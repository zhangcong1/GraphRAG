export interface EmbeddingVector {
    vector: number[];
    dimension: number;
}
/**
 * Abstract base class for embedding implementations
 */
export declare abstract class Embedding {
    protected abstract maxTokens: number;
    /**
     * Preprocess text to ensure it's valid for embedding
     * @param text Input text
     * @returns Processed text
     */
    protected preprocessText(text: string): string;
    /**
     * Detect embedding dimension
     * @param testText Test text for dimension detection
     * @returns Embedding dimension
     */
    abstract detectDimension(testText?: string): Promise<number>;
    /**
     * Preprocess array of texts
     * @param texts Array of input texts
     * @returns Array of processed texts
     */
    protected preprocessTexts(texts: string[]): string[];
    /**
     * Generate text embedding vector
     * @param text Text content
     * @returns Embedding vector
     */
    abstract embed(text: string): Promise<EmbeddingVector>;
    /**
     * Generate text embedding vectors in batch
     * @param texts Text array
     * @returns Embedding vector array
     */
    abstract embedBatch(texts: string[]): Promise<EmbeddingVector[]>;
    /**
     * Get embedding vector dimension
     * @returns Vector dimension
     */
    abstract getDimension(): number;
    /**
     * Get service provider name
     * @returns Provider name
     */
    abstract getProvider(): string;
}
//# sourceMappingURL=base-embedding.d.ts.map