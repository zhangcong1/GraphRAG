import { ILanguageParser, ParseResult, CodeEntity } from './types';

/**
 * 其他格式解析器（JSON、Markdown等）
 */
export class OtherFormatParser implements ILanguageParser {

    /**
     * 检查是否支持该文件扩展名
     */
    public isSupported(extension: string): boolean {
        const supportedExtensions = ['.json', '.md', '.txt', '.yaml', '.yml', '.xml'];
        return supportedExtensions.includes(extension.toLowerCase());
    }

    /**
     * 解析其他格式文件
     */
    public async parseFile(filePath: string, fileName: string, content: string): Promise<ParseResult> {
        const extension = this.getExtensionFromPath(filePath);
        
        switch (extension.toLowerCase()) {
            case '.json':
                return this.parseJSONFile(filePath, fileName, content);
            case '.md':
                return this.parseMarkdownFile(filePath, fileName, content);
            case '.yaml':
            case '.yml':
                return this.parseYAMLFile(filePath, fileName, content);
            case '.xml':
                return this.parseXMLFile(filePath, fileName, content);
            default:
                return this.parseTextFile(filePath, fileName, content);
        }
    }

    /**
     * 解析JSON文件
     */
    private async parseJSONFile(filePath: string, fileName: string, content: string): Promise<ParseResult> {
        const result: ParseResult = { entities: [], imports: [], exports: [], errors: [] };
        
        try {
            const jsonData = JSON.parse(content);
            result.entities.push({
                file_path: filePath,
                file_name: fileName,
                start_line: 1,
                end_line: content.split('\n').length,
                element_type: 'doc',
                name: fileName.replace('.json', ''),
                code_snippet: content.length > 200 ? content.substring(0, 200) + '...' : content,
                semantic_tags: this.generateJSONSemanticTags(fileName, jsonData),
                language: 'json'
            });
        } catch (error) {
            result.errors.push(`解析 JSON 文件失败: ${error}`);
        }

        return result;
    }

    /**
     * 解析Markdown文件
     */
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
                file_path: filePath,
                file_name: fileName,
                start_line: lineIndex,
                end_line: lineIndex,
                element_type: 'doc',
                name: title,
                code_snippet: match[0],
                semantic_tags: ['markdown', 'heading', `h${level}`],
                language: 'markdown'
            });
        }

        // 提取代码块
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        while ((match = codeBlockRegex.exec(content)) !== null) {
            const language = match[1] || 'text';
            const code = match[2];
            const lineIndex = content.substring(0, match.index).split('\n').length;
            const endLineIndex = lineIndex + code.split('\n').length;
            
            result.entities.push({
                file_path: filePath,
                file_name: fileName,
                start_line: lineIndex,
                end_line: endLineIndex,
                element_type: 'doc',
                name: `code_block_${language}`,
                code_snippet: code.length > 200 ? code.substring(0, 200) + '...' : code,
                semantic_tags: ['markdown', 'code-block', language],
                language: 'markdown'
            });
        }

        return result;
    }

    /**
     * 解析YAML文件
     */
    private async parseYAMLFile(filePath: string, fileName: string, content: string): Promise<ParseResult> {
        const result: ParseResult = { entities: [], imports: [], exports: [], errors: [] };
        
        // 简单的YAML解析，提取顶级键
        const keyRegex = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*:/gm;
        let match;
        
        while ((match = keyRegex.exec(content)) !== null) {
            const key = match[1];
            const lineNumber = content.substring(0, match.index).split('\n').length;
            
            result.entities.push({
                file_path: filePath,
                file_name: fileName,
                start_line: lineNumber,
                end_line: lineNumber,
                element_type: 'property',
                name: key,
                code_snippet: match[0],
                semantic_tags: ['yaml', 'configuration', 'property'],
                language: 'yaml'
            });
        }

        result.entities.push({
            file_path: filePath,
            file_name: fileName,
            start_line: 1,
            end_line: content.split('\n').length,
            element_type: 'doc',
            name: fileName.replace(/\.(yaml|yml)$/, ''),
            code_snippet: content.length > 200 ? content.substring(0, 200) + '...' : content,
            semantic_tags: this.generateYAMLSemanticTags(fileName),
            language: 'yaml'
        });

        return result;
    }

    /**
     * 解析XML文件
     */
    private async parseXMLFile(filePath: string, fileName: string, content: string): Promise<ParseResult> {
        const result: ParseResult = { entities: [], imports: [], exports: [], errors: [] };
        
        // 提取XML标签
        const tagRegex = /<([a-zA-Z][a-zA-Z0-9-_]*)[^>]*>/g;
        let match;
        const tags = new Set<string>();
        
        while ((match = tagRegex.exec(content)) !== null) {
            const tagName = match[1];
            if (!tags.has(tagName)) {
                tags.add(tagName);
                const lineNumber = content.substring(0, match.index).split('\n').length;
                
                result.entities.push({
                    file_path: filePath,
                    file_name: fileName,
                    start_line: lineNumber,
                    end_line: lineNumber,
                    element_type: 'property',
                    name: tagName,
                    code_snippet: match[0],
                    semantic_tags: ['xml', 'tag', tagName],
                    language: 'xml'
                });
            }
        }

        result.entities.push({
            file_path: filePath,
            file_name: fileName,
            start_line: 1,
            end_line: content.split('\n').length,
            element_type: 'doc',
            name: fileName.replace('.xml', ''),
            code_snippet: content.length > 200 ? content.substring(0, 200) + '...' : content,
            semantic_tags: ['xml', 'document'],
            language: 'xml'
        });

        return result;
    }

    /**
     * 解析普通文本文件
     */
    private async parseTextFile(filePath: string, fileName: string, content: string): Promise<ParseResult> {
        const result: ParseResult = { entities: [], imports: [], exports: [], errors: [] };
        
        result.entities.push({
            file_path: filePath,
            file_name: fileName,
            start_line: 1,
            end_line: content.split('\n').length,
            element_type: 'doc',
            name: fileName,
            code_snippet: content.length > 200 ? content.substring(0, 200) + '...' : content,
            semantic_tags: ['text', 'document'],
            language: 'text'
        });

        return result;
    }

    // 辅助方法

    private getExtensionFromPath(filePath: string): string {
        return filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
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

    private generateYAMLSemanticTags(fileName: string): string[] {
        const tags = ['yaml', 'configuration'];
        
        if (fileName.includes('docker')) tags.push('docker');
        if (fileName.includes('ci') || fileName.includes('cd')) tags.push('ci-cd');
        if (fileName.includes('config')) tags.push('configuration');
        if (fileName.includes('deploy')) tags.push('deployment');
        
        return tags;
    }
}