import * as vscode from 'vscode';
import { buildKnowledgeGraphCommand } from './commands/buildKnowledgeGraph';
import { showKnowledgeGraphCommand } from './commands/showKnowledgeGraph';
import { searchKnowledgeGraphCommand, batchSearchKnowledgeGraphCommand } from './commands/searchKnowledgeGraph';
import { checkGraphStatusCommand } from './commands/checkGraphStatus';
import { exportKnowledgeGraphCommand } from './commands/exportKnowledgeGraph';
import { toggleAutoUpdateCommand, initializeFileWatcher } from './commands/fileWatcher';

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
    
    // 注册检查图谱状态命令
    const checkStatusCommand = vscode.commands.registerCommand('graphrag.checkGraphStatus', async () => {
        await checkGraphStatusCommand();
    });
    
    // 注册导出知识图谱命令
    const exportCommand = vscode.commands.registerCommand('graphrag.exportKnowledgeGraph', async () => {
        await exportKnowledgeGraphCommand();
    });
    
    // 注册切换自动更新命令
    const toggleAutoUpdateCmd = vscode.commands.registerCommand('graphrag.toggleAutoUpdate', async () => {
        await toggleAutoUpdateCommand();
    });

    // 添加所有命令到订阅列表
    context.subscriptions.push(
        buildCommand, 
        showCommand, 
        searchCommand, 
        batchSearchCommand,
        checkStatusCommand,
        exportCommand,
        toggleAutoUpdateCmd
    );
    
    // 初始化文件监听器
    initializeFileWatcher(context).catch(error => {
        console.error('初始化文件监听器失败:', error);
    });
}

/**
 * 插件停用函数
 */
export function deactivate() {
    console.log('GraphRAG Knowledge Graph 扩展已停用');
}
