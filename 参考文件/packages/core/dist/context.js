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
exports.Context = void 0;
const splitter_1 = require("./splitter");
const embedding_1 = require("./embedding");
const env_manager_1 = require("./utils/env-manager");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const synchronizer_1 = require("./sync/synchronizer");
const DEFAULT_SUPPORTED_EXTENSIONS = [
    // Programming languages
    '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cpp', '.c', '.h', '.hpp',
    '.cs', '.go', '.rs', '.php', '.rb', '.swift', '.kt', '.scala', '.m', '.mm',
    // Text and markup files
    '.md', '.markdown', '.ipynb',
    // '.txt',  '.json', '.yaml', '.yml', '.xml', '.html', '.htm',
    // '.css', '.scss', '.less', '.sql', '.sh', '.bash', '.env'
];
const DEFAULT_IGNORE_PATTERNS = [
    // Common build output and dependency directories
    'node_modules/**',
    'dist/**',
    'build/**',
    'out/**',
    'target/**',
    'coverage/**',
    '.nyc_output/**',
    // IDE and editor files
    '.vscode/**',
    '.idea/**',
    '*.swp',
    '*.swo',
    // Version control
    '.git/**',
    '.svn/**',
    '.hg/**',
    // Cache directories
    '.cache/**',
    '__pycache__/**',
    '.pytest_cache/**',
    // Logs and temporary files
    'logs/**',
    'tmp/**',
    'temp/**',
    '*.log',
    // Environment and config files
    '.env',
    '.env.*',
    '*.local',
    // Minified and bundled files
    '*.min.js',
    '*.min.css',
    '*.min.map',
    '*.bundle.js',
    '*.bundle.css',
    '*.chunk.js',
    '*.vendor.js',
    '*.polyfills.js',
    '*.runtime.js',
    '*.map', // source map files
    'node_modules', '.git', '.svn', '.hg', 'build', 'dist', 'out',
    'target', '.vscode', '.idea', '__pycache__', '.pytest_cache',
    'coverage', '.nyc_output', 'logs', 'tmp', 'temp'
];
class Context {
    constructor(config = {}) {
        this.synchronizers = new Map();
        // Initialize services
        this.embedding = config.embedding || new embedding_1.OpenAIEmbedding({
            apiKey: env_manager_1.envManager.get('OPENAI_API_KEY') || 'your-openai-api-key',
            model: 'text-embedding-3-small',
            ...(env_manager_1.envManager.get('OPENAI_BASE_URL') && { baseURL: env_manager_1.envManager.get('OPENAI_BASE_URL') })
        });
        if (!config.vectorDatabase) {
            throw new Error('VectorDatabase is required. Please provide a vectorDatabase instance in the config.');
        }
        this.vectorDatabase = config.vectorDatabase;
        this.codeSplitter = config.codeSplitter || new splitter_1.AstCodeSplitter(2500, 300);
        // Load custom extensions from environment variables
        const envCustomExtensions = this.getCustomExtensionsFromEnv();
        // Combine default extensions with config extensions and env extensions
        const allSupportedExtensions = [
            ...DEFAULT_SUPPORTED_EXTENSIONS,
            ...(config.supportedExtensions || []),
            ...(config.customExtensions || []),
            ...envCustomExtensions
        ];
        // Remove duplicates
        this.supportedExtensions = [...new Set(allSupportedExtensions)];
        // Load custom ignore patterns from environment variables  
        const envCustomIgnorePatterns = this.getCustomIgnorePatternsFromEnv();
        // Start with default ignore patterns
        const allIgnorePatterns = [
            ...DEFAULT_IGNORE_PATTERNS,
            ...(config.ignorePatterns || []),
            ...(config.customIgnorePatterns || []),
            ...envCustomIgnorePatterns
        ];
        // Remove duplicates
        this.ignorePatterns = [...new Set(allIgnorePatterns)];
        console.log(`[Context] 🔧 Initialized with ${this.supportedExtensions.length} supported extensions and ${this.ignorePatterns.length} ignore patterns`);
        if (envCustomExtensions.length > 0) {
            console.log(`[Context] 📎 Loaded ${envCustomExtensions.length} custom extensions from environment: ${envCustomExtensions.join(', ')}`);
        }
        if (envCustomIgnorePatterns.length > 0) {
            console.log(`[Context] 🚫 Loaded ${envCustomIgnorePatterns.length} custom ignore patterns from environment: ${envCustomIgnorePatterns.join(', ')}`);
        }
    }
    /**
     * Get embedding instance
     */
    getEmbedding() {
        return this.embedding;
    }
    /**
     * Get vector database instance
     */
    getVectorDatabase() {
        return this.vectorDatabase;
    }
    /**
     * Get code splitter instance
     */
    getCodeSplitter() {
        return this.codeSplitter;
    }
    /**
     * Get supported extensions
     */
    getSupportedExtensions() {
        return [...this.supportedExtensions];
    }
    /**
     * Get ignore patterns
     */
    getIgnorePatterns() {
        return [...this.ignorePatterns];
    }
    /**
     * Get synchronizers map
     */
    getSynchronizers() {
        return new Map(this.synchronizers);
    }
    /**
     * Set synchronizer for a collection
     */
    setSynchronizer(collectionName, synchronizer) {
        this.synchronizers.set(collectionName, synchronizer);
    }
    /**
     * Public wrapper for loadIgnorePatterns private method
     */
    async getLoadedIgnorePatterns(codebasePath) {
        return this.loadIgnorePatterns(codebasePath);
    }
    /**
     * Public wrapper for prepareCollection private method
     */
    async getPreparedCollection(codebasePath) {
        return this.prepareCollection(codebasePath);
    }
    /**
     * Get isHybrid setting from environment variable with default true
     */
    getIsHybrid() {
        const isHybridEnv = env_manager_1.envManager.get('HYBRID_MODE');
        if (isHybridEnv === undefined || isHybridEnv === null) {
            return true; // Default to true
        }
        return isHybridEnv.toLowerCase() === 'true';
    }
    /**
     * Generate collection name based on codebase path and hybrid mode
     */
    getCollectionName(codebasePath) {
        const isHybrid = this.getIsHybrid();
        const normalizedPath = path.resolve(codebasePath);
        const hash = crypto.createHash('md5').update(normalizedPath).digest('hex');
        const prefix = isHybrid === true ? 'hybrid_code_chunks' : 'code_chunks';
        return `${prefix}_${hash.substring(0, 8)}`;
    }
    /**
     * Index a codebase for semantic search
     * @param codebasePath Codebase root path
     * @param progressCallback Optional progress callback function
     * @param forceReindex Whether to recreate the collection even if it exists
     * @returns Indexing statistics
     */
    async indexCodebase(codebasePath, progressCallback, forceReindex = false) {
        const isHybrid = this.getIsHybrid();
        const searchType = isHybrid === true ? 'hybrid search' : 'semantic search';
        console.log(`[Context] 🚀 Starting to index codebase with ${searchType}: ${codebasePath}`);
        // 1. Load ignore patterns from various ignore files
        await this.loadIgnorePatterns(codebasePath);
        // 2. Check and prepare vector collection
        progressCallback?.({ phase: 'Preparing collection...', current: 0, total: 100, percentage: 0 });
        console.log(`Debug2: Preparing vector collection for codebase${forceReindex ? ' (FORCE REINDEX)' : ''}`);
        await this.prepareCollection(codebasePath, forceReindex);
        // 3. Recursively traverse codebase to get all supported files
        progressCallback?.({ phase: 'Scanning files...', current: 5, total: 100, percentage: 5 });
        const codeFiles = await this.getCodeFiles(codebasePath);
        console.log(`[Context] 📁 Found ${codeFiles.length} code files`);
        if (codeFiles.length === 0) {
            progressCallback?.({ phase: 'No files to index', current: 100, total: 100, percentage: 100 });
            return { indexedFiles: 0, totalChunks: 0, status: 'completed' };
        }
        // 3. Process each file with streaming chunk processing
        // Reserve 10% for preparation, 90% for actual indexing
        const indexingStartPercentage = 10;
        const indexingEndPercentage = 100;
        const indexingRange = indexingEndPercentage - indexingStartPercentage;
        const result = await this.processFileList(codeFiles, codebasePath, (filePath, fileIndex, totalFiles) => {
            // Calculate progress percentage
            const progressPercentage = indexingStartPercentage + (fileIndex / totalFiles) * indexingRange;
            console.log(`[Context] 📊 Processed ${fileIndex}/${totalFiles} files`);
            progressCallback?.({
                phase: `Processing files (${fileIndex}/${totalFiles})...`,
                current: fileIndex,
                total: totalFiles,
                percentage: Math.round(progressPercentage)
            });
        });
        console.log(`[Context] ✅ Codebase indexing completed! Processed ${result.processedFiles} files in total, generated ${result.totalChunks} code chunks`);
        progressCallback?.({
            phase: 'Indexing complete!',
            current: result.processedFiles,
            total: codeFiles.length,
            percentage: 100
        });
        return {
            indexedFiles: result.processedFiles,
            totalChunks: result.totalChunks,
            status: result.status
        };
    }
    async reindexByChange(codebasePath, progressCallback) {
        const collectionName = this.getCollectionName(codebasePath);
        const synchronizer = this.synchronizers.get(collectionName);
        if (!synchronizer) {
            // Load project-specific ignore patterns before creating FileSynchronizer
            await this.loadIgnorePatterns(codebasePath);
            // To be safe, let's initialize if it's not there.
            const newSynchronizer = new synchronizer_1.FileSynchronizer(codebasePath, this.ignorePatterns);
            await newSynchronizer.initialize();
            this.synchronizers.set(collectionName, newSynchronizer);
        }
        const currentSynchronizer = this.synchronizers.get(collectionName);
        progressCallback?.({ phase: 'Checking for file changes...', current: 0, total: 100, percentage: 0 });
        const { added, removed, modified } = await currentSynchronizer.checkForChanges();
        const totalChanges = added.length + removed.length + modified.length;
        if (totalChanges === 0) {
            progressCallback?.({ phase: 'No changes detected', current: 100, total: 100, percentage: 100 });
            console.log('[Context] ✅ No file changes detected.');
            return { added: 0, removed: 0, modified: 0 };
        }
        console.log(`[Context] 🔄 Found changes: ${added.length} added, ${removed.length} removed, ${modified.length} modified.`);
        let processedChanges = 0;
        const updateProgress = (phase) => {
            processedChanges++;
            const percentage = Math.round((processedChanges / (removed.length + modified.length + added.length)) * 100);
            progressCallback?.({ phase, current: processedChanges, total: totalChanges, percentage });
        };
        // Handle removed files
        for (const file of removed) {
            await this.deleteFileChunks(collectionName, file);
            updateProgress(`Removed ${file}`);
        }
        // Handle modified files
        for (const file of modified) {
            await this.deleteFileChunks(collectionName, file);
            updateProgress(`Deleted old chunks for ${file}`);
        }
        // Handle added and modified files
        const filesToIndex = [...added, ...modified].map(f => path.join(codebasePath, f));
        if (filesToIndex.length > 0) {
            await this.processFileList(filesToIndex, codebasePath, (filePath, fileIndex, totalFiles) => {
                updateProgress(`Indexed ${filePath} (${fileIndex}/${totalFiles})`);
            });
        }
        console.log(`[Context] ✅ Re-indexing complete. Added: ${added.length}, Removed: ${removed.length}, Modified: ${modified.length}`);
        progressCallback?.({ phase: 'Re-indexing complete!', current: totalChanges, total: totalChanges, percentage: 100 });
        return { added: added.length, removed: removed.length, modified: modified.length };
    }
    async deleteFileChunks(collectionName, relativePath) {
        // Escape backslashes for Milvus query expression (Windows path compatibility)
        const escapedPath = relativePath.replace(/\\/g, '\\\\');
        const results = await this.vectorDatabase.query(collectionName, `relativePath == "${escapedPath}"`, ['id']);
        if (results.length > 0) {
            const ids = results.map(r => r.id).filter(id => id);
            if (ids.length > 0) {
                await this.vectorDatabase.delete(collectionName, ids);
                console.log(`[Context] Deleted ${ids.length} chunks for file ${relativePath}`);
            }
        }
    }
    /**
     * Semantic search with unified implementation
     * @param codebasePath Codebase path to search in
     * @param query Search query
     * @param topK Number of results to return
     * @param threshold Similarity threshold
     */
    async semanticSearch(codebasePath, query, topK = 5, threshold = 0.5, filterExpr) {
        const isHybrid = this.getIsHybrid();
        const searchType = isHybrid === true ? 'hybrid search' : 'semantic search';
        console.log(`[Context] 🔍 Executing ${searchType}: "${query}" in ${codebasePath}`);
        const collectionName = this.getCollectionName(codebasePath);
        console.log(`[Context] 🔍 Using collection: ${collectionName}`);
        // Check if collection exists and has data
        const hasCollection = await this.vectorDatabase.hasCollection(collectionName);
        if (!hasCollection) {
            console.log(`[Context] ⚠️  Collection '${collectionName}' does not exist. Please index the codebase first.`);
            return [];
        }
        if (isHybrid === true) {
            try {
                // Check collection stats to see if it has data
                const stats = await this.vectorDatabase.query(collectionName, '', ['id'], 1);
                console.log(`[Context] 🔍 Collection '${collectionName}' exists and appears to have data`);
            }
            catch (error) {
                console.log(`[Context] ⚠️  Collection '${collectionName}' exists but may be empty or not properly indexed:`, error);
            }
            // 1. Generate query vector
            console.log(`[Context] 🔍 Generating embeddings for query: "${query}"`);
            const queryEmbedding = await this.embedding.embed(query);
            console.log(`[Context] ✅ Generated embedding vector with dimension: ${queryEmbedding.vector.length}`);
            console.log(`[Context] 🔍 First 5 embedding values: [${queryEmbedding.vector.slice(0, 5).join(', ')}]`);
            // 2. Prepare hybrid search requests
            const searchRequests = [
                {
                    data: queryEmbedding.vector,
                    anns_field: "vector",
                    param: { "nprobe": 10 },
                    limit: topK
                },
                {
                    data: query,
                    anns_field: "sparse_vector",
                    param: { "drop_ratio_search": 0.2 },
                    limit: topK
                }
            ];
            console.log(`[Context] 🔍 Search request 1 (dense): anns_field="${searchRequests[0].anns_field}", vector_dim=${queryEmbedding.vector.length}, limit=${searchRequests[0].limit}`);
            console.log(`[Context] 🔍 Search request 2 (sparse): anns_field="${searchRequests[1].anns_field}", query_text="${query}", limit=${searchRequests[1].limit}`);
            // 3. Execute hybrid search
            console.log(`[Context] 🔍 Executing hybrid search with RRF reranking...`);
            const searchResults = await this.vectorDatabase.hybridSearch(collectionName, searchRequests, {
                rerank: {
                    strategy: 'rrf',
                    params: { k: 100 }
                },
                limit: topK,
                filterExpr
            });
            console.log(`[Context] 🔍 Raw search results count: ${searchResults.length}`);
            // 4. Convert to semantic search result format
            const results = searchResults.map(result => ({
                content: result.document.content,
                relativePath: result.document.relativePath,
                startLine: result.document.startLine,
                endLine: result.document.endLine,
                language: result.document.metadata.language || 'unknown',
                score: result.score
            }));
            console.log(`[Context] ✅ Found ${results.length} relevant hybrid results`);
            if (results.length > 0) {
                console.log(`[Context] 🔍 Top result score: ${results[0].score}, path: ${results[0].relativePath}`);
            }
            return results;
        }
        else {
            // Regular semantic search
            // 1. Generate query vector
            const queryEmbedding = await this.embedding.embed(query);
            // 2. Search in vector database
            const searchResults = await this.vectorDatabase.search(collectionName, queryEmbedding.vector, { topK, threshold, filterExpr });
            // 3. Convert to semantic search result format
            const results = searchResults.map(result => ({
                content: result.document.content,
                relativePath: result.document.relativePath,
                startLine: result.document.startLine,
                endLine: result.document.endLine,
                language: result.document.metadata.language || 'unknown',
                score: result.score
            }));
            console.log(`[Context] ✅ Found ${results.length} relevant results`);
            return results;
        }
    }
    /**
     * Check if index exists for codebase
     * @param codebasePath Codebase path to check
     * @returns Whether index exists
     */
    async hasIndex(codebasePath) {
        const collectionName = this.getCollectionName(codebasePath);
        return await this.vectorDatabase.hasCollection(collectionName);
    }
    /**
     * Clear index
     * @param codebasePath Codebase path to clear index for
     * @param progressCallback Optional progress callback function
     */
    async clearIndex(codebasePath, progressCallback) {
        console.log(`[Context] 🧹 Cleaning index data for ${codebasePath}...`);
        progressCallback?.({ phase: 'Checking existing index...', current: 0, total: 100, percentage: 0 });
        const collectionName = this.getCollectionName(codebasePath);
        const collectionExists = await this.vectorDatabase.hasCollection(collectionName);
        progressCallback?.({ phase: 'Removing index data...', current: 50, total: 100, percentage: 50 });
        if (collectionExists) {
            await this.vectorDatabase.dropCollection(collectionName);
        }
        // Delete snapshot file
        await synchronizer_1.FileSynchronizer.deleteSnapshot(codebasePath);
        progressCallback?.({ phase: 'Index cleared', current: 100, total: 100, percentage: 100 });
        console.log('[Context] ✅ Index data cleaned');
    }
    /**
     * Update ignore patterns (merges with default patterns and existing patterns)
     * @param ignorePatterns Array of ignore patterns to add to defaults
     */
    updateIgnorePatterns(ignorePatterns) {
        // Merge with default patterns and any existing custom patterns, avoiding duplicates
        const mergedPatterns = [...DEFAULT_IGNORE_PATTERNS, ...ignorePatterns];
        const uniquePatterns = [];
        const patternSet = new Set(mergedPatterns);
        patternSet.forEach(pattern => uniquePatterns.push(pattern));
        this.ignorePatterns = uniquePatterns;
        console.log(`[Context] 🚫 Updated ignore patterns: ${ignorePatterns.length} new + ${DEFAULT_IGNORE_PATTERNS.length} default = ${this.ignorePatterns.length} total patterns`);
    }
    /**
     * Add custom ignore patterns (from MCP or other sources) without replacing existing ones
     * @param customPatterns Array of custom ignore patterns to add
     */
    addCustomIgnorePatterns(customPatterns) {
        if (customPatterns.length === 0)
            return;
        // Merge current patterns with new custom patterns, avoiding duplicates
        const mergedPatterns = [...this.ignorePatterns, ...customPatterns];
        const uniquePatterns = [];
        const patternSet = new Set(mergedPatterns);
        patternSet.forEach(pattern => uniquePatterns.push(pattern));
        this.ignorePatterns = uniquePatterns;
        console.log(`[Context] 🚫 Added ${customPatterns.length} custom ignore patterns. Total: ${this.ignorePatterns.length} patterns`);
    }
    /**
     * Reset ignore patterns to defaults only
     */
    resetIgnorePatternsToDefaults() {
        this.ignorePatterns = [...DEFAULT_IGNORE_PATTERNS];
        console.log(`[Context] 🔄 Reset ignore patterns to defaults: ${this.ignorePatterns.length} patterns`);
    }
    /**
     * Update embedding instance
     * @param embedding New embedding instance
     */
    updateEmbedding(embedding) {
        this.embedding = embedding;
        console.log(`[Context] 🔄 Updated embedding provider: ${embedding.getProvider()}`);
    }
    /**
     * Update vector database instance
     * @param vectorDatabase New vector database instance
     */
    updateVectorDatabase(vectorDatabase) {
        this.vectorDatabase = vectorDatabase;
        console.log(`[Context] 🔄 Updated vector database`);
    }
    /**
     * Update splitter instance
     * @param splitter New splitter instance
     */
    updateSplitter(splitter) {
        this.codeSplitter = splitter;
        console.log(`[Context] 🔄 Updated splitter instance`);
    }
    /**
     * Prepare vector collection
     */
    async prepareCollection(codebasePath, forceReindex = false) {
        const isHybrid = this.getIsHybrid();
        const collectionType = isHybrid === true ? 'hybrid vector' : 'vector';
        console.log(`[Context] 🔧 Preparing ${collectionType} collection for codebase: ${codebasePath}${forceReindex ? ' (FORCE REINDEX)' : ''}`);
        const collectionName = this.getCollectionName(codebasePath);
        // Check if collection already exists
        const collectionExists = await this.vectorDatabase.hasCollection(collectionName);
        if (collectionExists && !forceReindex) {
            console.log(`📋 Collection ${collectionName} already exists, skipping creation`);
            return;
        }
        if (collectionExists && forceReindex) {
            console.log(`[Context] 🗑️  Dropping existing collection ${collectionName} for force reindex...`);
            await this.vectorDatabase.dropCollection(collectionName);
            console.log(`[Context] ✅ Collection ${collectionName} dropped successfully`);
        }
        console.log(`[Context] 🔍 Detecting embedding dimension for ${this.embedding.getProvider()} provider...`);
        const dimension = await this.embedding.detectDimension();
        console.log(`[Context] 📏 Detected dimension: ${dimension} for ${this.embedding.getProvider()}`);
        const dirName = path.basename(codebasePath);
        if (isHybrid === true) {
            await this.vectorDatabase.createHybridCollection(collectionName, dimension, `Hybrid Index for ${dirName}`);
        }
        else {
            await this.vectorDatabase.createCollection(collectionName, dimension, `Index for ${dirName}`);
        }
        console.log(`[Context] ✅ Collection ${collectionName} created successfully (dimension: ${dimension})`);
    }
    /**
     * Recursively get all code files in the codebase
     */
    async getCodeFiles(codebasePath) {
        const files = [];
        const traverseDirectory = async (currentPath) => {
            const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(currentPath, entry.name);
                // Check if path matches ignore patterns
                if (this.matchesIgnorePattern(fullPath, codebasePath)) {
                    continue;
                }
                if (entry.isDirectory()) {
                    await traverseDirectory(fullPath);
                }
                else if (entry.isFile()) {
                    const ext = path.extname(entry.name);
                    if (this.supportedExtensions.includes(ext)) {
                        files.push(fullPath);
                    }
                }
            }
        };
        await traverseDirectory(codebasePath);
        return files;
    }
    /**
 * Process a list of files with streaming chunk processing
 * @param filePaths Array of file paths to process
 * @param codebasePath Base path for the codebase
 * @param onFileProcessed Callback called when each file is processed
 * @returns Object with processed file count and total chunk count
 */
    async processFileList(filePaths, codebasePath, onFileProcessed) {
        const isHybrid = this.getIsHybrid();
        const EMBEDDING_BATCH_SIZE = Math.max(1, parseInt(env_manager_1.envManager.get('EMBEDDING_BATCH_SIZE') || '100', 10));
        const CHUNK_LIMIT = 450000;
        console.log(`[Context] 🔧 Using EMBEDDING_BATCH_SIZE: ${EMBEDDING_BATCH_SIZE}`);
        let chunkBuffer = [];
        let processedFiles = 0;
        let totalChunks = 0;
        let limitReached = false;
        for (let i = 0; i < filePaths.length; i++) {
            const filePath = filePaths[i];
            try {
                const content = await fs.promises.readFile(filePath, 'utf-8');
                const language = this.getLanguageFromExtension(path.extname(filePath));
                const chunks = await this.codeSplitter.split(content, language, filePath);
                // Log files with many chunks or large content
                if (chunks.length > 50) {
                    console.warn(`[Context] ⚠️  File ${filePath} generated ${chunks.length} chunks (${Math.round(content.length / 1024)}KB)`);
                }
                else if (content.length > 100000) {
                    console.log(`📄 Large file ${filePath}: ${Math.round(content.length / 1024)}KB -> ${chunks.length} chunks`);
                }
                // Add chunks to buffer
                for (const chunk of chunks) {
                    chunkBuffer.push({ chunk, codebasePath });
                    totalChunks++;
                    // Process batch when buffer reaches EMBEDDING_BATCH_SIZE
                    if (chunkBuffer.length >= EMBEDDING_BATCH_SIZE) {
                        try {
                            await this.processChunkBuffer(chunkBuffer);
                        }
                        catch (error) {
                            const searchType = isHybrid === true ? 'hybrid' : 'regular';
                            console.error(`[Context] ❌ Failed to process chunk batch for ${searchType}:`, error);
                            if (error instanceof Error) {
                                console.error('[Context] Stack trace:', error.stack);
                            }
                        }
                        finally {
                            chunkBuffer = []; // Always clear buffer, even on failure
                        }
                    }
                    // Check if chunk limit is reached
                    if (totalChunks >= CHUNK_LIMIT) {
                        console.warn(`[Context] ⚠️  Chunk limit of ${CHUNK_LIMIT} reached. Stopping indexing.`);
                        limitReached = true;
                        break; // Exit the inner loop (over chunks)
                    }
                }
                processedFiles++;
                onFileProcessed?.(filePath, i + 1, filePaths.length);
                if (limitReached) {
                    break; // Exit the outer loop (over files)
                }
            }
            catch (error) {
                console.warn(`[Context] ⚠️  Skipping file ${filePath}: ${error}`);
            }
        }
        // Process any remaining chunks in the buffer
        if (chunkBuffer.length > 0) {
            const searchType = isHybrid === true ? 'hybrid' : 'regular';
            console.log(`📝 Processing final batch of ${chunkBuffer.length} chunks for ${searchType}`);
            try {
                await this.processChunkBuffer(chunkBuffer);
            }
            catch (error) {
                console.error(`[Context] ❌ Failed to process final chunk batch for ${searchType}:`, error);
                if (error instanceof Error) {
                    console.error('[Context] Stack trace:', error.stack);
                }
            }
        }
        return {
            processedFiles,
            totalChunks,
            status: limitReached ? 'limit_reached' : 'completed'
        };
    }
    /**
 * Process accumulated chunk buffer
 */
    async processChunkBuffer(chunkBuffer) {
        if (chunkBuffer.length === 0)
            return;
        // Extract chunks and ensure they all have the same codebasePath
        const chunks = chunkBuffer.map(item => item.chunk);
        const codebasePath = chunkBuffer[0].codebasePath;
        // Estimate tokens (rough estimation: 1 token ≈ 4 characters)
        const estimatedTokens = chunks.reduce((sum, chunk) => sum + Math.ceil(chunk.content.length / 4), 0);
        const isHybrid = this.getIsHybrid();
        const searchType = isHybrid === true ? 'hybrid' : 'regular';
        console.log(`[Context] 🔄 Processing batch of ${chunks.length} chunks (~${estimatedTokens} tokens) for ${searchType}`);
        await this.processChunkBatch(chunks, codebasePath);
    }
    /**
     * Process a batch of chunks
     */
    async processChunkBatch(chunks, codebasePath) {
        const isHybrid = this.getIsHybrid();
        // Generate embedding vectors
        const chunkContents = chunks.map(chunk => chunk.content);
        const embeddings = await this.embedding.embedBatch(chunkContents);
        if (isHybrid === true) {
            // Create hybrid vector documents
            const documents = chunks.map((chunk, index) => {
                if (!chunk.metadata.filePath) {
                    throw new Error(`Missing filePath in chunk metadata at index ${index}`);
                }
                const relativePath = path.relative(codebasePath, chunk.metadata.filePath);
                const fileExtension = path.extname(chunk.metadata.filePath);
                const { filePath, startLine, endLine, ...restMetadata } = chunk.metadata;
                return {
                    id: this.generateId(relativePath, chunk.metadata.startLine || 0, chunk.metadata.endLine || 0, chunk.content),
                    content: chunk.content, // Full text content for BM25 and storage
                    vector: embeddings[index].vector, // Dense vector
                    relativePath,
                    startLine: chunk.metadata.startLine || 0,
                    endLine: chunk.metadata.endLine || 0,
                    fileExtension,
                    metadata: {
                        ...restMetadata,
                        codebasePath,
                        language: chunk.metadata.language || 'unknown',
                        chunkIndex: index
                    }
                };
            });
            // Store to vector database
            await this.vectorDatabase.insertHybrid(this.getCollectionName(codebasePath), documents);
        }
        else {
            // Create regular vector documents
            const documents = chunks.map((chunk, index) => {
                if (!chunk.metadata.filePath) {
                    throw new Error(`Missing filePath in chunk metadata at index ${index}`);
                }
                const relativePath = path.relative(codebasePath, chunk.metadata.filePath);
                const fileExtension = path.extname(chunk.metadata.filePath);
                const { filePath, startLine, endLine, ...restMetadata } = chunk.metadata;
                return {
                    id: this.generateId(relativePath, chunk.metadata.startLine || 0, chunk.metadata.endLine || 0, chunk.content),
                    vector: embeddings[index].vector,
                    content: chunk.content,
                    relativePath,
                    startLine: chunk.metadata.startLine || 0,
                    endLine: chunk.metadata.endLine || 0,
                    fileExtension,
                    metadata: {
                        ...restMetadata,
                        codebasePath,
                        language: chunk.metadata.language || 'unknown',
                        chunkIndex: index
                    }
                };
            });
            // Store to vector database
            await this.vectorDatabase.insert(this.getCollectionName(codebasePath), documents);
        }
    }
    /**
     * Get programming language based on file extension
     */
    getLanguageFromExtension(ext) {
        const languageMap = {
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.py': 'python',
            '.java': 'java',
            '.cpp': 'cpp',
            '.c': 'c',
            '.h': 'c',
            '.hpp': 'cpp',
            '.cs': 'csharp',
            '.go': 'go',
            '.rs': 'rust',
            '.php': 'php',
            '.rb': 'ruby',
            '.swift': 'swift',
            '.kt': 'kotlin',
            '.scala': 'scala',
            '.m': 'objective-c',
            '.mm': 'objective-c',
            '.ipynb': 'jupyter'
        };
        return languageMap[ext] || 'text';
    }
    /**
     * Generate unique ID based on chunk content and location
     * @param relativePath Relative path to the file
     * @param startLine Start line number
     * @param endLine End line number
     * @param content Chunk content
     * @returns Hash-based unique ID
     */
    generateId(relativePath, startLine, endLine, content) {
        const combinedString = `${relativePath}:${startLine}:${endLine}:${content}`;
        const hash = crypto.createHash('sha256').update(combinedString, 'utf-8').digest('hex');
        return `chunk_${hash.substring(0, 16)}`;
    }
    /**
     * Read ignore patterns from file (e.g., .gitignore)
     * @param filePath Path to the ignore file
     * @returns Array of ignore patterns
     */
    static async getIgnorePatternsFromFile(filePath) {
        try {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            return content
                .split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#')); // Filter out empty lines and comments
        }
        catch (error) {
            console.warn(`[Context] ⚠️  Could not read ignore file ${filePath}: ${error}`);
            return [];
        }
    }
    /**
     * Load ignore patterns from various ignore files in the codebase
     * This method preserves any existing custom patterns that were added before
     * @param codebasePath Path to the codebase
     */
    async loadIgnorePatterns(codebasePath) {
        try {
            let fileBasedPatterns = [];
            // Load all .xxxignore files in codebase directory
            const ignoreFiles = await this.findIgnoreFiles(codebasePath);
            for (const ignoreFile of ignoreFiles) {
                const patterns = await this.loadIgnoreFile(ignoreFile, path.basename(ignoreFile));
                fileBasedPatterns.push(...patterns);
            }
            // Load global ~/.context/.contextignore
            const globalIgnorePatterns = await this.loadGlobalIgnoreFile();
            fileBasedPatterns.push(...globalIgnorePatterns);
            // Merge file-based patterns with existing patterns (which may include custom MCP patterns)
            if (fileBasedPatterns.length > 0) {
                this.addCustomIgnorePatterns(fileBasedPatterns);
                console.log(`[Context] 🚫 Loaded total ${fileBasedPatterns.length} ignore patterns from all ignore files`);
            }
            else {
                console.log('📄 No ignore files found, keeping existing patterns');
            }
        }
        catch (error) {
            console.warn(`[Context] ⚠️ Failed to load ignore patterns: ${error}`);
            // Continue with existing patterns on error - don't reset them
        }
    }
    /**
     * Find all .xxxignore files in the codebase directory
     * @param codebasePath Path to the codebase
     * @returns Array of ignore file paths
     */
    async findIgnoreFiles(codebasePath) {
        try {
            const entries = await fs.promises.readdir(codebasePath, { withFileTypes: true });
            const ignoreFiles = [];
            for (const entry of entries) {
                if (entry.isFile() &&
                    entry.name.startsWith('.') &&
                    entry.name.endsWith('ignore')) {
                    ignoreFiles.push(path.join(codebasePath, entry.name));
                }
            }
            if (ignoreFiles.length > 0) {
                console.log(`📄 Found ignore files: ${ignoreFiles.map(f => path.basename(f)).join(', ')}`);
            }
            return ignoreFiles;
        }
        catch (error) {
            console.warn(`[Context] ⚠️ Failed to scan for ignore files: ${error}`);
            return [];
        }
    }
    /**
     * Load global ignore file from ~/.context/.contextignore
     * @returns Array of ignore patterns
     */
    async loadGlobalIgnoreFile() {
        try {
            const homeDir = require('os').homedir();
            const globalIgnorePath = path.join(homeDir, '.context', '.contextignore');
            return await this.loadIgnoreFile(globalIgnorePath, 'global .contextignore');
        }
        catch (error) {
            // Global ignore file is optional, don't log warnings
            return [];
        }
    }
    /**
     * Load ignore patterns from a specific ignore file
     * @param filePath Path to the ignore file
     * @param fileName Display name for logging
     * @returns Array of ignore patterns
     */
    async loadIgnoreFile(filePath, fileName) {
        try {
            await fs.promises.access(filePath);
            console.log(`📄 Found ${fileName} file at: ${filePath}`);
            const ignorePatterns = await Context.getIgnorePatternsFromFile(filePath);
            if (ignorePatterns.length > 0) {
                console.log(`[Context] 🚫 Loaded ${ignorePatterns.length} ignore patterns from ${fileName}`);
                return ignorePatterns;
            }
            else {
                console.log(`📄 ${fileName} file found but no valid patterns detected`);
                return [];
            }
        }
        catch (error) {
            if (fileName.includes('global')) {
                console.log(`📄 No ${fileName} file found`);
            }
            return [];
        }
    }
    /**
     * Check if a path matches any ignore pattern
     * @param filePath Path to check
     * @param basePath Base path for relative pattern matching
     * @returns True if path should be ignored
     */
    matchesIgnorePattern(filePath, basePath) {
        if (this.ignorePatterns.length === 0) {
            return false;
        }
        const relativePath = path.relative(basePath, filePath);
        const normalizedPath = relativePath.replace(/\\/g, '/'); // Normalize path separators
        for (const pattern of this.ignorePatterns) {
            if (this.isPatternMatch(normalizedPath, pattern)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Simple glob pattern matching
     * @param filePath File path to test
     * @param pattern Glob pattern
     * @returns True if pattern matches
     */
    isPatternMatch(filePath, pattern) {
        // Handle directory patterns (ending with /)
        if (pattern.endsWith('/')) {
            const dirPattern = pattern.slice(0, -1);
            const pathParts = filePath.split('/');
            return pathParts.some(part => this.simpleGlobMatch(part, dirPattern));
        }
        // Handle file patterns
        if (pattern.includes('/')) {
            // Pattern with path separator - match exact path
            return this.simpleGlobMatch(filePath, pattern);
        }
        else {
            // Pattern without path separator - match filename in any directory
            const fileName = path.basename(filePath);
            return this.simpleGlobMatch(fileName, pattern);
        }
    }
    /**
     * Simple glob matching supporting * wildcard
     * @param text Text to test
     * @param pattern Pattern with * wildcards
     * @returns True if pattern matches
     */
    simpleGlobMatch(text, pattern) {
        // Convert glob pattern to regex
        const regexPattern = pattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars except *
            .replace(/\*/g, '.*'); // Convert * to .*
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(text);
    }
    /**
     * Get custom extensions from environment variables
     * Supports CUSTOM_EXTENSIONS as comma-separated list
     * @returns Array of custom extensions
     */
    getCustomExtensionsFromEnv() {
        const envExtensions = env_manager_1.envManager.get('CUSTOM_EXTENSIONS');
        if (!envExtensions) {
            return [];
        }
        try {
            const extensions = envExtensions
                .split(',')
                .map(ext => ext.trim())
                .filter(ext => ext.length > 0)
                .map(ext => ext.startsWith('.') ? ext : `.${ext}`); // Ensure extensions start with dot
            return extensions;
        }
        catch (error) {
            console.warn(`[Context] ⚠️  Failed to parse CUSTOM_EXTENSIONS: ${error}`);
            return [];
        }
    }
    /**
     * Get custom ignore patterns from environment variables
     * Supports CUSTOM_IGNORE_PATTERNS as comma-separated list
     * @returns Array of custom ignore patterns
     */
    getCustomIgnorePatternsFromEnv() {
        const envIgnorePatterns = env_manager_1.envManager.get('CUSTOM_IGNORE_PATTERNS');
        if (!envIgnorePatterns) {
            return [];
        }
        try {
            const patterns = envIgnorePatterns
                .split(',')
                .map(pattern => pattern.trim())
                .filter(pattern => pattern.length > 0);
            return patterns;
        }
        catch (error) {
            console.warn(`[Context] ⚠️  Failed to parse CUSTOM_IGNORE_PATTERNS: ${error}`);
            return [];
        }
    }
    /**
     * Add custom extensions (from MCP or other sources) without replacing existing ones
     * @param customExtensions Array of custom extensions to add
     */
    addCustomExtensions(customExtensions) {
        if (customExtensions.length === 0)
            return;
        // Ensure extensions start with dot
        const normalizedExtensions = customExtensions.map(ext => ext.startsWith('.') ? ext : `.${ext}`);
        // Merge current extensions with new custom extensions, avoiding duplicates
        const mergedExtensions = [...this.supportedExtensions, ...normalizedExtensions];
        const uniqueExtensions = [...new Set(mergedExtensions)];
        this.supportedExtensions = uniqueExtensions;
        console.log(`[Context] 📎 Added ${customExtensions.length} custom extensions. Total: ${this.supportedExtensions.length} extensions`);
    }
    /**
     * Get current splitter information
     */
    getSplitterInfo() {
        const splitterName = this.codeSplitter.constructor.name;
        if (splitterName === 'AstCodeSplitter') {
            const { AstCodeSplitter } = require('./splitter/ast-splitter');
            return {
                type: 'ast',
                hasBuiltinFallback: true,
                supportedLanguages: AstCodeSplitter.getSupportedLanguages()
            };
        }
        else {
            return {
                type: 'langchain',
                hasBuiltinFallback: false
            };
        }
    }
    /**
     * Check if current splitter supports a specific language
     * @param language Programming language
     */
    isLanguageSupported(language) {
        const splitterName = this.codeSplitter.constructor.name;
        if (splitterName === 'AstCodeSplitter') {
            const { AstCodeSplitter } = require('./splitter/ast-splitter');
            return AstCodeSplitter.isLanguageSupported(language);
        }
        // LangChain splitter supports most languages
        return true;
    }
    /**
     * Get which strategy would be used for a specific language
     * @param language Programming language
     */
    getSplitterStrategyForLanguage(language) {
        const splitterName = this.codeSplitter.constructor.name;
        if (splitterName === 'AstCodeSplitter') {
            const { AstCodeSplitter } = require('./splitter/ast-splitter');
            const isSupported = AstCodeSplitter.isLanguageSupported(language);
            return {
                strategy: isSupported ? 'ast' : 'langchain',
                reason: isSupported
                    ? 'Language supported by AST parser'
                    : 'Language not supported by AST, will fallback to LangChain'
            };
        }
        else {
            return {
                strategy: 'langchain',
                reason: 'Using LangChain splitter directly'
            };
        }
    }
}
exports.Context = Context;
//# sourceMappingURL=context.js.map