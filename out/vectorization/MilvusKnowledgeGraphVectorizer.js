"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MilvusKnowledgeGraphVectorizer = void 0;
const EmbeddingService_1 = require("../embedding/EmbeddingService");
const MilvusVectorDB_1 = require("../vectordb/MilvusVectorDB");
/**
 * 基于 Milvus 的知识图谱向量化器
 */
class MilvusKnowledgeGraphVectorizer {
    embeddingService;
    vectorDB;
    config;
    projectPath;
    constructor(projectPath, embeddingConfig, milvusConfig, vectorizationConfig) {
        this.projectPath = projectPath;
        this.embeddingService = new EmbeddingService_1.EmbeddingService(embeddingConfig);
        this.vectorDB = new MilvusVectorDB_1.MilvusVectorDB(projectPath, milvusConfig);
        this.config = {
            useSimulation: false,
            batchSize: 20,
            includeSemanticTags: true,
            includeMetadata: true,
            dimension: 128,
            ...vectorizationConfig
        };
    }
    /**
     * 将知识图谱节点向量化并存储到 Milvus
     */
    async vectorizeKnowledgeGraph(nodes, collectionName, progressCallback) {
        const startTime = Date.now();
        const finalCollectionName = collectionName || this.vectorDB.getCollectionName('knowledge_graph');
        console.log(`🚀 开始向量化知识图谱，节点数量: ${nodes.length}`);
        const result = {
            totalNodes: nodes.length,
            vectorizedNodes: 0,
            skippedNodes: 0,
            errors: [],
            collectionName: finalCollectionName,
            dimension: this.config.dimension,
            processingTime: 0
        };
        if (nodes.length === 0) {
            console.log('⚠️ 没有节点需要向量化');
            return result;
        }
        try {
            // 1. 检测或获取 embedding 维度
            progressCallback?.(0, nodes.length, '检测 embedding 维度...');
            let dimension = this.config.dimension;
            if (!this.config.useSimulation) {
                try {
                    dimension = await this.embeddingService.detectDimension();
                    console.log(`📏 检测到 embedding 维度: ${dimension}`);
                }
                catch (error) {
                    console.warn('维度检测失败，使用默认维度:', dimension);
                }
            }
            result.dimension = dimension;
            // 2. 创建或确保集合存在
            progressCallback?.(5, nodes.length, '初始化 Milvus 集合...');
            const collectionExists = await this.vectorDB.hasCollection(finalCollectionName);
            if (!collectionExists) {
                await this.vectorDB.createCollection(finalCollectionName, dimension, `GraphRAG 知识图谱集合 - ${this.projectPath}`);
            }
            else {
                console.log(`✅ 集合 '${finalCollectionName}' 已存在`);
            }
            // 3. 准备文本内容
            progressCallback?.(10, nodes.length, '准备文本内容...');
            const { validNodes, textContents } = this.prepareNodesAndTexts(nodes, result);
            if (validNodes.length === 0) {
                console.log('⚠️ 没有有效的文本内容可以向量化');
                return result;
            }
            // 4. 批量获取嵌入向量
            progressCallback?.(20, nodes.length, '获取文本向量...');
            const embeddings = await this.embeddingService.getEmbeddingsWithProgress(textContents, (progress, total, phase) => {
                const overallProgress = 20 + (progress / total) * 60; // 20-80%
                progressCallback?.(overallProgress, nodes.length, phase);
            }, this.config.useSimulation);
            if (embeddings.length === 0) {
                throw new Error('未能获取任何嵌入向量');
            }
            // 5. 准备向量文档
            progressCallback?.(80, nodes.length, '准备向量文档...');
            const vectorDocuments = this.createVectorDocuments(validNodes, textContents, embeddings);
            // 6. 批量插入 Milvus
            progressCallback?.(90, nodes.length, '插入向量数据库...');
            await this.batchInsertToMilvus(finalCollectionName, vectorDocuments);
            result.vectorizedNodes = vectorDocuments.length;
            // 7. 完成
            result.processingTime = Date.now() - startTime;
            progressCallback?.(100, nodes.length, '向量化完成!');
            console.log(`✅ 知识图谱向量化完成:`, {
                ...result,
                processingTimeMs: result.processingTime
            });
            return result;
        }
        catch (error) {
            console.error('❌ 知识图谱向量化失败:', error);
            result.errors.push({
                nodeId: 'global',
                error: error instanceof Error ? error.message : String(error)
            });
            result.processingTime = Date.now() - startTime;
            throw error;
        }
    }
    /**
     * 准备节点和对应的文本内容
     */
    prepareNodesAndTexts(nodes, result) {
        const validNodes = [];
        const textContents = [];
        nodes.forEach(node => {
            const textContent = this.prepareTextContent(node);
            if (textContent && textContent.trim().length > 0) {
                validNodes.push(node);
                textContents.push(textContent);
            }
            else {
                result.skippedNodes++;
                console.log(`⏭️ 跳过空内容节点: ${node.id}`);
            }
        });
        return { validNodes, textContents };
    }
    /**
     * 准备节点的文本内容用于向量化
     */
    prepareTextContent(node) {
        const parts = [];
        // 节点名称
        if (node.name) {
            parts.push(`名称: ${node.name}`);
        }
        // 元素类型
        if (node.element_type) {
            parts.push(`类型: ${node.element_type}`);
        }
        // 文件信息
        if (node.file_name) {
            parts.push(`文件: ${node.file_name}`);
        }
        // 代码片段或内容 - 按照知识图谱向量化规范，优先使用 code_snippet
        if (node.code_snippet) {
            parts.push(`代码: ${node.code_snippet.trim()}`);
        }
        else if (node.content) {
            parts.push(`内容: ${node.content.trim()}`);
        }
        // 语义标签
        if (this.config.includeSemanticTags && node.semantic_tags && node.semantic_tags.length > 0) {
            parts.push(`标签: ${node.semantic_tags.join(', ')}`);
        }
        // 位置信息
        if (node.start_line !== undefined && node.end_line !== undefined) {
            parts.push(`位置: ${node.start_line}-${node.end_line}行`);
        }
        return parts.join('\\n');
    }
    /**
     * 创建向量文档数组
     */
    createVectorDocuments(nodes, textContents, embeddings) {
        return nodes.map((node, index) => {
            const textContent = textContents[index];
            const embedding = embeddings[index];
            const metadata = {
                originalNodeId: node.id,
                vectorizedAt: new Date().toISOString(),
                textLength: textContent.length,
                hasCodeSnippet: !!node.code_snippet,
                projectPath: this.projectPath
            };
            // 添加其他元数据
            if (this.config.includeMetadata) {
                metadata.embeddingProvider = this.embeddingService.getProvider();
                metadata.vectorizationConfig = this.config;
            }
            return {
                id: `${node.id}_${Date.now()}`, // 确保唯一性
                vector: embedding,
                content: textContent,
                nodeId: node.id,
                filePath: node.file_path || '',
                fileName: node.file_name || '',
                startLine: node.start_line || 0,
                endLine: node.end_line || 0,
                elementType: node.element_type || 'unknown',
                elementName: node.name || '',
                codeSnippet: node.code_snippet || '',
                semanticTags: node.semantic_tags || [],
                metadata
            };
        });
    }
    /**
     * 批量插入到 Milvus
     */
    async batchInsertToMilvus(collectionName, documents) {
        const batchSize = this.config.batchSize;
        for (let i = 0; i < documents.length; i += batchSize) {
            const batch = documents.slice(i, i + batchSize);
            try {
                await this.vectorDB.insert(collectionName, batch);
                console.log(`📥 批次 ${Math.floor(i / batchSize) + 1}: 插入 ${batch.length} 个文档`);
            }
            catch (error) {
                console.error(`❌ 批次插入失败:`, error);
                throw error;
            }
            // 添加小延迟避免压力过大
            if (i + batchSize < documents.length) {
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
    }
    /**
     * 搜索相似的知识图谱节点
     */
    async searchSimilarNodes(queryText, collectionName, options) {
        try {
            const finalCollectionName = collectionName || this.vectorDB.getCollectionName('knowledge_graph');
            console.log(`🔍 搜索相似节点: "${queryText}"`);
            // 获取查询文本的向量
            const embeddingResult = await this.embeddingService.embed(queryText);
            // 执行向量搜索
            const searchResults = await this.vectorDB.search(finalCollectionName, embeddingResult.vector, options);
            console.log(`✅ 找到 ${searchResults.length} 个相似节点`);
            return searchResults;
        }
        catch (error) {
            console.error('❌ 搜索相似节点失败:', error);
            throw error;
        }
    }
    /**
     * 按文件路径搜索
     */
    async searchByFilePath(filePath, collectionName, limit = 20) {
        try {
            const finalCollectionName = collectionName || this.vectorDB.getCollectionName('knowledge_graph');
            // 使用过滤表达式搜索
            const filterExpr = `filePath == "${filePath}"`;
            // 由于需要获取向量，我们使用一个通用查询向量
            const dummyVector = new Array(this.config.dimension).fill(0);
            const searchResults = await this.vectorDB.search(finalCollectionName, dummyVector, {
                topK: limit,
                filterExpr: filterExpr
            });
            return searchResults;
        }
        catch (error) {
            console.error('❌ 按文件路径搜索失败:', error);
            throw error;
        }
    }
    /**
     * 按代码元素类型搜索
     */
    async searchByElementType(elementType, collectionName, limit = 20) {
        try {
            const finalCollectionName = collectionName || this.vectorDB.getCollectionName('knowledge_graph');
            const filterExpr = `elementType == "${elementType}"`;
            const dummyVector = new Array(this.config.dimension).fill(0);
            const searchResults = await this.vectorDB.search(finalCollectionName, dummyVector, {
                topK: limit,
                filterExpr: filterExpr
            });
            return searchResults;
        }
        catch (error) {
            console.error('❌ 按元素类型搜索失败:', error);
            throw error;
        }
    }
    /**
     * 获取向量数据库统计信息
     */
    async getVectorDBStats(collectionName) {
        try {
            const finalCollectionName = collectionName || this.vectorDB.getCollectionName('knowledge_graph');
            const stats = await this.vectorDB.getStats(finalCollectionName);
            return {
                collectionName: finalCollectionName,
                ...stats
            };
        }
        catch (error) {
            console.error('❌ 获取统计信息失败:', error);
            return {
                collectionName: collectionName || 'unknown',
                totalDocuments: 0,
                collectionInfo: null
            };
        }
    }
    /**
     * 清理所有集合
     */
    async cleanup() {
        await this.vectorDB.cleanup();
    }
    /**
     * 测试连接
     */
    async testConnections() {
        const results = {
            embedding: false,
            milvus: false
        };
        try {
            results.embedding = await this.embeddingService.testConnection();
        }
        catch (error) {
            console.error('Embedding 服务测试失败:', error);
        }
        try {
            // 测试 Milvus 连接
            await this.vectorDB.listCollections();
            results.milvus = true;
        }
        catch (error) {
            console.error('Milvus 连接测试失败:', error);
        }
        return results;
    }
    /**
     * 更新配置
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    /**
     * 获取集合名称
     */
    getCollectionName(suffix = 'knowledge_graph') {
        return this.vectorDB.getCollectionName(suffix);
    }
    /**
     * 获取当前配置
     */
    getConfig() {
        return { ...this.config };
    }
}
exports.MilvusKnowledgeGraphVectorizer = MilvusKnowledgeGraphVectorizer;
//# sourceMappingURL=MilvusKnowledgeGraphVectorizer.js.map