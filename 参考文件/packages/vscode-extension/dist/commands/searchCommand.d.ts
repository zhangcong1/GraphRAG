import { Context, SemanticSearchResult } from '@zilliz/claude-context-core';
export declare class SearchCommand {
    private context;
    constructor(context: Context);
    /**
     * Update the Context instance (used when configuration changes)
     */
    updateContext(context: Context): void;
    execute(preSelectedText?: string): Promise<void>;
    private openResult;
    /**
     * Execute search for webview (without UI prompts)
     */
    executeForWebview(searchTerm: string, limit?: number, fileExtensions?: string[]): Promise<SemanticSearchResult[]>;
    /**
     * Check if index exists for the given codebase path
     */
    hasIndex(codebasePath: string): Promise<boolean>;
    /**
     * Generate quick pick items for VS Code
     */
    private generateQuickPickItems;
}
//# sourceMappingURL=searchCommand.d.ts.map