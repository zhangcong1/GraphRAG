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
const buildKnowledgeGraph_1 = require("./commands/buildKnowledgeGraph");
const showKnowledgeGraph_1 = require("./commands/showKnowledgeGraph");
const searchKnowledgeGraph_1 = require("./commands/searchKnowledgeGraph");
/**
 * 插件激活函数
 */
function activate(context) {
    console.log('GraphRAG Knowledge Graph 扩展已激活');
    // 注册构建知识图谱命令
    const buildCommand = vscode.commands.registerCommand('graphrag.buildKnowledgeGraph', async () => {
        await (0, buildKnowledgeGraph_1.buildKnowledgeGraphCommand)();
    });
    // 注册查看知识图谱命令
    const showCommand = vscode.commands.registerCommand('graphrag.showKnowledgeGraph', async () => {
        await (0, showKnowledgeGraph_1.showKnowledgeGraphCommand)();
    });
    // 注册向量搜索命令
    const searchCommand = vscode.commands.registerCommand('graphrag.searchKnowledgeGraph', async () => {
        await (0, searchKnowledgeGraph_1.searchKnowledgeGraphCommand)();
    });
    // 注册批量搜索命令
    const batchSearchCommand = vscode.commands.registerCommand('graphrag.batchSearchKnowledgeGraph', async () => {
        await (0, searchKnowledgeGraph_1.batchSearchKnowledgeGraphCommand)();
    });
    context.subscriptions.push(buildCommand, showCommand, searchCommand, batchSearchCommand);
}
/**
 * 插件停用函数
 */
function deactivate() {
    console.log('GraphRAG Knowledge Graph 扩展已停用');
}
//# sourceMappingURL=extension.js.map