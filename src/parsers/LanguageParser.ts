import { ILanguageParser, ParseResult, CodeEntity, ElementType, SPLITTABLE_NODE_TYPES } from './types';

/**
 * 通用语言解析器（Python、Java、Go、Rust等）
 */
export class LanguageParser implements ILanguageParser {
    private parsers: Map<string, any> = new Map();
    private TreeSitterModule: any;
    private Python: any;
    private Java: any;
    private Go: any;
    private Rust: any;

    constructor() {
        this.initializeParsers();
    }

    /**
     * 初始化Tree-sitter解析器
     */
    private async initializeParsers(): Promise<void> {
        try {
            this.TreeSitterModule = require('tree-sitter');
            
            // 扩展语言支持
            try {
                this.Python = require('tree-sitter-python');
                this.Java = require('tree-sitter-java');
                this.Go = require('tree-sitter-go'); 
                this.Rust = require('tree-sitter-rust');
            } catch (e) {
                console.warn('部分语言解析器未安装，将使用基础解析器');
            }

            if (this.Python) {
                const pyParser = new this.TreeSitterModule();
                pyParser.setLanguage(this.Python);
                this.parsers.set('python', pyParser);
                this.parsers.set('py', pyParser);
            }

            if (this.Java) {
                const javaParser = new this.TreeSitterModule();
                javaParser.setLanguage(this.Java);
                this.parsers.set('java', javaParser);
            }

            if (this.Go) {
                const goParser = new this.TreeSitterModule();
                goParser.setLanguage(this.Go);
                this.parsers.set('go', goParser);
            }

            if (this.Rust) {
                const rustParser = new this.TreeSitterModule();
                rustParser.setLanguage(this.Rust);
                this.parsers.set('rust', rustParser);
                this.parsers.set('rs', rustParser);
            }

            console.log(`🌳 通用语言解析器初始化完成，支持 ${this.parsers.size / 2} 种语言`);
        } catch (error) {
            console.warn('通用语言解析器初始化失败:', error);
        }
    }

    /**
     * 检查是否支持该文件扩展名
     */
    public isSupported(extension: string): boolean {
        const supportedExtensions = ['.py', '.java', '.go', '.rs'];
        return supportedExtensions.includes(extension.toLowerCase());
    }

    /**
     * 解析语言文件
     */
    public async parseFile(filePath: string, fileName: string, content: string): Promise<ParseResult> {
        const extension = this.getExtensionFromPath(filePath);
        const language = this.getLanguageFromExtension(extension);
        
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

    /**
     * 获取语言配置
     */
    private getLanguageConfig(language: string): { parser: any; nodeTypes: string[] } | null {
        const langKey = language.toLowerCase();
        const parser = this.parsers.get(langKey);
        
        if (!parser) return null;

        const nodeTypeMap: Record<string, string[]> = {
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
     * 从 AST 提取导入导出（针对不同语言）
     */
    private extractImportsExportsFromAST(node: any, code: string, result: ParseResult): void {
        const traverse = (currentNode: any) => {
            // Python import
            if (currentNode.type === 'import_statement' || currentNode.type === 'import_from_statement') {
                const importText = code.slice(currentNode.startIndex, currentNode.endIndex);
                const matches = importText.match(/(?:from\s+([^\s]+)\s+)?import\s+([^\n]+)/);
                if (matches) {
                    const module = matches[1] || matches[2];
                    result.imports.push(module);
                }
            }
            
            // Java import
            if (currentNode.type === 'import_declaration') {
                const importText = code.slice(currentNode.startIndex, currentNode.endIndex);
                const match = importText.match(/import\s+([^;]+);/);
                if (match) {
                    result.imports.push(match[1]);
                }
            }
            
            // Go import
            if (currentNode.type === 'import_spec') {
                const importText = code.slice(currentNode.startIndex, currentNode.endIndex);
                result.imports.push(importText.replace(/["']/g, ''));
            }
            
            // Rust use
            if (currentNode.type === 'use_declaration') {
                const useText = code.slice(currentNode.startIndex, currentNode.endIndex);
                const match = useText.match(/use\s+([^;]+);/);
                if (match) {
                    result.imports.push(match[1]);
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
    private async parseLanguageFileWithRegex(filePath: string, fileName: string, content: string, language: string): Promise<ParseResult> {
        const result: ParseResult = { entities: [], imports: [], exports: [], errors: [] };
        
        // 根据语言类型进行基本的正则解析
        switch (language) {
            case 'python':
                this.parsePythonWithRegex(filePath, fileName, content, result);
                break;
            case 'java':
                this.parseJavaWithRegex(filePath, fileName, content, result);
                break;
            case 'go':
                this.parseGoWithRegex(filePath, fileName, content, result);
                break;
            case 'rust':
                this.parseRustWithRegex(filePath, fileName, content, result);
                break;
            default:
                // 基本实体
                result.entities.push({
                    file_path: filePath,
                    file_name: fileName,
                    start_line: 1,
                    end_line: content.split('\n').length,
                    element_type: 'doc',
                    name: fileName,
                    code_snippet: content.substring(0, 200),
                    semantic_tags: [language, 'source'],
                    language: language
                });
        }

        return result;
    }

    // 语言特定的正则解析方法

    private parsePythonWithRegex(filePath: string, fileName: string, content: string, result: ParseResult): void {
        // 解析Python函数
        const funcRegex = /def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\):/g;
        let match;
        while ((match = funcRegex.exec(content)) !== null) {
            const lineNumber = content.substring(0, match.index).split('\n').length;
            result.entities.push({
                file_path: filePath,
                file_name: fileName,
                start_line: lineNumber,
                end_line: lineNumber,
                element_type: 'function',
                name: match[1],
                code_snippet: match[0],
                semantic_tags: ['python', 'function'],
                language: 'python'
            });
        }

        // 解析Python类
        const classRegex = /class\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:\([^)]*\))?:/g;
        while ((match = classRegex.exec(content)) !== null) {
            const lineNumber = content.substring(0, match.index).split('\n').length;
            result.entities.push({
                file_path: filePath,
                file_name: fileName,
                start_line: lineNumber,
                end_line: lineNumber,
                element_type: 'class',
                name: match[1],
                code_snippet: match[0],
                semantic_tags: ['python', 'class'],
                language: 'python'
            });
        }
    }

    private parseJavaWithRegex(filePath: string, fileName: string, content: string, result: ParseResult): void {
        // 解析Java方法
        const methodRegex = /(?:public|private|protected)\s+(?:static\s+)?(?:\w+\s+)*(\w+)\s*\([^)]*\)\s*\{/g;
        let match;
        while ((match = methodRegex.exec(content)) !== null) {
            const lineNumber = content.substring(0, match.index).split('\n').length;
            result.entities.push({
                file_path: filePath,
                file_name: fileName,
                start_line: lineNumber,
                end_line: lineNumber,
                element_type: 'method',
                name: match[1],
                code_snippet: match[0],
                semantic_tags: ['java', 'method'],
                language: 'java'
            });
        }

        // 解析Java类
        const classRegex = /(?:public\s+)?class\s+(\w+)/g;
        while ((match = classRegex.exec(content)) !== null) {
            const lineNumber = content.substring(0, match.index).split('\n').length;
            result.entities.push({
                file_path: filePath,
                file_name: fileName,
                start_line: lineNumber,
                end_line: lineNumber,
                element_type: 'class',
                name: match[1],
                code_snippet: match[0],
                semantic_tags: ['java', 'class'],
                language: 'java'
            });
        }
    }

    private parseGoWithRegex(filePath: string, fileName: string, content: string, result: ParseResult): void {
        // 解析Go函数
        const funcRegex = /func\s+(?:\([^)]*\)\s+)?(\w+)\s*\([^)]*\)/g;
        let match;
        while ((match = funcRegex.exec(content)) !== null) {
            const lineNumber = content.substring(0, match.index).split('\n').length;
            result.entities.push({
                file_path: filePath,
                file_name: fileName,
                start_line: lineNumber,
                end_line: lineNumber,
                element_type: 'function',
                name: match[1],
                code_snippet: match[0],
                semantic_tags: ['go', 'function'],
                language: 'go'
            });
        }

        // 解析Go类型
        const typeRegex = /type\s+(\w+)\s+(?:struct|interface)/g;
        while ((match = typeRegex.exec(content)) !== null) {
            const lineNumber = content.substring(0, match.index).split('\n').length;
            result.entities.push({
                file_path: filePath,
                file_name: fileName,
                start_line: lineNumber,
                end_line: lineNumber,
                element_type: 'class',
                name: match[1],
                code_snippet: match[0],
                semantic_tags: ['go', 'type'],
                language: 'go'
            });
        }
    }

    private parseRustWithRegex(filePath: string, fileName: string, content: string, result: ParseResult): void {
        // 解析Rust函数
        const funcRegex = /fn\s+(\w+)\s*\([^)]*\)/g;
        let match;
        while ((match = funcRegex.exec(content)) !== null) {
            const lineNumber = content.substring(0, match.index).split('\n').length;
            result.entities.push({
                file_path: filePath,
                file_name: fileName,
                start_line: lineNumber,
                end_line: lineNumber,
                element_type: 'function',
                name: match[1],
                code_snippet: match[0],
                semantic_tags: ['rust', 'function'],
                language: 'rust'
            });
        }

        // 解析Rust结构体
        const structRegex = /struct\s+(\w+)/g;
        while ((match = structRegex.exec(content)) !== null) {
            const lineNumber = content.substring(0, match.index).split('\n').length;
            result.entities.push({
                file_path: filePath,
                file_name: fileName,
                start_line: lineNumber,
                end_line: lineNumber,
                element_type: 'class',
                name: match[1],
                code_snippet: match[0],
                semantic_tags: ['rust', 'struct'],
                language: 'rust'
            });
        }
    }

    // 辅助方法

    private getExtensionFromPath(filePath: string): string {
        return filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
    }

    private getLanguageFromExtension(extension: string): string {
        const langMap: Record<string, string> = {
            '.py': 'python',
            '.java': 'java',
            '.go': 'go',
            '.rs': 'rust'
        };
        return langMap[extension] || 'unknown';
    }

    private mapNodeTypeToElementType(nodeType: string): ElementType {
        const typeMap: Record<string, ElementType> = {
            'function_definition': 'function',
            'function_declaration': 'function',
            'method_declaration': 'method',
            'class_definition': 'class',
            'class_declaration': 'class',
            'interface_declaration': 'interface',
            'struct_item': 'class',
            'enum_item': 'class',
            'trait_item': 'interface',
            'type_declaration': 'class',
            'var_declaration': 'variable',
            'const_declaration': 'variable'
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
        
        if (nodeText.includes('test')) tags.push('test');
        if (nodeText.includes('util')) tags.push('utility');
        if (nodeText.includes('service')) tags.push('service');
        if (nodeText.includes('model')) tags.push('model');
        if (nodeText.includes('config')) tags.push('configuration');
        
        return tags;
    }

    private extractScopeInfo(node: any, code: string): string | undefined {
        if (node.parent) {
            if (node.parent.type === 'class_definition' || node.parent.type === 'class_declaration') {
                return 'class';
            } else if (node.parent.type === 'function_definition' || node.parent.type === 'function_declaration') {
                return 'function';
            }
        }
        return 'global';
    }
    
    private extractParameters(node: any, code: string): string[] | undefined {
        // 简化的参数提取，可以根据具体语言需求扩展
        return undefined;
    }
    
    private extractReturnType(node: any, code: string): string | undefined {
        // 简化的返回类型提取，可以根据具体语言需求扩展
        return undefined;
    }
}