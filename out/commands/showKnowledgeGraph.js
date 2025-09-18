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
exports.showKnowledgeGraphCommand = showKnowledgeGraphCommand;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fsUtils_1 = require("../fsUtils");
const d3Visualization_1 = require("../webview/d3Visualization");
/**
 * 处理跳转到代码的消息
 */
async function handleNavigateToCode(data, workspacePath) {
    console.log('🚀 开始处理代码跳转:', data);
    try {
        let filePath;
        let startLine;
        let endLine;
        if (data.type === 'entity' && data.properties) {
            // 代码实体节点
            filePath = data.properties.file_path || data.path;
            startLine = data.properties.start_line;
            endLine = data.properties.end_line;
            console.log('📝 代码实体节点:', { filePath, startLine, endLine });
        }
        else if (data.type === 'file') {
            // 文件节点
            filePath = data.path;
            console.log('📁 文件节点:', { filePath });
        }
        else {
            console.log('⚠️ 不支持的节点类型:', data.type);
            vscode.window.showWarningMessage('该节点不支持跳转到代码');
            return;
        }
        if (!filePath) {
            console.log('❌ 没有找到文件路径');
            vscode.window.showWarningMessage('找不到文件路径');
            return;
        }
        // 如果是相对路径，转换为绝对路径
        if (!path.isAbsolute(filePath)) {
            filePath = path.join(workspacePath, filePath);
        }
        console.log('🔍 准备打开文件:', filePath);
        // 检查文件是否存在
        const uri = vscode.Uri.file(filePath);
        try {
            await vscode.workspace.fs.stat(uri);
            console.log('✅ 文件存在，继续打开');
        }
        catch (error) {
            console.log('❌ 文件不存在:', filePath);
            vscode.window.showErrorMessage(`文件不存在: ${filePath}`);
            return;
        }
        // 打开文件
        console.log('📄 正在打开文件...');
        const document = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(document);
        // 如果有行号信息，跳转并选中对应代码范围
        if (typeof startLine === 'number' && typeof endLine === 'number') {
            console.log(`🎯 跳转到行号: ${startLine}-${endLine}`);
            const startPos = new vscode.Position(Math.max(0, startLine - 1), 0);
            const endPos = new vscode.Position(Math.max(0, endLine - 1), Number.MAX_SAFE_INTEGER);
            const range = new vscode.Range(startPos, endPos);
            // 选中范围
            editor.selection = new vscode.Selection(range.start, range.end);
            // 跳转到该范围
            editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
            vscode.window.showInformationMessage(`跳转到 ${path.basename(filePath)} 第 ${startLine}-${endLine} 行`);
            console.log('✅ 成功跳转到指定行号');
        }
        else {
            // 只打开文件，不做选中
            vscode.window.showInformationMessage(`打开文件: ${path.basename(filePath)}`);
            console.log('✅ 成功打开文件');
        }
    }
    catch (error) {
        console.error('跳转到代码失败:', error);
        vscode.window.showErrorMessage(`跳转失败: ${error}`);
    }
}
/**
 * 显示知识图谱命令处理器
 */
async function showKnowledgeGraphCommand() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('请先打开一个工作区');
        return;
    }
    const workspacePath = workspaceFolders[0].uri.fsPath;
    const kgPath = path.join(workspacePath, '.huima', 'kg.json');
    try {
        const content = await (0, fsUtils_1.readFileContent)(kgPath);
        const kg = JSON.parse(content);
        // 创建并显示 WebView
        const panel = vscode.window.createWebviewPanel('knowledgeGraph', '知识图谱可视化', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        // 处理来自WebView的消息
        panel.webview.onDidReceiveMessage(async (message) => {
            console.log('🔔 收到WebView消息:', message);
            switch (message.command) {
                case 'navigateToCode':
                    console.log('📍 处理跳转请求:', message.data);
                    await handleNavigateToCode(message.data, workspacePath);
                    break;
                default:
                    console.log('❓ 未知命令:', message.command);
                    break;
            }
        }, undefined);
        panel.webview.html = (0, d3Visualization_1.generateD3WebviewContent)(kg);
    }
    catch (error) {
        vscode.window.showErrorMessage(`无法加载知识图谱: ${error}`);
    }
}
//# sourceMappingURL=showKnowledgeGraph.js.map