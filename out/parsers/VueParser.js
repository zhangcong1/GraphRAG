"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VueParser = void 0;
const JavaScriptParser_1 = require("./JavaScriptParser");
/**
 * Vue 文件解析器
 */
class VueParser {
    jsParser;
    vueCompilerSfc;
    constructor() {
        this.jsParser = new JavaScriptParser_1.JavaScriptParser();
        this.initializeVueCompiler();
    }
    /**
     * 初始化Vue编译器
     */
    async initializeVueCompiler() {
        try {
            this.vueCompilerSfc = require('@vue/compiler-sfc');
            console.log('🌳 Vue 解析器初始化完成');
        }
        catch (error) {
            console.warn('Vue 编译器初始化失败:', error);
        }
    }
    /**
     * 检查是否支持该文件扩展名
     */
    isSupported(extension) {
        return extension.toLowerCase() === '.vue';
    }
    /**
     * 解析Vue文件
     */
    async parseFile(filePath, fileName, content) {
        const result = {
            entities: [],
            imports: [],
            exports: [],
            errors: []
        };
        try {
            if (!this.vueCompilerSfc) {
                return this.parseVueFileWithRegex(filePath, fileName, content);
            }
            const { descriptor } = this.vueCompilerSfc.parse(content, { filename: filePath });
            // 解析 script 部分
            if (descriptor.script) {
                const scriptContent = descriptor.script.content;
                const scriptLang = descriptor.script.lang || 'js';
                const isTypeScript = scriptLang === 'ts';
                const scriptResult = await this.jsParser.parseFile(filePath, fileName, scriptContent);
                result.entities.push(...scriptResult.entities);
                result.imports.push(...scriptResult.imports);
                result.exports.push(...scriptResult.exports);
                await this.extractVue2OptionAPI(filePath, fileName, scriptContent, result);
            }
            // 解析 script setup 部分
            if (descriptor.scriptSetup) {
                const setupContent = descriptor.scriptSetup.content;
                const setupLang = descriptor.scriptSetup.lang || 'js';
                const setupResult = await this.jsParser.parseFile(filePath, fileName, setupContent);
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
        }
        catch (error) {
            result.errors.push(`解析 Vue 文件失败: ${error}`);
        }
        return result;
    }
    /**
     * 正则表达式解析Vue文件（回退方案）
     */
    async parseVueFileWithRegex(filePath, fileName, content) {
        const result = { entities: [], imports: [], exports: [], errors: [] };
        // 基本的 Vue 组件实体
        result.entities.push({
            file_path: filePath,
            file_name: fileName,
            start_line: 1,
            end_line: content.split('\n').length,
            element_type: 'component',
            name: this.getComponentNameFromPath(fileName),
            code_snippet: content.length > 200 ? content.substring(0, 200) + '...' : content,
            semantic_tags: ['vue', 'component'],
            language: 'vue'
        });
        return result;
    }
    /**
     * 提取Vue2 Option API
     */
    async extractVue2OptionAPI(filePath, fileName, content, result) {
        try {
            // 提取 methods 部分的具体方法
            const methodsMatch = content.match(/methods\s*:\s*{([\s\S]*?)(?=\n\s*},?\s*(?:computed|watch|mounted|created|props|components|\}))/);
            if (methodsMatch) {
                const methodsContent = methodsMatch[1];
                const methodRegex = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*\{/g;
                let match;
                while ((match = methodRegex.exec(methodsContent)) !== null) {
                    const methodName = match[1];
                    const methodStartIndex = (methodsMatch.index || 0) + match.index;
                    const startLine = content.substring(0, methodStartIndex).split('\n').length;
                    // 查找方法结束位置
                    const methodFullMatch = this.extractMethodBody(methodsContent, match.index);
                    const endLine = startLine + methodFullMatch.split('\n').length - 1;
                    result.entities.push({
                        file_path: filePath,
                        file_name: fileName,
                        start_line: startLine,
                        end_line: endLine,
                        element_type: 'method',
                        name: methodName,
                        code_snippet: methodFullMatch,
                        semantic_tags: ['vue2', 'option-api', 'method', methodName],
                        language: 'javascript'
                    });
                }
            }
            // 提取其他 Vue2 选项
            const options = [
                { name: 'data', type: 'function' },
                { name: 'computed', type: 'computed' },
                { name: 'watch', type: 'watch' },
                { name: 'props', type: 'property' },
                { name: 'components', type: 'component' }
            ];
            for (const option of options) {
                const regex = new RegExp(`${option.name}\\s*[:=]\\s*([\\s\\S]*?)(?=\\n\\s*[a-zA-Z_$][a-zA-Z0-9_$]*\\s*[:=]|\\n\\s*\\}|$)`, 'g');
                const match = regex.exec(content);
                if (match) {
                    const startLine = content.substring(0, match.index).split('\n').length;
                    const optionContent = match[1].trim();
                    const endLine = startLine + optionContent.split('\n').length - 1;
                    result.entities.push({
                        file_path: filePath,
                        file_name: fileName,
                        start_line: startLine,
                        end_line: endLine,
                        element_type: option.type,
                        name: option.name,
                        code_snippet: optionContent.length > 300 ? optionContent.substring(0, 300) + '...' : optionContent,
                        semantic_tags: ['vue2', 'option-api', option.type, option.name],
                        language: 'javascript'
                    });
                }
            }
            // 提取生命周期钩子
            const lifecycles = ['created', 'mounted', 'updated', 'destroyed', 'beforeCreate', 'beforeMount', 'beforeUpdate', 'beforeDestroy'];
            for (const lifecycle of lifecycles) {
                const regex = new RegExp(`${lifecycle}\\s*\\([^)]*\\)\\s*\\{([\\s\\S]*?)\\n\\s*\\}`, 'g');
                const match = regex.exec(content);
                if (match) {
                    const startLine = content.substring(0, match.index).split('\n').length;
                    const hookContent = match[0];
                    const endLine = startLine + hookContent.split('\n').length - 1;
                    result.entities.push({
                        file_path: filePath,
                        file_name: fileName,
                        start_line: startLine,
                        end_line: endLine,
                        element_type: 'lifecycle',
                        name: lifecycle,
                        code_snippet: hookContent,
                        semantic_tags: ['vue2', 'lifecycle', lifecycle],
                        language: 'javascript'
                    });
                }
            }
        }
        catch (error) {
            result.errors.push(`Vue2 Option API 解析失败: ${error}`);
        }
    }
    /**
     * 提取Vue3 Composition API
     */
    async extractVue3CompositionAPI(filePath, fileName, content, result) {
        // 简化的 Vue3 Composition API 处理
        const reactiveAPIs = ['ref', 'reactive', 'computed', 'watch', 'watchEffect'];
        for (const api of reactiveAPIs) {
            const regex = new RegExp(`${api}\\s*\\(`, 'g');
            let match;
            while ((match = regex.exec(content)) !== null) {
                const lineNumber = content.substring(0, match.index).split('\n').length;
                result.entities.push({
                    file_path: filePath,
                    file_name: fileName,
                    start_line: lineNumber,
                    end_line: lineNumber,
                    element_type: this.getVue3ElementType(api),
                    name: `${api}_call`,
                    code_snippet: match[0],
                    semantic_tags: ['vue3', 'composition-api', api],
                    language: 'javascript'
                });
            }
        }
    }
    /**
     * 提取模板信息
     */
    extractTemplateInfo(filePath, fileName, templateContent, result) {
        // 提取组件使用
        const componentRegex = /<([A-Z][a-zA-Z0-9-]*)/g;
        let match;
        const usedComponents = new Set();
        while ((match = componentRegex.exec(templateContent)) !== null) {
            usedComponents.add(match[1]);
        }
        for (const component of usedComponents) {
            result.entities.push({
                file_path: filePath,
                file_name: fileName,
                start_line: 1,
                end_line: 1,
                element_type: 'component',
                name: component,
                code_snippet: `<${component}>`,
                semantic_tags: ['template', 'component-usage', 'vue'],
                language: 'vue'
            });
        }
    }
    // 辅助方法
    getComponentNameFromPath(fileName) {
        return fileName.replace(/\.(vue|js|ts)$/, '')
            .replace(/[-_](.)/g, (_, char) => char.toUpperCase())
            .replace(/^(.)/, char => char.toUpperCase());
    }
    extractMethodBody(content, startIndex) {
        let braceCount = 0;
        let methodStart = -1;
        let i = startIndex;
        // 找到开始的大括号
        while (i < content.length) {
            if (content[i] === '{') {
                if (methodStart === -1) {
                    methodStart = i;
                }
                braceCount++;
            }
            else if (content[i] === '}') {
                braceCount--;
                if (braceCount === 0 && methodStart !== -1) {
                    return content.substring(startIndex, i + 1);
                }
            }
            i++;
        }
        // 如果没有找到完整的方法体，返回一个默认长度
        return content.substring(startIndex, Math.min(startIndex + 200, content.length));
    }
    getVue3ElementType(api) {
        const typeMap = {
            'ref': 'variable',
            'reactive': 'variable',
            'computed': 'computed',
            'watch': 'watch',
            'watchEffect': 'watch'
        };
        return typeMap[api] || 'function';
    }
}
exports.VueParser = VueParser;
//# sourceMappingURL=VueParser.js.map