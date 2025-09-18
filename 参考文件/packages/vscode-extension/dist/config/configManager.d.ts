import * as vscode from 'vscode';
import { OpenAIEmbeddingConfig, VoyageAIEmbeddingConfig, OllamaEmbeddingConfig, GeminiEmbeddingConfig, MilvusConfig, SplitterConfig } from '@zilliz/claude-context-core';
export interface MilvusWebConfig {
    address: string;
    token?: string;
}
export type EmbeddingProviderConfig = {
    provider: 'OpenAI';
    config: OpenAIEmbeddingConfig;
} | {
    provider: 'VoyageAI';
    config: VoyageAIEmbeddingConfig;
} | {
    provider: 'Ollama';
    config: OllamaEmbeddingConfig;
} | {
    provider: 'Gemini';
    config: GeminiEmbeddingConfig;
};
export type SplitterProviderConfig = {
    provider: 'AST';
    config: {
        chunkSize?: number;
        chunkOverlap?: number;
    };
} | {
    provider: 'LangChain';
    config: {
        chunkSize?: number;
        chunkOverlap?: number;
    };
};
export interface PluginConfig {
    embeddingProvider?: EmbeddingProviderConfig;
    splitterProvider?: SplitterProviderConfig;
    milvusConfig?: MilvusWebConfig;
    splitterConfig?: SplitterConfig;
}
type FieldDefinition = {
    name: string;
    type: string;
    description: string;
    inputType?: 'text' | 'password' | 'url' | 'select' | 'select-with-custom';
    placeholder?: string;
    required?: boolean;
};
export declare class ConfigManager {
    private static readonly CONFIG_KEY;
    private context;
    constructor(context: vscode.ExtensionContext);
    /**
     * Get embedding provider configuration information
     */
    private static getProviderInfo;
    /**
     * Get splitter provider configuration information
     */
    private static getSplitterProviderInfo;
    /**
     * Build configuration object
     */
    private buildConfigObject;
    /**
     * Get embedding provider configuration
     */
    getEmbeddingProviderConfig(): EmbeddingProviderConfig | undefined;
    /**
     * Save embedding provider configuration
     */
    saveEmbeddingProviderConfig(providerConfig: EmbeddingProviderConfig): Promise<void>;
    /**
     * Create embedding instance
     */
    static createEmbeddingInstance(provider: string, config: any): any;
    /**
     * Get supported embedding providers
     */
    static getSupportedProviders(): Record<string, {
        name: string;
        models: Record<string, any>;
        requiredFields: FieldDefinition[];
        optionalFields: FieldDefinition[];
        defaultConfig: any;
    }>;
    /**
     * Get Milvus frontend configuration
     */
    getMilvusConfig(): MilvusWebConfig | undefined;
    /**
     * Save Milvus frontend configuration
     */
    saveMilvusConfig(milvusConfig: MilvusWebConfig): Promise<void>;
    /**
     * Convert frontend configuration to complete MilvusConfig
     */
    getMilvusFullConfig(): MilvusConfig | undefined;
    /**
     * Get splitter configuration
     */
    getSplitterConfig(): SplitterConfig | undefined;
    /**
     * Save splitter configuration
     */
    saveSplitterConfig(splitterConfig: SplitterConfig): Promise<void>;
}
export {};
//# sourceMappingURL=configManager.d.ts.map