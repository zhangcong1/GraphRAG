import { VectorDocument, SearchOptions, VectorSearchResult, VectorDatabase, HybridSearchRequest, HybridSearchOptions, HybridSearchResult } from './types';
export interface MilvusConfig {
    address?: string;
    token?: string;
    username?: string;
    password?: string;
    ssl?: boolean;
}
export declare class MilvusVectorDatabase implements VectorDatabase {
    protected config: MilvusConfig;
    private client;
    protected initializationPromise: Promise<void>;
    constructor(config: MilvusConfig);
    private initialize;
    private initializeClient;
    /**
     * Resolve address from config or token
     * Common logic for both gRPC and REST implementations
     */
    protected resolveAddress(): Promise<string>;
    /**
     * Ensure initialization is complete before method execution
     */
    protected ensureInitialized(): Promise<void>;
    /**
     * Ensure collection is loaded before search/query operations
     */
    protected ensureLoaded(collectionName: string): Promise<void>;
    /**
     * Wait for an index to be ready before proceeding
     * Polls index build progress with exponential backoff up to 60 seconds
     */
    protected waitForIndexReady(collectionName: string, fieldName: string, maxWaitTime?: number, // 60 seconds
    initialInterval?: number, // 500ms
    maxInterval?: number, // 5 seconds
    backoffMultiplier?: number): Promise<void>;
    /**
     * Load collection with retry logic and exponential backoff
     * Retries up to 5 times with exponential backoff
     */
    protected loadCollectionWithRetry(collectionName: string, maxRetries?: number, initialInterval?: number, // 1 second
    backoffMultiplier?: number): Promise<void>;
    createCollection(collectionName: string, dimension: number, description?: string): Promise<void>;
    dropCollection(collectionName: string): Promise<void>;
    hasCollection(collectionName: string): Promise<boolean>;
    listCollections(): Promise<string[]>;
    insert(collectionName: string, documents: VectorDocument[]): Promise<void>;
    search(collectionName: string, queryVector: number[], options?: SearchOptions): Promise<VectorSearchResult[]>;
    delete(collectionName: string, ids: string[]): Promise<void>;
    query(collectionName: string, filter: string, outputFields: string[], limit?: number): Promise<Record<string, any>[]>;
    createHybridCollection(collectionName: string, dimension: number, description?: string): Promise<void>;
    insertHybrid(collectionName: string, documents: VectorDocument[]): Promise<void>;
    hybridSearch(collectionName: string, searchRequests: HybridSearchRequest[], options?: HybridSearchOptions): Promise<HybridSearchResult[]>;
    /**
     * Wrapper method to handle collection creation with limit detection for gRPC client
     * Returns true if collection can be created, false if limit exceeded
     */
    checkCollectionLimit(): Promise<boolean>;
}
//# sourceMappingURL=milvus-vectordb.d.ts.map