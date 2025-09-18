import * as vscode from 'vscode';
import { SearchCommand } from '../commands/searchCommand';
import { IndexCommand } from '../commands/indexCommand';
import { SyncCommand } from '../commands/syncCommand';
import { ConfigManager } from '../config/configManager';
export declare class SemanticSearchViewProvider implements vscode.WebviewViewProvider {
    private readonly _extensionUri;
    static readonly viewType = "semanticSearchView";
    private searchCommand;
    private indexCommand;
    private syncCommand;
    private configManager;
    constructor(_extensionUri: vscode.Uri, searchCommand: SearchCommand, indexCommand: IndexCommand, syncCommand: SyncCommand, configManager: ConfigManager);
    /**
     * Update the command instances (used when configuration changes)
     */
    updateCommands(searchCommand: SearchCommand, indexCommand: IndexCommand, syncCommand: SyncCommand): void;
    resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken): void;
    /**
     * Convert SemanticSearchResult[] from core to webview format
     */
    private convertSearchResultsToWebviewFormat;
    /**
     * Check index status and update webview accordingly
     */
    private checkIndexStatusAndUpdateWebview;
    private sendCurrentConfig;
    private saveConfig;
    private testEmbedding;
}
//# sourceMappingURL=semanticSearchProvider.d.ts.map