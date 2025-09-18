"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MilvusConfigManager = void 0;
class MilvusConfigManager {
    /**
     * Get Milvus configuration from Chrome storage
     */
    static async getMilvusConfig() {
        return new Promise((resolve) => {
            chrome.storage.sync.get([
                'milvusAddress',
                'milvusToken',
                'milvusUsername',
                'milvusPassword',
                'milvusDatabase'
            ], (items) => {
                if (chrome.runtime.lastError) {
                    console.error('Error loading Milvus config:', chrome.runtime.lastError);
                    resolve(null);
                    return;
                }
                if (!items.milvusAddress) {
                    resolve(null);
                    return;
                }
                const config = {
                    address: items.milvusAddress,
                    token: items.milvusToken,
                    username: items.milvusUsername,
                    password: items.milvusPassword,
                    database: items.milvusDatabase || 'default'
                };
                resolve(config);
            });
        });
    }
    /**
     * Save Milvus configuration to Chrome storage
     */
    static async saveMilvusConfig(config) {
        return new Promise((resolve, reject) => {
            chrome.storage.sync.set({
                milvusAddress: config.address,
                milvusToken: config.token,
                milvusUsername: config.username,
                milvusPassword: config.password,
                milvusDatabase: config.database || 'default'
            }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                }
                else {
                    resolve();
                }
            });
        });
    }
    /**
     * Get OpenAI configuration
     */
    static async getOpenAIConfig() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['openaiToken'], (items) => {
                if (chrome.runtime.lastError || !items.openaiToken) {
                    resolve(null);
                    return;
                }
                resolve({
                    apiKey: items.openaiToken,
                    model: 'text-embedding-3-small' // Default model
                });
            });
        });
    }
    /**
     * Validate Milvus configuration
     */
    static validateMilvusConfig(config) {
        if (!config.address) {
            return false;
        }
        // For basic validation, just check if address is provided
        // Authentication can be optional for local instances
        return true;
    }
}
exports.MilvusConfigManager = MilvusConfigManager;
//# sourceMappingURL=milvusConfig.js.map