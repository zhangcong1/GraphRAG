import { GoogleGenAI } from '@google/genai';
import { Embedding, EmbeddingVector } from './base-embedding';
export interface GeminiEmbeddingConfig {
    model: string;
    apiKey: string;
    baseURL?: string;
    outputDimensionality?: number;
}
export declare class GeminiEmbedding extends Embedding {
    private client;
    private config;
    private dimension;
    protected maxTokens: number;
    constructor(config: GeminiEmbeddingConfig);
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
     * Set output dimensionality
     * @param dimension Output dimension (must be supported by the model)
     */
    setOutputDimensionality(dimension: number): void;
    /**
     * Get client instance (for advanced usage)
     */
    getClient(): GoogleGenAI;
    /**
     * Get list of supported models
     */
    static getSupportedModels(): Record<string, {
        dimension: number;
        contextLength: number;
        description: string;
        supportedDimensions?: number[];
    }>;
    /**
     * Get supported dimensions for the current model
     */
    getSupportedDimensions(): number[];
    /**
     * Validate if a dimension is supported by the current model
     */
    isDimensionSupported(dimension: number): boolean;
}
//# sourceMappingURL=gemini-embedding.d.ts.map