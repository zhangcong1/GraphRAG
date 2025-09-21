"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLiteVectorDB = void 0;
const path = __importStar(require("path"));
const sqlite3 = __importStar(require("sqlite3"));
/**
 * SQLite向量数据库类
 * 使用SQLite存储向量数据，支持高效的向量搜索
 */
class SQLiteVectorDB {
    db = null;
    dbFilePath;
    projectName;
    isInitialized = false;
    constructor(projectPath) {
        this.projectName = this.getProjectName(projectPath);
        this.dbFilePath = this.getDBFilePath(projectPath);
    }
    /**
     * 获取项目名称
     */
    getProjectName(projectPath) {
        return path.basename(projectPath);
    }
    /**
     * 获取数据库文件路径
     */
    getDBFilePath(projectPath) {
        // 直接在项目根目录存储数据库文件
        return path.join(projectPath, 'knowledge-graph.db');
    }
    /**
     * 初始化数据库
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbFilePath, (err) => {
                if (err) {
                    console.error('❌ SQLite数据库连接失败:', err);
                    reject(err);
                    return;
                }
                console.log(`✅ SQLite数据库已连接: ${this.dbFilePath}`);
                // 创建向量表
                this.createTables().then(() => {
                    this.isInitialized = true;
                    resolve();
                }).catch(reject);
            });
        });
    }
    /**
     * 创建数据库表
     */
    async createTables() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('数据库未初始化'));
                return;
            }
            const createTableSQL = `
                CREATE TABLE IF NOT EXISTS vector_collections (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL,
                    dimension INTEGER NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS vector_documents (
                    id TEXT PRIMARY KEY,
                    collection_name TEXT NOT NULL,
                    vector TEXT NOT NULL,  -- JSON字符串存储向量
                    content TEXT NOT NULL,
                    metadata TEXT NOT NULL,  -- JSON字符串存储元数据
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY (collection_name) REFERENCES vector_collections(name)
                );

                CREATE INDEX IF NOT EXISTS idx_collection_name ON vector_documents(collection_name);
                CREATE INDEX IF NOT EXISTS idx_created_at ON vector_documents(created_at);
            `;
            this.db.exec(createTableSQL, (err) => {
                if (err) {
                    console.error('❌ 创建数据库表失败:', err);
                    reject(err);
                }
                else {
                    console.log('✅ 数据库表创建成功');
                    resolve();
                }
            });
        });
    }
    /**
     * 创建集合
     */
    async createCollection(collectionName, dimension) {
        await this.initialize();
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('数据库未初始化'));
                return;
            }
            const now = new Date().toISOString();
            const insertSQL = `
                INSERT OR REPLACE INTO vector_collections (name, dimension, created_at, updated_at)
                VALUES (?, ?, ?, ?)
            `;
            this.db.run(insertSQL, [collectionName, dimension, now, now], function (err) {
                if (err) {
                    console.error(`❌ 创建集合 "${collectionName}" 失败:`, err);
                    reject(err);
                }
                else {
                    console.log(`✅ 集合 "${collectionName}" 创建成功，维度: ${dimension}`);
                    resolve();
                }
            });
        });
    }
    /**
     * 插入向量文档
     */
    async insert(collectionName, documents) {
        await this.initialize();
        // 首先验证集合存在
        const collection = await this.getCollectionInfo(collectionName);
        if (!collection) {
            throw new Error(`集合 "${collectionName}" 不存在`);
        }
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('数据库未初始化'));
                return;
            }
            // 开始事务
            this.db.serialize(() => {
                this.db.run("BEGIN TRANSACTION");
                let completed = 0;
                let hasError = false;
                for (const doc of documents) {
                    // 验证向量维度
                    if (doc.vector.length !== collection.dimension) {
                        hasError = true;
                        this.db.run("ROLLBACK");
                        reject(new Error(`文档向量维度不匹配，期望: ${collection.dimension}, 实际: ${doc.vector.length}`));
                        return;
                    }
                    const now = new Date().toISOString();
                    const insertSQL = `
                        INSERT OR REPLACE INTO vector_documents 
                        (id, collection_name, vector, content, metadata, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `;
                    const vectorJson = JSON.stringify(doc.vector);
                    const metadataJson = JSON.stringify({
                        ...doc.metadata,
                        projectName: this.projectName,
                        updatedAt: now
                    });
                    this.db.run(insertSQL, [
                        doc.id,
                        collectionName,
                        vectorJson,
                        doc.content,
                        metadataJson,
                        now,
                        now
                    ], (err) => {
                        if (err && !hasError) {
                            hasError = true;
                            console.error(`❌ 插入文档 ${doc.id} 失败:`, err);
                            this.db.run("ROLLBACK");
                            reject(err);
                            return;
                        }
                        completed++;
                        if (completed === documents.length && !hasError) {
                            // 更新集合的修改时间
                            const updateCollectionSQL = `
                                UPDATE vector_collections 
                                SET updated_at = ? 
                                WHERE name = ?
                            `;
                            this.db.run(updateCollectionSQL, [now, collectionName], (updateErr) => {
                                if (updateErr) {
                                    this.db.run("ROLLBACK");
                                    reject(updateErr);
                                }
                                else {
                                    this.db.run("COMMIT");
                                    console.log(`✅ 成功插入 ${documents.length} 个文档到集合 "${collectionName}"`);
                                    resolve();
                                }
                            });
                        }
                    });
                }
            });
        });
    }
    /**
     * 搜索相似向量
     */
    async search(collectionName, queryVector, options = {}) {
        await this.initialize();
        const { topK = 5, threshold = 0 } = options;
        // 验证集合存在
        const collection = await this.getCollectionInfo(collectionName);
        if (!collection) {
            throw new Error(`集合 "${collectionName}" 不存在`);
        }
        if (queryVector.length !== collection.dimension) {
            throw new Error(`查询向量维度不匹配，期望: ${collection.dimension}, 实际: ${queryVector.length}`);
        }
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('数据库未初始化'));
                return;
            }
            const selectSQL = `
                SELECT id, vector, content, metadata 
                FROM vector_documents 
                WHERE collection_name = ?
            `;
            this.db.all(selectSQL, [collectionName], (err, rows) => {
                if (err) {
                    console.error('❌ 查询向量数据失败:', err);
                    reject(err);
                    return;
                }
                const results = [];
                try {
                    for (const row of rows) {
                        const vector = JSON.parse(row.vector);
                        const metadata = JSON.parse(row.metadata);
                        const similarity = this.cosineSimilarity(queryVector, vector);
                        if (similarity >= threshold) {
                            results.push({
                                document: {
                                    id: row.id,
                                    vector: vector,
                                    content: row.content,
                                    metadata: metadata
                                },
                                score: similarity
                            });
                        }
                    }
                    // 按相似度排序，返回前K个结果
                    results.sort((a, b) => b.score - a.score);
                    resolve(results.slice(0, topK));
                }
                catch (parseError) {
                    console.error('❌ 解析向量数据失败:', parseError);
                    reject(parseError);
                }
            });
        });
    }
    /**
     * 计算余弦相似度
     */
    cosineSimilarity(vecA, vecB) {
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
    async getCollectionInfo(collectionName) {
        await this.initialize();
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('数据库未初始化'));
                return;
            }
            const selectSQL = `
                SELECT c.*, COUNT(d.id) as document_count
                FROM vector_collections c
                LEFT JOIN vector_documents d ON c.name = d.collection_name
                WHERE c.name = ?
                GROUP BY c.name
            `;
            this.db.get(selectSQL, [collectionName], (err, row) => {
                if (err) {
                    reject(err);
                }
                else if (row) {
                    resolve({
                        name: row.name,
                        dimension: row.dimension,
                        documentCount: row.document_count,
                        created_at: row.created_at,
                        updated_at: row.updated_at
                    });
                }
                else {
                    resolve(null);
                }
            });
        });
    }
    /**
     * 获取所有集合名称
     */
    async getCollectionNames() {
        await this.initialize();
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('数据库未初始化'));
                return;
            }
            this.db.all("SELECT name FROM vector_collections", (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(rows.map(row => row.name));
                }
            });
        });
    }
    /**
     * 删除集合
     */
    async dropCollection(collectionName) {
        await this.initialize();
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('数据库未初始化'));
                return;
            }
            this.db.serialize(() => {
                this.db.run("BEGIN TRANSACTION");
                // 删除文档
                this.db.run("DELETE FROM vector_documents WHERE collection_name = ?", [collectionName], (err) => {
                    if (err) {
                        this.db.run("ROLLBACK");
                        reject(err);
                        return;
                    }
                    // 删除集合
                    this.db.run("DELETE FROM vector_collections WHERE name = ?", [collectionName], (err) => {
                        if (err) {
                            this.db.run("ROLLBACK");
                            reject(err);
                        }
                        else {
                            this.db.run("COMMIT");
                            console.log(`🗑️ 删除集合: ${collectionName}`);
                            resolve();
                        }
                    });
                });
            });
        });
    }
    /**
     * 获取数据库统计信息
     */
    async getStats() {
        await this.initialize();
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('数据库未初始化'));
                return;
            }
            const statsSQL = `
                SELECT 
                    c.name,
                    c.dimension,
                    COUNT(d.id) as document_count
                FROM vector_collections c
                LEFT JOIN vector_documents d ON c.name = d.collection_name
                GROUP BY c.name, c.dimension
            `;
            this.db.all(statsSQL, (err, rows) => {
                if (err) {
                    reject(err);
                }
                else {
                    const collections = {};
                    let totalDocuments = 0;
                    for (const row of rows) {
                        collections[row.name] = {
                            documents: row.document_count,
                            dimension: row.dimension
                        };
                        totalDocuments += row.document_count;
                    }
                    resolve({
                        totalCollections: rows.length,
                        totalDocuments,
                        collections
                    });
                }
            });
        });
    }
    /**
     * 检查项目是否已有知识图谱向量数据
     */
    async hasKnowledgeGraph() {
        try {
            await this.initialize();
            const collections = await this.getCollectionNames();
            return collections.includes('knowledge_graph');
        }
        catch (error) {
            console.warn('检查知识图谱状态失败:', error);
            return false;
        }
    }
    /**
     * 关闭数据库连接
     */
    async close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        console.error('❌ 关闭数据库失败:', err);
                        reject(err);
                    }
                    else {
                        console.log('✅ 数据库连接已关闭');
                        this.db = null;
                        this.isInitialized = false;
                        resolve();
                    }
                });
            }
            else {
                resolve();
            }
        });
    }
}
exports.SQLiteVectorDB = SQLiteVectorDB;
//# sourceMappingURL=SQLiteVectorDB.js.map