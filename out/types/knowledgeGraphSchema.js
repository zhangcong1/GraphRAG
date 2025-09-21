"use strict";
/**
 * 标准知识图谱JSON数据结构
 * 基于README.md中定义的四层架构：项目 → 目录 → 文件 → 代码元素
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.KNOWLEDGE_GRAPH_SCHEMA_EXAMPLE = void 0;
/**
 * 完整的知识图谱示例结构
 */
exports.KNOWLEDGE_GRAPH_SCHEMA_EXAMPLE = {
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
//# sourceMappingURL=knowledgeGraphSchema.js.map