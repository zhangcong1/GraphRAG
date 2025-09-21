import * as vscode from 'vscode';
import * as path from 'path';
import { scanWorkspace, readFileContent, writeFileContent, ensureDirectory } from '../fsUtils';
import { TreeSitterParser, CodeEntity } from '../parser';
import { GraphBuilder, DEFAULT_RELATIONSHIP_FILTERS, RelationshipFilters } from '../graph';
import { KnowledgeGraphVectorizer } from '../vectorization/KnowledgeGraphVectorizer';

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
            
            // 4. 获取关系过滤配置
            const config = vscode.workspace.getConfiguration('graphrag');
            const relationshipFilters: RelationshipFilters = {
                enableContains: config.get('relationshipFilters.enableContains', DEFAULT_RELATIONSHIP_FILTERS.enableContains),
                enableDefinedIn: config.get('relationshipFilters.enableDefinedIn', DEFAULT_RELATIONSHIP_FILTERS.enableDefinedIn),
                enableImportsExports: config.get('relationshipFilters.enableImportsExports', DEFAULT_RELATIONSHIP_FILTERS.enableImportsExports),
                enableCalls: config.get('relationshipFilters.enableCalls', DEFAULT_RELATIONSHIP_FILTERS.enableCalls),
                enableSemanticRelated: config.get('relationshipFilters.enableSemanticRelated', DEFAULT_RELATIONSHIP_FILTERS.enableSemanticRelated),
                minRelationWeight: config.get('relationshipFilters.minRelationWeight', DEFAULT_RELATIONSHIP_FILTERS.minRelationWeight)
            };
            
            // 构建知识图谱
            const graphBuilder = new GraphBuilder(workspacePath, relationshipFilters);
            const knowledgeGraph = graphBuilder.buildGraph(allEntities, fileImports, fileExports);
            
            progress.report({ increment: 90, message: '向量化知识图谱...' });
            
            // 5. 直接进行向量化处理（必须执行）
            const enableVectorization = config.get('enableVectorization', true);
            let vectorizationResult = null;
            
            // 必须执行向量化，不再是可选项
            try {
                progress.report({ increment: 95, message: '向量化知识图谱...' });
                
                const embeddingConfig = {
                    apiUrl: config.get('embeddingApiUrl', 'http://10.30.235.27:46600'),
                    model: config.get('embeddingModel', 'Qwen3-Embedding-8B')
                };
                
                // 使用 SQLite 向量数据库
                const vectorizer = new KnowledgeGraphVectorizer(
                    workspacePath,
                    embeddingConfig
                );
                
                // 向量化所有节点
                vectorizationResult = await vectorizer.vectorizeKnowledgeGraph(
                    knowledgeGraph.nodes,
                    'knowledge_graph',
                    (progress: number, total: number, message: string) => {
                        console.log(`向量化进度: ${progress}/${total} - ${message}`);
                    }
                );
                
                console.log('✅ 知识图谱向量化完成:', vectorizationResult);
                
                // 关闭数据库连接
                await vectorizer.close();
                
            } catch (vectorError) {
                console.error('向量化失败:', vectorError);
                vscode.window.showErrorMessage(`向量化失败: ${vectorError}`);
                throw vectorError; // 向量化失败时直接抛出错误
            }
            
            progress.report({ increment: 100, message: '完成!' });
            
            // 显示结果
            const stats = knowledgeGraph.metadata;
            let message = `知识图谱构建完成!\n` +
                `- 文件数量: ${stats.total_files}\n` +
                `- 代码实体: ${stats.total_entities}\n` +
                `- 关系数量: ${stats.total_relationships}\n` +
                `- 社区数量: ${knowledgeGraph.communities.length}\n`;
            
            // 添加向量化信息
            if (vectorizationResult) {
                message += `- 向量化节点: ${vectorizationResult.vectorizedNodes}/${vectorizationResult.totalNodes}\n`;
                message += `- 向量维度: ${vectorizationResult.dimension}\n`;
                message += `- 数据库: SQLite\n`;
            } else {
                message += `- 向量化: 失败\n`;
            }
            
            // 添加关系过滤信息
            message += `- 关系过滤: ${Object.values(relationshipFilters).filter(v => v === true).length}个类型启用\n`;
            
            message += `- 数据存储: SQLite向量数据库`;
            
            const result = await vscode.window.showInformationMessage(
                message,
                '查看图谱',
                '搜索功能'
            );
            
            if (result === '查看图谱') {
                // 动态导入避免循环依赖
                const { showKnowledgeGraphCommand } = await import('./showKnowledgeGraph.js');
                await showKnowledgeGraphCommand();
            } else if (result === '搜索功能') {
                // 动态导入避免循环依赖
                const { searchKnowledgeGraphCommand } = await import('./searchKnowledgeGraph.js');
                await searchKnowledgeGraphCommand();
            }
            
        } catch (error) {
            console.error('构建知识图谱失败:', error);
            vscode.window.showErrorMessage(`构建知识图谱失败: ${error}`);
        }
    });
}