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
exports.showKnowledgeGraphCommand = showKnowledgeGraphCommand;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const d3Visualization_1 = require("../webview/d3Visualization");
const KnowledgeGraphVectorizer_1 = require("../vectorization/KnowledgeGraphVectorizer");
/**
 * 从向量数据库重建知识图谱用于可视化
 */
async function buildKnowledgeGraphFromVectorDB(workspacePath) {
    try {
        const config = vscode.workspace.getConfiguration('graphrag');
        const embeddingConfig = {
            apiUrl: config.get('embeddingApiUrl', 'http://10.30.235.27:46600'),
            model: config.get('embeddingModel', 'Qwen3-Embedding-8B')
        };
        const vectorizer = new KnowledgeGraphVectorizer_1.KnowledgeGraphVectorizer(workspacePath, embeddingConfig);
        // 检查是否有向量数据
        const hasVectorData = await vectorizer.hasKnowledgeGraph();
        if (!hasVectorData) {
            await vectorizer.close();
            return null;
        }
        // 从向量数据库中检索所有文档并重建知识图谱
        const collectionInfo = await vectorizer.getCollectionInfo('knowledge_graph');
        if (!collectionInfo) {
            await vectorizer.close();
            return null;
        }
        // 获取统计信息
        const stats = await vectorizer.getVectorDBStats();
        // 获取所有向量文档
        const sqliteDB = vectorizer.vectorDB; // 获取私有属性用于查询
        await sqliteDB.initialize();
        // 查询所有文档
        const documents = await new Promise((resolve, reject) => {
            sqliteDB.db.all("SELECT id, vector, content, metadata FROM vector_documents WHERE collection_name = ?", ['knowledge_graph'], (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
        await vectorizer.close();
        // 重建节点
        const nodes = [];
        const nodeIdSet = new Set();
        const nodeMap = new Map();
        // 处理每个文档
        for (const doc of documents) {
            try {
                const metadata = JSON.parse(doc.metadata);
                const vector = JSON.parse(doc.vector);
                // 创建节点
                const node = {
                    id: doc.id,
                    name: metadata.nodeId || doc.id,
                    type: 'entity', // 默认类型
                    properties: metadata
                };
                // 根据元数据设置节点类型和属性
                if (metadata.elementType) {
                    node.type = 'entity';
                    node.element_type = metadata.elementType;
                }
                else if (metadata.fileName) {
                    node.type = 'file';
                    node.path = metadata.filePath;
                }
                // 设置路径属性（用于代码跳转）
                if (metadata.filePath) {
                    node.path = metadata.filePath;
                }
                // 添加行号信息（如果存在）
                if (metadata.startLine !== undefined) {
                    node.properties.start_line = metadata.startLine;
                }
                if (metadata.endLine !== undefined) {
                    node.properties.end_line = metadata.endLine;
                }
                nodes.push(node);
                nodeIdSet.add(doc.id);
                nodeMap.set(doc.id, node);
            }
            catch (parseError) {
                console.warn('解析文档元数据失败:', doc.id, parseError);
            }
        }
        // 为可视化创建简化的关系（基于节点类型和文件路径）
        const edges = [];
        const fileNodes = nodes.filter(n => n.type === 'file');
        const entityNodes = nodes.filter(n => n.type === 'entity');
        // 创建文件到实体的关系
        for (const entity of entityNodes) {
            if (entity.path) {
                const fileNode = fileNodes.find(f => f.path === entity.path);
                if (fileNode) {
                    edges.push({
                        id: `edge_${entity.id}_${fileNode.id}`,
                        source: fileNode.id,
                        target: entity.id,
                        relation: 'CONTAINS',
                        weight: 1.0,
                        properties: {}
                    });
                }
            }
        }
        // 创建相同文件中实体之间的关系
        const entitiesByFile = new Map();
        for (const entity of entityNodes) {
            if (entity.path) {
                if (!entitiesByFile.has(entity.path)) {
                    entitiesByFile.set(entity.path, []);
                }
                entitiesByFile.get(entity.path).push(entity);
            }
        }
        // 为同一文件中的实体创建关系
        for (const [filePath, entities] of entitiesByFile.entries()) {
            for (let i = 0; i < entities.length - 1; i++) {
                for (let j = i + 1; j < entities.length; j++) {
                    edges.push({
                        id: `edge_${entities[i].id}_${entities[j].id}`,
                        source: entities[i].id,
                        target: entities[j].id,
                        relation: 'RELATED_TO',
                        weight: 0.5,
                        properties: {
                            same_file: true
                        }
                    });
                }
            }
        }
        // 构建简化的知识图谱结构用于可视化
        const knowledgeGraph = {
            nodes: nodes,
            edges: edges,
            communities: [
                {
                    id: 'vector_community',
                    nodes: Array.from(nodeIdSet),
                    score: 1.0,
                    description: '向量数据库社区',
                    tags: ['vector', 'database', 'sqlite']
                }
            ],
            metadata: {
                version: '1.0.0',
                created_at: collectionInfo?.created_at || new Date().toISOString(),
                total_files: fileNodes.length,
                total_entities: entityNodes.length,
                total_relationships: edges.length,
                workspace_path: workspacePath
            }
        };
        return knowledgeGraph;
    }
    catch (error) {
        console.error('从向量数据库重建知识图谱失败:', error);
        return null;
    }
}
/**
 * 处理跳转到代码的消息
 */
async function handleNavigateToCode(data, workspacePath) {
    console.log('🚀 开始处理代码跳转:', data);
    try {
        let filePath;
        let startLine;
        let endLine;
        if (data.type === 'entity' && data.properties) {
            // 代码实体节点
            filePath = data.properties.file_path || data.path;
            startLine = data.properties.start_line;
            endLine = data.properties.end_line;
            console.log('📝 代码实体节点:', { filePath, startLine, endLine });
        }
        else if (data.type === 'file') {
            // 文件节点
            filePath = data.path;
            console.log('📁 文件节点:', { filePath });
        }
        else {
            console.log('⚠️ 不支持的节点类型:', data.type);
            vscode.window.showWarningMessage('该节点不支持跳转到代码');
            return;
        }
        if (!filePath) {
            console.log('❌ 没有找到文件路径');
            vscode.window.showWarningMessage('找不到文件路径');
            return;
        }
        // 如果是相对路径，转换为绝对路径
        if (!path.isAbsolute(filePath)) {
            filePath = path.join(workspacePath, filePath);
        }
        console.log('🔍 准备打开文件:', filePath);
        // 检查文件是否存在
        const uri = vscode.Uri.file(filePath);
        try {
            await vscode.workspace.fs.stat(uri);
            console.log('✅ 文件存在，继续打开');
        }
        catch (error) {
            console.log('❌ 文件不存在:', filePath);
            vscode.window.showErrorMessage(`文件不存在: ${filePath}`);
            return;
        }
        // 打开文件
        console.log('📄 正在打开文件...');
        const document = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(document);
        // 如果有行号信息，跳转并选中对应代码范围
        if (typeof startLine === 'number' && typeof endLine === 'number') {
            console.log(`🎯 跳转到行号: ${startLine}-${endLine}`);
            const startPos = new vscode.Position(Math.max(0, startLine - 1), 0);
            const endPos = new vscode.Position(Math.max(0, endLine - 1), Number.MAX_SAFE_INTEGER);
            const range = new vscode.Range(startPos, endPos);
            // 选中范围
            editor.selection = new vscode.Selection(range.start, range.end);
            // 跳转到该范围
            editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
            vscode.window.showInformationMessage(`跳转到 ${path.basename(filePath)} 第 ${startLine}-${endLine} 行`);
            console.log('✅ 成功跳转到指定行号');
        }
        else {
            // 只打开文件，不做选中
            vscode.window.showInformationMessage(`打开文件: ${path.basename(filePath)}`);
            console.log('✅ 成功打开文件');
        }
    }
    catch (error) {
        console.error('跳转到代码失败:', error);
        vscode.window.showErrorMessage(`跳转失败: ${error}`);
    }
}
/**
 * 显示知识图谱命令处理器
 */
async function showKnowledgeGraphCommand() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('请先打开一个工作区');
        return;
    }
    const workspacePath = workspaceFolders[0].uri.fsPath;
    try {
        // 先尝试从向量数据库重建知识图谱
        let kg = await buildKnowledgeGraphFromVectorDB(workspacePath);
        if (!kg) {
            const result = await vscode.window.showWarningMessage('没有找到向量数据库数据，是否要先构建知识图谱？', '构建知识图谱', '取消');
            if (result === '构建知识图谱') {
                const { buildKnowledgeGraphCommand } = await import('./buildKnowledgeGraph.js');
                await buildKnowledgeGraphCommand();
                // 重新尝试加载
                kg = await buildKnowledgeGraphFromVectorDB(workspacePath);
            }
            if (!kg) {
                return; // 仍然没有数据，退出
            }
        }
        // 创建并显示 WebView
        const panel = vscode.window.createWebviewPanel('knowledgeGraph', '知识图谱可视化', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true
        });
        // 处理来自WebView的消息
        panel.webview.onDidReceiveMessage(async (message) => {
            console.log('🔔 收到WebView消息:', message);
            switch (message.command) {
                case 'navigateToCode':
                    console.log('📍 处理跳转请求:', message.data);
                    await handleNavigateToCode(message.data, workspacePath);
                    break;
                default:
                    console.log('❓ 未知命令:', message.command);
                    break;
            }
        }, undefined);
        panel.webview.html = (0, d3Visualization_1.generateD3WebviewContent)(kg);
    }
    catch (error) {
        vscode.window.showErrorMessage(`无法加载知识图谱: ${error}`);
    }
}
//# sourceMappingURL=showKnowledgeGraph.js.map