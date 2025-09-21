import * as vscode from 'vscode';
import { KnowledgeGraphVectorizer } from '../vectorization/KnowledgeGraphVectorizer';

/**
 * 检查知识图谱状态命令处理器
 */
export async function checkGraphStatusCommand(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('请先打开一个工作区');
        return;
    }

    const workspacePath = workspaceFolders[0].uri.fsPath;
    
    try {
        // 检查向量数据库状态（主要状态来源）
        const config = vscode.workspace.getConfiguration('graphrag');
        const embeddingConfig = {
            apiUrl: config.get('embeddingApiUrl', 'http://10.30.235.27:46600'),
            model: config.get('embeddingModel', 'Qwen3-Embedding-8B')
        };
        
        const vectorizer = new KnowledgeGraphVectorizer(workspacePath, embeddingConfig);
        
        let message = '📊 知识图谱状态检查\\n\\n';
        
        // 检查是否有知识图谱向量数据
        const hasVectorData = await vectorizer.hasKnowledgeGraph();
        message += `💾 向量数据库状态:\\n`;
        message += `  • 数据库类型: SQLite\\n`;
        message += `  • 向量数据: ${hasVectorData ? '✅ 存在' : '❌ 不存在'}\\n`;
        
        if (hasVectorData) {
            const stats = await vectorizer.getVectorDBStats();
            const collectionInfo = await vectorizer.getCollectionInfo('knowledge_graph');
            
            message += `  • 总集合数: ${stats.totalCollections}\\n`;
            message += `  • 总文档数: ${stats.totalDocuments}\\n`;
            
            if (collectionInfo) {
                message += `  • 知识图谱集合文档数: ${collectionInfo.documentCount}\\n`;
                message += `  • 向量维度: ${collectionInfo.dimension}\\n`;
                message += `  • 最后更新: ${collectionInfo.updated_at}\\n`;
            }
        }
        
        await vectorizer.close();
        
        // 检查配置状态
        message += '\\n⚙️ 配置状态:\\n';
        message += `  • 向量化启用: ${config.get('enableVectorization', true) ? '✅ 是' : '❌ 否'}\\n`;
        message += `  • 自动更新启用: ${config.get('autoUpdateEnabled', false) ? '✅ 是' : '❌ 否'}\\n`;
        message += `  • 搜索TopK: ${config.get('searchTopK', 10)}\\n`;
        message += `  • 搜索阈值: ${config.get('searchThreshold', 0.5)}\\n`;
        
        // 检查关系过滤配置
        const relationshipFilters = config.get('relationshipFilters', {});
        const enabledFilters = Object.entries(relationshipFilters).filter(([key, value]) => 
            key.startsWith('enable') && value === true
        ).length;
        message += `  • 启用的关系类型: ${enabledFilters}\\n`;
        
        // 显示结果
        const actions: string[] = [];
        
        if (!hasVectorData) {
            actions.push('构建知识图谱');
        } else {
            actions.push('重新构建');
            actions.push('查看图谱');
            actions.push('搜索功能');
        }
        
        const result = await vscode.window.showInformationMessage(
            message,
            { modal: false },
            ...actions
        );
        
        // 处理用户选择
        if (result === '构建知识图谱' || result === '重新构建') {
            const { buildKnowledgeGraphCommand } = await import('./buildKnowledgeGraph.js');
            await buildKnowledgeGraphCommand();
        } else if (result === '查看图谱') {
            const { showKnowledgeGraphCommand } = await import('./showKnowledgeGraph.js');
            await showKnowledgeGraphCommand();
        } else if (result === '搜索功能') {
            const { searchKnowledgeGraphCommand } = await import('./searchKnowledgeGraph.js');
            await searchKnowledgeGraphCommand();
        }
        
    } catch (error) {
        console.error('检查知识图谱状态失败:', error);
        vscode.window.showErrorMessage(`检查知识图谱状态失败: ${error}`);
    }
}