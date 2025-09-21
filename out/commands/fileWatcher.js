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
exports.FileWatcherManager = void 0;
exports.toggleAutoUpdateCommand = toggleAutoUpdateCommand;
exports.initializeFileWatcher = initializeFileWatcher;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
/**
 * 文件监听管理器
 */
class FileWatcherManager {
    static instance;
    watchers = new Map();
    isEnabled = false;
    debounceTimer = null;
    changedFiles = new Set();
    constructor() { }
    static getInstance() {
        if (!FileWatcherManager.instance) {
            FileWatcherManager.instance = new FileWatcherManager();
        }
        return FileWatcherManager.instance;
    }
    /**
     * 启用文件监听
     */
    async enable(workspacePath) {
        if (this.isEnabled) {
            return;
        }
        try {
            console.log('🎯 启用文件监听，工作区:', workspacePath);
            // 监听支持的文件类型
            const patterns = [
                '**/*.js',
                '**/*.ts',
                '**/*.jsx',
                '**/*.tsx',
                '**/*.vue',
                '**/*.json',
                '**/*.md'
            ];
            for (const pattern of patterns) {
                const watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(workspacePath, pattern));
                // 监听文件变化
                watcher.onDidChange(uri => this.handleFileChange(uri, 'changed'));
                watcher.onDidCreate(uri => this.handleFileChange(uri, 'created'));
                watcher.onDidDelete(uri => this.handleFileChange(uri, 'deleted'));
                this.watchers.set(pattern, watcher);
            }
            this.isEnabled = true;
            console.log('✅ 文件监听已启用');
            // 更新状态栏
            this.updateStatusBar();
        }
        catch (error) {
            console.error('❌ 启用文件监听失败:', error);
            vscode.window.showErrorMessage(`启用文件监听失败: ${error}`);
        }
    }
    /**
     * 禁用文件监听
     */
    async disable() {
        if (!this.isEnabled) {
            return;
        }
        console.log('⏹️ 禁用文件监听');
        // 清理定时器
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        // 释放所有监听器
        for (const watcher of this.watchers.values()) {
            watcher.dispose();
        }
        this.watchers.clear();
        this.changedFiles.clear();
        this.isEnabled = false;
        console.log('✅ 文件监听已禁用');
        // 更新状态栏
        this.updateStatusBar();
    }
    /**
     * 切换文件监听状态
     */
    async toggle(workspacePath) {
        if (this.isEnabled) {
            await this.disable();
        }
        else {
            await this.enable(workspacePath);
        }
    }
    /**
     * 处理文件变化
     */
    handleFileChange(uri, changeType) {
        const filePath = uri.fsPath;
        // 过滤掉不需要监听的文件
        if (this.shouldIgnoreFile(filePath)) {
            return;
        }
        console.log(`📁 文件 ${changeType}: ${path.basename(filePath)}`);
        this.changedFiles.add(filePath);
        // 使用防抖机制，避免频繁更新
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
            this.triggerKnowledgeGraphUpdate();
        }, 2000); // 2秒延迟
    }
    /**
     * 检查是否应该忽略文件
     */
    shouldIgnoreFile(filePath) {
        const ignoredPaths = [
            'node_modules',
            '.git',
            'dist',
            'build',
            'out',
            '.huima', // 忽略自己的输出目录
            '.vscode'
        ];
        const ignoredExtensions = [
            '.min.js',
            '.map',
            '.log',
            '.tmp'
        ];
        // 检查路径
        for (const ignoredPath of ignoredPaths) {
            if (filePath.includes(ignoredPath)) {
                return true;
            }
        }
        // 检查扩展名
        for (const ignoredExt of ignoredExtensions) {
            if (filePath.endsWith(ignoredExt)) {
                return true;
            }
        }
        // 检查文件大小（跳过大文件）
        try {
            const stats = fs.statSync(filePath);
            if (stats.size > 10 * 1024 * 1024) { // 10MB
                return true;
            }
        }
        catch (error) {
            // 文件可能已被删除
            return false;
        }
        return false;
    }
    /**
     * 触发知识图谱更新
     */
    async triggerKnowledgeGraphUpdate() {
        if (this.changedFiles.size === 0) {
            return;
        }
        const changedCount = this.changedFiles.size;
        console.log(`🔄 触发知识图谱更新，变更文件数: ${changedCount}`);
        // 清空变更文件列表
        this.changedFiles.clear();
        try {
            // 显示更新通知
            const result = await vscode.window.showInformationMessage(`检测到 ${changedCount} 个文件变更，是否更新知识图谱？`, '立即更新', '暂时跳过', '禁用自动监听');
            if (result === '立即更新') {
                // 动态导入避免循环依赖
                const { buildKnowledgeGraphCommand } = await import('./buildKnowledgeGraph.js');
                await buildKnowledgeGraphCommand();
                vscode.window.showInformationMessage('✅ 知识图谱更新完成');
            }
            else if (result === '禁用自动监听') {
                await this.disable();
                // 更新配置
                const config = vscode.workspace.getConfiguration('graphrag');
                await config.update('autoUpdateEnabled', false, vscode.ConfigurationTarget.Workspace);
                vscode.window.showInformationMessage('❌ 自动监听已禁用');
            }
        }
        catch (error) {
            console.error('❌ 更新知识图谱失败:', error);
            vscode.window.showErrorMessage(`更新知识图谱失败: ${error}`);
        }
    }
    /**
     * 更新状态栏
     */
    updateStatusBar() {
        // 这里可以添加状态栏显示逻辑
        const statusMessage = this.isEnabled ? '📡 知识图谱监听: 已启用' : '📡 知识图谱监听: 已禁用';
        console.log(statusMessage);
    }
    /**
     * 获取当前状态
     */
    getStatus() {
        return {
            enabled: this.isEnabled,
            watchedPatterns: Array.from(this.watchers.keys()),
            changedFiles: this.changedFiles.size
        };
    }
    /**
     * 清理资源
     */
    dispose() {
        this.disable();
    }
}
exports.FileWatcherManager = FileWatcherManager;
/**
 * 切换自动更新命令处理器
 */
async function toggleAutoUpdateCommand() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('请先打开一个工作区');
        return;
    }
    const workspacePath = workspaceFolders[0].uri.fsPath;
    const config = vscode.workspace.getConfiguration('graphrag');
    const currentlyEnabled = config.get('autoUpdateEnabled', false);
    const fileWatcher = FileWatcherManager.getInstance();
    try {
        if (currentlyEnabled) {
            // 禁用自动更新
            await fileWatcher.disable();
            await config.update('autoUpdateEnabled', false, vscode.ConfigurationTarget.Workspace);
            vscode.window.showInformationMessage('❌ 自动更新已禁用');
        }
        else {
            // 启用自动更新
            await fileWatcher.enable(workspacePath);
            await config.update('autoUpdateEnabled', true, vscode.ConfigurationTarget.Workspace);
            vscode.window.showInformationMessage('✅ 自动更新已启用');
        }
    }
    catch (error) {
        console.error('切换自动更新状态失败:', error);
        vscode.window.showErrorMessage(`切换自动更新状态失败: ${error}`);
    }
}
/**
 * 初始化文件监听器
 */
async function initializeFileWatcher(context) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        return;
    }
    const workspacePath = workspaceFolders[0].uri.fsPath;
    const config = vscode.workspace.getConfiguration('graphrag');
    const autoUpdateEnabled = config.get('autoUpdateEnabled', false);
    if (autoUpdateEnabled) {
        const fileWatcher = FileWatcherManager.getInstance();
        await fileWatcher.enable(workspacePath);
        console.log('🎯 文件监听器已自动启用');
    }
    // 监听配置变化
    const configWatcher = vscode.workspace.onDidChangeConfiguration(async (event) => {
        if (event.affectsConfiguration('graphrag.autoUpdateEnabled')) {
            const newValue = config.get('autoUpdateEnabled', false);
            const fileWatcher = FileWatcherManager.getInstance();
            if (newValue && !fileWatcher.getStatus().enabled) {
                await fileWatcher.enable(workspacePath);
            }
            else if (!newValue && fileWatcher.getStatus().enabled) {
                await fileWatcher.disable();
            }
        }
    });
    context.subscriptions.push(configWatcher);
    // 在扩展停用时清理
    context.subscriptions.push({
        dispose: () => {
            FileWatcherManager.getInstance().dispose();
        }
    });
}
//# sourceMappingURL=fileWatcher.js.map