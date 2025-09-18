"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JavaScriptParser = void 0;
const types_1 = require("./types");
/**
 * JavaScript/TypeScript 解析器
 */
class JavaScriptParser {
    parsers = new Map();
    TreeSitterModule;
    JavaScript;
    TypeScript;
    constructor() {
        this.initializeParsers();
    }
    /**
     * 初始化Tree-sitter解析器
     */
    async initializeParsers() {
        try {
            this.TreeSitterModule = require('tree-sitter');
            this.JavaScript = require('tree-sitter-javascript');
            this.TypeScript = require('tree-sitter-typescript');
            if (this.JavaScript) {
                const jsParser = new this.TreeSitterModule();
                jsParser.setLanguage(this.JavaScript);
                this.parsers.set('javascript', jsParser);
                this.parsers.set('js', jsParser);
            }
            if (this.TypeScript) {
                const tsParser = new this.TreeSitterModule();
                tsParser.setLanguage(this.TypeScript.tsx);
                this.parsers.set('typescript', tsParser);
                this.parsers.set('ts', tsParser);
            }
            console.log(`🌳 JavaScript/TypeScript 解析器初始化完成`);
        }
        catch (error) {
            console.warn('JavaScript/TypeScript 解析器初始化失败:', error);
        }
    }
    /**
     * 检查是否支持该文件扩展名
     */
    isSupported(extension) {
        return ['.js', '.jsx', '.ts', '.tsx'].includes(extension.toLowerCase());
    }
    /**
     * 解析JavaScript/TypeScript文件
     */
    async parseFile(filePath, fileName, content) {
        const extension = this.getExtensionFromPath(filePath);
        const language = extension === '.ts' || extension === '.tsx' ? 'typescript' : 'javascript';
        const result = {
            entities: [],
            imports: [],
            exports: [],
            errors: []
        };
        const langConfig = this.getLanguageConfig(language);
        if (!langConfig) {
            return this.parseWithRegex(filePath, fileName, content, language);
        }
        try {
            console.log(`🌳 使用 AST 解析器解析 ${language} 文件: ${fileName}`);
            const tree = langConfig.parser.parse(content);
            if (!tree.rootNode) {
                console.warn(`⚠️  AST 解析失败，回退到正则解析: ${fileName}`);
                return this.parseWithRegex(filePath, fileName, content, language);
            }
            // 使用 AST 提取实体
            this.extractEntitiesFromAST(tree.rootNode, content, filePath, fileName, language, langConfig.nodeTypes, result);
            // 提取导入导出
            this.extractImportsExportsFromAST(tree.rootNode, content, result);
        }
        catch (error) {
            console.warn(`⚠️  AST 解析器失败，回退到正则解析: ${error}`);
            return this.parseWithRegex(filePath, fileName, content, language);
        }
        return result;
    }
    /**
     * 获取语言配置
     */
    getLanguageConfig(language) {
        const parser = this.parsers.get(language);
        if (!parser)
            return null;
        const nodeTypeMap = {
            'javascript': types_1.SPLITTABLE_NODE_TYPES.javascript,
            'typescript': types_1.SPLITTABLE_NODE_TYPES.typescript
        };
        return {
            parser,
            nodeTypes: nodeTypeMap[language] || []
        };
    }
    /**
     * 从 AST 提取代码实体
     */
    extractEntitiesFromAST(node, code, filePath, fileName, language, splittableTypes, result) {
        const traverse = (currentNode) => {
            if (splittableTypes.includes(currentNode.type)) {
                const startLine = currentNode.startPosition.row + 1;
                const endLine = currentNode.endPosition.row + 1;
                const nodeText = code.slice(currentNode.startIndex, currentNode.endIndex);
                if (nodeText.trim().length > 0) {
                    const entity = {
                        file_path: filePath,
                        file_name: fileName,
                        start_line: startLine,
                        end_line: endLine,
                        element_type: this.mapNodeTypeToElementType(currentNode.type),
                        name: this.extractNameFromNode(currentNode, code) || 'anonymous',
                        code_snippet: nodeText,
                        semantic_tags: this.generateSemanticTagsFromAST(currentNode, code, language),
                        language: language,
                        scope: this.extractScopeInfo(currentNode, code),
                        parameters: this.extractParameters(currentNode, code),
                        return_type: this.extractReturnType(currentNode, code)
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
    extractImportsExportsFromAST(node, code, result) {
        const traverse = (currentNode) => {
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
    /**
     * 正则表达式解析（回退方案）
     */
    async parseWithRegex(filePath, fileName, content, language) {
        const result = { entities: [], imports: [], exports: [], errors: [] };
        // 简单的正则解析
        const functionRegex = /(?:function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)|const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:\([^)]*\)\s*=>|function))/g;
        let match;
        while ((match = functionRegex.exec(content)) !== null) {
            const name = match[1] || match[2];
            if (name) {
                const lineNumber = content.substring(0, match.index).split('\n').length;
                result.entities.push({
                    file_path: filePath,
                    file_name: fileName,
                    start_line: lineNumber,
                    end_line: lineNumber,
                    element_type: 'function',
                    name: name,
                    code_snippet: match[0],
                    semantic_tags: [language, 'function'],
                    language: language
                });
            }
        }
        return result;
    }
    // 辅助方法
    getExtensionFromPath(filePath) {
        return filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
    }
    mapNodeTypeToElementType(nodeType) {
        const typeMap = {
            'function_declaration': 'function',
            'arrow_function': 'function',
            'method_definition': 'method',
            'class_declaration': 'class',
            'interface_declaration': 'interface',
            'type_alias_declaration': 'interface',
            'export_statement': 'export',
            'import_statement': 'import',
            'variable_declaration': 'variable',
            'const_declaration': 'variable',
            'let_declaration': 'variable'
        };
        return typeMap[nodeType] || 'variable';
    }
    extractNameFromNode(node, code) {
        if (node.children) {
            for (const child of node.children) {
                if (child.type === 'identifier') {
                    return code.slice(child.startIndex, child.endIndex);
                }
            }
        }
        return null;
    }
    generateSemanticTagsFromAST(node, code, language) {
        const tags = [language, node.type];
        const nodeText = code.slice(node.startIndex, node.endIndex).toLowerCase();
        if (nodeText.includes('api'))
            tags.push('api');
        if (nodeText.includes('service'))
            tags.push('service');
        if (nodeText.includes('util'))
            tags.push('utility');
        if (nodeText.includes('component'))
            tags.push('component');
        if (nodeText.includes('store'))
            tags.push('store');
        if (nodeText.includes('router'))
            tags.push('route');
        if (nodeText.includes('test'))
            tags.push('test');
        if (nodeText.includes('config'))
            tags.push('configuration');
        return tags;
    }
    extractScopeInfo(node, code) {
        if (node.parent) {
            if (node.parent.type === 'class_declaration') {
                return 'class';
            }
            else if (node.parent.type === 'function_declaration') {
                return 'function';
            }
        }
        return 'global';
    }
    extractParameters(node, code) {
        if (node.type === 'function_declaration' || node.type === 'method_definition') {
            const params = [];
            const findParams = (currentNode) => {
                if (currentNode.type === 'formal_parameters') {
                    for (const child of currentNode.children || []) {
                        if (child.type === 'identifier') {
                            params.push(code.slice(child.startIndex, child.endIndex));
                        }
                    }
                }
                for (const child of currentNode.children || []) {
                    findParams(child);
                }
            };
            findParams(node);
            return params.length > 0 ? params : undefined;
        }
        return undefined;
    }
    extractReturnType(node, code) {
        if (node.type === 'function_declaration' || node.type === 'method_definition') {
            const findReturnType = (currentNode) => {
                if (currentNode.type === 'type_annotation') {
                    return code.slice(currentNode.startIndex, currentNode.endIndex);
                }
                for (const child of currentNode.children || []) {
                    const result = findReturnType(child);
                    if (result)
                        return result;
                }
                return undefined;
            };
            return findReturnType(node);
        }
        return undefined;
    }
}
exports.JavaScriptParser = JavaScriptParser;
//# sourceMappingURL=JavaScriptParser.js.map