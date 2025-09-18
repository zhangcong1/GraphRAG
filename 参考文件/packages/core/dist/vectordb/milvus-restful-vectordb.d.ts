/**
 * Milvus RESTful Vector Database Implementation
 *
 * This RESTful implementation of Milvus vector database is specifically designed for
 * environments with strict dependency constraints, e.g. VSCode Extensions, Chrome Extensions, etc.
 *
 * The standard Milvus gRPC implementation requires some dependencies and modules
 * that are not available or restricted in these constrained environments. This RESTful
 * implementation uses only HTTP requests, making it compatible with them.
 */
import { VectorDocument, SearchOptions, VectorSearchResult, VectorDatabase, HybridSearchRequest, HybridSearchOptions, HybridSearchResult } from './types';
export interface MilvusRestfulConfig {
    address?: string;
    token?: string;
    username?: string;
    password?: string;
    database?: string;
}
/**
 * Milvus Vector Database implementation using REST API
 * This implementation is designed for environments where gRPC is not available,
 * such as VSCode extensions or browser environments.
 */
export declare class MilvusRestfulVectorDatabase implements VectorDatabase {
    protected config: MilvusRestfulConfig;
    private baseUrl;
    protected initializationPromise: Promise<void>;
    constructor(config: MilvusRestfulConfig);
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
     * Make HTTP request to Milvus REST API
     */
    private makeRequest;
    createCollection(collectionName: string, dimension: number, description?: string): Promise<void>;
    /**
     * Create index for vector field using the Index Create API
     */
    private createIndex;
    /**
     * Load collection to memory for searching
     */
    private loadCollection;
    dropCollection(collectionName: string): Promise<void>;
    hasCollection(collectionName: string): Promise<boolean>;
    listCollections(): Promise<string[]>;
    insert(collectionName: string, documents: VectorDocument[]): Promise<void>;
    search(collectionName: string, queryVector: number[], options?: SearchOptions): Promise<VectorSearchResult[]>;
    delete(collectionName: string, ids: string[]): Promise<void>;
    query(collectionName: string, filter: string, outputFields: string[], limit?: number): Promise<Record<string, any>[]>;
    createHybridCollection(collectionName: string, dimension: number, description?: string): Promise<void>;
    private createHybridIndexes;
    insertHybrid(collectionName: string, documents: VectorDocument[]): Promise<void>;
    hybridSearch(collectionName: string, searchRequests: HybridSearchRequest[], options?: HybridSearchOptions): Promise<HybridSearchResult[]>;
    /**
     * Check collection limit
     * Returns true if collection can be created, false if limit exceeded
     * TODO: Implement proper collection limit checking for REST API
     */
    checkCollectionLimit(): Promise<boolean>;
}
//# sourceMappingURL=milvus-restful-vectordb.d.ts.map