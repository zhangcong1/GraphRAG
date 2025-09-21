import * as vscode from 'vscode';
import * as path from 'path';
import { KnowledgeGraphVectorizer } from '../vectorization/KnowledgeGraphVectorizer';
import { readFileContent } from '../fsUtils';

/**
 * 搜索结果项接口
 */
interface SearchResultItem extends vscode.QuickPickItem {
    score: number;
    nodeId: string;
    filePath?: string;
    startLine?: number;
    endLine?: number;
    metadata: Record<string, any>;
}

/**
 * 知识图谱向量搜索命令处理器
 */
export async function searchKnowledgeGraphCommand(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('请先打开一个工作区');
        return;
    }

    const workspacePath = workspaceFolders[0].uri.fsPath;
    
    try {
        // 1. 检查是否存在向量数据库
        const config = vscode.workspace.getConfiguration('graphrag');
        const embeddingConfig = {
            apiUrl: config.get('embeddingApiUrl', 'http://10.30.235.27:46600'),
            model: config.get('embeddingModel', 'Qwen3-Embedding-8B')
        };
        
        const vectorizer = new KnowledgeGraphVectorizer(workspacePath, embeddingConfig);
        
        // 检查是否有知识图谱数据
        const hasKnowledgeGraph = await vectorizer.hasKnowledgeGraph();
        
        if (!hasKnowledgeGraph) {
            const result = await vscode.window.showWarningMessage(
                '没有找到向量数据库，需要先构建知识图谱并启用向量化功能',
                '构建知识图谱'
            );
            
            if (result === '构建知识图谱') {
                const { buildKnowledgeGraphCommand } = await import('./buildKnowledgeGraph.js');
                await buildKnowledgeGraphCommand();
            }
            return;
        }
        
        const stats = await vectorizer.getVectorDBStats();
        
        if (stats.totalDocuments === 0) {
            const result = await vscode.window.showWarningMessage(
                '没有找到向量数据，需要先构建知识图谱并启用向量化功能',
                '构建知识图谱'
            );
            
            if (result === '构建知识图谱') {
                const { buildKnowledgeGraphCommand } = await import('./buildKnowledgeGraph.js');
                await buildKnowledgeGraphCommand();
            }
            await vectorizer.close();
            return;
        }

        // 2. 使用默认集合
        const selectedCollection = 'knowledge_graph';
        
        // 简化处理，使用默认集合
        console.log(`使用集合: ${selectedCollection}`);
        console.log(`文档数量: ${stats.totalDocuments}`);

        // 3. 输入搜索查询
        const query = await vscode.window.showInputBox({
            title: '知识图谱向量搜索',
            placeHolder: '输入搜索查询，例如：用户认证功能、数据库操作、API接口...',
            prompt: `在集合 "${selectedCollection}" 中搜索相关代码`
        });

        if (!query) {
            return;
        }

        // 4. 执行搜索
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: '向量搜索中...',
            cancellable: false
        }, async (progress) => {
            try {
                progress.report({ increment: 20, message: '准备搜索...' });
                
                // 获取搜索参数
                const topK = vscode.workspace.getConfiguration('graphrag').get('searchTopK', 10);
                const threshold = vscode.workspace.getConfiguration('graphrag').get('searchThreshold', 0.5);
                
                progress.report({ increment: 50, message: '执行向量搜索...' });
                
                const searchResults = await vectorizer.searchSimilarNodes(
                    query,
                    selectedCollection,
                    { topK, threshold }
                );

                progress.report({ increment: 80, message: '处理搜索结果...' });

                if (searchResults.length === 0) {
                    vscode.window.showInformationMessage('没有找到相关的代码片段');
                    await vectorizer.close();
                    return;
                }

                // 5. 转换为快速选择项
                const quickPickItems: SearchResultItem[] = searchResults.map((result: any, index: number) => {
                    const doc = result.document;
                    const metadata = doc.metadata;
                    
                    // 格式化相似度分数
                    const scorePercent = (result.score * 100).toFixed(1);
                    
                    // 构建描述文本
                    let description = `相似度: ${scorePercent}%`;
                    if (metadata.fileName) {
                        description += ` | ${metadata.fileName}`;
                    }
                    if (metadata.elementType) {
                        description += ` | ${metadata.elementType}`;
                    }
                    
                    // 构建详细信息
                    let detail = doc.content.substring(0, 100);
                    if (doc.content.length > 100) {
                        detail += '...';
                    }
                    
                    return {
                        label: `${index + 1}. ${metadata.nodeId || doc.id}`,
                        description,
                        detail,
                        score: result.score,
                        nodeId: doc.id,
                        filePath: metadata.filePath,
                        startLine: metadata.startLine,
                        endLine: metadata.endLine,
                        metadata
                    };
                });

                progress.report({ increment: 100, message: '完成!' });

                // 6. 显示搜索结果
                const selectedItem = await vscode.window.showQuickPick(quickPickItems, {
                    title: `搜索结果 (${searchResults.length} 项)`,
                    placeHolder: '选择代码片段查看详情...',
                    matchOnDescription: true,
                    matchOnDetail: true
                });

                if (selectedItem) {
                    await handleSearchResultSelection(selectedItem);
                }
                
                // 关闭数据库连接
                await vectorizer.close();

            } catch (error) {
                console.error('向量搜索失败:', error);
                vscode.window.showErrorMessage(`向量搜索失败: ${error}`);
            }
        });

    } catch (error) {
        console.error('搜索知识图谱失败:', error);
        vscode.window.showErrorMessage(`搜索失败: ${error}`);
    }
}

/**
 * 处理搜索结果选择
 */
async function handleSearchResultSelection(item: SearchResultItem): Promise<void> {
    try {
        // 显示详细信息对话框
        const actions = ['跳转到代码', '查看完整内容', '复制内容'];
        if (item.filePath) {
            actions.unshift('打开文件');
        }

        const detailMessage = [
            `节点ID: ${item.nodeId}`,
            `相似度: ${(item.score * 100).toFixed(1)}%`,
            item.metadata.fileName ? `文件: ${item.metadata.fileName}` : '',
            item.metadata.elementType ? `类型: ${item.metadata.elementType}` : '',
            item.metadata.startLine ? `行号: ${item.metadata.startLine}-${item.metadata.endLine}` : '',
            '',
            '内容预览:',
            item.detail
        ].filter(line => line !== '').join('\n');

        const action = await vscode.window.showInformationMessage(
            detailMessage,
            ...actions
        );

        switch (action) {
            case '打开文件':
                if (item.filePath) {
                    await openFileAtLocation(item.filePath, item.startLine, item.endLine);
                }
                break;

            case '跳转到代码':
                if (item.filePath) {
                    await openFileAtLocation(item.filePath, item.startLine, item.endLine);
                } else {
                    vscode.window.showWarningMessage('无法确定文件位置');
                }
                break;

            case '查看完整内容':
                await showFullContent(item);
                break;

            case '复制内容':
                await vscode.env.clipboard.writeText(item.detail || '');
                vscode.window.showInformationMessage('内容已复制到剪贴板');
                break;
        }

    } catch (error) {
        console.error('处理搜索结果失败:', error);
        vscode.window.showErrorMessage(`处理失败: ${error}`);
    }
}

/**
 * 在指定位置打开文件
 */
async function openFileAtLocation(filePath: string, startLine?: number, endLine?: number): Promise<void> {
    try {
        const uri = vscode.Uri.file(filePath);
        const document = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(document);

        if (startLine !== undefined) {
            // 跳转到指定行并高亮选择
            const line = Math.max(0, startLine - 1); // VS Code 行号从0开始
            const endLineNum = endLine !== undefined ? Math.max(line, endLine - 1) : line;
            
            const startPos = new vscode.Position(line, 0);
            const endPos = new vscode.Position(endLineNum, document.lineAt(endLineNum).text.length);
            
            editor.selection = new vscode.Selection(startPos, endPos);
            editor.revealRange(new vscode.Range(startPos, endPos), vscode.TextEditorRevealType.InCenter);
        }
    } catch (error) {
        console.error('打开文件失败:', error);
        vscode.window.showErrorMessage(`打开文件失败: ${error}`);
    }
}

/**
 * 显示完整内容
 */
async function showFullContent(item: SearchResultItem): Promise<void> {
    try {
        // 创建一个临时文档显示完整内容
        const content = [
            `# 搜索结果详情`,
            ``,
            `**节点ID:** ${item.nodeId}`,
            `**相似度:** ${(item.score * 100).toFixed(1)}%`,
            item.metadata.fileName ? `**文件:** ${item.metadata.fileName}` : '',
            item.metadata.elementType ? `**类型:** ${item.metadata.elementType}` : '',
            item.metadata.startLine ? `**行号:** ${item.metadata.startLine}-${item.metadata.endLine}` : '',
            '',
            '## 完整内容',
            '',
            '```',
            item.detail,
            '```',
            '',
            '## 元数据',
            '',
            Object.entries(item.metadata)
                .map(([key, value]) => `**${key}:** ${value}`)
                .join('\n')
        ].filter(line => line !== '').join('\n');

        // 创建新的无标题文档
        const doc = await vscode.workspace.openTextDocument({
            content,
            language: 'markdown'
        });

        await vscode.window.showTextDocument(doc);

    } catch (error) {
        console.error('显示完整内容失败:', error);
        vscode.window.showErrorMessage(`显示内容失败: ${error}`);
    }
}

/**
 * 批量搜索命令（支持多个查询）
 */
export async function batchSearchKnowledgeGraphCommand(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('请先打开一个工作区');
        return;
    }

    const workspacePath = workspaceFolders[0].uri.fsPath;
    
    try {
        // 输入多个查询，用换行分隔
        const input = await vscode.window.showInputBox({
            title: '批量向量搜索',
            placeHolder: '输入多个搜索查询，每行一个...',
            prompt: '例如：\n用户认证\n数据库操作\nAPI接口'
        });

        if (!input) {
            return;
        }

        const queries = input.split('\n').map(q => q.trim()).filter(q => q.length > 0);
        
        if (queries.length === 0) {
            vscode.window.showWarningMessage('请输入至少一个有效查询');
            return;
        }

        const config = vscode.workspace.getConfiguration('graphrag');
        const embeddingConfig = {
            apiUrl: config.get('embeddingApiUrl', 'http://10.30.235.27:46600'),
            model: config.get('embeddingModel', 'Qwen3-Embedding-8B')
        };
        
        const vectorizer = new KnowledgeGraphVectorizer(workspacePath, embeddingConfig);
        const results: Array<{ query: string; results: any[] }> = [];

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: '执行批量搜索...',
            cancellable: false
        }, async (progress) => {
            const topK = 5; // 每个查询返回5个结果
            
            for (let i = 0; i < queries.length; i++) {
                const query = queries[i];
                progress.report({ 
                    increment: (100 / queries.length), 
                    message: `搜索: ${query} (${i + 1}/${queries.length})` 
                });

                try {
                    const searchResults = await vectorizer.searchSimilarNodes(query, 'knowledge_graph', { topK });
                    results.push({ query, results: searchResults });
                } catch (error) {
                    console.error(`查询 "${query}" 失败:`, error);
                    results.push({ query, results: [] });
                }
            }
        });

        // 生成搜索报告
        await generateSearchReport(results);

    } catch (error) {
        console.error('批量搜索失败:', error);
        vscode.window.showErrorMessage(`批量搜索失败: ${error}`);
    }
}

/**
 * 生成搜索报告
 */
async function generateSearchReport(results: Array<{ query: string; results: any[] }>): Promise<void> {
    const reportContent = [
        '# 知识图谱批量搜索报告',
        '',
        `**生成时间:** ${new Date().toLocaleString()}`,
        `**搜索查询数:** ${results.length}`,
        '',
        '## 搜索结果',
        ''
    ];

    results.forEach((result, index) => {
        reportContent.push(`### ${index + 1}. ${result.query}`);
        reportContent.push('');
        
        if (result.results.length === 0) {
            reportContent.push('*没有找到相关结果*');
        } else {
            result.results.forEach((item, itemIndex) => {
                const doc = item.document;
                const score = (item.score * 100).toFixed(1);
                
                reportContent.push(`**${itemIndex + 1}.** ${doc.metadata.nodeId || doc.id} (相似度: ${score}%)`);
                reportContent.push(`- 文件: ${doc.metadata.fileName || '未知'}`);
                reportContent.push(`- 类型: ${doc.metadata.elementType || '未知'}`);
                reportContent.push(`- 内容: ${doc.content.substring(0, 100)}${doc.content.length > 100 ? '...' : ''}`);
                reportContent.push('');
            });
        }
        
        reportContent.push('---');
        reportContent.push('');
    });

    const reportDoc = await vscode.workspace.openTextDocument({
        content: reportContent.join('\n'),
        language: 'markdown'
    });

    await vscode.window.showTextDocument(reportDoc);
}