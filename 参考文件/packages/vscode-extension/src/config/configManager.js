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
exports.ConfigManager = void 0;
const vscode = __importStar(require("vscode"));
const claude_context_core_1 = require("@zilliz/claude-context-core");
// Unified provider configuration
const EMBEDDING_PROVIDERS = {
    'OpenAI': {
        name: 'OpenAI',
        class: claude_context_core_1.OpenAIEmbedding,
        requiredFields: [
            { name: 'model', type: 'string', description: 'Model name to use', inputType: 'select-with-custom', required: true },
            { name: 'apiKey', type: 'string', description: 'OpenAI API key', inputType: 'password', required: true }
        ],
        optionalFields: [
            { name: 'baseURL', type: 'string', description: 'Custom API endpoint URL (optional)', inputType: 'url', placeholder: 'https://api.openai.com/v1' }
        ],
        defaultConfig: {
            model: 'text-embedding-3-small'
        }
    },
    'VoyageAI': {
        name: 'VoyageAI',
        class: claude_context_core_1.VoyageAIEmbedding,
        requiredFields: [
            { name: 'model', type: 'string', description: 'Model name to use', inputType: 'select-with-custom', required: true },
            { name: 'apiKey', type: 'string', description: 'VoyageAI API key', inputType: 'password', required: true }
        ],
        optionalFields: [],
        defaultConfig: {
            model: 'voyage-code-3'
        }
    },
    'Ollama': {
        name: 'Ollama',
        class: claude_context_core_1.OllamaEmbedding,
        requiredFields: [
            { name: 'model', type: 'string', description: 'Model name (e.g., nomic-embed-text, mxbai-embed-large)', inputType: 'text', required: true, placeholder: 'nomic-embed-text' }
        ],
        optionalFields: [
            { name: 'host', type: 'string', description: 'Ollama server host URL', inputType: 'url', placeholder: 'http://127.0.0.1:11434' },
            { name: 'keepAlive', type: 'string', description: 'Keep model alive duration', inputType: 'text', placeholder: '5m' }
        ],
        defaultConfig: {
            model: 'nomic-embed-text',
            host: 'http://127.0.0.1:11434',
            keepAlive: '5m'
        }
    },
    'Gemini': {
        name: 'Gemini',
        class: claude_context_core_1.GeminiEmbedding,
        requiredFields: [
            { name: 'model', type: 'string', description: 'Model name to use', inputType: 'select-with-custom', required: true },
            { name: 'apiKey', type: 'string', description: 'Google AI API key', inputType: 'password', required: true }
        ],
        optionalFields: [
            { name: 'baseURL', type: 'string', description: 'Custom API endpoint URL (optional)', inputType: 'url', placeholder: 'https://generativelanguage.googleapis.com/v1beta' },
            { name: 'outputDimensionality', type: 'number', description: 'Output dimension (supports Matryoshka representation)', inputType: 'text', placeholder: '3072' }
        ],
        defaultConfig: {
            model: 'gemini-embedding-001'
        }
    }
};
// Unified splitter provider configuration
const SPLITTER_PROVIDERS = {
    'AST': {
        name: 'AST Splitter',
        class: claude_context_core_1.AstCodeSplitter,
        requiredFields: [],
        optionalFields: [
            { name: 'chunkSize', type: 'number', description: 'Maximum chunk size in characters', inputType: 'text', placeholder: '1000' },
            { name: 'chunkOverlap', type: 'number', description: 'Overlap between chunks in characters', inputType: 'text', placeholder: '200' }
        ],
        defaultConfig: {
            chunkSize: 2500,
            chunkOverlap: 300
        }
    },
    'LangChain': {
        name: 'LangChain Splitter',
        class: claude_context_core_1.LangChainCodeSplitter,
        requiredFields: [],
        optionalFields: [
            { name: 'chunkSize', type: 'number', description: 'Maximum chunk size in characters', inputType: 'text', placeholder: '1000' },
            { name: 'chunkOverlap', type: 'number', description: 'Overlap between chunks in characters', inputType: 'text', placeholder: '200' }
        ],
        defaultConfig: {
            chunkSize: 1000,
            chunkOverlap: 200
        }
    }
};
class ConfigManager {
    static CONFIG_KEY = 'semanticCodeSearch';
    context;
    constructor(context) {
        this.context = context;
    }
    /**
     * Get embedding provider configuration information
     */
    static getProviderInfo(provider) {
        if (!(provider in EMBEDDING_PROVIDERS)) {
            return null;
        }
        return EMBEDDING_PROVIDERS[provider];
    }
    /**
     * Get splitter provider configuration information
     */
    static getSplitterProviderInfo(provider) {
        if (!(provider in SPLITTER_PROVIDERS)) {
            return null;
        }
        return SPLITTER_PROVIDERS[provider];
    }
    /**
     * Build configuration object
     */
    buildConfigObject(provider, vscodeConfig) {
        const providerInfo = ConfigManager.getProviderInfo(provider);
        if (!providerInfo)
            return null;
        const configObject = { ...providerInfo.defaultConfig };
        const allFields = [...providerInfo.requiredFields, ...providerInfo.optionalFields];
        // Read values for all fields
        for (const field of allFields) {
            const value = vscodeConfig.get(`embeddingProvider.${field.name}`);
            if (value !== undefined) {
                configObject[field.name] = value;
            }
        }
        // Validate required fields
        for (const field of providerInfo.requiredFields) {
            if (!configObject[field.name]) {
                return null;
            }
        }
        return configObject;
    }
    /**
     * Get embedding provider configuration
     */
    getEmbeddingProviderConfig() {
        const config = vscode.workspace.getConfiguration(ConfigManager.CONFIG_KEY);
        const provider = config.get('embeddingProvider.provider');
        if (!provider)
            return undefined;
        const configObject = this.buildConfigObject(provider, config);
        if (!configObject)
            return undefined;
        return {
            provider: provider,
            config: configObject
        };
    }
    /**
     * Save embedding provider configuration
     */
    async saveEmbeddingProviderConfig(providerConfig) {
        // Defensive checks
        if (!providerConfig) {
            throw new Error('Provider config is undefined');
        }
        if (!providerConfig.config) {
            throw new Error('Provider config.config is undefined');
        }
        const workspaceConfig = vscode.workspace.getConfiguration(ConfigManager.CONFIG_KEY);
        const { provider, config } = providerConfig;
        const providerInfo = ConfigManager.getProviderInfo(provider);
        if (!providerInfo) {
            throw new Error(`Unknown provider: ${provider}`);
        }
        // Save provider type
        await workspaceConfig.update('embeddingProvider.provider', provider, vscode.ConfigurationTarget.Global);
        // Save all fields
        const allFields = [...providerInfo.requiredFields, ...providerInfo.optionalFields];
        for (const field of allFields) {
            const value = config[field.name];
            // For empty strings, save undefined to avoid validation errors
            const saveValue = (value === '' || value === null) ? undefined : value;
            await workspaceConfig.update(`embeddingProvider.${field.name}`, saveValue, vscode.ConfigurationTarget.Global);
        }
    }
    /**
     * Create embedding instance
     */
    static createEmbeddingInstance(provider, config) {
        const providerInfo = ConfigManager.getProviderInfo(provider);
        if (!providerInfo) {
            throw new Error(`Unknown provider: ${provider}`);
        }
        return new providerInfo.class(config);
    }
    /**
     * Get supported embedding providers
     */
    static getSupportedProviders() {
        const result = {};
        for (const [providerKey, providerInfo] of Object.entries(EMBEDDING_PROVIDERS)) {
            // Ollama doesn't have getSupportedModels since users input model names manually
            const models = providerKey === 'Ollama' ? {} : providerInfo.class.getSupportedModels();
            result[providerKey] = {
                name: providerInfo.name,
                models: models,
                requiredFields: [...providerInfo.requiredFields],
                optionalFields: [...providerInfo.optionalFields],
                defaultConfig: providerInfo.defaultConfig
            };
        }
        return result;
    }
    /**
     * Get Milvus frontend configuration
     */
    getMilvusConfig() {
        const config = vscode.workspace.getConfiguration(ConfigManager.CONFIG_KEY);
        const address = config.get('milvus.address');
        const token = config.get('milvus.token');
        if (!address)
            return undefined;
        return {
            address,
            token
        };
    }
    /**
     * Save Milvus frontend configuration
     */
    async saveMilvusConfig(milvusConfig) {
        if (!milvusConfig) {
            throw new Error('Milvus config is undefined');
        }
        if (!milvusConfig.address) {
            throw new Error('Milvus address is required');
        }
        const workspaceConfig = vscode.workspace.getConfiguration(ConfigManager.CONFIG_KEY);
        await workspaceConfig.update('milvus.address', milvusConfig.address, vscode.ConfigurationTarget.Global);
        await workspaceConfig.update('milvus.token', milvusConfig.token ?? undefined, vscode.ConfigurationTarget.Global);
    }
    /**
     * Convert frontend configuration to complete MilvusConfig
     */
    getMilvusFullConfig() {
        const webConfig = this.getMilvusConfig();
        if (!webConfig)
            return undefined;
        // Convert simplified frontend config to complete config with reasonable defaults
        return {
            address: webConfig.address,
            token: webConfig.token,
            // Set default values
            ssl: webConfig.address.startsWith('https://'), // Enable SSL if https address
            // username and password are usually handled via token, so not set
        };
    }
    /**
     * Get splitter configuration
     */
    getSplitterConfig() {
        const config = vscode.workspace.getConfiguration(ConfigManager.CONFIG_KEY);
        const type = config.get('splitter.type');
        const chunkSize = config.get('splitter.chunkSize');
        const chunkOverlap = config.get('splitter.chunkOverlap');
        // Return default config if no type is set
        if (!type) {
            return {
                type: claude_context_core_1.SplitterType.AST,
                chunkSize: 1000,
                chunkOverlap: 200
            };
        }
        return {
            type: type,
            chunkSize: chunkSize || 1000,
            chunkOverlap: chunkOverlap || 200
        };
    }
    /**
     * Save splitter configuration
     */
    async saveSplitterConfig(splitterConfig) {
        if (!splitterConfig) {
            throw new Error('Splitter config is undefined');
        }
        const workspaceConfig = vscode.workspace.getConfiguration(ConfigManager.CONFIG_KEY);
        await workspaceConfig.update('splitter.type', splitterConfig.type || claude_context_core_1.SplitterType.AST, vscode.ConfigurationTarget.Global);
        await workspaceConfig.update('splitter.chunkSize', splitterConfig.chunkSize || 1000, vscode.ConfigurationTarget.Global);
        await workspaceConfig.update('splitter.chunkOverlap', splitterConfig.chunkOverlap || 200, vscode.ConfigurationTarget.Global);
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=configManager.js.map