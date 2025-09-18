import * as vscode from 'vscode';
import * as path from 'path';
import { scanWorkspace, readFileContent, writeFileContent, ensureDirectory } from '../fsUtils';
import { TreeSitterParser, CodeEntity } from '../parser';
import { GraphBuilder } from '../graph';

/**
 * 构建知识图谱命令处理器
 */
export async function buildKnowledgeGraphCommand(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('请先打开一个工作区');
        return;
    }

    const workspacePath = workspaceFolders[0].uri.fsPath;
    
    // 显示进度条
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: '构建知识图谱',
        cancellable: true
    }, async (progress, token) => {
        try {
            progress.report({ increment: 0, message: '扫描工作区文件...' });
            
            // 1. 扫描工作区
            const files = await scanWorkspace(workspacePath);
            console.log(`找到 ${files.length} 个支持的文件`);
            
            if (files.length === 0) {
                vscode.window.showWarningMessage('工作区中没有找到支持的文件类型');
                return;
            }

            progress.report({ increment: 20, message: '初始化解析器...' });
            
            // 2. 初始化解析器
            const parser = new TreeSitterParser();
            const allEntities: CodeEntity[] = [];
            const fileImports = new Map<string, string[]>();
            const fileExports = new Map<string, string[]>();
            
            progress.report({ increment: 30, message: '解析代码文件...' });
            
            // 3. 解析每个文件
            const totalFiles = files.length;
            for (let i = 0; i < totalFiles; i++) {
                if (token.isCancellationRequested) {
                    return;
                }
                
                const file = files[i];
                progress.report({ 
                    increment: (40 / totalFiles), 
                    message: `解析文件: ${file.name} (${i + 1}/${totalFiles})` 
                });
                
                try {
                    const content = await readFileContent(file.path);
                    const parseResult = await parser.parseFile(file.path, content);
                    
                    // 收集实体
                    allEntities.push(...parseResult.entities);
                    
                    // 收集导入/导出信息
                    if (parseResult.imports.length > 0) {
                        fileImports.set(file.path, parseResult.imports);
                    }
                    if (parseResult.exports.length > 0) {
                        fileExports.set(file.path, parseResult.exports);
                    }
                    
                    // 输出错误信息
                    if (parseResult.errors.length > 0) {
                        console.warn(`解析文件 ${file.path} 时出现错误:`, parseResult.errors);
                    }
                } catch (error) {
                    console.error(`解析文件 ${file.path} 失败:`, error);
                }
            }
            
            console.log(`共解析出 ${allEntities.length} 个代码实体`);
            
            progress.report({ increment: 70, message: '构建知识图谱...' });
            
            // 4. 构建知识图谱
            const graphBuilder = new GraphBuilder(workspacePath);
            const knowledgeGraph = graphBuilder.buildGraph(allEntities, fileImports, fileExports);
            
            progress.report({ increment: 90, message: '保存知识图谱...' });
            
            // 5. 保存知识图谱到 .huima 目录
            const huimaDir = path.join(workspacePath, '.huima');
            await ensureDirectory(huimaDir);
            const outputPath = path.join(huimaDir, 'kg.json');
            const jsonContent = JSON.stringify(knowledgeGraph, null, 2);
            await writeFileContent(outputPath, jsonContent);
            
            // 同时保存简化版本用于快速预览
            const summaryPath = path.join(huimaDir, 'kg_summary.json');
            const summary = {
                metadata: knowledgeGraph.metadata,
                node_count: knowledgeGraph.nodes.length,
                edge_count: knowledgeGraph.edges.length,
                community_count: knowledgeGraph.communities.length,
                top_communities: knowledgeGraph.communities.slice(0, 5)
            };
            await writeFileContent(summaryPath, JSON.stringify(summary, null, 2));
            
            progress.report({ increment: 100, message: '完成!' });
            
            // 显示结果
            const stats = knowledgeGraph.metadata;
            const message = `知识图谱构建完成!\n` +
                `- 文件数量: ${stats.total_files}\n` +
                `- 代码实体: ${stats.total_entities}\n` +
                `- 关系数量: ${stats.total_relationships}\n` +
                `- 社区数量: ${knowledgeGraph.communities.length}\n` +
                `- 输出目录: .huima/\n` +
                `- 主文件: kg.json\n` +
                `- 摘要文件: kg_summary.json`;
            
            const result = await vscode.window.showInformationMessage(
                message,
                '打开文件',
                '查看图谱'
            );
            
            if (result === '打开文件') {
                const document = await vscode.workspace.openTextDocument(outputPath);
                await vscode.window.showTextDocument(document);
            } else if (result === '查看图谱') {
                // 动态导入避免循环依赖
                const { showKnowledgeGraphCommand } = await import('./showKnowledgeGraph.js');
                await showKnowledgeGraphCommand();
            }
            
        } catch (error) {
            console.error('构建知识图谱失败:', error);
            vscode.window.showErrorMessage(`构建知识图谱失败: ${error}`);
        }
    });
}