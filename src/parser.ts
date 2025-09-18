import * as path from 'path';

// 类型定义
interface TreeSitter {
    parse(input: string): any;
    setLanguage(language: any): void;
}

// 延迟加载 tree-sitter 和相关模块
let TreeSitterModule: any;
let JavaScript: any;
let TypeScript: any;
let Vue: any;
let JSON: any;
let Python: any;
let Java: any;
let Go: any;
let Rust: any;
let vueCompilerSfc: any;

// 可分割的节点类型定义（借鉴参考项目的设计）
const SPLITTABLE_NODE_TYPES = {
    javascript: ['function_declaration', 'arrow_function', 'class_declaration', 'method_definition', 'export_statement'],
    typescript: ['function_declaration', 'arrow_function', 'class_declaration', 'method_definition', 'export_statement', 'interface_declaration', 'type_alias_declaration'],
    python: ['function_definition', 'class_definition', 'decorated_definition', 'async_function_definition'],
    java: ['method_declaration', 'class_declaration', 'interface_declaration', 'constructor_declaration'],
    go: ['function_declaration', 'method_declaration', 'type_declaration', 'var_declaration', 'const_declaration'],
    rust: ['function_item', 'impl_item', 'struct_item', 'enum_item', 'trait_item', 'mod_item']
};

// 初始化函数
async function initializeTreeSitter() {
    if (!TreeSitterModule) {
        try {
            TreeSitterModule = require('tree-sitter');
            JavaScript = require('tree-sitter-javascript');
            TypeScript = require('tree-sitter-typescript');
            Vue = require('tree-sitter-vue');
            JSON = require('tree-sitter-json');
            
            // 扩展更多语言支持
            try {
                Python = require('tree-sitter-python');
                Java = require('tree-sitter-java');
                Go = require('tree-sitter-go'); 
                Rust = require('tree-sitter-rust');
            } catch (e) {
                console.warn('部分语言解析器未安装，将使用基础解析器');
            }
            
            vueCompilerSfc = require('@vue/compiler-sfc');
        } catch (error) {
            console.warn('Tree-sitter 模块加载失败，将使用简化解析:', error);
        }
    }
}

/**
 * 代码实体类型
 */
export type ElementType = 
    | 'component' | 'function' | 'variable' | 'store' | 'api' | 'route' | 'doc' 
    | 'class' | 'interface' | 'import' | 'export' | 'method' | 'property' 
    | 'computed' | 'watch' | 'lifecycle' | 'directive' | 'event';

/**
 * 代码实体节点
 */
export interface CodeEntity {
    file_path: string;
    file_name: string;
    start_line: number;
    end_line: number;
    element_type: ElementType;
    name: string;
    code_snippet: string;
    semantic_tags: string[];
    language?: string;
    scope?: string;
    parameters?: string[];
    return_type?: string;
    dependencies?: string[];
}

/**
 * 解析结果
 */
export interface ParseResult {
    entities: CodeEntity[];
    imports: string[];
    exports: string[];
    errors: string[];
}

/**
 * Tree-sitter 解析器管理器（增强版，合并了 enhanced-parser 的优化）
 */
export class TreeSitterParser {
    private parsers: Map<string, any> = new Map();
    private supportedLanguages = new Set([
        'javascript', 'js', 'typescript', 'ts', 'vue', 'json',
        'python', 'py', 'java', 'go', 'rust', 'rs'
    ]);

    constructor() {
        // 延迟初始化
    }

    /**
     * 检查语言是否支持
     */
    public static isLanguageSupported(language: string): boolean {
        const supportedLanguages = [
            'javascript', 'js', 'typescript', 'ts', 'vue', 'json',
            'python', 'py', 'java', 'go', 'rust', 'rs'
        ];
        return supportedLanguages.includes(language.toLowerCase());
    }

    /**
     * 初始化各语言解析器
     */
    private async initializeParsers(): Promise<void> {
        await initializeTreeSitter();
        
        if (!TreeSitterModule) {
            console.warn('Tree-sitter 未安装，将使用简化解析');
            return;
        }

        try {
            // 初始化各种语言解析器
            if (JavaScript) {
                const jsParser = new TreeSitterModule();
                jsParser.setLanguage(JavaScript);
                this.parsers.set('javascript', jsParser);
                this.parsers.set('js', jsParser);
            }

            if (TypeScript) {
                const tsParser = new TreeSitterModule();
                tsParser.setLanguage(TypeScript.tsx);
                this.parsers.set('typescript', tsParser);
                this.parsers.set('ts', tsParser);
            }

            if (Vue) {
                const vueParser = new TreeSitterModule();
                vueParser.setLanguage(Vue);
                this.parsers.set('vue', vueParser);
            }

            if (JSON) {
                const jsonParser = new TreeSitterModule();
                jsonParser.setLanguage(JSON);
                this.parsers.set('json', jsonParser);
            }

            // 扩展语言支持
            if (Python) {
                const pyParser = new TreeSitterModule();
                pyParser.setLanguage(Python);
                this.parsers.set('python', pyParser);
                this.parsers.set('py', pyParser);
            }

            if (Java) {
                const javaParser = new TreeSitterModule();
                javaParser.setLanguage(Java);
                this.parsers.set('java', javaParser);
            }

            if (Go) {
                const goParser = new TreeSitterModule();
                goParser.setLanguage(Go);
                this.parsers.set('go', goParser);
            }

            if (Rust) {
                const rustParser = new TreeSitterModule();
                rustParser.setLanguage(Rust);
                this.parsers.set('rust', rustParser);
                this.parsers.set('rs', rustParser);
            }

            console.log(`🌳 初始化了 ${this.parsers.size} 个语言解析器`);
        } catch (error) {
            console.warn('解析器初始化失败:', error);
        }
    }

    /**
     * 获取语言配置
     */
    private getLanguageConfig(language: string): { parser: any; nodeTypes: string[] } | null {
        const langKey = language.toLowerCase();
        const parser = this.parsers.get(langKey);
        
        if (!parser) return null;

        const nodeTypeMap: Record<string, string[]> = {
            'javascript': SPLITTABLE_NODE_TYPES.javascript,
            'js': SPLITTABLE_NODE_TYPES.javascript,
            'typescript': SPLITTABLE_NODE_TYPES.typescript,
            'ts': SPLITTABLE_NODE_TYPES.typescript,
            'python': SPLITTABLE_NODE_TYPES.python,
            'py': SPLITTABLE_NODE_TYPES.python,
            'java': SPLITTABLE_NODE_TYPES.java,
            'go': SPLITTABLE_NODE_TYPES.go,
            'rust': SPLITTABLE_NODE_TYPES.rust,
            'rs': SPLITTABLE_NODE_TYPES.rust
        };

        return {
            parser,
            nodeTypes: nodeTypeMap[langKey] || []
        };
    }

    /**
     * 解析文件内容（增强版，集成了参考项目的优化）
     */
    public async parseFile(filePath: string, content: string): Promise<ParseResult> {
        const extension = path.extname(filePath).toLowerCase();
        const fileName = path.basename(filePath);
        
        const result: ParseResult = {
            entities: [],
            imports: [],
            exports: [],
            errors: []
        };

        if (this.parsers.size === 0) {
            await this.initializeParsers();
        }

        try {
            const language = this.getLanguageFromExtension(extension);
            console.log(`🔍 解析文件: ${fileName} (${language})`);

            switch (extension) {
                case '.vue':
                    return this.parseVueFile(filePath, fileName, content);
                case '.js':
                case '.jsx':
                    return this.parseJavaScriptFile(filePath, fileName, content, 'javascript');
                case '.ts':
                case '.tsx':
                    return this.parseJavaScriptFile(filePath, fileName, content, 'typescript');
                case '.py':
                    return this.parseLanguageFile(filePath, fileName, content, 'python');
                case '.java':
                    return this.parseLanguageFile(filePath, fileName, content, 'java');
                case '.go':
                    return this.parseLanguageFile(filePath, fileName, content, 'go');
                case '.rs':
                    return this.parseLanguageFile(filePath, fileName, content, 'rust');
                case '.json':
                    return this.parseJSONFile(filePath, fileName, content);
                case '.md':
                    return this.parseMarkdownFile(filePath, fileName, content);
                default:
                    result.errors.push(`不支持的文件类型: ${extension}`);
                    return result;
            }
        } catch (error) {
            result.errors.push(`解析文件失败: ${error}`);
            return result;
        }
    }

    /**
     * 解析 Vue 文件（增强版）
     */
    private async parseVueFile(filePath: string, fileName: string, content: string): Promise<ParseResult> {
        const result: ParseResult = {
            entities: [],
            imports: [],
            exports: [],
            errors: []
        };

        try {
            await initializeTreeSitter();
            
            if (!vueCompilerSfc) {
                return this.parseVueFileWithRegex(filePath, fileName, content);
            }
            
            const { descriptor } = vueCompilerSfc.parse(content, { filename: filePath });

            // 解析 script 部分
            if (descriptor.script) {
                const scriptContent = descriptor.script.content;
                const scriptLang = descriptor.script.lang || 'js';
                const isTypeScript = scriptLang === 'ts';
                
                const scriptResult = await this.parseJavaScriptFile(
                    filePath, 
                    fileName, 
                    scriptContent, 
                    isTypeScript ? 'typescript' : 'javascript'
                );

                result.entities.push(...scriptResult.entities);
                result.imports.push(...scriptResult.imports);
                result.exports.push(...scriptResult.exports);

                await this.extractVue2OptionAPI(filePath, fileName, scriptContent, result);
            }

            // 解析 script setup 部分
            if (descriptor.scriptSetup) {
                const setupContent = descriptor.scriptSetup.content;
                const setupLang = descriptor.scriptSetup.lang || 'js';
                const isTypeScript = setupLang === 'ts';

                const setupResult = await this.parseJavaScriptFile(
                    filePath, 
                    fileName, 
                    setupContent, 
                    isTypeScript ? 'typescript' : 'javascript'
                );

                result.entities.push(...setupResult.entities);
                result.imports.push(...setupResult.imports);
                result.exports.push(...setupResult.exports);

                await this.extractVue3CompositionAPI(filePath, fileName, setupContent, result);
            }

            // 解析 template 部分
            if (descriptor.template) {
                this.extractTemplateInfo(filePath, fileName, descriptor.template.content, result);
            }

            // 添加 Vue 组件实体
            result.entities.push({
                file_path: filePath,
                file_name: fileName,
                start_line: 1,
                end_line: content.split('\n').length,
                element_type: 'component',
                name: this.getComponentNameFromPath(fileName),
                code_snippet: content.length > 200 ? content.substring(0, 200) + '...' : content,
                semantic_tags: ['vue', 'component', 'frontend'],
                language: 'vue'
            });

        } catch (error) {
            result.errors.push(`解析 Vue 文件失败: ${error}`);
        }

        return result;
    }

    /**
     * 增强的 JavaScript/TypeScript 解析
     */
    private async parseJavaScriptFile(filePath: string, fileName: string, content: string, language: string): Promise<ParseResult> {
        const result: ParseResult = {
            entities: [],
            imports: [],
            exports: [],
            errors: []
        };

        const langConfig = this.getLanguageConfig(language);
        if (!langConfig) {
            return this.parseJavaScriptFileWithRegex(filePath, fileName, content, language);
        }

        try {
            console.log(`🌳 使用 AST 解析器解析 ${language} 文件: ${fileName}`);
            
            const tree = langConfig.parser.parse(content);
            
            if (!tree.rootNode) {
                console.warn(`⚠️  AST 解析失败，回退到正则解析: ${fileName}`);
                return this.parseJavaScriptFileWithRegex(filePath, fileName, content, language);
            }

            // 使用 AST 提取实体
            this.extractEntitiesFromAST(tree.rootNode, content, filePath, fileName, language, langConfig.nodeTypes, result);
            
            // 提取导入导出
            this.extractImportsExportsFromAST(tree.rootNode, content, result);
            
        } catch (error) {
            console.warn(`⚠️  AST 解析器失败，回退到正则解析: ${error}`);
            return this.parseJavaScriptFileWithRegex(filePath, fileName, content, language);
        }

        return result;
    }

    /**
     * 通用语言文件解析（Python、Java、Go、Rust等）
     */
    private async parseLanguageFile(filePath: string, fileName: string, content: string, language: string): Promise<ParseResult> {
        const result: ParseResult = {
            entities: [],
            imports: [],
            exports: [],
            errors: []
        };

        const langConfig = this.getLanguageConfig(language);
        if (!langConfig) {
            return this.parseLanguageFileWithRegex(filePath, fileName, content, language);
        }

        try {
            console.log(`🌳 使用 AST 解析器解析 ${language} 文件: ${fileName}`);
            
            const tree = langConfig.parser.parse(content);
            
            if (tree.rootNode) {
                this.extractEntitiesFromAST(tree.rootNode, content, filePath, fileName, language, langConfig.nodeTypes, result);
                this.extractImportsExportsFromAST(tree.rootNode, content, result);
            }
            
        } catch (error) {
            console.warn(`⚠️  ${language} AST 解析器失败，回退到正则解析: ${error}`);
            return this.parseLanguageFileWithRegex(filePath, fileName, content, language);
        }

        return result;
    }

    // AST 相关方法

    /**
     * 从 AST 提取代码实体
     */
    private extractEntitiesFromAST(
        node: any,
        code: string,
        filePath: string,
        fileName: string,
        language: string,
        splittableTypes: string[],
        result: ParseResult
    ): void {
        const traverse = (currentNode: any) => {
            if (splittableTypes.includes(currentNode.type)) {
                const startLine = currentNode.startPosition.row + 1;
                const endLine = currentNode.endPosition.row + 1;
                const nodeText = code.slice(currentNode.startIndex, currentNode.endIndex);

                if (nodeText.trim().length > 0) {
                    const entity: CodeEntity = {
                        file_path: filePath,
                        file_name: fileName,
                        start_line: startLine,
                        end_line: endLine,
                        element_type: this.mapNodeTypeToElementType(currentNode.type),
                        name: this.extractNameFromNode(currentNode, code) || 'anonymous',
                        code_snippet: nodeText.length > 500 ? nodeText.substring(0, 500) + '...' : nodeText,
                        semantic_tags: this.generateSemanticTagsFromAST(currentNode, code, language),
                        language: language
                    };
                    result.entities.push(entity);
                }
            }

            for (const child of currentNode.children || []) {
                traverse(child);
            }
        };

        traverse(node);
    }

    /**
     * 从 AST 提取导入导出
     */
    private extractImportsExportsFromAST(node: any, code: string, result: ParseResult): void {
        const traverse = (currentNode: any) => {
            if (currentNode.type === 'import_statement') {
                const importText = code.slice(currentNode.startIndex, currentNode.endIndex);
                const match = importText.match(/from\s+['"]([^'"]+)['"]/);
                if (match) {
                    result.imports.push(match[1]);
                }
            }
            
            if (currentNode.type === 'export_statement') {
                const exportText = code.slice(currentNode.startIndex, currentNode.endIndex);
                const matches = exportText.match(/export\s+(?:default\s+)?(?:function|class|const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g);
                if (matches) {
                    matches.forEach(match => {
                        const nameMatch = match.match(/([a-zA-Z_$][a-zA-Z0-9_$]*)\s*$/);
                        if (nameMatch) {
                            result.exports.push(nameMatch[1]);
                        }
                    });
                }
            }

            for (const child of currentNode.children || []) {
                traverse(child);
            }
        };

        traverse(node);
    }

    // 辅助方法

    private getLanguageFromExtension(extension: string): string {
        const langMap: Record<string, string> = {
            '.vue': 'vue', '.js': 'javascript', '.jsx': 'javascript', '.ts': 'typescript', 
            '.tsx': 'typescript', '.py': 'python', '.java': 'java', '.go': 'go', 
            '.rs': 'rust', '.json': 'json', '.md': 'markdown'
        };
        return langMap[extension] || 'unknown';
    }

    private mapNodeTypeToElementType(nodeType: string): ElementType {
        const typeMap: Record<string, ElementType> = {
            'function_declaration': 'function', 'arrow_function': 'function', 'method_definition': 'method',
            'class_declaration': 'class', 'interface_declaration': 'interface', 'type_alias_declaration': 'interface',
            'export_statement': 'export', 'import_statement': 'import', 'variable_declaration': 'variable',
            'const_declaration': 'variable', 'let_declaration': 'variable'
        };
        return typeMap[nodeType] || 'variable';
    }

    private extractNameFromNode(node: any, code: string): string | null {
        if (node.children) {
            for (const child of node.children) {
                if (child.type === 'identifier') {
                    return code.slice(child.startIndex, child.endIndex);
                }
            }
        }
        return null;
    }

    private generateSemanticTagsFromAST(node: any, code: string, language: string): string[] {
        const tags = [language, node.type];
        const nodeText = code.slice(node.startIndex, node.endIndex).toLowerCase();
        
        if (nodeText.includes('api')) tags.push('api');
        if (nodeText.includes('service')) tags.push('service');
        if (nodeText.includes('util')) tags.push('utility');
        if (nodeText.includes('component')) tags.push('component');
        if (nodeText.includes('store')) tags.push('store');
        if (nodeText.includes('router')) tags.push('route');
        if (nodeText.includes('test')) tags.push('test');
        if (nodeText.includes('config')) tags.push('configuration');
        
        return tags;
    }

    private getComponentNameFromPath(fileName: string): string {
        return fileName.replace(/\.(vue|js|ts)$/, '')
                      .replace(/[-_](.)/g, (_, char) => char.toUpperCase())
                      .replace(/^(.)/, char => char.toUpperCase());
    }

    // 简化解析方法（回退方案）

    private async parseVueFileWithRegex(filePath: string, fileName: string, content: string): Promise<ParseResult> {
        const result: ParseResult = { entities: [], imports: [], exports: [], errors: [] };
        
        // 基本的 Vue 组件实体
        result.entities.push({
            file_path: filePath, file_name: fileName, start_line: 1, end_line: content.split('\n').length,
            element_type: 'component', name: this.getComponentNameFromPath(fileName),
            code_snippet: content.length > 200 ? content.substring(0, 200) + '...' : content,
            semantic_tags: ['vue', 'component'], language: 'vue'
        });

        return result;
    }

    private async parseJavaScriptFileWithRegex(filePath: string, fileName: string, content: string, language: string): Promise<ParseResult> {
        const result: ParseResult = { entities: [], imports: [], exports: [], errors: [] };
        
        // 简单的正则解析
        const functionRegex = /(?:function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)|const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:\([^)]*\)\s*=>|function))/g;
        let match;
        
        while ((match = functionRegex.exec(content)) !== null) {
            const name = match[1] || match[2];
            if (name) {
                const lineNumber = content.substring(0, match.index).split('\n').length;
                result.entities.push({
                    file_path: filePath, file_name: fileName, start_line: lineNumber, end_line: lineNumber,
                    element_type: 'function', name: name, code_snippet: match[0],
                    semantic_tags: [language, 'function'], language: language
                });
            }
        }

        return result;
    }

    private async parseLanguageFileWithRegex(filePath: string, fileName: string, content: string, language: string): Promise<ParseResult> {
        const result: ParseResult = { entities: [], imports: [], exports: [], errors: [] };
        
        // 基本实体
        result.entities.push({
            file_path: filePath, file_name: fileName, start_line: 1, end_line: content.split('\n').length,
            element_type: 'doc', name: fileName, code_snippet: content.substring(0, 200),
            semantic_tags: [language, 'source'], language: language
        });

        return result;
    }

    private async parseJSONFile(filePath: string, fileName: string, content: string): Promise<ParseResult> {
        const result: ParseResult = { entities: [], imports: [], exports: [], errors: [] };
        
        try {
            const jsonData = JSON.parse(content);
            result.entities.push({
                file_path: filePath, file_name: fileName, start_line: 1, end_line: content.split('\n').length,
                element_type: 'doc', name: fileName.replace('.json', ''),
                code_snippet: content.length > 200 ? content.substring(0, 200) + '...' : content,
                semantic_tags: this.generateJSONSemanticTags(fileName, jsonData), language: 'json'
            });
        } catch (error) {
            result.errors.push(`解析 JSON 文件失败: ${error}`);
        }

        return result;
    }

    private async parseMarkdownFile(filePath: string, fileName: string, content: string): Promise<ParseResult> {
        const result: ParseResult = { entities: [], imports: [], exports: [], errors: [] };
        
        // 提取标题
        const headingRegex = /^(#{1,6})\s+(.+)$/gm;
        let match;
        
        while ((match = headingRegex.exec(content)) !== null) {
            const level = match[1].length;
            const title = match[2];
            const lineIndex = content.substring(0, match.index).split('\n').length;
            
            result.entities.push({
                file_path: filePath, file_name: fileName, start_line: lineIndex, end_line: lineIndex,
                element_type: 'doc', name: title, code_snippet: match[0],
                semantic_tags: ['markdown', 'heading', `h${level}`], language: 'markdown'
            });
        }

        return result;
    }

    private generateJSONSemanticTags(fileName: string, jsonData: any): string[] {
        const tags = ['json', 'configuration'];
        
        if (fileName.includes('package')) tags.push('package', 'dependencies');
        if (fileName.includes('config')) tags.push('configuration');
        if (fileName.includes('api')) tags.push('api');
        if (fileName.includes('route')) tags.push('route');
        
        if (jsonData.dependencies) tags.push('dependencies');
        if (jsonData.scripts) tags.push('scripts');
        if (jsonData.routes) tags.push('routes');
        if (jsonData.api) tags.push('api');
        
        return tags;
    }

    // Vue 特殊处理方法

    private async extractVue2OptionAPI(filePath: string, fileName: string, content: string, result: ParseResult): Promise<void> {
        // 简化的 Vue2 Option API 处理
        const options = ['data', 'methods', 'computed', 'watch', 'props', 'components'];
        
        for (const option of options) {
            const regex = new RegExp(`${option}\\s*[:=]`, 'g');
            const match = regex.exec(content);
            if (match) {
                const lineNumber = content.substring(0, match.index).split('\n').length;
                result.entities.push({
                    file_path: filePath, file_name: fileName, start_line: lineNumber, end_line: lineNumber,
                    element_type: this.getVue2ElementType(option), name: option,
                    code_snippet: match[0], semantic_tags: ['vue2', 'option-api', option], language: 'javascript'
                });
            }
        }
    }

    private async extractVue3CompositionAPI(filePath: string, fileName: string, content: string, result: ParseResult): Promise<void> {
        // 简化的 Vue3 Composition API 处理
        const reactiveAPIs = ['ref', 'reactive', 'computed', 'watch', 'watchEffect'];
        
        for (const api of reactiveAPIs) {
            const regex = new RegExp(`${api}\\s*\\(`, 'g');
            let match;
            while ((match = regex.exec(content)) !== null) {
                const lineNumber = content.substring(0, match.index).split('\n').length;
                result.entities.push({
                    file_path: filePath, file_name: fileName, start_line: lineNumber, end_line: lineNumber,
                    element_type: this.getVue3ElementType(api), name: `${api}_call`,
                    code_snippet: match[0], semantic_tags: ['vue3', 'composition-api', api], language: 'javascript'
                });
            }
        }
    }

    private extractTemplateInfo(filePath: string, fileName: string, templateContent: string, result: ParseResult): void {
        // 提取组件使用
        const componentRegex = /<([A-Z][a-zA-Z0-9-]*)/g;
        let match;
        const usedComponents = new Set<string>();

        while ((match = componentRegex.exec(templateContent)) !== null) {
            usedComponents.add(match[1]);
        }

        for (const component of usedComponents) {
            result.entities.push({
                file_path: filePath, file_name: fileName, start_line: 1, end_line: 1,
                element_type: 'component', name: component, code_snippet: `<${component}>`,
                semantic_tags: ['template', 'component-usage', 'vue'], language: 'vue'
            });
        }
    }

    private getVue2ElementType(option: string): ElementType {
        const typeMap: Record<string, ElementType> = {
            'data': 'variable', 'methods': 'method', 'computed': 'computed', 'watch': 'watch',
            'props': 'property', 'components': 'component', 'created': 'lifecycle', 'mounted': 'lifecycle'
        };
        return typeMap[option] || 'property';
    }

    private getVue3ElementType(api: string): ElementType {
        const typeMap: Record<string, ElementType> = {
            'ref': 'variable', 'reactive': 'variable', 'computed': 'computed', 
            'watch': 'watch', 'watchEffect': 'watch'
        };
        return typeMap[api] || 'function';
    }
}