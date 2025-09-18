import * as vscode from 'vscode';
import { EmbeddingService } from '../embedding/EmbeddingService';
import { LocalVectorDB, VectorDocument } from '../vectordb/LocalVectorDB';

/**
 * 知识图谱节点接口（来源于原有的图结构）
 */
export interface KnowledgeGraphNode {
    id: string;
    file_path?: string;
    file_name?: string;
    start_line?: number;
    end_line?: number;
    element_type?: string;
    name?: string;
    code_snippet?: string;
    semantic_tags?: string[];
    content?: string;
}

/**
 * 向量化配置接口
 */
export interface VectorizationConfig {
    useSimulation?: boolean;
    batchSize?: number;
    includeSemanticTags?: boolean;
    includeMetadata?: boolean;
}

/**
 * 向量化结果接口
 */
export interface VectorizationResult {
    totalNodes: number;
    vectorizedNodes: number;
    skippedNodes: number;
    errors: Array<{ nodeId: string; error: string }>;
    collectionName: string;
    dimension: number;
}

/**
 * 知识图谱向量化器类
 */
export class KnowledgeGraphVectorizer {
    private embeddingService: EmbeddingService;
    private vectorDB: LocalVectorDB;
    private config: VectorizationConfig;

    constructor(
        projectPath: string, 
        embeddingConfig?: any,
        vectorizationConfig?: VectorizationConfig
    ) {
        this.embeddingService = new EmbeddingService(embeddingConfig);
        this.vectorDB = new LocalVectorDB(projectPath);
        this.config = {
            useSimulation: false,
            batchSize: 10,
            includeSemanticTags: true,
            includeMetadata: true,
            ...vectorizationConfig
        };
    }

    /**
     * 将知识图谱节点向量化并存储
     * @param nodes 知识图谱节点数组
     * @param collectionName 集合名称
     * @param progressCallback 进度回调函数
     */
    async vectorizeKnowledgeGraph(
        nodes: KnowledgeGraphNode[],
        collectionName: string = 'knowledge_graph',
        progressCallback?: (progress: number, total: number, message: string) => void
    ): Promise<VectorizationResult> {
        console.log(`🚀 开始向量化知识图谱，节点数量: ${nodes.length}`);
        
        const result: VectorizationResult = {
            totalNodes: nodes.length,
            vectorizedNodes: 0,
            skippedNodes: 0,
            errors: [],
            collectionName,
            dimension: 128 // 默认维度，会在获取第一个向量时更新
        };

        if (nodes.length === 0) {
            console.log('⚠️ 没有节点需要向量化');
            return result;
        }

        try {
            // 1. 准备文本内容
            progressCallback?.(0, nodes.length, '准备文本内容...');
            const textContents = this.prepareTextContents(nodes);
            
            // 2. 过滤有效内容
            const validIndices: number[] = [];
            const validTexts: string[] = [];
            
            textContents.forEach((text, index) => {
                if (text && text.trim().length > 0) {
                    validIndices.push(index);
                    validTexts.push(text);
                } else {
                    result.skippedNodes++;
                    console.log(`⏭️ 跳过空内容节点: ${nodes[index].id}`);
                }
            });

            if (validTexts.length === 0) {
                console.log('⚠️ 没有有效的文本内容可以向量化');
                return result;
            }

            // 3. 获取嵌入向量
            progressCallback?.(0, validTexts.length, '获取文本向量...');
            
            const embeddings = await this.embeddingService.getEmbeddingsWithProgress(
                validTexts,
                (progress, total) => {
                    progressCallback?.(progress, total, `获取向量: ${progress}/${total}`);
                },
                this.config.useSimulation
            );

            if (embeddings.length === 0) {
                throw new Error('未能获取任何嵌入向量');
            }

            // 更新维度信息
            result.dimension = embeddings[0].length;

            // 4. 创建向量集合
            this.vectorDB.createCollection(collectionName, result.dimension);

            // 5. 准备向量文档
            progressCallback?.(0, validIndices.length, '准备向量文档...');
            
            const vectorDocuments: VectorDocument[] = validIndices.map((nodeIndex, embeddingIndex) => {
                const node = nodes[nodeIndex];
                const embedding = embeddings[embeddingIndex];
                
                return this.createVectorDocument(node, embedding, textContents[nodeIndex]);
            });

            // 6. 插入向量数据库
            progressCallback?.(0, vectorDocuments.length, '插入向量数据库...');
            
            this.vectorDB.insert(collectionName, vectorDocuments);
            result.vectorizedNodes = vectorDocuments.length;

            console.log(`✅ 知识图谱向量化完成:`, result);
            
            return result;

        } catch (error) {
            console.error('❌ 知识图谱向量化失败:', error);
            result.errors.push({
                nodeId: 'global',
                error: error instanceof Error ? error.message : String(error)
            });
            
            throw error;
        }
    }

    /**
     * 准备节点的文本内容用于向量化
     */
    private prepareTextContents(nodes: KnowledgeGraphNode[]): string[] {
        return nodes.map(node => {
            const parts: string[] = [];
            
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
            
            // 代码片段或内容
            if (node.code_snippet) {
                parts.push(`代码: ${node.code_snippet.trim()}`);
            } else if (node.content) {
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
            
            return parts.join('\n');
        });
    }

    /**
     * 创建向量文档
     */
    private createVectorDocument(
        node: KnowledgeGraphNode,
        embedding: number[],
        textContent: string
    ): VectorDocument {
        const metadata: Record<string, any> = {
            nodeId: node.id,
            elementType: node.element_type,
            fileName: node.file_name,
            filePath: node.file_path,
        };

        // 添加位置信息
        if (node.start_line !== undefined) {
            metadata.startLine = node.start_line;
        }
        if (node.end_line !== undefined) {
            metadata.endLine = node.end_line;
        }

        // 添加语义标签
        if (this.config.includeSemanticTags && node.semantic_tags) {
            metadata.semanticTags = node.semantic_tags;
        }

        // 添加其他元数据
        if (this.config.includeMetadata) {
            metadata.vectorizedAt = new Date().toISOString();
            metadata.textLength = textContent.length;
            metadata.hasCodeSnippet = !!node.code_snippet;
        }

        return {
            id: node.id,
            vector: embedding,
            content: textContent,
            metadata
        };
    }

    /**
     * 搜索相似的知识图谱节点
     * @param queryText 查询文本
     * @param collectionName 集合名称
     * @param options 搜索选项
     */
    async searchSimilarNodes(
        queryText: string,
        collectionName: string = 'knowledge_graph',
        options: { topK?: number; threshold?: number } = {}
    ) {
        try {
            console.log(`🔍 搜索相似节点: "${queryText}"`);
            
            // 获取查询文本的向量
            const queryEmbeddings = await this.embeddingService.getEmbeddings(
                [queryText], 
                this.config.useSimulation
            );
            
            if (queryEmbeddings.length === 0) {
                throw new Error('无法获取查询文本的向量表示');
            }
            
            // 执行向量搜索
            const searchResults = this.vectorDB.search(
                collectionName, 
                queryEmbeddings[0], 
                options
            );
            
            console.log(`✅ 找到 ${searchResults.length} 个相似节点`);
            
            return searchResults;
            
        } catch (error) {
            console.error('❌ 搜索相似节点失败:', error);
            throw error;
        }
    }

    /**
     * 获取向量数据库统计信息
     */
    getVectorDBStats() {
        return this.vectorDB.getStats();
    }

    /**
     * 获取集合信息
     */
    getCollectionInfo(collectionName: string) {
        return this.vectorDB.getCollectionInfo(collectionName);
    }

    /**
     * 测试嵌入服务连接
     */
    async testEmbeddingService(): Promise<boolean> {
        return this.embeddingService.testConnection();
    }

    /**
     * 更新向量化配置
     */
    updateConfig(newConfig: Partial<VectorizationConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * 批量向量化指定文件的节点
     * @param nodes 所有节点
     * @param filePaths 指定的文件路径
     * @param collectionName 集合名称
     */
    async vectorizeFileNodes(
        nodes: KnowledgeGraphNode[],
        filePaths: string[],
        collectionName: string = 'knowledge_graph'
    ): Promise<VectorizationResult> {
        // 过滤指定文件的节点
        const fileNodes = nodes.filter(node => 
            node.file_path && filePaths.includes(node.file_path)
        );
        
        console.log(`🎯 向量化指定文件的节点，文件数: ${filePaths.length}，节点数: ${fileNodes.length}`);
        
        return this.vectorizeKnowledgeGraph(fileNodes, collectionName);
    }
}