import { VoyageAIClient } from 'voyageai';
import { Embedding, EmbeddingVector } from './base-embedding';
export interface VoyageAIEmbeddingConfig {
    model: string;
    apiKey: string;
}
export declare class VoyageAIEmbedding extends Embedding {
    private client;
    private config;
    private dimension;
    private inputType;
    protected maxTokens: number;
    constructor(config: VoyageAIEmbeddingConfig);
    private updateModelSettings;
    private updateDimensionForModel;
    detectDimension(): Promise<number>;
    embed(text: string): Promise<EmbeddingVector>;
    embedBatch(texts: string[]): Promise<EmbeddingVector[]>;
    getDimension(): number;
    getProvider(): string;
    /**
     * Set model type
     * @param model Model name
     */
    setModel(model: string): void;
    /**
     * Set input type (VoyageAI specific feature)
     * @param inputType Input type: 'document' | 'query'
     */
    setInputType(inputType: 'document' | 'query'): void;
    /**
     * Get client instance (for advanced usage)
     */
    getClient(): VoyageAIClient;
    /**
     * Get list of supported models
     */
    static getSupportedModels(): Record<string, {
        dimension: number | string;
        contextLength: number;
        description: string;
    }>;
}
//# sourceMappingURL=voyageai-embedding.d.ts.map