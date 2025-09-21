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
exports.generateKnowledgeGraphJsonCommand = generateKnowledgeGraphJsonCommand;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const fsUtils_1 = require("../fsUtils");
const parser_1 = require("../parser");
/**
 * 生成标准知识图谱JSON文件命令
 */
async function generateKnowledgeGraphJsonCommand() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage('请先打开一个工作区');
        return;
    }
    const workspacePath = workspaceFolders[0].uri.fsPath;
    // 显示进度条
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: '生成知识图谱JSON',
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
            // 4. 构建标准知识图谱JSON
            const standardGraph = generateStandardKnowledgeGraphJson(workspacePath, allEntities, fileImports, fileExports);
            progress.report({ increment: 90, message: '写入JSON文件...' });
            // 5. 写入JSON文件到项目根目录
            const outputPath = path.join(workspacePath, 'knowledge-graph.json');
            const jsonContent = JSON.stringify(standardGraph, null, 2);
            await (0, fsUtils_1.writeFileContent)(outputPath, jsonContent);
            progress.report({ increment: 100, message: '完成!' });
            // 显示结果
            const stats = standardGraph.metadata;
            const message = `知识图谱JSON生成完成!\n` +
                `- 文件路径: ${outputPath}\n` +
                `- 文件数量: ${stats.total_files}\n` +
                `- 代码实体: ${stats.total_entities}\n` +
                `- 关系数量: ${stats.total_relationships}\n` +
                `- 社区数量: ${standardGraph.communities.length}\n` +
                `- 节点总数: ${standardGraph.nodes.length}\n` +
                `- 边总数: ${standardGraph.edges.length}`;
            const result = await vscode.window.showInformationMessage(message, '打开文件', '查看图谱');
            if (result === '打开文件') {
                const uri = vscode.Uri.file(outputPath);
                await vscode.window.showTextDocument(uri);
            }
            else if (result === '查看图谱') {
                // 动态导入避免循环依赖
                const { showKnowledgeGraphCommand } = await import('./showKnowledgeGraph.js');
                await showKnowledgeGraphCommand();
            }
        }
        catch (error) {
            console.error('生成知识图谱JSON失败:', error);
            vscode.window.showErrorMessage(`生成知识图谱JSON失败: ${error}`);
        }
    });
}
/**
 * 生成标准知识图谱JSON结构
 */
function generateStandardKnowledgeGraphJson(workspacePath, entities, fileImports, fileExports) {
    const nodes = [];
    const edges = [];
    // 1. 创建项目根节点
    const projectNode = createProjectNode(workspacePath);
    nodes.push(projectNode);
    // 2. 创建文件和目录节点
    const { fileNodes, directoryNodes } = createFileAndDirectoryNodes(workspacePath, entities);
    nodes.push(...directoryNodes, ...fileNodes);
    // 3. 创建代码元素节点
    const entityNodes = createEntityNodes(workspacePath, entities);
    nodes.push(...entityNodes);
    // 4. 创建包含关系
    const containsEdges = createContainsRelationships(workspacePath, entities, projectNode.id, directoryNodes, fileNodes, entityNodes);
    edges.push(...containsEdges);
    // 5. 创建定义关系
    const definedInEdges = createDefinedInRelationships(entityNodes, fileNodes);
    edges.push(...definedInEdges);
    // 6. 创建导入/导出关系
    const importExportEdges = createImportExportRelationships(workspacePath, fileImports, fileExports, fileNodes);
    edges.push(...importExportEdges);
    // 7. 创建语义关系（基于标签）
    const semanticEdges = createSemanticRelationships(entityNodes);
    edges.push(...semanticEdges);
    // 8. 检测社区
    const communities = detectCommunities(nodes, edges);
    // 9. 创建元数据
    const metadata = {
        version: "1.0.0",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        workspace_path: workspacePath,
        total_files: fileNodes.length,
        total_entities: entityNodes.length,
        total_relationships: edges.length,
        supported_languages: getUniqueLanguages(entities),
        parsing_statistics: calculateParsingStatistics(entities, fileNodes.length)
    };
    return {
        metadata,
        nodes,
        edges,
        communities
    };
}
/**
 * 创建项目根节点
 */
function createProjectNode(workspacePath) {
    const packageJsonPath = path.join(workspacePath, 'package.json');
    let projectName = path.basename(workspacePath);
    let techStack = [];
    let packageJsonInfo = {};
    try {
        if (fs.existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            projectName = packageJson.name || projectName;
            packageJsonInfo = {
                dependencies: packageJson.dependencies || {},
                devDependencies: packageJson.devDependencies || {},
                scripts: packageJson.scripts || {}
            };
            // 推断技术栈
            const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
            if (deps.vue)
                techStack.push(deps.vue.startsWith('^3') || deps.vue.startsWith('3') ? 'vue3' : 'vue2');
            if (deps.react)
                techStack.push('react');
            if (deps.typescript)
                techStack.push('typescript');
            if (deps['@types/node'])
                techStack.push('nodejs');
            if (deps.next)
                techStack.push('nextjs');
            if (deps.nuxt)
                techStack.push('nuxtjs');
        }
    }
    catch (error) {
        console.warn('无法读取package.json:', error);
    }
    return {
        id: 'project_root',
        type: 'project',
        name: projectName,
        absolute_path: workspacePath,
        semantic_tags: ['project', 'root', ...techStack],
        tech_stack: techStack,
        properties: {
            package_json: packageJsonInfo,
            workspace_path: workspacePath
        }
    };
}
/**
 * 创建文件和目录节点
 */
function createFileAndDirectoryNodes(workspacePath, entities) {
    const processedPaths = new Set();
    const fileNodes = [];
    const directoryNodes = [];
    const directorySet = new Set();
    for (const entity of entities) {
        const filePath = entity.file_path;
        if (!processedPaths.has(filePath)) {
            processedPaths.add(filePath);
            // 创建文件节点
            const fileName = path.basename(filePath);
            const relativePath = path.relative(workspacePath, filePath);
            const fileExtension = path.extname(filePath);
            // 获取文件统计信息
            let fileSize = 0;
            let lineCount = 0;
            try {
                const stats = fs.statSync(filePath);
                fileSize = stats.size;
                const content = fs.readFileSync(filePath, 'utf8');
                lineCount = content.split('\n').length;
            }
            catch (error) {
                console.warn(`无法获取文件统计信息: ${filePath}`);
            }
            // 获取文件中的实体信息
            const entitiesInFile = entities.filter(e => e.file_path === filePath);
            const fileTypes = [...new Set(entitiesInFile.map(e => e.element_type))];
            const fileNode = {
                id: `file:${relativePath}`,
                type: 'file',
                name: fileName,
                absolute_path: filePath,
                relative_path: relativePath,
                file_type: getFileType(fileExtension),
                file_size: fileSize,
                line_count: lineCount,
                semantic_tags: generateFileSemanticTags(entity.language, fileTypes, fileName),
                properties: {
                    extension: fileExtension,
                    language: entity.language || 'unknown',
                    entities_count: entitiesInFile.length,
                    element_types: fileTypes
                }
            };
            fileNodes.push(fileNode);
            // 创建目录节点层次结构
            createDirectoryHierarchy(workspacePath, filePath, directoryNodes, directorySet);
        }
    }
    return { fileNodes, directoryNodes };
}
/**
 * 创建目录层次结构
 */
function createDirectoryHierarchy(workspacePath, filePath, directoryNodes, directorySet) {
    const relativePath = path.relative(workspacePath, filePath);
    const pathParts = path.dirname(relativePath).split(path.sep);
    let currentPath = '';
    for (let i = 0; i < pathParts.length; i++) {
        if (pathParts[i] === '.' || pathParts[i] === '')
            continue;
        currentPath = currentPath ? path.join(currentPath, pathParts[i]) : pathParts[i];
        const dirId = `dir:${currentPath}`;
        if (!directorySet.has(dirId)) {
            directorySet.add(dirId);
            const absolutePath = path.join(workspacePath, currentPath);
            // 获取目录下的子目录和文件数量
            let childrenCount = 0;
            try {
                const children = fs.readdirSync(absolutePath);
                childrenCount = children.length;
            }
            catch (error) {
                console.warn(`无法读取目录: ${absolutePath}`);
            }
            const directoryNode = {
                id: dirId,
                type: 'directory',
                name: pathParts[i],
                absolute_path: absolutePath,
                relative_path: currentPath,
                level: i + 1,
                children_count: childrenCount,
                semantic_tags: generateDirectorySemanticTags(pathParts[i], currentPath),
                properties: {
                    depth: i + 1,
                    full_path: absolutePath
                }
            };
            directoryNodes.push(directoryNode);
        }
    }
}
/**
 * 创建代码元素节点
 */
function createEntityNodes(workspacePath, entities) {
    const entityNodes = [];
    for (const entity of entities) {
        const relativePath = path.relative(workspacePath, entity.file_path);
        const entityNode = {
            id: `entity:${relativePath}:${entity.element_type}:${entity.name}:${entity.start_line}`,
            type: 'code_element',
            name: entity.name,
            absolute_path: entity.file_path,
            relative_path: relativePath,
            start_line: entity.start_line,
            end_line: entity.end_line,
            element_type: mapElementType(entity.element_type),
            code_snippet: entity.code_snippet,
            semantic_tags: [...entity.semantic_tags],
            properties: {
                language: entity.language,
                file_name: entity.file_name,
                code_length: entity.code_snippet ? entity.code_snippet.length : 0,
                line_count: entity.end_line && entity.start_line ? entity.end_line - entity.start_line + 1 : 1
            }
        };
        entityNodes.push(entityNode);
    }
    return entityNodes;
}
// 辅助函数
function getFileType(extension) {
    const typeMap = {
        '.js': 'javascript',
        '.ts': 'typescript',
        '.vue': 'vue',
        '.jsx': 'jsx',
        '.tsx': 'tsx',
        '.json': 'json',
        '.md': 'markdown',
        '.css': 'css',
        '.scss': 'scss',
        '.html': 'html'
    };
    return typeMap[extension] || 'unknown';
}
function generateFileSemanticTags(language, elementTypes, fileName) {
    const tags = ['file'];
    if (language)
        tags.push(language);
    tags.push(...elementTypes);
    // 基于文件名添加特殊标签
    const lowerName = fileName.toLowerCase();
    if (lowerName.includes('test'))
        tags.push('test');
    if (lowerName.includes('spec'))
        tags.push('spec');
    if (lowerName.includes('config'))
        tags.push('config');
    if (lowerName.includes('util') || lowerName.includes('helper'))
        tags.push('utility');
    if (lowerName.includes('component'))
        tags.push('component');
    if (lowerName.includes('service'))
        tags.push('service');
    if (lowerName.includes('store'))
        tags.push('store');
    return [...new Set(tags)];
}
function generateDirectorySemanticTags(dirName, fullPath) {
    const tags = ['directory'];
    const lowerName = dirName.toLowerCase();
    if (lowerName.includes('component'))
        tags.push('components');
    if (lowerName.includes('page') || lowerName.includes('view'))
        tags.push('pages');
    if (lowerName.includes('util') || lowerName.includes('helper'))
        tags.push('utilities');
    if (lowerName.includes('service') || lowerName.includes('api'))
        tags.push('services');
    if (lowerName.includes('store') || lowerName.includes('state'))
        tags.push('state-management');
    if (lowerName.includes('test') || lowerName.includes('spec'))
        tags.push('testing');
    if (lowerName.includes('config'))
        tags.push('configuration');
    if (lowerName.includes('asset') || lowerName.includes('static'))
        tags.push('assets');
    if (lowerName.includes('doc'))
        tags.push('documentation');
    return tags;
}
function mapElementType(elementType) {
    const typeMap = {
        'function': 'function',
        'class': 'class',
        'variable': 'variable',
        'component': 'component',
        'interface': 'interface',
        'type': 'type',
        'constant': 'constant',
        'method': 'method',
        'property': 'property'
    };
    return typeMap[elementType] || 'function';
}
// 关系创建函数
function createContainsRelationships(workspacePath, entities, projectId, directoryNodes, fileNodes, entityNodes) {
    const edges = [];
    let edgeId = 1;
    // 项目包含目录
    const rootDirectories = directoryNodes.filter(dir => (dir.level || 0) === 1);
    for (const rootDir of rootDirectories) {
        edges.push({
            id: `edge_${edgeId++}`,
            source: projectId,
            target: rootDir.id,
            relation: 'CONTAINS',
            weight: 1.0,
            properties: {
                description: `项目包含目录 ${rootDir.name}`
            }
        });
    }
    // 目录包含子目录
    for (const dir of directoryNodes) {
        const level = dir.level || 0;
        if (level > 1) {
            const parentPath = path.dirname(dir.relative_path);
            const parentDir = directoryNodes.find(d => d.relative_path === parentPath);
            if (parentDir) {
                edges.push({
                    id: `edge_${edgeId++}`,
                    source: parentDir.id,
                    target: dir.id,
                    relation: 'CONTAINS',
                    weight: 1.0,
                    properties: {
                        description: `目录 ${parentDir.name} 包含子目录 ${dir.name}`
                    }
                });
            }
        }
    }
    // 目录包含文件
    for (const file of fileNodes) {
        const dirPath = path.dirname(file.relative_path);
        if (dirPath !== '.') {
            const parentDir = directoryNodes.find(d => d.relative_path === dirPath);
            if (parentDir) {
                edges.push({
                    id: `edge_${edgeId++}`,
                    source: parentDir.id,
                    target: file.id,
                    relation: 'CONTAINS',
                    weight: 1.0,
                    properties: {
                        description: `目录 ${parentDir.name} 包含文件 ${file.name}`
                    }
                });
            }
        }
        else {
            // 文件在项目根目录
            edges.push({
                id: `edge_${edgeId++}`,
                source: projectId,
                target: file.id,
                relation: 'CONTAINS',
                weight: 1.0,
                properties: {
                    description: `项目根目录包含文件 ${file.name}`
                }
            });
        }
    }
    // 文件包含代码元素
    for (const entity of entityNodes) {
        const file = fileNodes.find(f => f.absolute_path === entity.absolute_path);
        if (file) {
            edges.push({
                id: `edge_${edgeId++}`,
                source: file.id,
                target: entity.id,
                relation: 'CONTAINS',
                weight: 1.0,
                properties: {
                    description: `文件 ${file.name} 包含 ${entity.element_type} ${entity.name}`,
                    line_number: entity.start_line
                }
            });
        }
    }
    return edges;
}
function createDefinedInRelationships(entityNodes, fileNodes) {
    const edges = [];
    let edgeId = 1000;
    for (const entity of entityNodes) {
        const file = fileNodes.find(f => f.absolute_path === entity.absolute_path);
        if (file) {
            edges.push({
                id: `edge_${edgeId++}`,
                source: entity.id,
                target: file.id,
                relation: 'DEFINED_IN',
                weight: 1.0,
                properties: {
                    description: `${entity.element_type} ${entity.name} 定义在文件 ${file.name} 中`,
                    line_number: entity.start_line
                }
            });
        }
    }
    return edges;
}
function createImportExportRelationships(workspacePath, fileImports, fileExports, fileNodes) {
    const edges = [];
    let edgeId = 2000;
    // 处理导入关系
    for (const [filePath, imports] of fileImports.entries()) {
        const sourceFile = fileNodes.find(f => f.absolute_path === filePath);
        if (!sourceFile)
            continue;
        for (const importPath of imports) {
            // 尝试解析导入路径
            const resolvedPath = resolveImportPath(workspacePath, filePath, importPath);
            if (resolvedPath) {
                const targetFile = fileNodes.find(f => f.absolute_path === resolvedPath);
                if (targetFile) {
                    edges.push({
                        id: `edge_${edgeId++}`,
                        source: sourceFile.id,
                        target: targetFile.id,
                        relation: 'IMPORTS',
                        weight: 1.0,
                        properties: {
                            description: `${sourceFile.name} 导入 ${targetFile.name}`,
                            import_path: importPath,
                            dependency_type: importPath.startsWith('.') ? 'import' : 'require'
                        }
                    });
                }
            }
        }
    }
    return edges;
}
function createSemanticRelationships(entityNodes) {
    const edges = [];
    let edgeId = 3000;
    // 基于语义标签创建关系
    for (let i = 0; i < entityNodes.length; i++) {
        for (let j = i + 1; j < entityNodes.length; j++) {
            const entityA = entityNodes[i];
            const entityB = entityNodes[j];
            // 跳过同一文件中的实体（避免过多关系）
            if (entityA.absolute_path === entityB.absolute_path) {
                continue;
            }
            const commonTags = getCommonTags(entityA.semantic_tags, entityB.semantic_tags);
            if (commonTags.length >= 2) { // 至少有2个共同标签
                const similarity = commonTags.length / Math.max(entityA.semantic_tags.length, entityB.semantic_tags.length);
                if (similarity > 0.3) { // 相似度阈值
                    edges.push({
                        id: `edge_${edgeId++}`,
                        source: entityA.id,
                        target: entityB.id,
                        relation: 'RELATED_TO',
                        weight: similarity,
                        properties: {
                            description: `${entityA.name} 与 ${entityB.name} 在语义上相关`,
                            similarity_score: similarity,
                            common_tags: commonTags
                        }
                    });
                }
            }
        }
    }
    return edges;
}
function detectCommunities(nodes, edges) {
    const communities = [];
    // 基于文件路径的社区检测
    const pathGroups = new Map();
    for (const node of nodes) {
        if (node.type === 'code_element' && node.relative_path) {
            const dir = path.dirname(node.relative_path);
            if (!pathGroups.has(dir)) {
                pathGroups.set(dir, []);
            }
            pathGroups.get(dir).push(node);
        }
    }
    let communityId = 1;
    for (const [dirPath, groupNodes] of pathGroups.entries()) {
        if (groupNodes.length > 2) { // 至少3个节点组成社区
            const tags = extractCommunityTags(groupNodes);
            const primaryLanguage = getMostCommonLanguage(groupNodes);
            communities.push({
                id: `community_${communityId++}`,
                label: `${path.basename(dirPath)}模块`,
                description: `位于${dirPath}目录的功能模块`,
                nodes: groupNodes.map(n => n.id),
                score: calculateCommunityScore(groupNodes, edges),
                cohesion: 0.8,
                coupling: 0.3,
                tags,
                primary_language: primaryLanguage,
                functionality: inferFunctionality(dirPath, tags),
                detection_method: 'dependency_based',
                confidence: 0.8,
                level: 1,
                sub_communities: []
            });
        }
    }
    return communities;
}
// 更多辅助函数
function getUniqueLanguages(entities) {
    const languages = new Set();
    for (const entity of entities) {
        if (entity.language) {
            languages.add(entity.language);
        }
    }
    return Array.from(languages);
}
function calculateParsingStatistics(entities, totalFiles) {
    const stats = {
        successful_files: totalFiles,
        failed_files: 0,
        parsed_functions: 0,
        parsed_classes: 0,
        parsed_variables: 0,
        parsed_components: 0
    };
    for (const entity of entities) {
        switch (entity.element_type) {
            case 'function':
                stats.parsed_functions++;
                break;
            case 'class':
                stats.parsed_classes++;
                break;
            case 'variable':
                stats.parsed_variables++;
                break;
            case 'component':
                stats.parsed_components++;
                break;
        }
    }
    return stats;
}
function resolveImportPath(workspacePath, fromFile, importPath) {
    if (importPath.startsWith('.')) {
        // 相对路径
        const fromDir = path.dirname(fromFile);
        const resolvedPath = path.resolve(fromDir, importPath);
        // 尝试常见的文件扩展名
        const extensions = ['.js', '.ts', '.vue', '.jsx', '.tsx'];
        for (const ext of extensions) {
            const fullPath = resolvedPath + ext;
            if (fs.existsSync(fullPath)) {
                return fullPath;
            }
        }
        // 尝试 index 文件
        for (const ext of extensions) {
            const indexPath = path.join(resolvedPath, 'index' + ext);
            if (fs.existsSync(indexPath)) {
                return indexPath;
            }
        }
    }
    return null;
}
function getCommonTags(tagsA, tagsB) {
    const setA = new Set(tagsA);
    return tagsB.filter(tag => setA.has(tag));
}
function extractCommunityTags(nodes) {
    const tagCount = new Map();
    for (const node of nodes) {
        for (const tag of node.semantic_tags) {
            tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
        }
    }
    // 返回最常见的标签
    return Array.from(tagCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag]) => tag);
}
function getMostCommonLanguage(nodes) {
    const languageCount = new Map();
    for (const node of nodes) {
        const language = node.properties?.language;
        if (language && language !== 'unknown') {
            languageCount.set(language, (languageCount.get(language) || 0) + 1);
        }
    }
    const mostCommon = Array.from(languageCount.entries())
        .sort((a, b) => b[1] - a[1])[0];
    return mostCommon ? mostCommon[0] : 'unknown';
}
function calculateCommunityScore(nodes, edges) {
    const nodeIds = new Set(nodes.map(n => n.id));
    let internalEdges = 0;
    let externalEdges = 0;
    for (const edge of edges) {
        const sourceInCommunity = nodeIds.has(edge.source);
        const targetInCommunity = nodeIds.has(edge.target);
        if (sourceInCommunity && targetInCommunity) {
            internalEdges++;
        }
        else if (sourceInCommunity || targetInCommunity) {
            externalEdges++;
        }
    }
    const totalEdges = internalEdges + externalEdges;
    return totalEdges > 0 ? (internalEdges - externalEdges / 2) / totalEdges : 0;
}
function inferFunctionality(dirPath, tags) {
    const functionality = [];
    const lowerPath = dirPath.toLowerCase();
    if (lowerPath.includes('component'))
        functionality.push('ui_components');
    if (lowerPath.includes('page') || lowerPath.includes('view'))
        functionality.push('page_routing');
    if (lowerPath.includes('service') || lowerPath.includes('api'))
        functionality.push('api_integration');
    if (lowerPath.includes('store') || lowerPath.includes('state'))
        functionality.push('state_management');
    if (lowerPath.includes('util') || lowerPath.includes('helper'))
        functionality.push('utilities');
    if (lowerPath.includes('test'))
        functionality.push('testing');
    if (lowerPath.includes('config'))
        functionality.push('configuration');
    // 基于标签推断功能
    if (tags.includes('vue') || tags.includes('react'))
        functionality.push('frontend_framework');
    if (tags.includes('function'))
        functionality.push('business_logic');
    if (tags.includes('class'))
        functionality.push('object_oriented');
    return functionality.length > 0 ? functionality : ['general'];
}
//# sourceMappingURL=generateKnowledgeGraphJson.js.map