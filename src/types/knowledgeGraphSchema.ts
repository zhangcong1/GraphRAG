/**
 * 标准知识图谱JSON数据结构
 * 基于README.md中定义的四层架构：项目 → 目录 → 文件 → 代码元素
 */

export interface KnowledgeGraphJSON {
    metadata: KnowledgeGraphMetadata;
    nodes: KnowledgeGraphNode[];
    edges: KnowledgeGraphEdge[];
    communities: KnowledgeGraphCommunity[];
}

/**
 * 知识图谱元数据
 */
export interface KnowledgeGraphMetadata {
    version: string;
    created_at: string;
    updated_at: string;
    workspace_path: string;
    total_files: number;
    total_entities: number;
    total_relationships: number;
    supported_languages: string[];
    parsing_statistics: {
        successful_files: number;
        failed_files: number;
        parsed_functions: number;
        parsed_classes: number;
        parsed_variables: number;
        parsed_components: number;
    };
}

/**
 * 知识图谱节点
 */
export interface KnowledgeGraphNode {
    id: string;
    type: 'project' | 'directory' | 'file' | 'code_element';
    name: string;
    
    // 必须字段：文件绝对路径和行数信息
    absolute_path?: string;      // 文件的绝对路径
    relative_path?: string;      // 相对于项目根目录的路径
    start_line?: number;         // 代码片段开始行号（1-based）
    end_line?: number;           // 代码片段结束行号（1-based）
    
    // 代码元素相关字段
    element_type?: 'function' | 'class' | 'variable' | 'component' | 'interface' | 'type' | 'constant' | 'method' | 'property' | 'route' | 'store' | 'api_handler' | 'markdown_section';
    code_snippet?: string;       // 原始代码片段
    semantic_tags: string[];     // 语义标签
    
    // 文件相关字段
    file_type?: string;          // 文件类型：vue/js/ts/json/md等
    file_size?: number;          // 文件大小（字节）
    line_count?: number;         // 文件总行数
    
    // 项目/目录相关字段
    level?: number;              // 目录层级
    children_count?: number;     // 子节点数量
    
    // 通用属性
    properties: Record<string, any>;
    
    // 技术栈标签（项目级别）
    tech_stack?: string[];       // vue2/vue3/react/ts/js等
    
    // 导入导出信息（文件级别）
    imports?: string[];
    exports?: string[];
    
    // 附加元数据
    description?: string;
    documentation?: string;
    complexity_score?: number;   // 复杂度评分
}

/**
 * 知识图谱边（关系）
 */
export interface KnowledgeGraphEdge {
    id: string;
    source: string;              // 源节点ID
    target: string;              // 目标节点ID
    relation: RelationType;
    weight: number;              // 关系权重 [0-1]
    
    // 关系具体信息
    properties: {
        description?: string;
        confidence?: number;     // 关系可信度
        line_number?: number;    // 关系发生的行号
        call_count?: number;     // 调用次数（对于CALLS关系）
        similarity_score?: number; // 语义相似度（对于SIMILAR_TO关系）
        dependency_type?: 'import' | 'require' | 'dynamic'; // 依赖类型
        [key: string]: any;
    };
}

/**
 * 关系类型枚举
 */
export type RelationType = 
    // 结构性关系
    | 'CONTAINS'           // 包含关系：项目→模块→文件→代码元素
    | 'DEFINED_IN'         // 定义关系：代码元素→文件
    | 'IMPORTS'            // 导入关系：文件→文件
    | 'EXPORTS'            // 导出关系：文件→文件
    | 'CALLS'              // 调用关系：函数→函数
    | 'EXTENDS'            // 继承关系：类→类
    | 'IMPLEMENTS'         // 实现关系：类→接口
    | 'USES'               // 使用关系：代码元素→代码元素
    
    // 语义性关系
    | 'SIMILAR_TO'         // 语义相似：代码元素↔代码元素
    | 'RELATED_TO'         // 语义关联：跨文件的功能关联
    | 'DOCUMENTED_BY'      // 文档关系：代码元素↔文档
    
    // 社区关系
    | 'BELONGS_TO_COMMUNITY'; // 社区归属：节点→社区

/**
 * 知识图谱社区（功能群落）
 */
export interface KnowledgeGraphCommunity {
    id: string;
    label: string;               // 社区标签，例如"登录功能"、"权限管理"
    description: string;         // 社区描述
    
    // 社区成员
    nodes: string[];             // 包含的节点ID列表
    
    // 社区统计
    score: number;               // 社区质量评分 [0-1]
    cohesion: number;            // 内聚度
    coupling: number;            // 耦合度
    
    // 社区特征
    tags: string[];              // 社区特征标签
    primary_language?: string;   // 主要编程语言
    functionality: string[];     // 功能分类
    
    // 聚合规则
    detection_method: 'dependency_based' | 'semantic_similarity' | 'hybrid';
    confidence: number;          // 社区检测可信度
    
    // 社区层次
    level: number;               // 社区层级（支持嵌套社区）
    parent_community?: string;   // 父社区ID
    sub_communities: string[];   // 子社区ID列表
}

/**
 * 代码元素详细信息
 */
export interface CodeElementDetails {
    // 基本信息
    signature?: string;          // 函数/方法签名
    parameters?: Parameter[];    // 参数列表
    return_type?: string;        // 返回类型
    visibility?: 'public' | 'private' | 'protected'; // 可见性
    
    // 代码质量指标
    cyclomatic_complexity?: number; // 圈复杂度
    lines_of_code?: number;      // 代码行数
    comment_ratio?: number;      // 注释比例
    
    // 使用统计
    call_frequency?: number;     // 被调用频次
    last_modified?: string;      // 最后修改时间
    author?: string;             // 作者信息
    
    // 依赖信息
    dependencies: string[];      // 依赖的其他代码元素
    dependents: string[];        // 依赖此元素的其他元素
}

/**
 * 参数信息
 */
export interface Parameter {
    name: string;
    type?: string;
    optional?: boolean;
    default_value?: string;
    description?: string;
}

/**
 * 完整的知识图谱示例结构
 */
export const KNOWLEDGE_GRAPH_SCHEMA_EXAMPLE: KnowledgeGraphJSON = {
    metadata: {
        version: "1.0.0",
        created_at: "2024-01-20T10:00:00Z",
        updated_at: "2024-01-20T10:30:00Z",
        workspace_path: "/Users/username/project",
        total_files: 45,
        total_entities: 230,
        total_relationships: 456,
        supported_languages: ["javascript", "typescript", "vue", "json", "markdown"],
        parsing_statistics: {
            successful_files: 43,
            failed_files: 2,
            parsed_functions: 120,
            parsed_classes: 25,
            parsed_variables: 60,
            parsed_components: 25
        }
    },
    
    nodes: [
        // 项目节点
        {
            id: "project_root",
            type: "project",
            name: "Vue登录系统",
            absolute_path: "/Users/username/project",
            semantic_tags: ["vue", "login", "authentication"],
            tech_stack: ["vue2", "javascript", "vuex"],
            properties: {
                package_json: {
                    dependencies: ["vue", "vuex", "axios"],
                    scripts: ["dev", "build", "test"]
                }
            }
        },
        
        // 目录节点
        {
            id: "dir_components",
            type: "directory", 
            name: "components",
            absolute_path: "/Users/username/project/components",
            relative_path: "components",
            level: 1,
            children_count: 3,
            semantic_tags: ["ui", "components"],
            properties: {}
        },
        
        // 文件节点
        {
            id: "file_login_vue",
            type: "file",
            name: "LoginForm.vue",
            absolute_path: "/Users/username/project/components/LoginForm.vue",
            relative_path: "components/LoginForm.vue",
            file_type: "vue",
            file_size: 2048,
            line_count: 85,
            semantic_tags: ["login", "form", "authentication", "vue-component"],
            imports: ["./authService.js", "vuex"],
            exports: ["LoginForm"],
            properties: {
                component_type: "single_file_component",
                has_scoped_style: true
            }
        },
        
        // 代码元素节点
        {
            id: "element_login_method",
            type: "code_element",
            name: "login",
            absolute_path: "/Users/username/project/components/LoginForm.vue",
            relative_path: "components/LoginForm.vue",
            start_line: 45,
            end_line: 62,
            element_type: "method",
            code_snippet: `async login() {
    try {
        const response = await this.$store.dispatch('auth/login', {
            username: this.username,
            password: this.password
        });
        
        if (response.success) {
            this.$router.push('/dashboard');
        } else {
            this.showError(response.message);
        }
    } catch (error) {
        this.showError('登录失败，请重试');
        console.error('Login error:', error);
    }
}`,
            semantic_tags: ["login", "authentication", "async", "error-handling", "navigation"],
            properties: {
                is_async: true,
                has_error_handling: true,
                calls_store: true,
                calls_router: true
            }
        }
    ],
    
    edges: [
        // 包含关系
        {
            id: "edge_project_contains_dir",
            source: "project_root",
            target: "dir_components", 
            relation: "CONTAINS",
            weight: 1.0,
            properties: {
                description: "项目包含components目录"
            }
        },
        
        {
            id: "edge_dir_contains_file",
            source: "dir_components",
            target: "file_login_vue",
            relation: "CONTAINS", 
            weight: 1.0,
            properties: {
                description: "components目录包含LoginForm.vue文件"
            }
        },
        
        {
            id: "edge_file_contains_method",
            source: "file_login_vue",
            target: "element_login_method",
            relation: "CONTAINS",
            weight: 1.0,
            properties: {
                description: "LoginForm.vue文件包含login方法"
            }
        },
        
        // 定义关系
        {
            id: "edge_method_defined_in_file",
            source: "element_login_method",
            target: "file_login_vue",
            relation: "DEFINED_IN",
            weight: 1.0,
            properties: {
                description: "login方法定义在LoginForm.vue文件中",
                line_number: 45
            }
        }
    ],
    
    communities: [
        {
            id: "community_auth",
            label: "用户认证模块",
            description: "处理用户登录、注册、权限验证的功能模块",
            nodes: ["file_login_vue", "element_login_method"],
            score: 0.85,
            cohesion: 0.9,
            coupling: 0.3,
            tags: ["authentication", "login", "security"],
            primary_language: "javascript",
            functionality: ["user_authentication", "session_management"],
            detection_method: "semantic_similarity",
            confidence: 0.87,
            level: 1,
            sub_communities: []
        }
    ]
};