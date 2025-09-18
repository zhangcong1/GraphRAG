import * as path from 'path';
import { 
    JavaScriptParser, 
    VueParser, 
    LanguageParser, 
    OtherFormatParser,
    ILanguageParser, 
    ParseResult, 
    CodeEntity, 
    ElementType 
} from './parsers';

// 重新导出类型
export { ParseResult, CodeEntity, ElementType };

/**
 * Tree-sitter 解析器管理器（重构版本）
 */
export class TreeSitterParser {
    private parsers: ILanguageParser[] = [];
    private initialized = false;

    constructor() {
        // 延迟初始化
    }

    /**
     * 检查语言是否支持
     */
    public static isLanguageSupported(language: string): boolean {
        const supportedLanguages = [
            'javascript', 'js', 'typescript', 'ts', 'vue', 'json',
            'python', 'py', 'java', 'go', 'rust', 'rs', 'md', 'yaml', 'yml', 'xml'
        ];
        return supportedLanguages.includes(language.toLowerCase());
    }

    /**
     * 初始化各语言解析器
     */
    private async initializeParsers(): Promise<void> {
        if (this.initialized) return;

        try {
            // 初始化所有解析器
            this.parsers = [
                new JavaScriptParser(),
                new VueParser(),
                new LanguageParser(),
                new OtherFormatParser()
            ];

            this.initialized = true;
            console.log(`🌳 解析器管理器初始化完成，支持多种语言格式`);
        } catch (error) {
            console.warn('解析器初始化失败:', error);
        }
    }

    /**
     * 解析文件内容（入口方法）
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

        if (!this.initialized) {
            await this.initializeParsers();
        }

        try {
            console.log(`🔍 解析文件: ${fileName} (${extension})`);

            // 找到合适的解析器
            const parser = this.parsers.find(p => p.isSupported(extension));
            
            if (parser) {
                return await parser.parseFile(filePath, fileName, content);
            } else {
                result.errors.push(`不支持的文件类型: ${extension}`);
                return result;
            }
        } catch (error) {
            result.errors.push(`解析文件失败: ${error}`);
            return result;
        }
    }

    /**
     * 批量解析文件
     */
    public async parseFiles(files: Array<{ path: string; content: string }>): Promise<ParseResult[]> {
        const results: ParseResult[] = [];
        
        for (const file of files) {
            try {
                const result = await this.parseFile(file.path, file.content);
                results.push(result);
            } catch (error) {
                results.push({
                    entities: [],
                    imports: [],
                    exports: [],
                    errors: [`批量解析失败: ${error}`]
                });
            }
        }
        
        return results;
    }

    /**
     * 获取支持的文件扩展名列表
     */
    public getSupportedExtensions(): string[] {
        return [
            '.js', '.jsx', '.ts', '.tsx', '.vue',
            '.py', '.java', '.go', '.rs',
            '.json', '.md', '.yaml', '.yml', '.xml', '.txt'
        ];
    }
}