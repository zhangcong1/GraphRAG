export declare class FileSynchronizer {
    private fileHashes;
    private merkleDAG;
    private rootDir;
    private snapshotPath;
    private ignorePatterns;
    constructor(rootDir: string, ignorePatterns?: string[]);
    private getSnapshotPath;
    private hashFile;
    private generateFileHashes;
    private shouldIgnore;
    private matchPattern;
    private simpleGlobMatch;
    private buildMerkleDAG;
    initialize(): Promise<void>;
    checkForChanges(): Promise<{
        added: string[];
        removed: string[];
        modified: string[];
    }>;
    private compareStates;
    getFileHash(filePath: string): string | undefined;
    private saveSnapshot;
    private loadSnapshot;
    /**
     * Delete snapshot file for a given codebase path
     */
    static deleteSnapshot(codebasePath: string): Promise<void>;
}
//# sourceMappingURL=synchronizer.d.ts.map