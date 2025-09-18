import OpenAI from 'openai';
import { Embedding, EmbeddingVector } from './base-embedding';
export interface OpenAIEmbeddingConfig {
    model: string;
    apiKey: string;
    baseURL?: string;
}
export declare class OpenAIEmbedding extends Embedding {
    private client;
    private config;
    private dimension;
    protected maxTokens: number;
    constructor(config: OpenAIEmbeddingConfig);
    detectDimension(testText?: string): Promise<number>;
    embed(text: string): Promise<EmbeddingVector>;
    embedBatch(texts: string[]): Promise<EmbeddingVector[]>;
    getDimension(): number;
    getProvider(): string;
    /**
     * Set model type
     * @param model Model name
     */
    setModel(model: string): Promise<void>;
    /**
     * Get client instance (for advanced usage)
     */
    getClient(): OpenAI;
    /**
     * Get list of supported models
     */
    static getSupportedModels(): Record<string, {
        dimension: number;
        description: string;
    }>;
}
//# sourceMappingURL=openai-embedding.d.ts.map