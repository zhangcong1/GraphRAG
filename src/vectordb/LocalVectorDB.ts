import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * 向量文档接口
 */
export interface VectorDocument {
    id: string;
    vector: number[];
    content: string;
    metadata: Record<string, any>;
}

/**
 * 向量集合接口
 */
export interface VectorCollection {
    dimension: number;
    documents: VectorDocument[];
    createdAt: string;
    updatedAt: string;
}

/**
 * 向量数据库数据结构
 */
export interface VectorDBData {
    collections: Record<string, VectorCollection>;
    version: string;
}

/**
 * 搜索结果接口
 */
export interface SearchResult {
    document: VectorDocument;
    score: number;
}

/**
 * 本地向量数据库类
 * 支持按项目管理向量数据，每个项目有独立的向量数据库文件
 */
export class LocalVectorDB {
    private data: VectorDBData;
    private dbFilePath: string;
    private projectName: string;

    constructor(projectPath: string) {
        this.projectName = this.getProjectName(projectPath);
        this.dbFilePath = this.getDBFilePath(projectPath);
        this.data = this.loadDatabase();
    }

    /**
     * 获取项目名称
     */
    private getProjectName(projectPath: string): string {
        return path.basename(projectPath);
    }

    /**
     * 获取数据库文件路径
     */
    private getDBFilePath(projectPath: string): string {
        const huimaDir = path.join(projectPath, '.huima');
        if (!fs.existsSync(huimaDir)) {
            fs.mkdirSync(huimaDir, { recursive: true });
        }
        return path.join(huimaDir, 'vector-database.json');
    }

    /**
     * 加载数据库
     */
    private loadDatabase(): VectorDBData {
        try {
            if (fs.existsSync(this.dbFilePath)) {
                const data = fs.readFileSync(this.dbFilePath, 'utf8');
                const parsed = JSON.parse(data);
                
                // 版本兼容性检查
                if (!parsed.version) {
                    parsed.version = '1.0.0';
                }
                
                return parsed;
            }
        } catch (error) {
            console.warn(`向量数据库加载失败，创建新数据库: ${error}`);
            vscode.window.showWarningMessage(`向量数据库加载失败，将创建新数据库`);
        }
        
        return {
            collections: {},
            version: '1.0.0'
        };
    }

    /**
     * 保存数据库
     */
    private saveDatabase(): void {
        try {
            const dataToSave = {
                ...this.data,
                version: '1.0.0'
            };
            
            fs.writeFileSync(this.dbFilePath, JSON.stringify(dataToSave, null, 2), 'utf8');
            console.log(`✅ 向量数据库已保存: ${this.dbFilePath}`);
        } catch (error) {
            console.error('❌ 保存向量数据库失败:', error);
            vscode.window.showErrorMessage(`保存向量数据库失败: ${error}`);
            throw error;
        }
    }

    /**
     * 创建集合
     * @param collectionName 集合名称
     * @param dimension 向量维度
     */
    public createCollection(collectionName: string, dimension: number): void {
        if (!this.data.collections[collectionName]) {
            this.data.collections[collectionName] = {
                dimension: dimension,
                documents: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            console.log(`✅ 集合 "${collectionName}" 创建成功，维度: ${dimension}`);
        } else {
            console.log(`⚠️ 集合 "${collectionName}" 已存在`);
        }
        this.saveDatabase();
    }

    /**
     * 插入向量文档
     * @param collectionName 集合名称
     * @param documents 文档数组
     */
    public insert(collectionName: string, documents: VectorDocument[]): void {
        if (!this.data.collections[collectionName]) {
            throw new Error(`集合 "${collectionName}" 不存在`);
        }

        const collection = this.data.collections[collectionName];
        
        documents.forEach(doc => {
            // 验证向量维度
            if (doc.vector.length !== collection.dimension) {
                throw new Error(`文档向量维度不匹配，期望: ${collection.dimension}, 实际: ${doc.vector.length}`);
            }
            
            // 检查是否已存在相同ID的文档
            const existingIndex = collection.documents.findIndex(d => d.id === doc.id);
            if (existingIndex !== -1) {
                // 更新现有文档
                collection.documents[existingIndex] = {
                    ...doc,
                    metadata: {
                        ...doc.metadata,
                        updatedAt: new Date().toISOString()
                    }
                };
                console.log(`🔄 更新文档: ${doc.id}`);
            } else {
                // 添加新文档
                collection.documents.push({
                    ...doc,
                    metadata: {
                        ...doc.metadata,
                        createdAt: new Date().toISOString(),
                        projectName: this.projectName
                    }
                });
                console.log(`➕ 新增文档: ${doc.id}`);
            }
        });

        // 更新集合的最后修改时间
        collection.updatedAt = new Date().toISOString();
        
        console.log(`✅ 成功处理 ${documents.length} 个文档到集合 "${collectionName}"`);
        this.saveDatabase();
    }

    /**
     * 搜索相似向量
     * @param collectionName 集合名称
     * @param queryVector 查询向量
     * @param options 搜索选项
     */
    public search(collectionName: string, queryVector: number[], options: { topK?: number; threshold?: number } = {}): SearchResult[] {
        const { topK = 5, threshold = 0 } = options;
        
        if (!this.data.collections[collectionName]) {
            throw new Error(`集合 "${collectionName}" 不存在`);
        }

        const collection = this.data.collections[collectionName];
        
        if (queryVector.length !== collection.dimension) {
            throw new Error(`查询向量维度不匹配，期望: ${collection.dimension}, 实际: ${queryVector.length}`);
        }

        // 计算相似度
        const results: SearchResult[] = collection.documents.map(doc => {
            const similarity = this.cosineSimilarity(queryVector, doc.vector);
            return {
                document: doc,
                score: similarity
            };
        });

        // 过滤低于阈值的结果，按相似度排序，返回前K个结果
        return results
            .filter(result => result.score >= threshold)
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    }

    /**
     * 计算余弦相似度
     */
    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        if (vecA.length !== vecB.length) {
            throw new Error('向量维度不匹配');
        }

        let dotProduct = 0;
        let magnitudeA = 0;
        let magnitudeB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            magnitudeA += vecA[i] * vecA[i];
            magnitudeB += vecB[i] * vecB[i];
        }

        magnitudeA = Math.sqrt(magnitudeA);
        magnitudeB = Math.sqrt(magnitudeB);

        if (magnitudeA === 0 || magnitudeB === 0) {
            return 0;
        }

        return dotProduct / (magnitudeA * magnitudeB);
    }

    /**
     * 获取集合信息
     */
    public getCollectionInfo(collectionName: string): VectorCollection | null {
        return this.data.collections[collectionName] || null;
    }

    /**
     * 获取所有集合名称
     */
    public getCollectionNames(): string[] {
        return Object.keys(this.data.collections);
    }

    /**
     * 删除集合
     */
    public dropCollection(collectionName: string): void {
        if (this.data.collections[collectionName]) {
            delete this.data.collections[collectionName];
            console.log(`🗑️ 删除集合: ${collectionName}`);
            this.saveDatabase();
        } else {
            console.warn(`⚠️ 集合 "${collectionName}" 不存在`);
        }
    }

    /**
     * 获取数据库统计信息
     */
    public getStats(): { 
        totalCollections: number; 
        totalDocuments: number; 
        collections: Record<string, { documents: number; dimension: number }> 
    } {
        const collections: Record<string, { documents: number; dimension: number }> = {};
        let totalDocuments = 0;

        Object.entries(this.data.collections).forEach(([name, collection]) => {
            collections[name] = {
                documents: collection.documents.length,
                dimension: collection.dimension
            };
            totalDocuments += collection.documents.length;
        });

        return {
            totalCollections: Object.keys(this.data.collections).length,
            totalDocuments,
            collections
        };
    }
}