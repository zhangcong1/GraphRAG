import * as vscode from 'vscode';
import { buildKnowledgeGraphCommand } from './commands/buildKnowledgeGraph';
import { showKnowledgeGraphCommand } from './commands/showKnowledgeGraph';
import { searchKnowledgeGraphCommand, batchSearchKnowledgeGraphCommand } from './commands/searchKnowledgeGraph';

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

    // 注册向量搜索命令
    const searchCommand = vscode.commands.registerCommand('graphrag.searchKnowledgeGraph', async () => {
        await searchKnowledgeGraphCommand();
    });

    // 注册批量搜索命令
    const batchSearchCommand = vscode.commands.registerCommand('graphrag.batchSearchKnowledgeGraph', async () => {
        await batchSearchKnowledgeGraphCommand();
    });

    context.subscriptions.push(buildCommand, showCommand, searchCommand, batchSearchCommand);
}

/**
 * 插件停用函数
 */
export function deactivate() {
    console.log('GraphRAG Knowledge Graph 扩展已停用');
}
