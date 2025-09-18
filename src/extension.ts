import * as vscode from 'vscode';
import { buildKnowledgeGraphCommand } from './commands/buildKnowledgeGraph';
import { showKnowledgeGraphCommand } from './commands/showKnowledgeGraph';

/**
 * 插件激活函数
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('GraphRAG Knowledge Graph 扩展已激活');

    // 注册构建知识图谱命令
    const buildCommand = vscode.commands.registerCommand('graphrag.buildKnowledgeGraph', async () => {
        await buildKnowledgeGraphCommand();
    });

    // 注册查看知识图谱命令
    const showCommand = vscode.commands.registerCommand('graphrag.showKnowledgeGraph', async () => {
        await showKnowledgeGraphCommand();
    });

    context.subscriptions.push(buildCommand, showCommand);
}

/**
 * 插件停用函数
 */
export function deactivate() {
    console.log('GraphRAG Knowledge Graph 扩展已停用');
}
