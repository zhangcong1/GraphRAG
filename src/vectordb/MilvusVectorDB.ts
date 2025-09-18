import { MilvusClient, DataType, MetricType, LoadState } from '@zilliz/milvus2-sdk-node';
import * as vscode from 'vscode';
import * as path from 'path';

/**
 * 向量文档接口 - 扩展支持知识图谱节点信息
 */
export interface KnowledgeGraphVectorDocument {
    id: string;
    vector: number[];
    content: string;
    nodeId: string;
    filePath: string;
    fileName: string;
    startLine: number;
    endLine: number;
    elementType: string;
    elementName: string;
    codeSnippet: string;
    semanticTags: string[];
    metadata: Record<string, any>;
}

/**
 * 搜索选项
 */
export interface MilvusSearchOptions {
    topK?: number;
    threshold?: number;
    filterExpr?: string;
    metricType?: string;
}

/**
 * 搜索结果
 */
export interface MilvusSearchResult {
    document: KnowledgeGraphVectorDocument;
    score: number;
}

/**
 * Milvus 配置
 */
export interface MilvusConfig {
    address?: string;
    token?: string;
    username?: string;
    password?: string;
    ssl?: boolean;
}

/**
 * Milvus 向量数据库实现
 */
export class MilvusVectorDB {
    private config: MilvusConfig;
    private client: MilvusClient | null = null;
    private initializationPromise: Promise<void>;
    private projectName: string;

    constructor(projectPath: string, config?: MilvusConfig) {
        this.projectName = this.getProjectName(projectPath);
        this.config = {
            address: 'http://localhost:19530',
            username: '',
            password: '',
            ssl: false,
            ...config
        };

        // 异步初始化
        this.initializationPromise = this.initialize();
    }

    /**
     * 获取项目名称作为集合前缀
     */
    private getProjectName(projectPath: string): string {
        const baseName = path.basename(projectPath);
        // 清理名称，只保留字母数字和下划线
        return baseName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    }

    /**
     * 初始化 Milvus 客户端
     */
    private async initialize(): Promise<void> {
        try {
            console.log('🔌 连接到 Milvus 向量数据库:', this.config.address);
            
            this.client = new MilvusClient({
                address: this.config.address!,
                username: this.config.username,
                password: this.config.password,
                token: this.config.token,
                ssl: this.config.ssl || false,
            });

            // 测试连接
            await this.client.checkHealth();
            console.log('✅ Milvus 连接成功');
            
        } catch (error) {
            console.error('❌ Milvus 连接失败:', error);
            vscode.window.showErrorMessage(`Milvus 连接失败: ${error}`);
            throw error;
        }
    }

    /**
     * 确保初始化完成
     */
    private async ensureInitialized(): Promise<void> {
        await this.initializationPromise;
        if (!this.client) {
            throw new Error('Milvus 客户端未初始化');
        }
    }

    /**
     * 确保集合已加载到内存
     */
    private async ensureLoaded(collectionName: string): Promise<void> {
        if (!this.client) {
            throw new Error('Milvus 客户端未初始化');
        }

        try {
            const result = await this.client.getLoadState({
                collection_name: collectionName
            });

            if (result.state !== LoadState.LoadStateLoaded) {
                console.log(`🔄 加载集合 '${collectionName}' 到内存...`);
                await this.client.loadCollection({
                    collection_name: collectionName,
                });
                console.log(`✅ 集合 '${collectionName}' 加载完成`);
            }
        } catch (error) {
            console.error(`❌ 加载集合 '${collectionName}' 失败:`, error);
            throw error;
        }
    }

    /**
     * 等待索引构建完成
     */
    private async waitForIndexReady(
        collectionName: string,
        fieldName: string,
        maxWaitTime: number = 60000
    ): Promise<void> {
        if (!this.client) {
            throw new Error('Milvus 客户端未初始化');
        }

        const startTime = Date.now();
        console.log(`⏳ 等待字段 '${fieldName}' 的索引构建完成...`);

        while (Date.now() - startTime < maxWaitTime) {
            try {
                const indexBuildProgress = await this.client.getIndexBuildProgress({
                    collection_name: collectionName,
                    field_name: fieldName
                });

                if (indexBuildProgress.indexed_rows === indexBuildProgress.total_rows) {
                    console.log(`✅ 字段 '${fieldName}' 索引构建完成!`);
                    return;
                }

                console.log(`📊 索引构建进度: ${indexBuildProgress.indexed_rows}/${indexBuildProgress.total_rows}`);
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                console.error(`❌ 检查索引构建进度失败:`, error);
                throw error;
            }
        }

        throw new Error(`索引构建超时: ${maxWaitTime}ms`);
    }

    /**
     * 获取集合名称
     */
    public getCollectionName(suffix: string = 'knowledge_graph'): string {
        return `${this.projectName}_${suffix}`;
    }

    /**
     * 创建知识图谱集合
     */
    public async createCollection(collectionName: string, dimension: number, description?: string): Promise<void> {
        await this.ensureInitialized();

        console.log(`🔧 创建知识图谱集合: ${collectionName}, 维度: ${dimension}`);

        const schema = [
            {
                name: 'id',
                description: '文档ID',
                data_type: DataType.VarChar,
                max_length: 512,
                is_primary_key: true,
            },
            {
                name: 'vector',
                description: '嵌入向量',
                data_type: DataType.FloatVector,
                dim: dimension,
            },
            {
                name: 'content',
                description: '内容文本',
                data_type: DataType.VarChar,
                max_length: 65535,
            },
            {
                name: 'nodeId',
                description: '知识图谱节点ID',
                data_type: DataType.VarChar,
                max_length: 512,
            },
            {
                name: 'filePath',
                description: '文件路径',
                data_type: DataType.VarChar,
                max_length: 2048,
            },
            {
                name: 'fileName',
                description: '文件名',
                data_type: DataType.VarChar,
                max_length: 512,
            },
            {
                name: 'startLine',
                description: '起始行号',
                data_type: DataType.Int64,
            },
            {
                name: 'endLine',
                description: '结束行号',
                data_type: DataType.Int64,
            },
            {
                name: 'elementType',
                description: '代码元素类型',
                data_type: DataType.VarChar,
                max_length: 128,
            },
            {
                name: 'elementName',
                description: '代码元素名称',
                data_type: DataType.VarChar,
                max_length: 512,
            },
            {
                name: 'codeSnippet',
                description: '代码片段',
                data_type: DataType.VarChar,
                max_length: 65535,
            },
            {
                name: 'semanticTags',
                description: '语义标签（JSON数组字符串）',
                data_type: DataType.VarChar,
                max_length: 2048,
            },
            {
                name: 'metadata',
                description: '元数据（JSON字符串）',
                data_type: DataType.VarChar,
                max_length: 65535,
            },
        ];

        const createCollectionParams = {
            collection_name: collectionName,
            description: description || `GraphRAG 知识图谱集合: ${collectionName}`,
            fields: schema,
        };

        if (!this.client) {
            throw new Error('Milvus 客户端未初始化');
        }

        await this.client.createCollection(createCollectionParams);
        console.log(`✅ 集合 '${collectionName}' 创建成功`);

        // 创建向量索引
        const indexParams = {
            collection_name: collectionName,
            field_name: 'vector',
            index_name: 'vector_index',
            index_type: 'AUTOINDEX',
            metric_type: MetricType.COSINE,
        };

        console.log(`🔧 为字段 'vector' 创建索引...`);
        await this.client.createIndex(indexParams);

        // 等待索引构建完成
        await this.waitForIndexReady(collectionName, 'vector');

        // 加载集合到内存
        await this.client.loadCollection({
            collection_name: collectionName,
        });

        console.log(`✅ 集合 '${collectionName}' 初始化完成`);
    }

    /**
     * 检查集合是否存在
     */
    public async hasCollection(collectionName: string): Promise<boolean> {
        await this.ensureInitialized();

        if (!this.client) {
            throw new Error('Milvus 客户端未初始化');
        }

        const result = await this.client.hasCollection({
            collection_name: collectionName,
        });

        return Boolean(result.value);
    }

    /**
     * 删除集合
     */
    public async dropCollection(collectionName: string): Promise<void> {
        await this.ensureInitialized();

        if (!this.client) {
            throw new Error('Milvus 客户端未初始化');
        }

        await this.client.dropCollection({
            collection_name: collectionName,
        });

        console.log(`🗑️ 删除集合: ${collectionName}`);
    }

    /**
     * 获取所有集合
     */
    public async listCollections(): Promise<string[]> {
        await this.ensureInitialized();

        if (!this.client) {
            throw new Error('Milvus 客户端未初始化');
        }

        const result = await this.client.showCollections();
        const collections = (result as any).collection_names || (result as any).collections || [];
        
        // 过滤出当前项目的集合
        return collections.filter((name: string) => name.startsWith(`${this.projectName}_`));
    }

    /**
     * 批量插入向量文档
     */
    public async insert(collectionName: string, documents: KnowledgeGraphVectorDocument[]): Promise<void> {
        await this.ensureInitialized();
        await this.ensureLoaded(collectionName);

        if (!this.client) {
            throw new Error('Milvus 客户端未初始化');
        }

        console.log(`📥 插入 ${documents.length} 个文档到集合: ${collectionName}`);

        const data = documents.map(doc => ({
            id: doc.id,
            vector: doc.vector,
            content: doc.content,
            nodeId: doc.nodeId,
            filePath: doc.filePath,
            fileName: doc.fileName,
            startLine: doc.startLine,
            endLine: doc.endLine,
            elementType: doc.elementType,
            elementName: doc.elementName,
            codeSnippet: doc.codeSnippet,
            semanticTags: JSON.stringify(doc.semanticTags),
            metadata: JSON.stringify(doc.metadata),
        }));

        await this.client.insert({
            collection_name: collectionName,
            data: data,
        });

        console.log(`✅ 成功插入 ${documents.length} 个文档`);
    }

    /**
     * 向量搜索
     */
    public async search(
        collectionName: string,
        queryVector: number[],
        options?: MilvusSearchOptions
    ): Promise<MilvusSearchResult[]> {
        await this.ensureInitialized();
        await this.ensureLoaded(collectionName);

        if (!this.client) {
            throw new Error('Milvus 客户端未初始化');
        }

        const searchParams: any = {
            collection_name: collectionName,
            data: [queryVector],
            limit: options?.topK || 10,
            output_fields: [
                'id', 'content', 'nodeId', 'filePath', 'fileName',
                'startLine', 'endLine', 'elementType', 'elementName',
                'codeSnippet', 'semanticTags', 'metadata'
            ],
        };

        // 应用过滤表达式
        if (options?.filterExpr && options.filterExpr.trim().length > 0) {
            searchParams.expr = options.filterExpr;
        }

        console.log(`🔍 在集合 '${collectionName}' 中搜索...`);
        const searchResult = await this.client.search(searchParams);

        if (!searchResult.results || searchResult.results.length === 0) {
            return [];
        }

        return searchResult.results.map((result: any) => ({
            document: {
                id: result.id,
                vector: queryVector,
                content: result.content,
                nodeId: result.nodeId,
                filePath: result.filePath,
                fileName: result.fileName,
                startLine: result.startLine,
                endLine: result.endLine,
                elementType: result.elementType,
                elementName: result.elementName,
                codeSnippet: result.codeSnippet,
                semanticTags: JSON.parse(result.semanticTags || '[]'),
                metadata: JSON.parse(result.metadata || '{}'),
            },
            score: result.score,
        }));
    }

    /**
     * 删除文档
     */
    public async delete(collectionName: string, ids: string[]): Promise<void> {
        await this.ensureInitialized();
        await this.ensureLoaded(collectionName);

        if (!this.client) {
            throw new Error('Milvus 客户端未初始化');
        }

        await this.client.delete({
            collection_name: collectionName,
            filter: `id in [${ids.map(id => `"${id}"`).join(', ')}]`,
        });

        console.log(`🗑️ 删除 ${ids.length} 个文档`);
    }

    /**
     * 查询文档
     */
    public async query(
        collectionName: string,
        filter: string,
        outputFields: string[],
        limit?: number
    ): Promise<Record<string, any>[]> {
        await this.ensureInitialized();
        await this.ensureLoaded(collectionName);

        if (!this.client) {
            throw new Error('Milvus 客户端未初始化');
        }

        const queryParams: any = {
            collection_name: collectionName,
            filter: filter,
            output_fields: outputFields,
        };

        if (limit !== undefined) {
            queryParams.limit = limit;
        } else if (filter === '' || filter.trim() === '') {
            queryParams.limit = 16384; // 空过滤器的默认限制
        }

        const result = await this.client.query(queryParams);

        if (result.status.error_code !== 'Success') {
            throw new Error(`查询失败: ${result.status.reason}`);
        }

        return result.data || [];
    }

    /**
     * 获取集合统计信息
     */
    public async getStats(collectionName: string): Promise<{
        totalDocuments: number;
        collectionInfo: any;
    }> {
        await this.ensureInitialized();

        if (!this.client) {
            throw new Error('Milvus 客户端未初始化');
        }

        try {
            // 获取集合信息
            const collectionInfo = await this.client.describeCollection({
                collection_name: collectionName,
            });

            // 获取文档数量
            const countResult = await this.query(
                collectionName,
                '',
                ['count(*)'],
                1
            );

            const totalDocuments = countResult.length > 0 ? countResult[0]['count(*)'] : 0;

            return {
                totalDocuments,
                collectionInfo
            };
        } catch (error) {
            console.error(`获取集合 '${collectionName}' 统计信息失败:`, error);
            return {
                totalDocuments: 0,
                collectionInfo: null
            };
        }
    }

    /**
     * 清理项目的所有集合
     */
    public async cleanup(): Promise<void> {
        await this.ensureInitialized();

        const collections = await this.listCollections();
        
        for (const collectionName of collections) {
            try {
                await this.dropCollection(collectionName);
            } catch (error) {
                console.error(`删除集合 '${collectionName}' 失败:`, error);
            }
        }

        console.log(`🧹 清理完成，删除了 ${collections.length} 个集合`);
    }

    /**
     * 关闭连接
     */
    public async close(): Promise<void> {
        if (this.client) {
            // Milvus 客户端通常不需要显式关闭
            this.client = null;
            console.log('🔌 Milvus 连接已关闭');
        }
    }
}