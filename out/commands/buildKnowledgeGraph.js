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
const path = __importStar(require("path"));
const fsUtils_1 = require("../fsUtils");
const parser_1 = require("../parser");
const graph_1 = require("../graph");
const MilvusKnowledgeGraphVectorizer_1 = require("../vectorization/MilvusKnowledgeGraphVectorizer");
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
            // 4. 构建知识图谱
            const graphBuilder = new graph_1.GraphBuilder(workspacePath);
            const knowledgeGraph = graphBuilder.buildGraph(allEntities, fileImports, fileExports);
            progress.report({ increment: 90, message: '保存知识图谱...' });
            // 5. 保存知识图谱到 .huima 目录
            const huimaDir = path.join(workspacePath, '.huima');
            await (0, fsUtils_1.ensureDirectory)(huimaDir);
            const outputPath = path.join(huimaDir, 'kg.json');
            const jsonContent = JSON.stringify(knowledgeGraph, null, 2);
            await (0, fsUtils_1.writeFileContent)(outputPath, jsonContent);
            // 同时保存简化版本用于快速预览
            const summaryPath = path.join(huimaDir, 'kg_summary.json');
            const summary = {
                metadata: knowledgeGraph.metadata,
                node_count: knowledgeGraph.nodes.length,
                edge_count: knowledgeGraph.edges.length,
                community_count: knowledgeGraph.communities.length,
                top_communities: knowledgeGraph.communities.slice(0, 5)
            };
            await (0, fsUtils_1.writeFileContent)(summaryPath, JSON.stringify(summary, null, 2));
            // 6. 向量化知识图谱（可选）
            const enableVectorization = vscode.workspace.getConfiguration('graphrag').get('enableVectorization', true);
            let vectorizationResult = null;
            if (enableVectorization) {
                try {
                    progress.report({ increment: 95, message: '向量化知识图谱...' });
                    const vectorizer = new MilvusKnowledgeGraphVectorizer_1.MilvusKnowledgeGraphVectorizer(workspacePath, {
                        apiUrl: vscode.workspace.getConfiguration('graphrag').get('embeddingApiUrl', 'http://10.30.235.27:46600'),
                        model: vscode.workspace.getConfiguration('graphrag').get('embeddingModel', 'Qwen3-Embedding-8B')
                    }, {
                        address: vscode.workspace.getConfiguration('graphrag').get('milvusAddress', 'http://localhost:19530')
                    });
                    // 向量化所有节点
                    vectorizationResult = await vectorizer.vectorizeKnowledgeGraph(knowledgeGraph.nodes, undefined, (progress, total, message) => {
                        console.log(`向量化进度: ${progress}/${total} - ${message}`);
                    });
                    console.log('✅ 知识图谱向量化完成:', vectorizationResult);
                    // 更新知识图谱，添加向量化信息
                    knowledgeGraph.metadata.vectorization = {
                        enabled: true,
                        totalNodes: vectorizationResult.totalNodes,
                        vectorizedNodes: vectorizationResult.vectorizedNodes,
                        skippedNodes: vectorizationResult.skippedNodes,
                        dimension: vectorizationResult.dimension,
                        collectionName: vectorizationResult.collectionName,
                        vectorizedAt: new Date().toISOString()
                    };
                    // 重新保存包含向量化信息的知识图谱
                    await (0, fsUtils_1.writeFileContent)(outputPath, JSON.stringify(knowledgeGraph, null, 2));
                }
                catch (vectorError) {
                    console.warn('向量化失败，但知识图谱构建成功:', vectorError);
                    vscode.window.showWarningMessage(`向量化失败: ${vectorError}`);
                    // 即使向量化失败，也要记录状态
                    knowledgeGraph.metadata.vectorization = {
                        enabled: false,
                        error: vectorError instanceof Error ? vectorError.message : String(vectorError),
                        attemptedAt: new Date().toISOString()
                    };
                    await (0, fsUtils_1.writeFileContent)(outputPath, JSON.stringify(knowledgeGraph, null, 2));
                }
            }
            else {
                console.log('⏭️ 向量化功能已禁用');
                knowledgeGraph.metadata.vectorization = {
                    enabled: false,
                    reason: 'disabled_by_configuration'
                };
                await (0, fsUtils_1.writeFileContent)(outputPath, JSON.stringify(knowledgeGraph, null, 2));
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
            }
            else if (enableVectorization) {
                message += `- 向量化: 已尝试但失败\n`;
            }
            else {
                message += `- 向量化: 已禁用\n`;
            }
            message += `- 输出目录: .huima/\n` +
                `- 主文件: kg.json\n` +
                `- 摘要文件: kg_summary.json`;
            const result = await vscode.window.showInformationMessage(message, '打开文件', '查看图谱');
            if (result === '打开文件') {
                const document = await vscode.workspace.openTextDocument(outputPath);
                await vscode.window.showTextDocument(document);
            }
            else if (result === '查看图谱') {
                // 动态导入避免循环依赖
                const { showKnowledgeGraphCommand } = await import('./showKnowledgeGraph.js');
                await showKnowledgeGraphCommand();
            }
        }
        catch (error) {
            console.error('构建知识图谱失败:', error);
            vscode.window.showErrorMessage(`构建知识图谱失败: ${error}`);
        }
    });
}
//# sourceMappingURL=buildKnowledgeGraph.js.map