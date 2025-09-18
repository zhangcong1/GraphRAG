import * as vscode from 'vscode';
import * as path from 'path';
import { readFileContent } from '../fsUtils';
import { KnowledgeGraph } from '../graph';
import { generateD3WebviewContent } from '../webview/d3Visualization';

/**
 * 显示知识图谱命令处理器
 */
export async function showKnowledgeGraphCommand(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('请先打开一个工作区');
        return;
    }

    const workspacePath = workspaceFolders[0].uri.fsPath;
    const kgPath = path.join(workspacePath, '.huima', 'kg.json');
    
    try {
        const content = await readFileContent(kgPath);
        const kg: KnowledgeGraph = JSON.parse(content);
        
        // 创建并显示 WebView
        const panel = vscode.window.createWebviewPanel(
            'knowledgeGraph',
            '知识图谱可视化',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );
        
        panel.webview.html = generateD3WebviewContent(kg);
        
    } catch (error) {
        vscode.window.showErrorMessage(`无法加载知识图谱: ${error}`);
    }
}