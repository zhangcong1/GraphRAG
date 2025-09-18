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
exports.TreeSitterParser = void 0;
const path = __importStar(require("path"));
const JavaScriptParser_1 = require("./parsers/JavaScriptParser");
const VueParser_1 = require("./parsers/VueParser");
const LanguageParser_1 = require("./parsers/LanguageParser");
const OtherFormatParser_1 = require("./parsers/OtherFormatParser");
/**
 * Tree-sitter 解析器管理器（重构版本）
 */
class TreeSitterParser {
    parsers = [];
    initialized = false;
    constructor() {
        // 延迟初始化
    }
    /**
     * 检查语言是否支持
     */
    static isLanguageSupported(language) {
        const supportedLanguages = [
            'javascript', 'js', 'typescript', 'ts', 'vue', 'json',
            'python', 'py', 'java', 'go', 'rust', 'rs', 'md', 'yaml', 'yml', 'xml'
        ];
        return supportedLanguages.includes(language.toLowerCase());
    }
    /**
     * 初始化各语言解析器
     */
    async initializeParsers() {
        if (this.initialized)
            return;
        try {
            // 初始化所有解析器
            this.parsers = [
                new JavaScriptParser_1.JavaScriptParser(),
                new VueParser_1.VueParser(),
                new LanguageParser_1.LanguageParser(),
                new OtherFormatParser_1.OtherFormatParser()
            ];
            this.initialized = true;
            console.log(`🌳 解析器管理器初始化完成，支持多种语言格式`);
        }
        catch (error) {
            console.warn('解析器初始化失败:', error);
        }
    }
    /**
     * 解析文件内容（入口方法）
     */
    async parseFile(filePath, content) {
        const extension = path.extname(filePath).toLowerCase();
        const fileName = path.basename(filePath);
        const result = {
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
            }
            else {
                result.errors.push(`不支持的文件类型: ${extension}`);
                return result;
            }
        }
        catch (error) {
            result.errors.push(`解析文件失败: ${error}`);
            return result;
        }
    }
    /**
     * 批量解析文件
     */
    async parseFiles(files) {
        const results = [];
        for (const file of files) {
            try {
                const result = await this.parseFile(file.path, file.content);
                results.push(result);
            }
            catch (error) {
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
    getSupportedExtensions() {
        return [
            '.js', '.jsx', '.ts', '.tsx', '.vue',
            '.py', '.java', '.go', '.rs',
            '.json', '.md', '.yaml', '.yml', '.xml', '.txt'
        ];
    }
}
exports.TreeSitterParser = TreeSitterParser;
//# sourceMappingURL=parser_new.js.map