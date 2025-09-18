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
exports.LocalVectorDB = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
/**
 * 本地向量数据库类
 * 支持按项目管理向量数据，每个项目有独立的向量数据库文件
 */
class LocalVectorDB {
    data;
    dbFilePath;
    projectName;
    constructor(projectPath) {
        this.projectName = this.getProjectName(projectPath);
        this.dbFilePath = this.getDBFilePath(projectPath);
        this.data = this.loadDatabase();
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
        const huimaDir = path.join(projectPath, '.huima');
        if (!fs.existsSync(huimaDir)) {
            fs.mkdirSync(huimaDir, { recursive: true });
        }
        return path.join(huimaDir, 'vector-database.json');
    }
    /**
     * 加载数据库
     */
    loadDatabase() {
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
        }
        catch (error) {
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
    saveDatabase() {
        try {
            const dataToSave = {
                ...this.data,
                version: '1.0.0'
            };
            fs.writeFileSync(this.dbFilePath, JSON.stringify(dataToSave, null, 2), 'utf8');
            console.log(`✅ 向量数据库已保存: ${this.dbFilePath}`);
        }
        catch (error) {
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
    createCollection(collectionName, dimension) {
        if (!this.data.collections[collectionName]) {
            this.data.collections[collectionName] = {
                dimension: dimension,
                documents: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            console.log(`✅ 集合 "${collectionName}" 创建成功，维度: ${dimension}`);
        }
        else {
            console.log(`⚠️ 集合 "${collectionName}" 已存在`);
        }
        this.saveDatabase();
    }
    /**
     * 插入向量文档
     * @param collectionName 集合名称
     * @param documents 文档数组
     */
    insert(collectionName, documents) {
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
            }
            else {
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
    search(collectionName, queryVector, options = {}) {
        const { topK = 5, threshold = 0 } = options;
        if (!this.data.collections[collectionName]) {
            throw new Error(`集合 "${collectionName}" 不存在`);
        }
        const collection = this.data.collections[collectionName];
        if (queryVector.length !== collection.dimension) {
            throw new Error(`查询向量维度不匹配，期望: ${collection.dimension}, 实际: ${queryVector.length}`);
        }
        // 计算相似度
        const results = collection.documents.map(doc => {
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
    getCollectionInfo(collectionName) {
        return this.data.collections[collectionName] || null;
    }
    /**
     * 获取所有集合名称
     */
    getCollectionNames() {
        return Object.keys(this.data.collections);
    }
    /**
     * 删除集合
     */
    dropCollection(collectionName) {
        if (this.data.collections[collectionName]) {
            delete this.data.collections[collectionName];
            console.log(`🗑️ 删除集合: ${collectionName}`);
            this.saveDatabase();
        }
        else {
            console.warn(`⚠️ 集合 "${collectionName}" 不存在`);
        }
    }
    /**
     * 获取数据库统计信息
     */
    getStats() {
        const collections = {};
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
exports.LocalVectorDB = LocalVectorDB;
//# sourceMappingURL=LocalVectorDB.js.map