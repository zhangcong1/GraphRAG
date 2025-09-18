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
        panel.webview.html = (0, d3Visualization_1.generateD3WebviewContent)(kg);
    }
    catch (error) {
        vscode.window.showErrorMessage(`无法加载知识图谱: ${error}`);
    }
}
//# sourceMappingURL=showKnowledgeGraph.js.map