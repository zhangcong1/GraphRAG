import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { KnowledgeGraphVectorizer } from '../vectorization/KnowledgeGraphVectorizer';

/**
 * 导出知识图谱JSON命令处理器
 */
export async function exportKnowledgeGraphCommand(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('请先打开一个工作区');
        return;
    }

    const workspacePath = workspaceFolders[0].uri.fsPath;
    
    // 检查是否存在向量数据库
    const config = vscode.workspace.getConfiguration('graphrag');
    const embeddingConfig = {
        apiUrl: config.get('embeddingApiUrl', 'http://10.30.235.27:46600'),
        model: config.get('embeddingModel', 'Qwen3-Embedding-8B')
    };
    
    const vectorizer = new KnowledgeGraphVectorizer(workspacePath, embeddingConfig);
    
    const hasVectorData = await vectorizer.hasKnowledgeGraph();
    if (!hasVectorData) {
        const result = await vscode.window.showWarningMessage(
            '没有找到向量数据库，是否要先构建知识图谱？',
            '构建知识图谱',
            '取消'
        );
        
        if (result === '构建知识图谱') {
            const { buildKnowledgeGraphCommand } = await import('./buildKnowledgeGraph.js');
            await buildKnowledgeGraphCommand();
        }
        await vectorizer.close();
        return;
    }

    try {
        // 从向量数据库获取统计信息
        const dbStats = await vectorizer.getVectorDBStats();
        const collectionInfo = await vectorizer.getCollectionInfo('knowledge_graph');
        
        // 构建简化的知识图谱数据
        const kg = {
            metadata: {
                created_at: collectionInfo?.created_at || new Date().toISOString(),
                updated_at: collectionInfo?.updated_at || new Date().toISOString(),
                total_documents: dbStats.totalDocuments,
                dimension: collectionInfo?.dimension || 0,
                database_type: 'sqlite',
                workspace_path: workspacePath
            },
            statistics: {
                collections: dbStats.totalCollections,
                documents: dbStats.totalDocuments,
                vector_dimension: collectionInfo?.dimension || 0
            }
        };
        
        // 让用户选择导出选项
        const exportOptions = [
            '向量数据库统计',
            '集合信息',
            '配置信息'
        ];
        
        const selectedOption = await vscode.window.showQuickPick(exportOptions, {
            placeHolder: '请选择要导出的内容'
        });
        
        if (!selectedOption) {
            return;
        }
        
        // 准备导出数据
        let exportData: any = {};
        let filename = '';
        
        switch (selectedOption) {
            case '向量数据库统计':
                exportData = {
                    database_stats: dbStats,
                    collection_info: collectionInfo,
                    exported_at: new Date().toISOString(),
                    export_type: 'database_stats'
                };
                filename = 'vector_database_stats.json';
                break;
                
            case '集合信息':
                exportData = {
                    collection_info: collectionInfo,
                    metadata: {
                        exported_at: new Date().toISOString(),
                        export_type: 'collection_info'
                    }
                };
                filename = 'collection_info.json';
                break;
                
            case '配置信息':
                const config = vscode.workspace.getConfiguration('graphrag');
                exportData = {
                    configuration: {
                        enableVectorization: config.get('enableVectorization'),
                        autoUpdateEnabled: config.get('autoUpdateEnabled'),
                        embeddingApiUrl: config.get('embeddingApiUrl'),
                        embeddingModel: config.get('embeddingModel'),
                        searchTopK: config.get('searchTopK'),
                        searchThreshold: config.get('searchThreshold'),
                        relationshipFilters: config.get('relationshipFilters')
                    },
                    metadata: {
                        exported_at: new Date().toISOString(),
                        export_type: 'configuration'
                    }
                };
                filename = 'graphrag_config.json';
                break;
                
            default:
                await vectorizer.close();
                return;
        }
        
        // 让用户选择保存位置
        const saveUri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(path.join(workspacePath, filename)),
            filters: {
                'JSON Files': ['json']
            },
            saveLabel: '导出'
        });
        
        if (!saveUri) {
            return;
        }
        
        // 写入文件
        const exportContent = JSON.stringify(exportData, null, 2);
        fs.writeFileSync(saveUri.fsPath, exportContent, 'utf-8');
        
        // 统计信息
        const exportStats = {
            fileSize: (exportContent.length / 1024).toFixed(2),
            totalCollections: exportData.database_stats?.totalCollections || 0,
            totalDocuments: exportData.database_stats?.totalDocuments || dbStats.totalDocuments || 0
        };
        
        let message = `知识图谱导出成功！\n\n`;
        message += `📁 文件路径: ${saveUri.fsPath}\n`;
        message += `📆 文件大小: ${exportStats.fileSize} KB\n`;
        message += `📈 内容统计:\n`;
        
        if (exportStats.totalCollections > 0) {
            message += `  • 集合数量: ${exportStats.totalCollections}\n`;
        }
        if (exportStats.totalDocuments > 0) {
            message += `  • 文档数量: ${exportStats.totalDocuments}\n`;
        }
        
        const result = await vscode.window.showInformationMessage(
            message,
            '打开文件',
            '打开文件夹'
        );
        
        if (result === '打开文件') {
            const document = await vscode.workspace.openTextDocument(saveUri);
            await vscode.window.showTextDocument(document);
        } else if (result === '打开文件夹') {
            const folderUri = vscode.Uri.file(path.dirname(saveUri.fsPath));
            await vscode.commands.executeCommand('vscode.openFolder', folderUri, true);
        }
        
    } catch (error) {
        console.error('导出知识图谱失败:', error);
        vscode.window.showErrorMessage(`导出知识图谱失败: ${error}`);
    }
}
