/**
 * 解析器相关类型定义
 */

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
 * 可分割的节点类型定义
 */
export const SPLITTABLE_NODE_TYPES = {
    javascript: ['function_declaration', 'arrow_function', 'class_declaration', 'method_definition', 'export_statement'],
    typescript: ['function_declaration', 'arrow_function', 'class_declaration', 'method_definition', 'export_statement', 'interface_declaration', 'type_alias_declaration'],
    python: ['function_definition', 'class_definition', 'decorated_definition', 'async_function_definition'],
    java: ['method_declaration', 'class_declaration', 'interface_declaration', 'constructor_declaration'],
    go: ['function_declaration', 'method_declaration', 'type_declaration', 'var_declaration', 'const_declaration'],
    rust: ['function_item', 'impl_item', 'struct_item', 'enum_item', 'trait_item', 'mod_item']
};

/**
 * 解析器基类接口
 */
export interface ILanguageParser {
    parseFile(filePath: string, fileName: string, content: string): Promise<ParseResult>;
    isSupported(extension: string): boolean;
}