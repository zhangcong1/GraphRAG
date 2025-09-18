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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const semanticSearchProvider_1 = require("./webview/semanticSearchProvider");
const searchCommand_1 = require("./commands/searchCommand");
const indexCommand_1 = require("./commands/indexCommand");
const syncCommand_1 = require("./commands/syncCommand");
const configManager_1 = require("./config/configManager");
const claude_context_core_1 = require("@zilliz/claude-context-core");
const claude_context_core_2 = require("@zilliz/claude-context-core");
let semanticSearchProvider;
let searchCommand;
let indexCommand;
let syncCommand;
let configManager;
let codeContext;
let autoSyncDisposable = null;
async function activate(context) {
    console.log('Context extension is now active!');
    // Initialize config manager
    configManager = new configManager_1.ConfigManager(context);
    // Initialize shared context instance with embedding configuration
    codeContext = createContextWithConfig(configManager);
    // Initialize providers and commands
    searchCommand = new searchCommand_1.SearchCommand(codeContext);
    indexCommand = new indexCommand_1.IndexCommand(codeContext);
    syncCommand = new syncCommand_1.SyncCommand(codeContext);
    semanticSearchProvider = new semanticSearchProvider_1.SemanticSearchViewProvider(context.extensionUri, searchCommand, indexCommand, syncCommand, configManager);
    // Register command handlers
    const disposables = [
        // Register webview providers
        vscode.window.registerWebviewViewProvider(semanticSearchProvider_1.SemanticSearchViewProvider.viewType, semanticSearchProvider, {
            webviewOptions: {
                retainContextWhenHidden: true
            }
        }),
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('semanticCodeSearch.embeddingProvider') ||
                event.affectsConfiguration('semanticCodeSearch.milvus') ||
                event.affectsConfiguration('semanticCodeSearch.splitter') ||
                event.affectsConfiguration('semanticCodeSearch.autoSync')) {
                console.log('Context configuration changed, reloading...');
                reloadContextConfiguration();
            }
        }),
        // Register commands
        vscode.commands.registerCommand('semanticCodeSearch.semanticSearch', () => {
            // Get selected text from active editor
            const editor = vscode.window.activeTextEditor;
            const selectedText = editor?.document.getText(editor.selection);
            return searchCommand.execute(selectedText);
        }),
        vscode.commands.registerCommand('semanticCodeSearch.indexCodebase', () => indexCommand.execute()),
        vscode.commands.registerCommand('semanticCodeSearch.clearIndex', () => indexCommand.clearIndex()),
        vscode.commands.registerCommand('semanticCodeSearch.reloadConfiguration', () => reloadContextConfiguration())
    ];
    context.subscriptions.push(...disposables);
    // Initialize auto-sync if enabled
    setupAutoSync();
    // Run initial sync on startup
    runInitialSync();
    // Show status bar item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = `$(search) Context`;
    statusBarItem.tooltip = 'Click to open semantic search';
    statusBarItem.command = 'semanticCodeSearch.semanticSearch';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
}
async function runInitialSync() {
    try {
        console.log('[STARTUP] Running initial sync...');
        await syncCommand.executeSilent();
        console.log('[STARTUP] Initial sync completed');
    }
    catch (error) {
        console.error('[STARTUP] Initial sync failed:', error);
        // Don't show error message to user for startup sync failure
    }
}
function setupAutoSync() {
    const config = vscode.workspace.getConfiguration('semanticCodeSearch');
    const autoSyncEnabled = config.get('autoSync.enabled', true);
    const autoSyncInterval = config.get('autoSync.intervalMinutes', 5);
    // Stop existing auto-sync if running
    if (autoSyncDisposable) {
        autoSyncDisposable.dispose();
        autoSyncDisposable = null;
    }
    if (autoSyncEnabled) {
        console.log(`Setting up auto-sync with ${autoSyncInterval} minute interval`);
        // Start periodic auto-sync
        syncCommand.startAutoSync(autoSyncInterval).then(disposable => {
            autoSyncDisposable = disposable;
        }).catch(error => {
            console.error('Failed to start auto-sync:', error);
            vscode.window.showErrorMessage(`Failed to start auto-sync: ${error instanceof Error ? error.message : 'Unknown error'}`);
        });
    }
    else {
        console.log('Auto-sync disabled');
    }
}
function createContextWithConfig(configManager) {
    const embeddingConfig = configManager.getEmbeddingProviderConfig();
    const milvusConfig = configManager.getMilvusFullConfig();
    const splitterConfig = configManager.getSplitterConfig();
    try {
        let embedding;
        let vectorDatabase;
        const contextConfig = {};
        // Create embedding instance
        if (embeddingConfig) {
            embedding = configManager_1.ConfigManager.createEmbeddingInstance(embeddingConfig.provider, embeddingConfig.config);
            console.log(`Embedding initialized with ${embeddingConfig.provider} (model: ${embeddingConfig.config.model})`);
            contextConfig.embedding = embedding;
        }
        else {
            console.log('No embedding configuration found');
        }
        // Create vector database instance
        if (milvusConfig) {
            vectorDatabase = new claude_context_core_1.MilvusRestfulVectorDatabase(milvusConfig);
            console.log(`Vector database initialized with Milvus REST API (address: ${milvusConfig.address})`);
            contextConfig.vectorDatabase = vectorDatabase;
        }
        else {
            vectorDatabase = new claude_context_core_1.MilvusRestfulVectorDatabase({
                address: claude_context_core_2.envManager.get('MILVUS_ADDRESS') || 'http://localhost:19530',
                token: claude_context_core_2.envManager.get('MILVUS_TOKEN') || ''
            });
            console.log('No Milvus configuration found, using default REST API configuration');
            contextConfig.vectorDatabase = vectorDatabase;
        }
        // Create splitter instance
        let codeSplitter;
        if (splitterConfig) {
            if (splitterConfig.type === claude_context_core_1.SplitterType.LANGCHAIN) {
                codeSplitter = new claude_context_core_1.LangChainCodeSplitter(splitterConfig.chunkSize ?? 1000, splitterConfig.chunkOverlap ?? 200);
            }
            else { // Default to AST splitter
                codeSplitter = new claude_context_core_1.AstCodeSplitter(splitterConfig.chunkSize ?? 2500, splitterConfig.chunkOverlap ?? 300);
            }
            contextConfig.codeSplitter = codeSplitter;
            console.log(`Splitter configured: ${splitterConfig.type} (chunkSize: ${splitterConfig.chunkSize}, overlap: ${splitterConfig.chunkOverlap})`);
        }
        else {
            codeSplitter = new claude_context_core_1.AstCodeSplitter(2500, 300);
            contextConfig.codeSplitter = codeSplitter;
            console.log('No splitter configuration found, using default AST splitter (chunkSize: 2500, overlap: 300)');
        }
        return new claude_context_core_1.Context(contextConfig);
    }
    catch (error) {
        console.error('Failed to create Context with user config:', error);
        vscode.window.showErrorMessage(`Failed to initialize Context: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
    }
}
function reloadContextConfiguration() {
    console.log('Reloading Context configuration...');
    const embeddingConfig = configManager.getEmbeddingProviderConfig();
    const milvusConfig = configManager.getMilvusFullConfig();
    const splitterConfig = configManager.getSplitterConfig();
    try {
        // Update embedding if configuration exists
        if (embeddingConfig) {
            const embedding = configManager_1.ConfigManager.createEmbeddingInstance(embeddingConfig.provider, embeddingConfig.config);
            codeContext.updateEmbedding(embedding);
            console.log(`Embedding updated with ${embeddingConfig.provider} (model: ${embeddingConfig.config.model})`);
        }
        // Update vector database if configuration exists
        if (milvusConfig) {
            const vectorDatabase = new claude_context_core_1.MilvusRestfulVectorDatabase(milvusConfig);
            codeContext.updateVectorDatabase(vectorDatabase);
            console.log(`Vector database updated with Milvus REST API (address: ${milvusConfig.address})`);
        }
        // Update splitter if configuration exists
        if (splitterConfig) {
            let newSplitter;
            if (splitterConfig.type === claude_context_core_1.SplitterType.LANGCHAIN) {
                newSplitter = new claude_context_core_1.LangChainCodeSplitter(splitterConfig.chunkSize ?? 1000, splitterConfig.chunkOverlap ?? 200);
            }
            else {
                newSplitter = new claude_context_core_1.AstCodeSplitter(splitterConfig.chunkSize ?? 2500, splitterConfig.chunkOverlap ?? 300);
            }
            codeContext.updateSplitter(newSplitter);
            console.log(`Splitter updated: ${splitterConfig.type} (chunkSize: ${splitterConfig.chunkSize}, overlap: ${splitterConfig.chunkOverlap})`);
        }
        else {
            const defaultSplitter = new claude_context_core_1.AstCodeSplitter(2500, 300);
            codeContext.updateSplitter(defaultSplitter);
            console.log('No splitter configuration found, using default AST splitter (chunkSize: 2500, overlap: 300)');
        }
        // Update command instances with new context
        searchCommand.updateContext(codeContext);
        indexCommand.updateContext(codeContext);
        syncCommand.updateContext(codeContext);
        // Restart auto-sync if it was enabled
        setupAutoSync();
        console.log('Context configuration reloaded successfully');
        vscode.window.showInformationMessage('Configuration reloaded successfully!');
    }
    catch (error) {
        console.error('Failed to reload Context configuration:', error);
        vscode.window.showErrorMessage(`Failed to reload configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
function deactivate() {
    console.log('Context extension is now deactivated');
    // Stop auto-sync if running
    if (autoSyncDisposable) {
        autoSyncDisposable.dispose();
        autoSyncDisposable = null;
    }
}
//# sourceMappingURL=extension.js.map