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
exports.buildKnowledgeGraphCommand = buildKnowledgeGraphCommand;
const vscode = __importStar(require("vscode"));
const fsUtils_1 = require("../fsUtils");
const parser_1 = require("../parser");
const graph_1 = require("../graph");
const KnowledgeGraphVectorizer_1 = require("../vectorization/KnowledgeGraphVectorizer");
/**
 * 构建知识图谱命令处理器
 */
async function buildKnowledgeGraphCommand() {
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
            const files = await (0, fsUtils_1.scanWorkspace)(workspacePath);
            console.log(`找到 ${files.length} 个支持的文件`);
            if (files.length === 0) {
                vscode.window.showWarningMessage('工作区中没有找到支持的文件类型');
                return;
            }
            progress.report({ increment: 20, message: '初始化解析器...' });
            // 2. 初始化解析器
            const parser = new parser_1.TreeSitterParser();
            const allEntities = [];
            const fileImports = new Map();
            const fileExports = new Map();
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
                    const content = await (0, fsUtils_1.readFileContent)(file.path);
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
                }
                catch (error) {
                    console.error(`解析文件 ${file.path} 失败:`, error);
                }
            }
            console.log(`共解析出 ${allEntities.length} 个代码实体`);
            progress.report({ increment: 70, message: '构建知识图谱...' });
            // 4. 获取关系过滤配置
            const config = vscode.workspace.getConfiguration('graphrag');
            const relationshipFilters = {
                enableContains: config.get('relationshipFilters.enableContains', graph_1.DEFAULT_RELATIONSHIP_FILTERS.enableContains),
                enableDefinedIn: config.get('relationshipFilters.enableDefinedIn', graph_1.DEFAULT_RELATIONSHIP_FILTERS.enableDefinedIn),
                enableImportsExports: config.get('relationshipFilters.enableImportsExports', graph_1.DEFAULT_RELATIONSHIP_FILTERS.enableImportsExports),
                enableCalls: config.get('relationshipFilters.enableCalls', graph_1.DEFAULT_RELATIONSHIP_FILTERS.enableCalls),
                enableSemanticRelated: config.get('relationshipFilters.enableSemanticRelated', graph_1.DEFAULT_RELATIONSHIP_FILTERS.enableSemanticRelated),
                minRelationWeight: config.get('relationshipFilters.minRelationWeight', graph_1.DEFAULT_RELATIONSHIP_FILTERS.minRelationWeight)
            };
            // 构建知识图谱
            const graphBuilder = new graph_1.GraphBuilder(workspacePath, relationshipFilters);
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
                const vectorizer = new KnowledgeGraphVectorizer_1.KnowledgeGraphVectorizer(workspacePath, embeddingConfig);
                // 向量化所有节点
                vectorizationResult = await vectorizer.vectorizeKnowledgeGraph(knowledgeGraph.nodes, 'knowledge_graph', (progress, total, message) => {
                    console.log(`向量化进度: ${progress}/${total} - ${message}`);
                });
                console.log('✅ 知识图谱向量化完成:', vectorizationResult);
                // 关闭数据库连接
                await vectorizer.close();
            }
            catch (vectorError) {
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
            }
            else {
                message += `- 向量化: 失败\n`;
            }
            // 添加关系过滤信息
            message += `- 关系过滤: ${Object.values(relationshipFilters).filter(v => v === true).length}个类型启用\n`;
            message += `- 数据存储: SQLite向量数据库`;
            const result = await vscode.window.showInformationMessage(message, '查看图谱', '搜索功能');
            if (result === '查看图谱') {
                // 动态导入避免循环依赖
                const { showKnowledgeGraphCommand } = await import('./showKnowledgeGraph.js');
                await showKnowledgeGraphCommand();
            }
            else if (result === '搜索功能') {
                // 动态导入避免循环依赖
                const { searchKnowledgeGraphCommand } = await import('./searchKnowledgeGraph.js');
                await searchKnowledgeGraphCommand();
            }
        }
        catch (error) {
            console.error('构建知识图谱失败:', error);
            vscode.window.showErrorMessage(`构建知识图谱失败: ${error}`);
        }
    });
}
//# sourceMappingURL=buildKnowledgeGraph.js.map