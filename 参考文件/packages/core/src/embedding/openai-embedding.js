"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIEmbedding = void 0;
const openai_1 = __importDefault(require("openai"));
const base_embedding_1 = require("./base-embedding");
class OpenAIEmbedding extends base_embedding_1.Embedding {
    client;
    config;
    dimension = 1536; // Default dimension for text-embedding-3-small
    maxTokens = 8192; // Maximum tokens for OpenAI embedding models
    constructor(config) {
        super();
        this.config = config;
        this.client = new openai_1.default({
            apiKey: config.apiKey,
            baseURL: config.baseURL,
        });
    }
    async detectDimension(testText = "test") {
        const model = this.config.model || 'text-embedding-3-small';
        const knownModels = OpenAIEmbedding.getSupportedModels();
        // Use known dimension for standard models
        if (knownModels[model]) {
            return knownModels[model].dimension;
        }
        // For custom models, make API call to detect dimension
        try {
            const processedText = this.preprocessText(testText);
            const response = await this.client.embeddings.create({
                model: model,
                input: processedText,
                encoding_format: 'float',
            });
            return response.data[0].embedding.length;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            // Re-throw authentication errors
            if (errorMessage.includes('API key') || errorMessage.includes('unauthorized') || errorMessage.includes('authentication')) {
                throw new Error(`Failed to detect dimension for model ${model}: ${errorMessage}`);
            }
            // For other errors, throw exception instead of using fallback
            throw new Error(`Failed to detect dimension for model ${model}: ${errorMessage}`);
        }
    }
    async embed(text) {
        const processedText = this.preprocessText(text);
        const model = this.config.model || 'text-embedding-3-small';
        const knownModels = OpenAIEmbedding.getSupportedModels();
        if (knownModels[model] && this.dimension !== knownModels[model].dimension) {
            this.dimension = knownModels[model].dimension;
        }
        else if (!knownModels[model]) {
            this.dimension = await this.detectDimension();
        }
        try {
            const response = await this.client.embeddings.create({
                model: model,
                input: processedText,
                encoding_format: 'float',
            });
            // Update dimension from actual response
            this.dimension = response.data[0].embedding.length;
            return {
                vector: response.data[0].embedding,
                dimension: this.dimension
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to generate OpenAI embedding: ${errorMessage}`);
        }
    }
    async embedBatch(texts) {
        const processedTexts = this.preprocessTexts(texts);
        const model = this.config.model || 'text-embedding-3-small';
        const knownModels = OpenAIEmbedding.getSupportedModels();
        if (knownModels[model] && this.dimension !== knownModels[model].dimension) {
            this.dimension = knownModels[model].dimension;
        }
        else if (!knownModels[model]) {
            this.dimension = await this.detectDimension();
        }
        try {
            const response = await this.client.embeddings.create({
                model: model,
                input: processedTexts,
                encoding_format: 'float',
            });
            this.dimension = response.data[0].embedding.length;
            return response.data.map((item) => ({
                vector: item.embedding,
                dimension: this.dimension
            }));
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to generate OpenAI batch embeddings: ${errorMessage}`);
        }
    }
    getDimension() {
        // For custom models, we need to detect the dimension first
        const model = this.config.model || 'text-embedding-3-small';
        const knownModels = OpenAIEmbedding.getSupportedModels();
        // If it's a known model, return its known dimension
        if (knownModels[model]) {
            return knownModels[model].dimension;
        }
        // For custom models, return the current dimension
        // Note: This may be incorrect until detectDimension() is called
        console.warn(`[OpenAIEmbedding] ⚠️ getDimension() called for custom model '${model}' - returning ${this.dimension}. Call detectDimension() first for accurate dimension.`);
        return this.dimension;
    }
    getProvider() {
        return 'OpenAI';
    }
    /**
     * Set model type
     * @param model Model name
     */
    async setModel(model) {
        this.config.model = model;
        const knownModels = OpenAIEmbedding.getSupportedModels();
        if (knownModels[model]) {
            this.dimension = knownModels[model].dimension;
        }
        else {
            this.dimension = await this.detectDimension();
        }
    }
    /**
     * Get client instance (for advanced usage)
     */
    getClient() {
        return this.client;
    }
    /**
     * Get list of supported models
     */
    static getSupportedModels() {
        return {
            'text-embedding-3-small': {
                dimension: 1536,
                description: 'High performance and cost-effective embedding model (recommended)'
            },
            'text-embedding-3-large': {
                dimension: 3072,
                description: 'Highest performance embedding model with larger dimensions'
            },
            'text-embedding-ada-002': {
                dimension: 1536,
                description: 'Legacy model (use text-embedding-3-small instead)'
            }
        };
    }
}
exports.OpenAIEmbedding = OpenAIEmbedding;
//# sourceMappingURL=openai-embedding.js.map