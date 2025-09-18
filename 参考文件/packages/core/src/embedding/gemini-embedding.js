"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiEmbedding = void 0;
const genai_1 = require("@google/genai");
const base_embedding_1 = require("./base-embedding");
class GeminiEmbedding extends base_embedding_1.Embedding {
    client;
    config;
    dimension = 3072; // Default dimension for gemini-embedding-001
    maxTokens = 2048; // Maximum tokens for Gemini embedding models
    constructor(config) {
        super();
        this.config = config;
        this.client = new genai_1.GoogleGenAI({
            apiKey: config.apiKey,
            ...(config.baseURL && {
                httpOptions: {
                    baseUrl: config.baseURL
                }
            }),
        });
        // Set dimension based on model and configuration
        this.updateDimensionForModel(config.model || 'gemini-embedding-001');
        // Override dimension if specified in config
        if (config.outputDimensionality) {
            this.dimension = config.outputDimensionality;
        }
    }
    updateDimensionForModel(model) {
        const supportedModels = GeminiEmbedding.getSupportedModels();
        const modelInfo = supportedModels[model];
        if (modelInfo) {
            this.dimension = modelInfo.dimension;
            this.maxTokens = modelInfo.contextLength;
        }
        else {
            // Use default dimension and context length for unknown models
            this.dimension = 3072;
            this.maxTokens = 2048;
        }
    }
    async detectDimension() {
        // Gemini doesn't need dynamic detection, return configured dimension
        return this.dimension;
    }
    async embed(text) {
        const processedText = this.preprocessText(text);
        const model = this.config.model || 'gemini-embedding-001';
        try {
            const response = await this.client.models.embedContent({
                model: model,
                contents: processedText,
                config: {
                    outputDimensionality: this.config.outputDimensionality || this.dimension,
                },
            });
            if (!response.embeddings || !response.embeddings[0] || !response.embeddings[0].values) {
                throw new Error('Gemini API returned invalid response');
            }
            return {
                vector: response.embeddings[0].values,
                dimension: response.embeddings[0].values.length
            };
        }
        catch (error) {
            throw new Error(`Gemini embedding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async embedBatch(texts) {
        const processedTexts = this.preprocessTexts(texts);
        const model = this.config.model || 'gemini-embedding-001';
        try {
            const response = await this.client.models.embedContent({
                model: model,
                contents: processedTexts,
                config: {
                    outputDimensionality: this.config.outputDimensionality || this.dimension,
                },
            });
            if (!response.embeddings) {
                throw new Error('Gemini API returned invalid response');
            }
            return response.embeddings.map((embedding) => {
                if (!embedding.values) {
                    throw new Error('Gemini API returned invalid embedding data');
                }
                return {
                    vector: embedding.values,
                    dimension: embedding.values.length
                };
            });
        }
        catch (error) {
            throw new Error(`Gemini batch embedding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    getDimension() {
        return this.dimension;
    }
    getProvider() {
        return 'Gemini';
    }
    /**
     * Set model type
     * @param model Model name
     */
    setModel(model) {
        this.config.model = model;
        this.updateDimensionForModel(model);
    }
    /**
     * Set output dimensionality
     * @param dimension Output dimension (must be supported by the model)
     */
    setOutputDimensionality(dimension) {
        this.config.outputDimensionality = dimension;
        this.dimension = dimension;
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
            'gemini-embedding-001': {
                dimension: 3072,
                contextLength: 2048,
                description: 'Latest Gemini embedding model with state-of-the-art performance (recommended)',
                supportedDimensions: [3072, 1536, 768, 256] // Matryoshka Representation Learning support
            }
        };
    }
    /**
     * Get supported dimensions for the current model
     */
    getSupportedDimensions() {
        const modelInfo = GeminiEmbedding.getSupportedModels()[this.config.model || 'gemini-embedding-001'];
        return modelInfo?.supportedDimensions || [this.dimension];
    }
    /**
     * Validate if a dimension is supported by the current model
     */
    isDimensionSupported(dimension) {
        const supportedDimensions = this.getSupportedDimensions();
        return supportedDimensions.includes(dimension);
    }
}
exports.GeminiEmbedding = GeminiEmbedding;
//# sourceMappingURL=gemini-embedding.js.map