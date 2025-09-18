import * as vscode from 'vscode';
import { Context } from '@zilliz/claude-context-core';
export declare class SyncCommand {
    private context;
    private isSyncing;
    constructor(context: Context);
    /**
     * Update the Context instance (used when configuration changes)
     */
    updateContext(context: Context): void;
    /**
     * Sync the current workspace folder - check for changes and update index
     */
    execute(): Promise<void>;
    /**
     * Auto-sync functionality - periodically check for changes
     */
    startAutoSync(intervalMinutes?: number): Promise<vscode.Disposable>;
    /**
     * Silent sync - runs without progress notifications, used for auto-sync
     */
    executeSilent(): Promise<void>;
    /**
     * Check if sync is currently in progress
     */
    getIsSyncing(): boolean;
}
//# sourceMappingURL=syncCommand.d.ts.map