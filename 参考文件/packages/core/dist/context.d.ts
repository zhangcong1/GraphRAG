import { Splitter } from './splitter';
import { Embedding } from './embedding';
import { VectorDatabase } from './vectordb';
import { SemanticSearchResult } from './types';
import { FileSynchronizer } from './sync/synchronizer';
export interface ContextConfig {
    embedding?: Embedding;
    vectorDatabase?: VectorDatabase;
    codeSplitter?: Splitter;
    supportedExtensions?: string[];
    ignorePatterns?: string[];
    customExtensions?: string[];
    customIgnorePatterns?: string[];
}
export declare class Context {
    private embedding;
    private vectorDatabase;
    private codeSplitter;
    private supportedExtensions;
    private ignorePatterns;
    private synchronizers;
    constructor(config?: ContextConfig);
    /**
     * Get embedding instance
     */
    getEmbedding(): Embedding;
    /**
     * Get vector database instance
     */
    getVectorDatabase(): VectorDatabase;
    /**
     * Get code splitter instance
     */
    getCodeSplitter(): Splitter;
    /**
     * Get supported extensions
     */
    getSupportedExtensions(): string[];
    /**
     * Get ignore patterns
     */
    getIgnorePatterns(): string[];
    /**
     * Get synchronizers map
     */
    getSynchronizers(): Map<string, FileSynchronizer>;
    /**
     * Set synchronizer for a collection
     */
    setSynchronizer(collectionName: string, synchronizer: FileSynchronizer): void;
    /**
     * Public wrapper for loadIgnorePatterns private method
     */
    getLoadedIgnorePatterns(codebasePath: string): Promise<void>;
    /**
     * Public wrapper for prepareCollection private method
     */
    getPreparedCollection(codebasePath: string): Promise<void>;
    /**
     * Get isHybrid setting from environment variable with default true
     */
    private getIsHybrid;
    /**
     * Generate collection name based on codebase path and hybrid mode
     */
    getCollectionName(codebasePath: string): string;
    /**
     * Index a codebase for semantic search
     * @param codebasePath Codebase root path
     * @param progressCallback Optional progress callback function
     * @param forceReindex Whether to recreate the collection even if it exists
     * @returns Indexing statistics
     */
    indexCodebase(codebasePath: string, progressCallback?: (progress: {
        phase: string;
        current: number;
        total: number;
        percentage: number;
    }) => void, forceReindex?: boolean): Promise<{
        indexedFiles: number;
        totalChunks: number;
        status: 'completed' | 'limit_reached';
    }>;
    reindexByChange(codebasePath: string, progressCallback?: (progress: {
        phase: string;
        current: number;
        total: number;
        percentage: number;
    }) => void): Promise<{
        added: number;
        removed: number;
        modified: number;
    }>;
    private deleteFileChunks;
    /**
     * Semantic search with unified implementation
     * @param codebasePath Codebase path to search in
     * @param query Search query
     * @param topK Number of results to return
     * @param threshold Similarity threshold
     */
    semanticSearch(codebasePath: string, query: string, topK?: number, threshold?: number, filterExpr?: string): Promise<SemanticSearchResult[]>;
    /**
     * Check if index exists for codebase
     * @param codebasePath Codebase path to check
     * @returns Whether index exists
     */
    hasIndex(codebasePath: string): Promise<boolean>;
    /**
     * Clear index
     * @param codebasePath Codebase path to clear index for
     * @param progressCallback Optional progress callback function
     */
    clearIndex(codebasePath: string, progressCallback?: (progress: {
        phase: string;
        current: number;
        total: number;
        percentage: number;
    }) => void): Promise<void>;
    /**
     * Update ignore patterns (merges with default patterns and existing patterns)
     * @param ignorePatterns Array of ignore patterns to add to defaults
     */
    updateIgnorePatterns(ignorePatterns: string[]): void;
    /**
     * Add custom ignore patterns (from MCP or other sources) without replacing existing ones
     * @param customPatterns Array of custom ignore patterns to add
     */
    addCustomIgnorePatterns(customPatterns: string[]): void;
    /**
     * Reset ignore patterns to defaults only
     */
    resetIgnorePatternsToDefaults(): void;
    /**
     * Update embedding instance
     * @param embedding New embedding instance
     */
    updateEmbedding(embedding: Embedding): void;
    /**
     * Update vector database instance
     * @param vectorDatabase New vector database instance
     */
    updateVectorDatabase(vectorDatabase: VectorDatabase): void;
    /**
     * Update splitter instance
     * @param splitter New splitter instance
     */
    updateSplitter(splitter: Splitter): void;
    /**
     * Prepare vector collection
     */
    private prepareCollection;
    /**
     * Recursively get all code files in the codebase
     */
    private getCodeFiles;
    /**
 * Process a list of files with streaming chunk processing
 * @param filePaths Array of file paths to process
 * @param codebasePath Base path for the codebase
 * @param onFileProcessed Callback called when each file is processed
 * @returns Object with processed file count and total chunk count
 */
    private processFileList;
    /**
 * Process accumulated chunk buffer
 */
    private processChunkBuffer;
    /**
     * Process a batch of chunks
     */
    private processChunkBatch;
    /**
     * Get programming language based on file extension
     */
    private getLanguageFromExtension;
    /**
     * Generate unique ID based on chunk content and location
     * @param relativePath Relative path to the file
     * @param startLine Start line number
     * @param endLine End line number
     * @param content Chunk content
     * @returns Hash-based unique ID
     */
    private generateId;
    /**
     * Read ignore patterns from file (e.g., .gitignore)
     * @param filePath Path to the ignore file
     * @returns Array of ignore patterns
     */
    static getIgnorePatternsFromFile(filePath: string): Promise<string[]>;
    /**
     * Load ignore patterns from various ignore files in the codebase
     * This method preserves any existing custom patterns that were added before
     * @param codebasePath Path to the codebase
     */
    private loadIgnorePatterns;
    /**
     * Find all .xxxignore files in the codebase directory
     * @param codebasePath Path to the codebase
     * @returns Array of ignore file paths
     */
    private findIgnoreFiles;
    /**
     * Load global ignore file from ~/.context/.contextignore
     * @returns Array of ignore patterns
     */
    private loadGlobalIgnoreFile;
    /**
     * Load ignore patterns from a specific ignore file
     * @param filePath Path to the ignore file
     * @param fileName Display name for logging
     * @returns Array of ignore patterns
     */
    private loadIgnoreFile;
    /**
     * Check if a path matches any ignore pattern
     * @param filePath Path to check
     * @param basePath Base path for relative pattern matching
     * @returns True if path should be ignored
     */
    private matchesIgnorePattern;
    /**
     * Simple glob pattern matching
     * @param filePath File path to test
     * @param pattern Glob pattern
     * @returns True if pattern matches
     */
    private isPatternMatch;
    /**
     * Simple glob matching supporting * wildcard
     * @param text Text to test
     * @param pattern Pattern with * wildcards
     * @returns True if pattern matches
     */
    private simpleGlobMatch;
    /**
     * Get custom extensions from environment variables
     * Supports CUSTOM_EXTENSIONS as comma-separated list
     * @returns Array of custom extensions
     */
    private getCustomExtensionsFromEnv;
    /**
     * Get custom ignore patterns from environment variables
     * Supports CUSTOM_IGNORE_PATTERNS as comma-separated list
     * @returns Array of custom ignore patterns
     */
    private getCustomIgnorePatternsFromEnv;
    /**
     * Add custom extensions (from MCP or other sources) without replacing existing ones
     * @param customExtensions Array of custom extensions to add
     */
    addCustomExtensions(customExtensions: string[]): void;
    /**
     * Get current splitter information
     */
    getSplitterInfo(): {
        type: string;
        hasBuiltinFallback: boolean;
        supportedLanguages?: string[];
    };
    /**
     * Check if current splitter supports a specific language
     * @param language Programming language
     */
    isLanguageSupported(language: string): boolean;
    /**
     * Get which strategy would be used for a specific language
     * @param language Programming language
     */
    getSplitterStrategyForLanguage(language: string): {
        strategy: 'ast' | 'langchain';
        reason: string;
    };
}
//# sourceMappingURL=context.d.ts.map