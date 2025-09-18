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
exports.FileSynchronizer = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const merkle_1 = require("./merkle");
const os = __importStar(require("os"));
class FileSynchronizer {
    constructor(rootDir, ignorePatterns = []) {
        this.rootDir = rootDir;
        this.snapshotPath = this.getSnapshotPath(rootDir);
        this.fileHashes = new Map();
        this.merkleDAG = new merkle_1.MerkleDAG();
        this.ignorePatterns = ignorePatterns;
    }
    getSnapshotPath(codebasePath) {
        const homeDir = os.homedir();
        const merkleDir = path.join(homeDir, '.context', 'merkle');
        const normalizedPath = path.resolve(codebasePath);
        const hash = crypto.createHash('md5').update(normalizedPath).digest('hex');
        return path.join(merkleDir, `${hash}.json`);
    }
    async hashFile(filePath) {
        // Double-check that this is actually a file, not a directory
        const stat = await fs.stat(filePath);
        if (stat.isDirectory()) {
            throw new Error(`Attempted to hash a directory: ${filePath}`);
        }
        const content = await fs.readFile(filePath, 'utf-8');
        return crypto.createHash('sha256').update(content).digest('hex');
    }
    async generateFileHashes(dir) {
        const fileHashes = new Map();
        let entries;
        try {
            entries = await fs.readdir(dir, { withFileTypes: true });
        }
        catch (error) {
            console.warn(`[Synchronizer] Cannot read directory ${dir}: ${error.message}`);
            return fileHashes;
        }
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(this.rootDir, fullPath);
            // Check if this path should be ignored BEFORE any file system operations
            if (this.shouldIgnore(relativePath, entry.isDirectory())) {
                continue; // Skip completely - no access at all
            }
            // Double-check with fs.stat to be absolutely sure about file type
            let stat;
            try {
                stat = await fs.stat(fullPath);
            }
            catch (error) {
                console.warn(`[Synchronizer] Cannot stat ${fullPath}: ${error.message}`);
                continue;
            }
            if (stat.isDirectory()) {
                // Verify it's really a directory and not ignored
                if (!this.shouldIgnore(relativePath, true)) {
                    const subHashes = await this.generateFileHashes(fullPath);
                    const entries = Array.from(subHashes.entries());
                    for (let i = 0; i < entries.length; i++) {
                        const [p, h] = entries[i];
                        fileHashes.set(p, h);
                    }
                }
            }
            else if (stat.isFile()) {
                // Verify it's really a file and not ignored
                if (!this.shouldIgnore(relativePath, false)) {
                    try {
                        const hash = await this.hashFile(fullPath);
                        fileHashes.set(relativePath, hash);
                    }
                    catch (error) {
                        console.warn(`[Synchronizer] Cannot hash file ${fullPath}: ${error.message}`);
                        continue;
                    }
                }
            }
            // Skip other types (symlinks, etc.)
        }
        return fileHashes;
    }
    shouldIgnore(relativePath, isDirectory = false) {
        // Always ignore hidden files and directories (starting with .)
        const pathParts = relativePath.split(path.sep);
        if (pathParts.some(part => part.startsWith('.'))) {
            return true;
        }
        if (this.ignorePatterns.length === 0) {
            return false;
        }
        // Normalize path separators and remove leading/trailing slashes
        const normalizedPath = relativePath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
        if (!normalizedPath) {
            return false; // Don't ignore root
        }
        // Check direct pattern matches first
        for (const pattern of this.ignorePatterns) {
            if (this.matchPattern(normalizedPath, pattern, isDirectory)) {
                return true;
            }
        }
        // Check if any parent directory is ignored
        const normalizedPathParts = normalizedPath.split('/');
        for (let i = 0; i < normalizedPathParts.length; i++) {
            const partialPath = normalizedPathParts.slice(0, i + 1).join('/');
            for (const pattern of this.ignorePatterns) {
                // Check directory patterns
                if (pattern.endsWith('/')) {
                    const dirPattern = pattern.slice(0, -1);
                    if (this.simpleGlobMatch(partialPath, dirPattern) ||
                        this.simpleGlobMatch(normalizedPathParts[i], dirPattern)) {
                        return true;
                    }
                }
                // Check exact path patterns
                else if (pattern.includes('/')) {
                    if (this.simpleGlobMatch(partialPath, pattern)) {
                        return true;
                    }
                }
                // Check filename patterns against any path component
                else {
                    if (this.simpleGlobMatch(normalizedPathParts[i], pattern)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    matchPattern(filePath, pattern, isDirectory = false) {
        // Clean both path and pattern
        const cleanPath = filePath.replace(/^\/+|\/+$/g, '');
        const cleanPattern = pattern.replace(/^\/+|\/+$/g, '');
        if (!cleanPath || !cleanPattern) {
            return false;
        }
        // Handle directory patterns (ending with /)
        if (pattern.endsWith('/')) {
            if (!isDirectory)
                return false; // Directory pattern only matches directories
            const dirPattern = cleanPattern.slice(0, -1);
            // Direct match or any path component matches
            return this.simpleGlobMatch(cleanPath, dirPattern) ||
                cleanPath.split('/').some(part => this.simpleGlobMatch(part, dirPattern));
        }
        // Handle path patterns (containing /)
        if (cleanPattern.includes('/')) {
            return this.simpleGlobMatch(cleanPath, cleanPattern);
        }
        // Handle filename patterns (no /) - match against basename
        const fileName = path.basename(cleanPath);
        return this.simpleGlobMatch(fileName, cleanPattern);
    }
    simpleGlobMatch(text, pattern) {
        if (!text || !pattern)
            return false;
        // Convert glob pattern to regex
        const regexPattern = pattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars except *
            .replace(/\*/g, '.*'); // Convert * to .*
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(text);
    }
    buildMerkleDAG(fileHashes) {
        const dag = new merkle_1.MerkleDAG();
        const keys = Array.from(fileHashes.keys());
        const sortedPaths = keys.slice().sort(); // Create a sorted copy
        // Create a root node for the entire directory
        let valuesString = "";
        keys.forEach(key => {
            valuesString += fileHashes.get(key);
        });
        const rootNodeData = "root:" + valuesString;
        const rootNodeId = dag.addNode(rootNodeData);
        // Add each file as a child of the root
        for (const path of sortedPaths) {
            const fileData = path + ":" + fileHashes.get(path);
            dag.addNode(fileData, rootNodeId);
        }
        return dag;
    }
    async initialize() {
        console.log(`Initializing file synchronizer for ${this.rootDir}`);
        await this.loadSnapshot();
        this.merkleDAG = this.buildMerkleDAG(this.fileHashes);
        console.log(`[Synchronizer] File synchronizer initialized. Loaded ${this.fileHashes.size} file hashes.`);
    }
    async checkForChanges() {
        console.log('[Synchronizer] Checking for file changes...');
        const newFileHashes = await this.generateFileHashes(this.rootDir);
        const newMerkleDAG = this.buildMerkleDAG(newFileHashes);
        // Compare the DAGs
        const changes = merkle_1.MerkleDAG.compare(this.merkleDAG, newMerkleDAG);
        // If there are any changes in the DAG, we should also do a file-level comparison
        if (changes.added.length > 0 || changes.removed.length > 0 || changes.modified.length > 0) {
            console.log('[Synchronizer] Merkle DAG has changed. Comparing file states...');
            const fileChanges = this.compareStates(this.fileHashes, newFileHashes);
            this.fileHashes = newFileHashes;
            this.merkleDAG = newMerkleDAG;
            await this.saveSnapshot();
            console.log(`[Synchronizer] Found changes: ${fileChanges.added.length} added, ${fileChanges.removed.length} removed, ${fileChanges.modified.length} modified.`);
            return fileChanges;
        }
        console.log('[Synchronizer] No changes detected based on Merkle DAG comparison.');
        return { added: [], removed: [], modified: [] };
    }
    compareStates(oldHashes, newHashes) {
        const added = [];
        const removed = [];
        const modified = [];
        const newEntries = Array.from(newHashes.entries());
        for (let i = 0; i < newEntries.length; i++) {
            const [file, hash] = newEntries[i];
            if (!oldHashes.has(file)) {
                added.push(file);
            }
            else if (oldHashes.get(file) !== hash) {
                modified.push(file);
            }
        }
        const oldKeys = Array.from(oldHashes.keys());
        for (let i = 0; i < oldKeys.length; i++) {
            const file = oldKeys[i];
            if (!newHashes.has(file)) {
                removed.push(file);
            }
        }
        return { added, removed, modified };
    }
    getFileHash(filePath) {
        return this.fileHashes.get(filePath);
    }
    async saveSnapshot() {
        const merkleDir = path.dirname(this.snapshotPath);
        await fs.mkdir(merkleDir, { recursive: true });
        // Convert Map to array without using iterator
        const fileHashesArray = [];
        const keys = Array.from(this.fileHashes.keys());
        keys.forEach(key => {
            fileHashesArray.push([key, this.fileHashes.get(key)]);
        });
        const data = JSON.stringify({
            fileHashes: fileHashesArray,
            merkleDAG: this.merkleDAG.serialize()
        });
        await fs.writeFile(this.snapshotPath, data, 'utf-8');
        console.log(`Saved snapshot to ${this.snapshotPath}`);
    }
    async loadSnapshot() {
        try {
            const data = await fs.readFile(this.snapshotPath, 'utf-8');
            const obj = JSON.parse(data);
            // Reconstruct Map without using constructor with iterator
            this.fileHashes = new Map();
            for (const [key, value] of obj.fileHashes) {
                this.fileHashes.set(key, value);
            }
            if (obj.merkleDAG) {
                this.merkleDAG = merkle_1.MerkleDAG.deserialize(obj.merkleDAG);
            }
            console.log(`Loaded snapshot from ${this.snapshotPath}`);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                console.log(`Snapshot file not found at ${this.snapshotPath}. Generating new one.`);
                this.fileHashes = await this.generateFileHashes(this.rootDir);
                this.merkleDAG = this.buildMerkleDAG(this.fileHashes);
                await this.saveSnapshot();
            }
            else {
                throw error;
            }
        }
    }
    /**
     * Delete snapshot file for a given codebase path
     */
    static async deleteSnapshot(codebasePath) {
        const homeDir = os.homedir();
        const merkleDir = path.join(homeDir, '.context', 'merkle');
        const normalizedPath = path.resolve(codebasePath);
        const hash = crypto.createHash('md5').update(normalizedPath).digest('hex');
        const snapshotPath = path.join(merkleDir, `${hash}.json`);
        try {
            await fs.unlink(snapshotPath);
            console.log(`Deleted snapshot file: ${snapshotPath}`);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                console.log(`Snapshot file not found (already deleted): ${snapshotPath}`);
            }
            else {
                console.error(`[Synchronizer] Failed to delete snapshot file ${snapshotPath}:`, error.message);
                throw error; // Re-throw non-ENOENT errors
            }
        }
    }
}
exports.FileSynchronizer = FileSynchronizer;
//# sourceMappingURL=synchronizer.js.map