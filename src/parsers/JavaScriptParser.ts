import { ILanguageParser, ParseResult, CodeEntity, ElementType, SPLITTABLE_NODE_TYPES } from './types';

/**
 * JavaScript/TypeScript 解析器
 */
export class JavaScriptParser implements ILanguageParser {
    private parsers: Map<string, any> = new Map();
    private TreeSitterModule: any;
    private JavaScript: any;
    private TypeScript: any;

    constructor() {
        this.initializeParsers();
    }

    /**
     * 初始化Tree-sitter解析器
     */
    private async initializeParsers(): Promise<void> {
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
        } catch (error) {
            console.warn('JavaScript/TypeScript 解析器初始化失败:', error);
        }
    }

    /**
     * 检查是否支持该文件扩展名
     */
    public isSupported(extension: string): boolean {
        return ['.js', '.jsx', '.ts', '.tsx'].includes(extension.toLowerCase());
    }

    /**
     * 解析JavaScript/TypeScript文件
     */
    public async parseFile(filePath: string, fileName: string, content: string): Promise<ParseResult> {
        const extension = this.getExtensionFromPath(filePath);
        const language = extension === '.ts' || extension === '.tsx' ? 'typescript' : 'javascript';
        
        const result: ParseResult = {
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
            
        } catch (error) {
            console.warn(`⚠️  AST 解析器失败，回退到正则解析: ${error}`);
            return this.parseWithRegex(filePath, fileName, content, language);
        }

        return result;
    }

    /**
     * 获取语言配置
     */
    private getLanguageConfig(language: string): { parser: any; nodeTypes: string[] } | null {
        const parser = this.parsers.get(language);
        if (!parser) return null;

        const nodeTypeMap: Record<string, string[]> = {
            'javascript': SPLITTABLE_NODE_TYPES.javascript,
            'typescript': SPLITTABLE_NODE_TYPES.typescript
        };

        return {
            parser,
            nodeTypes: nodeTypeMap[language] || []
        };
    }

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

    /**
     * 正则表达式解析（回退方案）
     */
    private async parseWithRegex(filePath: string, fileName: string, content: string, language: string): Promise<ParseResult> {
        const result: ParseResult = { entities: [], imports: [], exports: [], errors: [] };
        
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

    private getExtensionFromPath(filePath: string): string {
        return filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
    }

    private mapNodeTypeToElementType(nodeType: string): ElementType {
        const typeMap: Record<string, ElementType> = {
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

    private extractScopeInfo(node: any, code: string): string | undefined {
        if (node.parent) {
            if (node.parent.type === 'class_declaration') {
                return 'class';
            } else if (node.parent.type === 'function_declaration') {
                return 'function';
            }
        }
        return 'global';
    }
    
    private extractParameters(node: any, code: string): string[] | undefined {
        if (node.type === 'function_declaration' || node.type === 'method_definition') {
            const params: string[] = [];
            const findParams = (currentNode: any) => {
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
    
    private extractReturnType(node: any, code: string): string | undefined {
        if (node.type === 'function_declaration' || node.type === 'method_definition') {
            const findReturnType = (currentNode: any): string | undefined => {
                if (currentNode.type === 'type_annotation') {
                    return code.slice(currentNode.startIndex, currentNode.endIndex);
                }
                for (const child of currentNode.children || []) {
                    const result = findReturnType(child);
                    if (result) return result;
                }
                return undefined;
            };
            return findReturnType(node);
        }
        return undefined;
    }
}