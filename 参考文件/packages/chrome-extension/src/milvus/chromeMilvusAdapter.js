"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChromeMilvusAdapter = void 0;
// Import core types and implementation
const milvusConfig_1 = require("../config/milvusConfig");
const milvus_vectordb_stub_1 = require("../stubs/milvus-vectordb-stub");
/**
 * Chrome Extension adapter for Milvus RESTful Vector Database
 * This class wraps the core MilvusRestfulVectorDatabase to provide
 * Chrome extension specific functionality
 */
class ChromeMilvusAdapter {
    milvusDb = null;
    collectionName;
    constructor(collectionName = 'chrome_code_chunks') {
        this.collectionName = collectionName;
    }
    /**
     * Initialize connection to Milvus
     */
    async initialize() {
        const config = await milvusConfig_1.MilvusConfigManager.getMilvusConfig();
        if (!config || !milvusConfig_1.MilvusConfigManager.validateMilvusConfig(config)) {
            throw new Error('Invalid or missing Milvus configuration');
        }
        // Convert our config to core format
        const coreConfig = {
            address: config.address,
            token: config.token,
            username: config.username,
            password: config.password,
            database: config.database
        };
        this.milvusDb = new milvus_vectordb_stub_1.MilvusRestfulVectorDatabase(coreConfig);
        console.log('🔌 Chrome Milvus adapter initialized');
    }
    /**
     * Create collection for the repository
     */
    async createCollection(dimension = 1536) {
        if (!this.milvusDb) {
            throw new Error('Milvus not initialized');
        }
        try {
            await this.milvusDb.createCollection(this.collectionName, dimension, 'Chrome extension code chunks');
            console.log(`✅ Collection '${this.collectionName}' created successfully`);
        }
        catch (error) {
            console.error('❌ Failed to create collection:', error);
            throw error;
        }
    }
    /**
     * Check if collection exists
     */
    async collectionExists() {
        if (!this.milvusDb) {
            return false;
        }
        try {
            return await this.milvusDb.hasCollection(this.collectionName);
        }
        catch (error) {
            console.error('Error checking collection existence:', error);
            return false;
        }
    }
    /**
     * Insert code chunks into Milvus
     */
    async insertChunks(chunks) {
        if (!this.milvusDb) {
            throw new Error('Milvus not initialized');
        }
        if (chunks.length === 0) {
            return;
        }
        // Convert to vector documents format
        const documents = chunks.map(chunk => ({
            id: chunk.id,
            vector: chunk.vector || [],
            content: chunk.content,
            relativePath: chunk.relativePath,
            startLine: chunk.startLine,
            endLine: chunk.endLine,
            fileExtension: chunk.fileExtension,
            metadata: JSON.parse(chunk.metadata || '{}') // Parse metadata string to object
        }));
        try {
            await this.milvusDb.insert(this.collectionName, documents);
            console.log(`✅ Inserted ${documents.length} chunks into Milvus`);
        }
        catch (error) {
            console.error('❌ Failed to insert chunks:', error);
            throw error;
        }
    }
    /**
     * Search for similar code chunks
     */
    async searchSimilar(queryVector, limit = 10, threshold = 0.3) {
        if (!this.milvusDb) {
            throw new Error('Milvus not initialized');
        }
        try {
            const searchOptions = {
                topK: limit,
                threshold
            };
            const results = await this.milvusDb.search(this.collectionName, queryVector, searchOptions);
            // Convert results to our format and ensure they're sorted by score (descending)
            const searchResults = results.map(result => ({
                id: result.document.id,
                content: result.document.content,
                relativePath: result.document.relativePath,
                startLine: result.document.startLine,
                endLine: result.document.endLine,
                fileExtension: result.document.fileExtension,
                metadata: JSON.stringify(result.document.metadata), // Convert back to string
                score: result.score
            }));
            // Additional sorting to ensure results are in descending order by score
            searchResults.sort((a, b) => b.score - a.score);
            console.log(`🔍 Found ${searchResults.length} results with cosine similarity scores:`, searchResults.slice(0, 5).map(r => ({
                path: r.relativePath.split('/').pop(),
                score: r.score.toFixed(4),
                lines: `${r.startLine}-${r.endLine}`
            })));
            return searchResults;
        }
        catch (error) {
            console.error('❌ Search failed:', error);
            throw error;
        }
    }
    /**
     * Clear all data in the collection
     */
    async clearCollection() {
        if (!this.milvusDb) {
            throw new Error('Milvus not initialized');
        }
        try {
            await this.milvusDb.dropCollection(this.collectionName);
            console.log(`✅ Collection '${this.collectionName}' cleared successfully`);
        }
        catch (error) {
            console.error('❌ Failed to clear collection:', error);
            throw error;
        }
    }
    /**
     * Get collection statistics
     */
    async getCollectionStats() {
        if (!this.milvusDb) {
            return null;
        }
        try {
            const stats = await this.milvusDb.getCollectionStats(this.collectionName);
            return {
                totalEntities: stats.entityCount || 0
            };
        }
        catch (error) {
            console.error('❌ Failed to get collection stats:', error);
            return null;
        }
    }
    /**
     * Test connection to Milvus
     */
    async testConnection() {
        try {
            // Get configuration
            const config = await milvusConfig_1.MilvusConfigManager.getMilvusConfig();
            if (!config) {
                console.error('No Milvus configuration found');
                throw new Error('No Milvus configuration found');
            }
            if (!milvusConfig_1.MilvusConfigManager.validateMilvusConfig(config)) {
                console.error('Invalid Milvus configuration');
                throw new Error('Invalid Milvus configuration');
            }
            console.log('Testing connection with config:', {
                address: config.address,
                database: config.database,
                hasToken: !!config.token,
                hasUsername: !!config.username
            });
            // Try to create a temporary MilvusRestfulVectorDatabase instance
            const coreConfig = {
                address: config.address,
                token: config.token,
                username: config.username,
                password: config.password,
                database: config.database
            };
            const testDb = new milvus_vectordb_stub_1.MilvusRestfulVectorDatabase(coreConfig);
            // Try to make a simple request to test connectivity
            // We'll try to check if a collection exists as a basic connectivity test
            try {
                await testDb.hasCollection('_test_connection_');
                console.log('Milvus connection test successful');
                return true;
            }
            catch (error) {
                console.error('Milvus connection test failed:', error);
                throw error;
            }
        }
        catch (error) {
            console.error('Connection test failed:', error);
            throw error;
        }
    }
}
exports.ChromeMilvusAdapter = ChromeMilvusAdapter;
//# sourceMappingURL=chromeMilvusAdapter.js.map