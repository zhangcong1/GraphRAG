import { Ollama } from 'ollama';
import { Embedding, EmbeddingVector } from './base-embedding';
export interface OllamaEmbeddingConfig {
    model: string;
    host?: string;
    fetch?: any;
    keepAlive?: string | number;
    options?: Record<string, any>;
    dimension?: number;
    maxTokens?: number;
}
export declare class OllamaEmbedding extends Embedding {
    private client;
    private config;
    private dimension;
    private dimensionDetected;
    protected maxTokens: number;
    constructor(config: OllamaEmbeddingConfig);
    private setDefaultMaxTokensForModel;
    embed(text: string): Promise<EmbeddingVector>;
    embedBatch(texts: string[]): Promise<EmbeddingVector[]>;
    getDimension(): number;
    getProvider(): string;
    /**
     * Set model type and detect its dimension
     * @param model Model name
     */
    setModel(model: string): Promise<void>;
    /**
     * Set host URL
     * @param host Ollama host URL
     */
    setHost(host: string): void;
    /**
     * Set keep alive duration
     * @param keepAlive Keep alive duration
     */
    setKeepAlive(keepAlive: string | number): void;
    /**
     * Set additional options
     * @param options Additional options for the model
     */
    setOptions(options: Record<string, any>): void;
    /**
     * Set max tokens manually
     * @param maxTokens Maximum number of tokens
     */
    setMaxTokens(maxTokens: number): void;
    /**
     * Get client instance (for advanced usage)
     */
    getClient(): Ollama;
    detectDimension(testText?: string): Promise<number>;
}
//# sourceMappingURL=ollama-embedding.d.ts.map