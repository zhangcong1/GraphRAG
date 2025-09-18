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
exports.EmbeddingService = void 0;
const vscode = __importStar(require("vscode"));
/**
 * 改进的 Embedding 服务类
 */
class EmbeddingService {
    config;
    maxTokens;
    cachedDimension = null;
    constructor(config) {
        // 默认配置
        this.config = {
            apiUrl: 'http://10.30.235.27:46600',
            model: 'Qwen3-Embedding-8B',
            timeout: 30000,
            maxTokens: 8192,
            maxBatchSize: 20,
            ...config
        };
        this.maxTokens = this.config.maxTokens;
    }
    /**
     * 预处理文本以确保其有效
     */
    preprocessText(text) {
        // 空字符串替换为单个空格
        if (text === '') {
            return ' ';
        }
        // 简单的字符基础截断（近似值）
        // 每个 token 平均约为4个字符
        const maxChars = this.maxTokens * 4;
        if (text.length > maxChars) {
            return text.substring(0, maxChars);
        }
        return text;
    }
    /**
     * 预处理文本数组
     */
    preprocessTexts(texts) {
        return texts.map(text => this.preprocessText(text));
    }
    /**
     * 检测 embedding 维度
     */
    async detectDimension(testText = 'test') {
        if (this.cachedDimension) {
            return this.cachedDimension;
        }
        try {
            const result = await this.embed(testText);
            this.cachedDimension = result.dimension;
            return this.cachedDimension;
        }
        catch (error) {
            console.warn('无法检测维度，使用默认值 128');
            this.cachedDimension = 128;
            return this.cachedDimension;
        }
    }
    /**
     * 生成单个文本的 embedding 向量
     */
    async embed(text) {
        const processedText = this.preprocessText(text);
        const embeddings = await this.getRealEmbeddings([processedText]);
        return {
            vector: embeddings[0],
            dimension: embeddings[0].length
        };
    }
    /**
     * 批量生成 embedding 向量
     */
    async embedBatch(texts) {
        const processedTexts = this.preprocessTexts(texts);
        const embeddings = await this.getRealEmbeddings(processedTexts);
        return embeddings.map(vector => ({
            vector,
            dimension: vector.length
        }));
    }
    /**
     * 获取文本的嵌入向量（保持向后兼容）
     */
    async getEmbeddings(texts, useSimulation = false) {
        if (texts.length === 0) {
            return [];
        }
        console.log(`🔄 正在获取 ${texts.length} 个文本的嵌入向量...`);
        try {
            if (useSimulation) {
                return this.getSimulatedEmbeddings(texts);
            }
            return await this.getRealEmbeddings(texts);
        }
        catch (error) {
            console.error('❌ 获取嵌入向量失败:', error);
            // 如果真实API调用失败，回退到模拟数据
            console.log('🔄 回退到模拟数据...');
            vscode.window.showWarningMessage(`Embedding API 调用失败，使用模拟数据: ${error}`);
            return this.getSimulatedEmbeddings(texts);
        }
    }
    /**
     * 批量获取嵌入向量，支持进度回调
     */
    async getEmbeddingsWithProgress(texts, progressCallback, useSimulation = false) {
        if (texts.length === 0) {
            return [];
        }
        const batchSize = this.config.maxBatchSize;
        const allEmbeddings = [];
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            if (useSimulation) {
                const batchEmbeddings = this.getSimulatedEmbeddings(batch);
                allEmbeddings.push(...batchEmbeddings);
            }
            else {
                try {
                    const batchEmbeddings = await this.getRealEmbeddings(batch);
                    allEmbeddings.push(...batchEmbeddings);
                }
                catch (error) {
                    console.warn(`批次 ${i}-${i + batchSize} 处理失败，使用模拟数据:`, error);
                    const batchEmbeddings = this.getSimulatedEmbeddings(batch);
                    allEmbeddings.push(...batchEmbeddings);
                }
            }
            // 调用进度回调
            const progress = Math.min(i + batchSize, texts.length);
            if (progressCallback) {
                progressCallback(progress, texts.length, `处理向量: ${progress}/${texts.length}`);
            }
            // 避免API限流，添加小延迟
            if (i + batchSize < texts.length && !useSimulation) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        return allEmbeddings;
    }
    /**
     * 调用真实的 Embedding API
     */
    async getRealEmbeddings(texts) {
        const endpoint = `${this.config.apiUrl}/v1/embeddings`;
        console.log(`连接到 Embedding 模型服务: ${endpoint}`);
        // 分批处理，避免请求过大
        const batchSize = 10;
        const allEmbeddings = [];
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            const batchEmbeddings = await this.processBatch(batch, endpoint);
            allEmbeddings.push(...batchEmbeddings);
            // 显示进度
            if (texts.length > batchSize) {
                const progress = Math.min(i + batchSize, texts.length);
                console.log(`进度: ${progress}/${texts.length}`);
            }
        }
        return allEmbeddings;
    }
    /**
     * 处理单个批次的文本
     */
    async processBatch(texts, endpoint) {
        const requestBody = {
            input: texts,
            model: this.config.model
        };
        const headers = {
            'Content-Type': 'application/json'
        };
        if (this.config.apiKey) {
            headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API请求失败: ${response.status} - ${errorText}`);
            }
            const data = await response.json();
            if (!data.data || !Array.isArray(data.data)) {
                throw new Error('API响应格式不正确');
            }
            return data.data
                .sort((a, b) => a.index - b.index) // 确保顺序正确
                .map(item => item.embedding);
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error(`请求超时 (${this.config.timeout}ms)`);
            }
            throw error;
        }
    }
    /**
     * 生成模拟的嵌入向量（用于测试）
     */
    getSimulatedEmbeddings(texts) {
        const dimension = 128; // 模拟128维向量
        return texts.map((text, index) => {
            // 基于文本内容生成相对稳定的向量
            const seed = this.hashString(text + index.toString());
            const random = this.seededRandom(seed);
            return Array(dimension).fill(0).map(() => random() * 2 - 1);
        });
    }
    /**
     * 简单的字符串哈希函数
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return Math.abs(hash);
    }
    /**
     * 基于种子的伪随机数生成器
     */
    seededRandom(seed) {
        let current = seed;
        return () => {
            current = (current * 9301 + 49297) % 233280;
            return current / 233280;
        };
    }
    /**
     * 测试 Embedding 服务连接
     */
    async testConnection() {
        try {
            const testText = ["测试连接"];
            await this.getRealEmbeddings(testText);
            return true;
        }
        catch (error) {
            console.error('Embedding 服务连接测试失败:', error);
            return false;
        }
    }
    /**
     * 获取配置信息
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * 更新配置
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    /**
     * 获取当前 embedding 维度
     */
    getDimension() {
        return this.cachedDimension || 128;
    }
    /**
     * 获取服务提供商名称
     */
    getProvider() {
        return `Qwen3-Embedding (${this.config.apiUrl})`;
    }
}
exports.EmbeddingService = EmbeddingService;
//# sourceMappingURL=EmbeddingService.js.map