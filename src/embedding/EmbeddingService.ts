import * as vscode from 'vscode';

/**
 * Embedding 模型响应接口
 */
export interface EmbeddingResponse {
    data: Array<{
        index: number;
        embedding: number[];
    }>;
}

/**
 * Embedding 模型配置接口
 */
export interface EmbeddingConfig {
    apiUrl: string;
    model: string;
    apiKey?: string;
    timeout?: number;
    maxTokens?: number;
}

/**
 * Embedding 服务类
 */
export class EmbeddingService {
    private config: EmbeddingConfig;

    constructor(config?: Partial<EmbeddingConfig>) {
        // 默认配置
        this.config = {
            apiUrl: 'http://10.30.235.27:46600',
            model: 'Qwen3-Embedding-8B',
            timeout: 30000,
            maxTokens: 8192,
            ...config
        };
    }

    /**
     * 获取文本的嵌入向量
     * @param texts 文本数组
     * @param useSimulation 是否使用模拟数据（用于测试）
     */
    async getEmbeddings(texts: string[], useSimulation = false): Promise<number[][]> {
        if (texts.length === 0) {
            return [];
        }

        console.log(`🔄 正在获取 ${texts.length} 个文本的嵌入向量...`);
        
        try {
            if (useSimulation) {
                return this.getSimulatedEmbeddings(texts);
            }

            return await this.getRealEmbeddings(texts);
        } catch (error) {
            console.error('❌ 获取嵌入向量失败:', error);
            
            // 如果真实API调用失败，回退到模拟数据
            console.log('🔄 回退到模拟数据...');
            vscode.window.showWarningMessage(`Embedding API 调用失败，使用模拟数据: ${error}`);
            return this.getSimulatedEmbeddings(texts);
        }
    }

    /**
     * 调用真实的 Embedding API
     */
    private async getRealEmbeddings(texts: string[]): Promise<number[][]> {
        const endpoint = `${this.config.apiUrl}/v1/embeddings`;
        
        console.log(`连接到 Embedding 模型服务: ${endpoint}`);
        
        // 分批处理，避免请求过大
        const batchSize = 10;
        const allEmbeddings: number[][] = [];
        
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
    private async processBatch(texts: string[], endpoint: string): Promise<number[][]> {
        const requestBody = {
            input: texts,
            model: this.config.model
        };

        const headers: Record<string, string> = {
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

            const data = await response.json() as EmbeddingResponse;
            
            if (!data.data || !Array.isArray(data.data)) {
                throw new Error('API响应格式不正确');
            }

            return data.data
                .sort((a, b) => a.index - b.index)  // 确保顺序正确
                .map(item => item.embedding);

        } catch (error) {
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
    private getSimulatedEmbeddings(texts: string[]): number[][] {
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
    private hashString(str: string): number {
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
    private seededRandom(seed: number): () => number {
        let current = seed;
        return () => {
            current = (current * 9301 + 49297) % 233280;
            return current / 233280;
        };
    }

    /**
     * 批量获取嵌入向量，支持进度回调
     */
    async getEmbeddingsWithProgress(
        texts: string[], 
        progressCallback?: (progress: number, total: number) => void,
        useSimulation = false
    ): Promise<number[][]> {
        if (texts.length === 0) {
            return [];
        }

        const batchSize = 10;
        const allEmbeddings: number[][] = [];
        
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            
            if (useSimulation) {
                const batchEmbeddings = this.getSimulatedEmbeddings(batch);
                allEmbeddings.push(...batchEmbeddings);
            } else {
                try {
                    const endpoint = `${this.config.apiUrl}/v1/embeddings`;
                    const batchEmbeddings = await this.processBatch(batch, endpoint);
                    allEmbeddings.push(...batchEmbeddings);
                } catch (error) {
                    console.warn(`批次 ${i}-${i + batchSize} 处理失败，使用模拟数据:`, error);
                    const batchEmbeddings = this.getSimulatedEmbeddings(batch);
                    allEmbeddings.push(...batchEmbeddings);
                }
            }
            
            // 调用进度回调
            const progress = Math.min(i + batchSize, texts.length);
            if (progressCallback) {
                progressCallback(progress, texts.length);
            }
        }
        
        return allEmbeddings;
    }

    /**
     * 测试 Embedding 服务连接
     */
    async testConnection(): Promise<boolean> {
        try {
            const testText = ["测试连接"];
            await this.getRealEmbeddings(testText);
            return true;
        } catch (error) {
            console.error('Embedding 服务连接测试失败:', error);
            return false;
        }
    }

    /**
     * 获取配置信息
     */
    getConfig(): EmbeddingConfig {
        return { ...this.config };
    }

    /**
     * 更新配置
     */
    updateConfig(newConfig: Partial<EmbeddingConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }
}