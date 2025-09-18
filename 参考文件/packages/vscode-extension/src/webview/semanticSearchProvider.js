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
exports.SemanticSearchViewProvider = void 0;
const vscode = __importStar(require("vscode"));
const webviewHelper_1 = require("./webviewHelper");
const configManager_1 = require("../config/configManager");
const path = __importStar(require("path"));
class SemanticSearchViewProvider {
    _extensionUri;
    static viewType = 'semanticSearchView';
    searchCommand;
    indexCommand;
    syncCommand;
    configManager;
    constructor(_extensionUri, searchCommand, indexCommand, syncCommand, configManager) {
        this._extensionUri = _extensionUri;
        this.searchCommand = searchCommand;
        this.indexCommand = indexCommand;
        this.syncCommand = syncCommand;
        this.configManager = configManager;
    }
    /**
     * Update the command instances (used when configuration changes)
     */
    updateCommands(searchCommand, indexCommand, syncCommand) {
        this.searchCommand = searchCommand;
        this.indexCommand = indexCommand;
        this.syncCommand = syncCommand;
    }
    resolveWebviewView(webviewView, context, _token) {
        console.log('SemanticSearchViewProvider: resolveWebviewView called');
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        webviewView.webview.html = webviewHelper_1.WebviewHelper.getHtmlContent(this._extensionUri, 'src/webview/templates/semanticSearch.html', webviewView.webview);
        // Check index status on load
        this.checkIndexStatusAndUpdateWebview(webviewView.webview);
        // Send initial configuration data to webview
        this.sendCurrentConfig(webviewView.webview);
        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'checkIndex':
                    // Handle index status check
                    await this.checkIndexStatusAndUpdateWebview(webviewView.webview);
                    return;
                case 'getConfig':
                    this.sendCurrentConfig(webviewView.webview);
                    return;
                case 'saveConfig':
                    await this.saveConfig(message.config, webviewView.webview);
                    return;
                case 'testEmbedding':
                    await this.testEmbedding(message.config, webviewView.webview);
                    return;
                case 'search':
                    try {
                        // Use search command
                        const searchResults = await this.searchCommand.executeForWebview(message.text, 50, Array.isArray(message.fileExtensions) ? message.fileExtensions : []);
                        // Convert SemanticSearchResult[] to webview format
                        const results = this.convertSearchResultsToWebviewFormat(searchResults);
                        // Send results back to webview
                        webviewView.webview.postMessage({
                            command: 'showResults',
                            results: results,
                            query: message.text
                        });
                        vscode.window.showInformationMessage(`Found ${results.length} results for: "${message.text}"`);
                    }
                    catch (error) {
                        console.error('Search failed:', error);
                        vscode.window.showErrorMessage(`Search failed: ${error}`);
                        // Send empty results to webview
                        webviewView.webview.postMessage({
                            command: 'showResults',
                            results: [],
                            query: message.text
                        });
                    }
                    return;
                case 'index':
                    // Handle index command
                    try {
                        await this.indexCommand.execute();
                        // Notify webview that indexing is complete and check index status
                        webviewView.webview.postMessage({
                            command: 'indexComplete'
                        });
                        // Update index status after completion
                        await this.checkIndexStatusAndUpdateWebview(webviewView.webview);
                    }
                    catch (error) {
                        console.error('Indexing error:', error);
                        // Still notify webview to reset button state
                        webviewView.webview.postMessage({
                            command: 'indexComplete'
                        });
                    }
                    return;
                case 'openFile':
                    // Handle file opening
                    try {
                        const workspaceFolders = vscode.workspace.workspaceFolders;
                        const workspaceRoot = workspaceFolders ? workspaceFolders[0].uri.fsPath : '';
                        const absPath = path.join(workspaceRoot, message.relativePath);
                        const uri = vscode.Uri.file(absPath);
                        const document = await vscode.workspace.openTextDocument(uri);
                        const editor = await vscode.window.showTextDocument(document);
                        // Select range from startLine to endLine if provided, otherwise just jump to line
                        if (message.startLine !== undefined && message.endLine !== undefined) {
                            const startLine = Math.max(0, message.startLine - 1); // Convert to 0-based
                            const endLine = Math.max(0, message.endLine - 1); // Convert to 0-based
                            const range = new vscode.Range(startLine, 0, endLine, Number.MAX_SAFE_INTEGER);
                            editor.selection = new vscode.Selection(range.start, range.end);
                            editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
                        }
                        else if (message.line !== undefined) {
                            const line = Math.max(0, message.line - 1); // Convert to 0-based
                            const range = new vscode.Range(line, 0, line, 0);
                            editor.selection = new vscode.Selection(range.start, range.end);
                            editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
                        }
                    }
                    catch (error) {
                        vscode.window.showErrorMessage(`Failed to open file: ${message.relativePath}`);
                    }
                    return;
            }
        }, undefined, []);
    }
    /**
     * Convert SemanticSearchResult[] from core to webview format
     */
    convertSearchResultsToWebviewFormat(searchResults) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const baseWorkspacePath = workspaceFolders ? workspaceFolders[0].uri.fsPath : '/tmp';
        return searchResults.map(result => {
            let filePath = result.relativePath;
            if (result.relativePath && !result.relativePath.startsWith('/') && !result.relativePath.includes(':')) {
                filePath = `${baseWorkspacePath}/${result.relativePath}`;
            }
            let displayPath = result.relativePath;
            // Truncate content for display
            const truncatedContent = result.content && result.content.length <= 150
                ? result.content
                : (result.content || '').substring(0, 150) + '...';
            return {
                file: displayPath,
                filePath: filePath,
                relativePath: result.relativePath,
                line: result.startLine,
                preview: truncatedContent,
                context: `1 match in ${displayPath}`,
                score: result.score,
                startLine: result.startLine,
                endLine: result.endLine
            };
        });
    }
    /**
     * Check index status and update webview accordingly
     */
    async checkIndexStatusAndUpdateWebview(webview) {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                webview.postMessage({
                    command: 'updateIndexStatus',
                    hasIndex: false
                });
                return;
            }
            const codebasePath = workspaceFolders[0].uri.fsPath;
            const hasIndex = await this.searchCommand.hasIndex(codebasePath);
            webview.postMessage({
                command: 'updateIndexStatus',
                hasIndex: hasIndex
            });
        }
        catch (error) {
            console.error('Failed to check index status:', error);
            webview.postMessage({
                command: 'updateIndexStatus',
                hasIndex: false
            });
        }
    }
    sendCurrentConfig(webview) {
        const config = this.configManager.getEmbeddingProviderConfig();
        const milvusConfig = this.configManager.getMilvusConfig();
        const splitterConfig = this.configManager.getSplitterConfig();
        const supportedProviders = configManager_1.ConfigManager.getSupportedProviders();
        webview.postMessage({
            command: 'configData',
            config: config,
            milvusConfig: milvusConfig,
            splitterConfig: splitterConfig,
            supportedProviders: supportedProviders
        });
    }
    async saveConfig(configData, webview) {
        try {
            // Save embedding provider config
            const embeddingConfig = {
                provider: configData.provider,
                config: configData.config
            };
            await this.configManager.saveEmbeddingProviderConfig(embeddingConfig);
            // Save Milvus config
            if (configData.milvusConfig) {
                await this.configManager.saveMilvusConfig(configData.milvusConfig);
            }
            // Save splitter config
            if (configData.splitterConfig) {
                await this.configManager.saveSplitterConfig(configData.splitterConfig);
            }
            // Add a small delay to ensure configuration is fully saved
            await new Promise(resolve => setTimeout(resolve, 100));
            // Notify extension to recreate Context with new config
            vscode.commands.executeCommand('semanticCodeSearch.reloadConfiguration');
            webview.postMessage({
                command: 'saveResult',
                success: true,
                message: 'Configuration saved successfully!'
            });
            vscode.window.showInformationMessage('Context configuration saved successfully!');
        }
        catch (error) {
            webview.postMessage({
                command: 'saveResult',
                success: false,
                message: `Save failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        }
    }
    async testEmbedding(embeddingConfig, webview) {
        try {
            // Test only embedding connection
            const embedding = configManager_1.ConfigManager.createEmbeddingInstance(embeddingConfig.provider, embeddingConfig.config);
            await embedding.embed('test embedding connection');
            webview.postMessage({
                command: 'testResult',
                success: true,
                message: 'Embedding connection test successful!'
            });
        }
        catch (error) {
            webview.postMessage({
                command: 'testResult',
                success: false,
                message: `Embedding connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        }
    }
}
exports.SemanticSearchViewProvider = SemanticSearchViewProvider;
//# sourceMappingURL=semanticSearchProvider.js.map