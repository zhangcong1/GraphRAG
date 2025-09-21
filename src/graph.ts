import { CodeEntity } from './parser';
import * as path from 'path';
import * as fs from 'fs';
import { KnowledgeGraphJSON, KnowledgeGraphNode, KnowledgeGraphEdge, KnowledgeGraphCommunity, KnowledgeGraphMetadata, RelationType as SchemaRelationType } from './types/knowledgeGraphSchema';

/**
 * 关系过滤配置
 */
export interface RelationshipFilters {
    enableContains: boolean;          // 目录->文件->元素包含关系
    enableDefinedIn: boolean;         // 元素->文件定义关系
    enableImportsExports: boolean;    // 文件间导入/导出关系
    enableCalls: boolean;             // 函数调用关系
    enableSemanticRelated: boolean;   // 语义相关关系
    minRelationWeight: number;        // 最小关系权重
}

/**
 * 默认关系过滤配置 - 只保留最基本的关系
 */
export const DEFAULT_RELATIONSHIP_FILTERS: RelationshipFilters = {
    enableContains: true,
    enableDefinedIn: true,
    enableImportsExports: false,
    enableCalls: false,
    enableSemanticRelated: false,
    minRelationWeight: 0.3
};

/**
 * 关系类型
 */
export type RelationType = 
    | 'CONTAINS'        // 目录->文件->element
    | 'DEFINED_IN'      // element->file
    | 'IMPORTS'         // 文件->文件
    | 'EXPORTS'         // 文件->文件
    | 'CALLS'           // 函数调用
    | 'RELATED_TO'      // 基于 import/call/semantic_tags
    | 'COMPONENT_OF'    // 组件关系
    | 'EXTENDS'         // 继承关系
    | 'IMPLEMENTS';     // 实现关系

/**
 * 图节点
 */
export interface GraphNode {
    id: string;
    type: 'file' | 'directory' | 'entity';
    name: string;
    path?: string;
    entity?: CodeEntity;
    properties: Record<string, any>;
}

/**
 * 图边
 */
export interface GraphEdge {
    id: string;
    source: string;
    target: string;
    relation: RelationType;
    weight: number;
    properties: Record<string, any>;
}

/**
 * 社区信息
 */
export interface Community {
    id: string;
    nodes: string[];
    score: number;
    description: string;
    tags: string[];
}

/**
 * 知识图谱 (保持向后兼容)
 */
export interface KnowledgeGraph {
    nodes: GraphNode[];
    edges: GraphEdge[];
    communities: Community[];
    metadata: {
        version: string;
        created_at: string;
        total_files: number;
        total_entities: number;
        total_relationships: number;
        workspace_path: string;
    };
}

/**
 * 标准知识图谱JSON结构 (新增)
 */
export interface StandardKnowledgeGraph {
    json: KnowledgeGraphJSON;
    legacy: KnowledgeGraph;
}

/**
 * 图构建器
 */
export class GraphBuilder {
    private nodes: Map<string, GraphNode> = new Map();
    private edges: Map<string, GraphEdge> = new Map();
    private workspacePath: string;
    private relationshipFilters: RelationshipFilters;

    constructor(workspacePath: string, relationshipFilters?: RelationshipFilters) {
        this.workspacePath = workspacePath;
        this.relationshipFilters = relationshipFilters || DEFAULT_RELATIONSHIP_FILTERS;
    }

    /**
     * 从代码实体构建知识图谱
     */
    public buildGraph(entities: CodeEntity[], fileImports: Map<string, string[]>, fileExports: Map<string, string[]>): KnowledgeGraph {
        const result = this.buildStandardGraph(entities, fileImports, fileExports);
        return result.legacy;
    }

    /**
     * 构建标准知识图谱JSON结构
     */
    public buildStandardGraph(entities: CodeEntity[], fileImports: Map<string, string[]>, fileExports: Map<string, string[]>): StandardKnowledgeGraph {
        // 清空之前的数据
        this.nodes.clear();
        this.edges.clear();

        // 构建标准JSON节点数组
        const standardNodes: KnowledgeGraphNode[] = [];
        const standardEdges: KnowledgeGraphEdge[] = [];
        
        // 1. 创建项目根节点
        const projectNode = this.createProjectNode();
        standardNodes.push(projectNode);

        // 2. 创建文件和目录节点
        const { fileNodes, directoryNodes } = this.createStandardFileAndDirectoryNodes(entities);
        standardNodes.push(...directoryNodes, ...fileNodes);

        // 3. 创建代码元素节点
        const entityNodes = this.createStandardEntityNodes(entities);
        standardNodes.push(...entityNodes);

        // 4. 创建包含关系 (CONTAINS)
        if (this.relationshipFilters.enableContains) {
            const containsEdges = this.createStandardContainsRelationships(entities, projectNode.id, directoryNodes, fileNodes, entityNodes);
            standardEdges.push(...containsEdges);
        }

        // 5. 创建定义关系 (DEFINED_IN)
        if (this.relationshipFilters.enableDefinedIn) {
            const definedInEdges = this.createStandardDefinedInRelationships(entityNodes, fileNodes);
            standardEdges.push(...definedInEdges);
        }

        // 6. 创建导入/导出关系
        if (this.relationshipFilters.enableImportsExports) {
            const importExportEdges = this.createStandardImportExportRelationships(fileImports, fileExports, fileNodes);
            standardEdges.push(...importExportEdges);
        }

        // 7. 创建调用关系
        if (this.relationshipFilters.enableCalls) {
            const callEdges = this.createStandardCallRelationships(entities, entityNodes);
            standardEdges.push(...callEdges);
        }

        // 8. 创建语义关系
        if (this.relationshipFilters.enableSemanticRelated) {
            const semanticEdges = this.createStandardSemanticRelationships(entityNodes);
            standardEdges.push(...semanticEdges);
        }

        // 9. 检测社区
        const standardCommunities = this.detectStandardCommunities(standardNodes, standardEdges);

        // 构建标准JSON结构
        const standardJson: KnowledgeGraphJSON = {
            metadata: this.createStandardMetadata(entities, standardNodes, standardEdges),
            nodes: standardNodes,
            edges: standardEdges,
            communities: standardCommunities
        };

        // 构建传统格式（向后兼容）
        this.buildLegacyNodesAndEdges(entities, fileImports, fileExports);
        const legacyGraph: KnowledgeGraph = {
            nodes: Array.from(this.nodes.values()),
            edges: Array.from(this.edges.values()),
            communities: this.detectCommunities(),
            metadata: {
                version: '1.0.0',
                created_at: new Date().toISOString(),
                total_files: this.countFileNodes(),
                total_entities: entities.length,
                total_relationships: this.edges.size,
                workspace_path: this.workspacePath
            }
        };

        // 保存标准JSON到文件
        this.saveStandardGraphToFile(standardJson);

        return {
            json: standardJson,
            legacy: legacyGraph
        };
    }

    /**
     * 构建传统格式（向后兼容）
     */
    private buildLegacyNodesAndEdges(entities: CodeEntity[], fileImports: Map<string, string[]>, fileExports: Map<string, string[]>): void {
        // 1. 创建文件和目录节点
        this.createFileAndDirectoryNodes(entities);

        // 2. 创建实体节点
        this.createEntityNodes(entities);

        // 3. 创建包含关系 (CONTAINS)
        if (this.relationshipFilters.enableContains) {
            this.createContainsRelationships(entities);
        }

        // 4. 创建定义关系 (DEFINED_IN)
        if (this.relationshipFilters.enableDefinedIn) {
            this.createDefinedInRelationships(entities);
        }

        // 5. 创建导入/导出关系
        if (this.relationshipFilters.enableImportsExports) {
            this.createImportExportRelationships(fileImports, fileExports);
        }

        // 6. 创建调用关系
        if (this.relationshipFilters.enableCalls) {
            this.createCallRelationships(entities);
        }

        // 7. 创建语义关系
        if (this.relationshipFilters.enableSemanticRelated) {
            this.createSemanticRelationships(entities);
        }
    }

    /**
     * 保存标准知识图谱JSON到文件
     */
    private saveStandardGraphToFile(standardJson: KnowledgeGraphJSON): void {
        try {
            const outputPath = path.join(this.workspacePath, 'knowledge-graph.json');
            const jsonContent = JSON.stringify(standardJson, null, 2);
            fs.writeFileSync(outputPath, jsonContent, 'utf8');
            console.log(`✅ 标准知识图谱JSON已保存到: ${outputPath}`);
        } catch (error) {
            console.error('保存标准知识图谱JSON失败:', error);
        }
    }

    // 标准知识图谱构建方法

    /**
     * 创建项目根节点
     */
    private createProjectNode(): KnowledgeGraphNode {
        const packageJsonPath = path.join(this.workspacePath, 'package.json');
        let projectName = path.basename(this.workspacePath);
        let techStack: string[] = [];
        let packageJsonInfo: any = {};
        
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
                if (deps.vue) techStack.push(deps.vue.startsWith('^3') || deps.vue.startsWith('3') ? 'vue3' : 'vue2');
                if (deps.react) techStack.push('react');
                if (deps.typescript) techStack.push('typescript');
                if (deps['@types/node']) techStack.push('nodejs');
                if (deps.next) techStack.push('nextjs');
                if (deps.nuxt) techStack.push('nuxtjs');
            }
        } catch (error) {
            console.warn('无法读取package.json:', error);
        }
        
        return {
            id: 'project_root',
            type: 'project',
            name: projectName,
            absolute_path: this.workspacePath,
            semantic_tags: ['project', 'root', ...techStack],
            tech_stack: techStack,
            properties: {
                package_json: packageJsonInfo,
                workspace_path: this.workspacePath
            }
        };
    }

    /**
     * 创建标准文件和目录节点
     */
    private createStandardFileAndDirectoryNodes(entities: CodeEntity[]): { fileNodes: KnowledgeGraphNode[], directoryNodes: KnowledgeGraphNode[] } {
        const processedPaths = new Set<string>();
        const fileNodes: KnowledgeGraphNode[] = [];
        const directoryNodes: KnowledgeGraphNode[] = [];
        const directorySet = new Set<string>();

        for (const entity of entities) {
            const filePath = entity.file_path;
            
            if (!processedPaths.has(filePath)) {
                processedPaths.add(filePath);

                // 创建文件节点
                const fileName = path.basename(filePath);
                const relativePath = path.relative(this.workspacePath, filePath);
                const fileExtension = path.extname(filePath);
                
                // 获取文件统计信息
                let fileSize = 0;
                let lineCount = 0;
                try {
                    const stats = fs.statSync(filePath);
                    fileSize = stats.size;
                    const content = fs.readFileSync(filePath, 'utf8');
                    lineCount = content.split('\n').length;
                } catch (error) {
                    console.warn(`无法获取文件统计信息: ${filePath}`);
                }
                
                // 获取文件中的实体信息
                const entitiesInFile = entities.filter(e => e.file_path === filePath);
                const fileTypes = [...new Set(entitiesInFile.map(e => e.element_type))];
                
                const fileNode: KnowledgeGraphNode = {
                    id: `file:${relativePath}`,
                    type: 'file',
                    name: fileName,
                    absolute_path: filePath,
                    relative_path: relativePath,
                    file_type: this.getFileType(fileExtension),
                    file_size: fileSize,
                    line_count: lineCount,
                    semantic_tags: this.generateFileSemanticTags(entity.language, fileTypes, fileName),
                    properties: {
                        extension: fileExtension,
                        language: entity.language || 'unknown',
                        entities_count: entitiesInFile.length,
                        element_types: fileTypes
                    }
                };
                
                fileNodes.push(fileNode);

                // 创建目录节点层次结构
                this.createStandardDirectoryHierarchy(filePath, directoryNodes, directorySet);
            }
        }

        return { fileNodes, directoryNodes };
    }

    /**
     * 创建目录层次结构
     */
    private createStandardDirectoryHierarchy(filePath: string, directoryNodes: KnowledgeGraphNode[], directorySet: Set<string>): void {
        const relativePath = path.relative(this.workspacePath, filePath);
        const pathParts = path.dirname(relativePath).split(path.sep);

        let currentPath = '';
        for (let i = 0; i < pathParts.length; i++) {
            if (pathParts[i] === '.' || pathParts[i] === '') continue;

            currentPath = currentPath ? path.join(currentPath, pathParts[i]) : pathParts[i];
            const dirId = `dir:${currentPath}`;

            if (!directorySet.has(dirId)) {
                directorySet.add(dirId);
                
                const absolutePath = path.join(this.workspacePath, currentPath);
                
                // 获取目录下的子目录和文件数量
                let childrenCount = 0;
                try {
                    const children = fs.readdirSync(absolutePath);
                    childrenCount = children.length;
                } catch (error) {
                    console.warn(`无法读取目录: ${absolutePath}`);
                }
                
                const directoryNode: KnowledgeGraphNode = {
                    id: dirId,
                    type: 'directory',
                    name: pathParts[i],
                    absolute_path: absolutePath,
                    relative_path: currentPath,
                    level: i + 1,
                    children_count: childrenCount,
                    semantic_tags: this.generateDirectorySemanticTags(pathParts[i], currentPath),
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
     * 创建标准代码元素节点
     */
    private createStandardEntityNodes(entities: CodeEntity[]): KnowledgeGraphNode[] {
        const entityNodes: KnowledgeGraphNode[] = [];
        
        for (const entity of entities) {
            const relativePath = path.relative(this.workspacePath, entity.file_path);
            
            const entityNode: KnowledgeGraphNode = {
                id: `entity:${relativePath}:${entity.element_type}:${entity.name}:${entity.start_line}`,
                type: 'code_element',
                name: entity.name,
                absolute_path: entity.file_path,
                relative_path: relativePath,
                start_line: entity.start_line,
                end_line: entity.end_line,
                element_type: this.mapElementType(entity.element_type),
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

    /**
     * 创建包含关系
     */
    private createStandardContainsRelationships(
        entities: CodeEntity[],
        projectId: string,
        directoryNodes: KnowledgeGraphNode[],
        fileNodes: KnowledgeGraphNode[],
        entityNodes: KnowledgeGraphNode[]
    ): KnowledgeGraphEdge[] {
        const edges: KnowledgeGraphEdge[] = [];
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
                const parentPath = path.dirname(dir.relative_path!);
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
            const dirPath = path.dirname(file.relative_path!);
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
            } else {
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

    /**
     * 创建定义关系
     */
    private createStandardDefinedInRelationships(entityNodes: KnowledgeGraphNode[], fileNodes: KnowledgeGraphNode[]): KnowledgeGraphEdge[] {
        const edges: KnowledgeGraphEdge[] = [];
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

    /**
     * 创建导入/导出关系
     */
    private createStandardImportExportRelationships(
        fileImports: Map<string, string[]>,
        fileExports: Map<string, string[]>,
        fileNodes: KnowledgeGraphNode[]
    ): KnowledgeGraphEdge[] {
        const edges: KnowledgeGraphEdge[] = [];
        let edgeId = 2000;
        
        // 处理导入关系
        for (const [filePath, imports] of fileImports.entries()) {
            const sourceFile = fileNodes.find(f => f.absolute_path === filePath);
            if (!sourceFile) continue;
            
            for (const importPath of imports) {
                // 尝试解析导入路径
                const resolvedPath = this.resolveImportPath(this.workspacePath, filePath, importPath);
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

    /**
     * 创建调用关系
     */
    private createStandardCallRelationships(entities: CodeEntity[], entityNodes: KnowledgeGraphNode[]): KnowledgeGraphEdge[] {
        const edges: KnowledgeGraphEdge[] = [];
        let edgeId = 3000;
        
        // 简化实现：基于代码片段中的函数调用模式
        const functionEntities = entities.filter(e => e.element_type === 'function');
        
        // 在每个文件内部查找函数调用
        for (const entity of entities) {
            if (entity.element_type === 'function') {
                const calledFunctions = this.extractFunctionCalls(entity.code_snippet);
                
                for (const calledName of calledFunctions) {
                    // 查找被调用的函数
                    const targetFunctions = this.findFunctionsByName(entities, calledName);
                    
                    for (const targetFunc of targetFunctions) {
                        if (targetFunc.file_path !== entity.file_path || targetFunc.name !== entity.name) {
                            const sourceNode = entityNodes.find(n => 
                                n.absolute_path === entity.file_path && 
                                n.name === entity.name &&
                                n.start_line === entity.start_line
                            );
                            
                            const targetNode = entityNodes.find(n => 
                                n.absolute_path === targetFunc.file_path && 
                                n.name === targetFunc.name &&
                                n.start_line === targetFunc.start_line
                            );
                            
                            if (sourceNode && targetNode) {
                                edges.push({
                                    id: `edge_${edgeId++}`,
                                    source: sourceNode.id,
                                    target: targetNode.id,
                                    relation: 'CALLS',
                                    weight: 1.0,
                                    properties: {
                                        description: `${entity.name} 调用 ${targetFunc.name}`,
                                        call_name: calledName
                                    }
                                });
                            }
                        }
                    }
                }
            }
        }
        
        return edges;
    }

    /**
     * 创建语义关系
     */
    private createStandardSemanticRelationships(entityNodes: KnowledgeGraphNode[]): KnowledgeGraphEdge[] {
        const edges: KnowledgeGraphEdge[] = [];
        let edgeId = 4000;
        
        // 基于语义标签创建关系
        for (let i = 0; i < entityNodes.length; i++) {
            for (let j = i + 1; j < entityNodes.length; j++) {
                const entityA = entityNodes[i];
                const entityB = entityNodes[j];
                
                // 跳过同一文件中的实体（避免过多关系）
                if (entityA.absolute_path === entityB.absolute_path) {
                    continue;
                }
                
                const commonTags = this.getCommonTags(entityA.semantic_tags, entityB.semantic_tags);
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

    /**
     * 检测社区
     */
    private detectStandardCommunities(nodes: KnowledgeGraphNode[], edges: KnowledgeGraphEdge[]): KnowledgeGraphCommunity[] {
        const communities: KnowledgeGraphCommunity[] = [];
        
        // 基于文件路径的社区检测
        const pathGroups = new Map<string, KnowledgeGraphNode[]>();
        
        for (const node of nodes) {
            if (node.type === 'code_element' && node.relative_path) {
                const dir = path.dirname(node.relative_path);
                if (!pathGroups.has(dir)) {
                    pathGroups.set(dir, []);
                }
                pathGroups.get(dir)!.push(node);
            }
        }
        
        let communityId = 1;
        for (const [dirPath, groupNodes] of pathGroups.entries()) {
            if (groupNodes.length > 2) { // 至少3个节点组成社区
                const tags = this.extractCommunityTags(groupNodes);
                const primaryLanguage = this.getMostCommonLanguage(groupNodes);
                
                communities.push({
                    id: `community_${communityId++}`,
                    label: `${path.basename(dirPath)}模块`,
                    description: `位于${dirPath}目录的功能模块`,
                    nodes: groupNodes.map(n => n.id),
                    score: this.calculateCommunityScore(groupNodes, edges),
                    cohesion: 0.8,
                    coupling: 0.3,
                    tags,
                    primary_language: primaryLanguage,
                    functionality: this.inferFunctionality(dirPath, tags),
                    detection_method: 'dependency_based',
                    confidence: 0.8,
                    level: 1,
                    sub_communities: []
                });
            }
        }
        
        return communities;
    }

    /**
     * 创建元数据
     */
    private createStandardMetadata(
        entities: CodeEntity[], 
        nodes: KnowledgeGraphNode[], 
        edges: KnowledgeGraphEdge[]
    ): KnowledgeGraphMetadata {
        const fileNodes = nodes.filter(n => n.type === 'file');
        const entityNodes = nodes.filter(n => n.type === 'code_element');
        
        return {
            version: "1.0.0",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            workspace_path: this.workspacePath,
            total_files: fileNodes.length,
            total_entities: entityNodes.length,
            total_relationships: edges.length,
            supported_languages: this.getUniqueLanguages(entities),
            parsing_statistics: this.calculateParsingStatistics(entities, fileNodes.length)
        };
    }

    // 传统方法（保持向后兼容）

    /**
     * 创建文件和目录节点
     */
    private createFileAndDirectoryNodes(entities: CodeEntity[]): void {
        const processedPaths = new Set<string>();

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
    private createDirectoryHierarchy(filePath: string): void {
        const relativePath = path.relative(this.workspacePath, filePath);
        const pathParts = path.dirname(relativePath).split(path.sep);

        let currentPath = '';
        for (let i = 0; i < pathParts.length; i++) {
            if (pathParts[i] === '.' || pathParts[i] === '') continue;

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
    private createEntityNodes(entities: CodeEntity[]): void {
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
    private createContainsRelationships(entities: CodeEntity[]): void {
        for (const entity of entities) {
            const fileId = this.getFileId(entity.file_path);
            const entityId = this.getEntityId(entity);
            
            this.addEdge(fileId, entityId, 'CONTAINS', 1.0);
        }
    }

    /**
     * 创建定义关系
     */
    private createDefinedInRelationships(entities: CodeEntity[]): void {
        for (const entity of entities) {
            const fileId = this.getFileId(entity.file_path);
            const entityId = this.getEntityId(entity);
            
            this.addEdge(entityId, fileId, 'DEFINED_IN', 1.0);
        }
    }

    /**
     * 创建导入/导出关系
     */
    private createImportExportRelationships(fileImports: Map<string, string[]>, fileExports: Map<string, string[]>): void {
        // 处理导入关系
        for (const [filePath, imports] of fileImports.entries()) {
            const fileId = this.getFileId(filePath);
            
            for (const importPath of imports) {
                // 解析导入路径
                const resolvedPath = this.resolveImportPath(this.workspacePath, filePath, importPath);
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
    private createCallRelationships(entities: CodeEntity[]): void {
        // 简化实现：基于代码片段中的函数调用模式
        const functionEntities = entities.filter(e => e.element_type === 'function');
        const functionMap = new Map<string, CodeEntity[]>();

        // 按文件分组函数
        for (const func of functionEntities) {
            const filePath = func.file_path;
            if (!functionMap.has(filePath)) {
                functionMap.set(filePath, []);
            }
            functionMap.get(filePath)!.push(func);
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
     * 创建语义关系（优化版）
     */
    private createSemanticRelationships(entities: CodeEntity[]): void {
        // 只在相同文件或相关文件之间创建语义关系，减少计算量
        const fileGroups = new Map<string, CodeEntity[]>();
        
        // 按文件分组
        for (const entity of entities) {
            const filePath = entity.file_path;
            if (!fileGroups.has(filePath)) {
                fileGroups.set(filePath, []);
            }
            fileGroups.get(filePath)!.push(entity);
        }
        
        // 只在同一文件内的实体之间创建关系
        for (const [filePath, fileEntities] of fileGroups.entries()) {
            for (let i = 0; i < fileEntities.length; i++) {
                for (let j = i + 1; j < fileEntities.length; j++) {
                    const entityA = fileEntities[i];
                    const entityB = fileEntities[j];
                    
                    // 只在特定情况下创建关系
                    if (this.shouldCreateSemanticRelation(entityA, entityB)) {
                        const similarity = this.calculateSemanticSimilarity(entityA, entityB);
                        
                        if (similarity > 0.5) { // 提高阈值
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
        }
        
        // 只在有导入关系的文件间创建跨文件关系
        this.createCrossFileSemanticRelationships(entities);
    }
    
    /**
     * 判断是否应该创建语义关系
     */
    private shouldCreateSemanticRelation(entityA: CodeEntity, entityB: CodeEntity): boolean {
        // 如果是同一类型的实体，且有共同标签
        if (entityA.element_type === entityB.element_type) {
            const commonTags = this.getCommonTags(entityA.semantic_tags, entityB.semantic_tags);
            return commonTags.length > 1; // 需要有多个共同标签
        }
        
        // Vue组件内部的methods与options之间
        if (entityA.semantic_tags.includes('vue2') && entityB.semantic_tags.includes('vue2')) {
            return true;
        }
        
        return false;
    }
    
    /**
     * 创建跨文件的语义关系（限制数量）
     */
    private createCrossFileSemanticRelationships(entities: CodeEntity[]): void {
        // 只在有导入关系的文件之间创建关系
        const importRelatedFiles = new Set<string>();
        
        for (const edge of this.edges.values()) {
            if (edge.relation === 'IMPORTS') {
                importRelatedFiles.add(edge.source);
                importRelatedFiles.add(edge.target);
            }
        }
        
        // 限制跨文件关系的数量
        let crossFileRelationCount = 0;
        const maxCrossFileRelations = 50; // 限制最多50个跨文件关系
        
        for (let i = 0; i < entities.length && crossFileRelationCount < maxCrossFileRelations; i++) {
            for (let j = i + 1; j < entities.length && crossFileRelationCount < maxCrossFileRelations; j++) {
                const entityA = entities[i];
                const entityB = entities[j];
                
                // 只在不同文件且有导入关系的情况下检查
                if (entityA.file_path !== entityB.file_path) {
                    const fileIdA = this.getFileId(entityA.file_path);
                    const fileIdB = this.getFileId(entityB.file_path);
                    
                    if (importRelatedFiles.has(fileIdA) && importRelatedFiles.has(fileIdB)) {
                        const similarity = this.calculateSemanticSimilarity(entityA, entityB);
                        
                        if (similarity > 0.7) { // 更高的阈值
                            const idA = this.getEntityId(entityA);
                            const idB = this.getEntityId(entityB);
                            
                            this.addEdge(idA, idB, 'RELATED_TO', similarity, {
                                similarity_score: similarity,
                                cross_file: true
                            });
                            crossFileRelationCount++;
                        }
                    }
                }
            }
        }
    }

    /**
     * 检测社区
     */
    private detectCommunities(): Community[] {
        const communities: Community[] = [];
        const visited = new Set<string>();
        const nodeIds = Array.from(this.nodes.keys());

        // 使用连通组件检测进行简单的社区发现
        for (const nodeId of nodeIds) {
            if (!visited.has(nodeId)) {
                const community = this.findConnectedComponent(nodeId, visited);
                if (community.length > 1) { // 只保留包含多个节点的社区
                    communities.push({
                        id: `community_${communities.length + 1}`,
                        nodes: community,
                        score: this.calculateCommunityScoreOld(community),
                        description: this.generateCommunityDescription(community),
                        tags: this.extractCommunityTagsOld(community)
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
    private findConnectedComponent(startNodeId: string, visited: Set<string>): string[] {
        const component: string[] = [];
        const stack: string[] = [startNodeId];

        while (stack.length > 0) {
            const nodeId = stack.pop()!;
            
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
    private getNeighbors(nodeId: string): string[] {
        const neighbors: string[] = [];
        
        for (const edge of this.edges.values()) {
            if (edge.source === nodeId) {
                neighbors.push(edge.target);
            } else if (edge.target === nodeId) {
                neighbors.push(edge.source);
            }
        }

        return neighbors;
    }

    /**
     * 计算社区分数
     */
    private calculateCommunityScoreOld(nodeIds: string[]): number {
        let internalEdges = 0;
        let externalEdges = 0;

        for (const edge of this.edges.values()) {
            const sourceInCommunity = nodeIds.includes(edge.source);
            const targetInCommunity = nodeIds.includes(edge.target);

            if (sourceInCommunity && targetInCommunity) {
                internalEdges++;
            } else if (sourceInCommunity || targetInCommunity) {
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
    private generateCommunityDescription(nodeIds: string[]): string {
        const nodes = nodeIds.map(id => this.nodes.get(id)).filter(Boolean);
        const entityNodes = nodes.filter(node => node!.type === 'entity');
        
        if (entityNodes.length === 0) {
            return '文件目录社区';
        }

        // 统计最常见的元素类型
        const typeCount = new Map<string, number>();
        for (const node of entityNodes) {
            const type = node!.entity?.element_type || 'unknown';
            typeCount.set(type, (typeCount.get(type) || 0) + 1);
        }

        const mostCommonType = Array.from(typeCount.entries())
            .sort((a, b) => b[1] - a[1])[0];

        return `主要包含 ${mostCommonType?.[1] || 0} 个 ${mostCommonType?.[0] || 'unknown'} 的社区`;
    }

    /**
     * 提取社区标签
     */
    private extractCommunityTagsOld(nodeIds: string[]): string[] {
        const tagCount = new Map<string, number>();
        
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

    private getFileId(filePath: string): string {
        return `file:${path.relative(this.workspacePath, filePath)}`;
    }

    private getDirectoryId(relativePath: string): string {
        return `dir:${relativePath}`;
    }

    private getEntityId(entity: CodeEntity): string {
        const relativePath = path.relative(this.workspacePath, entity.file_path);
        return `entity:${relativePath}:${entity.element_type}:${entity.name}:${entity.start_line}`;
    }

    private addEdge(source: string, target: string, relation: RelationType, weight: number, properties: Record<string, any> = {}): void {
        // 检查权重过滤
        if (weight < this.relationshipFilters.minRelationWeight) {
            return; // 跳过权重过低的关系
        }
        
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

    private resolveImportPath(workspacePath: string, fromFile: string, importPath: string): string | null {
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

    private extractFunctionCalls(codeSnippet: string): string[] {
        const calls: string[] = [];
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

    private findFunctionsByName(entities: CodeEntity[], name: string): CodeEntity[] {
        return entities.filter(e => 
            e.element_type === 'function' && 
            e.name === name
        );
    }

    private calculateSemanticSimilarity(entityA: CodeEntity, entityB: CodeEntity): number {
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

    private calculatePathSimilarity(pathA: string, pathB: string): number {
        const dirsA = path.dirname(pathA).split(path.sep);
        const dirsB = path.dirname(pathB).split(path.sep);
        
        const commonDirs = dirsA.filter(dir => dirsB.includes(dir)).length;
        const totalDirs = new Set([...dirsA, ...dirsB]).size;
        
        return totalDirs > 0 ? commonDirs / totalDirs : 0;
    }

    private calculateNameSimilarity(nameA: string, nameB: string): number {
        // 简单的字符串相似度
        const longer = nameA.length > nameB.length ? nameA : nameB;
        const shorter = nameA.length > nameB.length ? nameB : nameA;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    private levenshteinDistance(str1: string, str2: string): number {
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
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i] + 1,
                    matrix[j - 1][i - 1] + indicator
                );
            }
        }

        return matrix[str2.length][str1.length];
    }

    private getCommonTags(tagsA: string[], tagsB: string[]): string[] {
        const setA = new Set(tagsA);
        return tagsB.filter(tag => setA.has(tag));
    }

    private countFileNodes(): number {
        return Array.from(this.nodes.values()).filter(node => node.type === 'file').length;
    }

    // 标准知识图谱辅助方法

    private getFileType(extension: string): string {
        const typeMap: Record<string, string> = {
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

    private generateFileSemanticTags(language: string | undefined, elementTypes: string[], fileName: string): string[] {
        const tags = ['file'];
        if (language) tags.push(language);
        tags.push(...elementTypes);
        
        // 基于文件名添加特殊标签
        const lowerName = fileName.toLowerCase();
        if (lowerName.includes('test')) tags.push('test');
        if (lowerName.includes('spec')) tags.push('spec');
        if (lowerName.includes('config')) tags.push('config');
        if (lowerName.includes('util') || lowerName.includes('helper')) tags.push('utility');
        if (lowerName.includes('component')) tags.push('component');
        if (lowerName.includes('service')) tags.push('service');
        if (lowerName.includes('store')) tags.push('store');
        
        return [...new Set(tags)];
    }

    private generateDirectorySemanticTags(dirName: string, fullPath: string): string[] {
        const tags = ['directory'];
        const lowerName = dirName.toLowerCase();
        
        if (lowerName.includes('component')) tags.push('components');
        if (lowerName.includes('page') || lowerName.includes('view')) tags.push('pages');
        if (lowerName.includes('util') || lowerName.includes('helper')) tags.push('utilities');
        if (lowerName.includes('service') || lowerName.includes('api')) tags.push('services');
        if (lowerName.includes('store') || lowerName.includes('state')) tags.push('state-management');
        if (lowerName.includes('test') || lowerName.includes('spec')) tags.push('testing');
        if (lowerName.includes('config')) tags.push('configuration');
        if (lowerName.includes('asset') || lowerName.includes('static')) tags.push('assets');
        if (lowerName.includes('doc')) tags.push('documentation');
        
        return tags;
    }

    private mapElementType(elementType: string): KnowledgeGraphNode['element_type'] {
        const typeMap: Record<string, KnowledgeGraphNode['element_type']> = {
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

    private extractCommunityTags(nodes: KnowledgeGraphNode[]): string[] {
        const tagCount = new Map<string, number>();
        
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

    private getMostCommonLanguage(nodes: KnowledgeGraphNode[]): string {
        const languageCount = new Map<string, number>();
        
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

    private calculateCommunityScore(nodes: KnowledgeGraphNode[], edges: KnowledgeGraphEdge[]): number {
        const nodeIds = new Set(nodes.map(n => n.id));
        let internalEdges = 0;
        let externalEdges = 0;
        
        for (const edge of edges) {
            const sourceInCommunity = nodeIds.has(edge.source);
            const targetInCommunity = nodeIds.has(edge.target);
            
            if (sourceInCommunity && targetInCommunity) {
                internalEdges++;
            } else if (sourceInCommunity || targetInCommunity) {
                externalEdges++;
            }
        }
        
        const totalEdges = internalEdges + externalEdges;
        return totalEdges > 0 ? (internalEdges - externalEdges / 2) / totalEdges : 0;
    }

    private inferFunctionality(dirPath: string, tags: string[]): string[] {
        const functionality: string[] = [];
        const lowerPath = dirPath.toLowerCase();
        
        if (lowerPath.includes('component')) functionality.push('ui_components');
        if (lowerPath.includes('page') || lowerPath.includes('view')) functionality.push('page_routing');
        if (lowerPath.includes('service') || lowerPath.includes('api')) functionality.push('api_integration');
        if (lowerPath.includes('store') || lowerPath.includes('state')) functionality.push('state_management');
        if (lowerPath.includes('util') || lowerPath.includes('helper')) functionality.push('utilities');
        if (lowerPath.includes('test')) functionality.push('testing');
        if (lowerPath.includes('config')) functionality.push('configuration');
        
        // 基于标签推断功能
        if (tags.includes('vue') || tags.includes('react')) functionality.push('frontend_framework');
        if (tags.includes('function')) functionality.push('business_logic');
        if (tags.includes('class')) functionality.push('object_oriented');
        
        return functionality.length > 0 ? functionality : ['general'];
    }

    private getUniqueLanguages(entities: CodeEntity[]): string[] {
        const languages = new Set<string>();
        for (const entity of entities) {
            if (entity.language) {
                languages.add(entity.language);
            }
        }
        return Array.from(languages);
    }

    private calculateParsingStatistics(entities: CodeEntity[], totalFiles: number): KnowledgeGraphMetadata['parsing_statistics'] {
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
}