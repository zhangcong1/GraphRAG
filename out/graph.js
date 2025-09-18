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
exports.GraphBuilder = void 0;
const path = __importStar(require("path"));
/**
 * 图构建器
 */
class GraphBuilder {
    nodes = new Map();
    edges = new Map();
    workspacePath;
    constructor(workspacePath) {
        this.workspacePath = workspacePath;
    }
    /**
     * 从代码实体构建知识图谱
     */
    buildGraph(entities, fileImports, fileExports) {
        // 清空之前的数据
        this.nodes.clear();
        this.edges.clear();
        // 1. 创建文件和目录节点
        this.createFileAndDirectoryNodes(entities);
        // 2. 创建实体节点
        this.createEntityNodes(entities);
        // 3. 创建包含关系 (CONTAINS)
        this.createContainsRelationships(entities);
        // 4. 创建定义关系 (DEFINED_IN)
        this.createDefinedInRelationships(entities);
        // 5. 创建导入/导出关系
        this.createImportExportRelationships(fileImports, fileExports);
        // 6. 创建调用关系
        this.createCallRelationships(entities);
        // 7. 创建语义关系
        this.createSemanticRelationships(entities);
        // 8. 检测社区
        const communities = this.detectCommunities();
        return {
            nodes: Array.from(this.nodes.values()),
            edges: Array.from(this.edges.values()),
            communities,
            metadata: {
                version: '1.0.0',
                created_at: new Date().toISOString(),
                total_files: this.countFileNodes(),
                total_entities: entities.length,
                total_relationships: this.edges.size,
                workspace_path: this.workspacePath
            }
        };
    }
    /**
     * 创建文件和目录节点
     */
    createFileAndDirectoryNodes(entities) {
        const processedPaths = new Set();
        for (const entity of entities) {
            const filePath = entity.file_path;
            if (!processedPaths.has(filePath)) {
                processedPaths.add(filePath);
                // 创建文件节点
                const fileId = this.getFileId(filePath);
                const fileName = path.basename(filePath);
                const relativePath = path.relative(this.workspacePath, filePath);
                this.nodes.set(fileId, {
                    id: fileId,
                    type: 'file',
                    name: fileName,
                    path: relativePath,
                    properties: {
                        absolute_path: filePath,
                        extension: path.extname(filePath),
                        language: entity.language || 'unknown',
                        size: 0 // 可以后续添加文件大小
                    }
                });
                // 创建目录节点层次结构
                this.createDirectoryHierarchy(filePath);
            }
        }
    }
    /**
     * 创建目录层次结构
     */
    createDirectoryHierarchy(filePath) {
        const relativePath = path.relative(this.workspacePath, filePath);
        const pathParts = path.dirname(relativePath).split(path.sep);
        let currentPath = '';
        for (let i = 0; i < pathParts.length; i++) {
            if (pathParts[i] === '.' || pathParts[i] === '')
                continue;
            const parentPath = currentPath;
            currentPath = currentPath ? path.join(currentPath, pathParts[i]) : pathParts[i];
            const dirId = this.getDirectoryId(currentPath);
            if (!this.nodes.has(dirId)) {
                this.nodes.set(dirId, {
                    id: dirId,
                    type: 'directory',
                    name: pathParts[i],
                    path: currentPath,
                    properties: {
                        level: i,
                        full_path: path.join(this.workspacePath, currentPath)
                    }
                });
                // 创建父目录包含关系
                if (parentPath) {
                    const parentDirId = this.getDirectoryId(parentPath);
                    this.addEdge(parentDirId, dirId, 'CONTAINS', 1.0);
                }
            }
        }
        // 创建目录包含文件的关系
        if (pathParts.length > 0 && pathParts[0] !== '.') {
            const dirPath = path.dirname(relativePath);
            if (dirPath !== '.') {
                const dirId = this.getDirectoryId(dirPath);
                const fileId = this.getFileId(filePath);
                this.addEdge(dirId, fileId, 'CONTAINS', 1.0);
            }
        }
    }
    /**
     * 创建实体节点
     */
    createEntityNodes(entities) {
        for (const entity of entities) {
            const entityId = this.getEntityId(entity);
            this.nodes.set(entityId, {
                id: entityId,
                type: 'entity',
                name: entity.name,
                path: entity.file_path,
                entity: entity,
                properties: {
                    element_type: entity.element_type,
                    start_line: entity.start_line,
                    end_line: entity.end_line,
                    language: entity.language,
                    semantic_tags: entity.semantic_tags,
                    file_name: entity.file_name
                }
            });
        }
    }
    /**
     * 创建包含关系
     */
    createContainsRelationships(entities) {
        for (const entity of entities) {
            const fileId = this.getFileId(entity.file_path);
            const entityId = this.getEntityId(entity);
            this.addEdge(fileId, entityId, 'CONTAINS', 1.0);
        }
    }
    /**
     * 创建定义关系
     */
    createDefinedInRelationships(entities) {
        for (const entity of entities) {
            const fileId = this.getFileId(entity.file_path);
            const entityId = this.getEntityId(entity);
            this.addEdge(entityId, fileId, 'DEFINED_IN', 1.0);
        }
    }
    /**
     * 创建导入/导出关系
     */
    createImportExportRelationships(fileImports, fileExports) {
        // 处理导入关系
        for (const [filePath, imports] of fileImports.entries()) {
            const fileId = this.getFileId(filePath);
            for (const importPath of imports) {
                // 解析导入路径
                const resolvedPath = this.resolveImportPath(filePath, importPath);
                if (resolvedPath) {
                    const targetFileId = this.getFileId(resolvedPath);
                    if (this.nodes.has(targetFileId)) {
                        this.addEdge(fileId, targetFileId, 'IMPORTS', 1.0, {
                            import_path: importPath
                        });
                    }
                }
            }
        }
        // 处理导出关系
        for (const [filePath, exports] of fileExports.entries()) {
            const fileId = this.getFileId(filePath);
            // 可以在这里添加更复杂的导出关系逻辑
            // 目前简单地为每个导出创建属性
            const fileNode = this.nodes.get(fileId);
            if (fileNode) {
                fileNode.properties.exports = exports;
            }
        }
    }
    /**
     * 创建调用关系
     */
    createCallRelationships(entities) {
        // 简化实现：基于代码片段中的函数调用模式
        const functionEntities = entities.filter(e => e.element_type === 'function');
        const functionMap = new Map();
        // 按文件分组函数
        for (const func of functionEntities) {
            const filePath = func.file_path;
            if (!functionMap.has(filePath)) {
                functionMap.set(filePath, []);
            }
            functionMap.get(filePath).push(func);
        }
        // 在每个文件内部查找函数调用
        for (const entity of entities) {
            if (entity.element_type === 'function') {
                const calledFunctions = this.extractFunctionCalls(entity.code_snippet);
                for (const calledName of calledFunctions) {
                    // 查找被调用的函数
                    const targetFunctions = this.findFunctionsByName(entities, calledName);
                    for (const targetFunc of targetFunctions) {
                        if (targetFunc.file_path !== entity.file_path || targetFunc.name !== entity.name) {
                            const sourceId = this.getEntityId(entity);
                            const targetId = this.getEntityId(targetFunc);
                            this.addEdge(sourceId, targetId, 'CALLS', 1.0, {
                                call_name: calledName
                            });
                        }
                    }
                }
            }
        }
    }
    /**
     * 创建语义关系
     */
    createSemanticRelationships(entities) {
        // 基于语义标签创建关系
        for (let i = 0; i < entities.length; i++) {
            for (let j = i + 1; j < entities.length; j++) {
                const entityA = entities[i];
                const entityB = entities[j];
                // 计算语义相似度
                const similarity = this.calculateSemanticSimilarity(entityA, entityB);
                if (similarity > 0.3) { // 阈值可调
                    const idA = this.getEntityId(entityA);
                    const idB = this.getEntityId(entityB);
                    this.addEdge(idA, idB, 'RELATED_TO', similarity, {
                        similarity_score: similarity,
                        common_tags: this.getCommonTags(entityA.semantic_tags, entityB.semantic_tags)
                    });
                }
            }
        }
    }
    /**
     * 检测社区
     */
    detectCommunities() {
        const communities = [];
        const visited = new Set();
        const nodeIds = Array.from(this.nodes.keys());
        // 使用连通组件检测进行简单的社区发现
        for (const nodeId of nodeIds) {
            if (!visited.has(nodeId)) {
                const community = this.findConnectedComponent(nodeId, visited);
                if (community.length > 1) { // 只保留包含多个节点的社区
                    communities.push({
                        id: `community_${communities.length + 1}`,
                        nodes: community,
                        score: this.calculateCommunityScore(community),
                        description: this.generateCommunityDescription(community),
                        tags: this.extractCommunityTags(community)
                    });
                }
            }
        }
        // 按分数排序
        communities.sort((a, b) => b.score - a.score);
        return communities;
    }
    /**
     * 查找连通组件
     */
    findConnectedComponent(startNodeId, visited) {
        const component = [];
        const stack = [startNodeId];
        while (stack.length > 0) {
            const nodeId = stack.pop();
            if (!visited.has(nodeId)) {
                visited.add(nodeId);
                component.push(nodeId);
                // 找到所有相邻节点
                const neighbors = this.getNeighbors(nodeId);
                for (const neighbor of neighbors) {
                    if (!visited.has(neighbor)) {
                        stack.push(neighbor);
                    }
                }
            }
        }
        return component;
    }
    /**
     * 获取节点的邻居
     */
    getNeighbors(nodeId) {
        const neighbors = [];
        for (const edge of this.edges.values()) {
            if (edge.source === nodeId) {
                neighbors.push(edge.target);
            }
            else if (edge.target === nodeId) {
                neighbors.push(edge.source);
            }
        }
        return neighbors;
    }
    /**
     * 计算社区分数
     */
    calculateCommunityScore(nodeIds) {
        let internalEdges = 0;
        let externalEdges = 0;
        for (const edge of this.edges.values()) {
            const sourceInCommunity = nodeIds.includes(edge.source);
            const targetInCommunity = nodeIds.includes(edge.target);
            if (sourceInCommunity && targetInCommunity) {
                internalEdges++;
            }
            else if (sourceInCommunity || targetInCommunity) {
                externalEdges++;
            }
        }
        // 模块度计算的简化版本
        const totalEdges = internalEdges + externalEdges;
        return totalEdges > 0 ? (internalEdges - externalEdges / 2) / totalEdges : 0;
    }
    /**
     * 生成社区描述
     */
    generateCommunityDescription(nodeIds) {
        const nodes = nodeIds.map(id => this.nodes.get(id)).filter(Boolean);
        const entityNodes = nodes.filter(node => node.type === 'entity');
        if (entityNodes.length === 0) {
            return '文件目录社区';
        }
        // 统计最常见的元素类型
        const typeCount = new Map();
        for (const node of entityNodes) {
            const type = node.entity?.element_type || 'unknown';
            typeCount.set(type, (typeCount.get(type) || 0) + 1);
        }
        const mostCommonType = Array.from(typeCount.entries())
            .sort((a, b) => b[1] - a[1])[0];
        return `主要包含 ${mostCommonType?.[1] || 0} 个 ${mostCommonType?.[0] || 'unknown'} 的社区`;
    }
    /**
     * 提取社区标签
     */
    extractCommunityTags(nodeIds) {
        const tagCount = new Map();
        for (const nodeId of nodeIds) {
            const node = this.nodes.get(nodeId);
            if (node?.entity?.semantic_tags) {
                for (const tag of node.entity.semantic_tags) {
                    tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
                }
            }
        }
        // 返回最常见的标签
        return Array.from(tagCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([tag]) => tag);
    }
    // 辅助方法
    getFileId(filePath) {
        return `file:${path.relative(this.workspacePath, filePath)}`;
    }
    getDirectoryId(relativePath) {
        return `dir:${relativePath}`;
    }
    getEntityId(entity) {
        const relativePath = path.relative(this.workspacePath, entity.file_path);
        return `entity:${relativePath}:${entity.element_type}:${entity.name}:${entity.start_line}`;
    }
    addEdge(source, target, relation, weight, properties = {}) {
        const edgeId = `${source}->${target}:${relation}`;
        // 避免重复边
        if (!this.edges.has(edgeId)) {
            this.edges.set(edgeId, {
                id: edgeId,
                source,
                target,
                relation,
                weight,
                properties
            });
        }
    }
    resolveImportPath(fromFile, importPath) {
        // 简化的路径解析逻辑
        if (importPath.startsWith('.')) {
            // 相对路径
            const fromDir = path.dirname(fromFile);
            const resolvedPath = path.resolve(fromDir, importPath);
            // 尝试常见的文件扩展名
            const extensions = ['.js', '.ts', '.vue', '.jsx', '.tsx'];
            for (const ext of extensions) {
                const fullPath = resolvedPath + ext;
                if (this.nodes.has(this.getFileId(fullPath))) {
                    return fullPath;
                }
            }
            // 尝试 index 文件
            for (const ext of extensions) {
                const indexPath = path.join(resolvedPath, 'index' + ext);
                if (this.nodes.has(this.getFileId(indexPath))) {
                    return indexPath;
                }
            }
        }
        return null;
    }
    extractFunctionCalls(codeSnippet) {
        const calls = [];
        const callRegex = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
        let match;
        while ((match = callRegex.exec(codeSnippet)) !== null) {
            const functionName = match[1];
            // 过滤掉一些常见的关键字
            if (!['if', 'for', 'while', 'switch', 'catch', 'function'].includes(functionName)) {
                calls.push(functionName);
            }
        }
        return [...new Set(calls)]; // 去重
    }
    findFunctionsByName(entities, name) {
        return entities.filter(e => e.element_type === 'function' &&
            e.name === name);
    }
    calculateSemanticSimilarity(entityA, entityB) {
        // 基于语义标签计算相似度
        const tagsA = new Set(entityA.semantic_tags);
        const tagsB = new Set(entityB.semantic_tags);
        const intersection = new Set([...tagsA].filter(tag => tagsB.has(tag)));
        const union = new Set([...tagsA, ...tagsB]);
        const jaccardSimilarity = intersection.size / union.size;
        // 考虑文件路径相似性
        const pathSimilarity = this.calculatePathSimilarity(entityA.file_path, entityB.file_path);
        // 考虑名称相似性
        const nameSimilarity = this.calculateNameSimilarity(entityA.name, entityB.name);
        // 加权组合
        return (jaccardSimilarity * 0.5) + (pathSimilarity * 0.3) + (nameSimilarity * 0.2);
    }
    calculatePathSimilarity(pathA, pathB) {
        const dirsA = path.dirname(pathA).split(path.sep);
        const dirsB = path.dirname(pathB).split(path.sep);
        const commonDirs = dirsA.filter(dir => dirsB.includes(dir)).length;
        const totalDirs = new Set([...dirsA, ...dirsB]).size;
        return totalDirs > 0 ? commonDirs / totalDirs : 0;
    }
    calculateNameSimilarity(nameA, nameB) {
        // 简单的字符串相似度
        const longer = nameA.length > nameB.length ? nameA : nameB;
        const shorter = nameA.length > nameB.length ? nameB : nameA;
        if (longer.length === 0)
            return 1.0;
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }
    levenshteinDistance(str1, str2) {
        const matrix = Array(str2.length + 1)
            .fill(null)
            .map(() => Array(str1.length + 1).fill(null));
        for (let i = 0; i <= str1.length; i++) {
            matrix[0][i] = i;
        }
        for (let j = 0; j <= str2.length; j++) {
            matrix[j][0] = j;
        }
        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + indicator);
            }
        }
        return matrix[str2.length][str1.length];
    }
    getCommonTags(tagsA, tagsB) {
        const setA = new Set(tagsA);
        return tagsB.filter(tag => setA.has(tag));
    }
    countFileNodes() {
        return Array.from(this.nodes.values()).filter(node => node.type === 'file').length;
    }
}
exports.GraphBuilder = GraphBuilder;
//# sourceMappingURL=graph.js.map