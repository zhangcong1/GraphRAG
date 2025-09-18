"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AstCodeSplitter = void 0;
const tree_sitter_1 = __importDefault(require("tree-sitter"));
// Language parsers
const JavaScript = require('tree-sitter-javascript');
const TypeScript = require('tree-sitter-typescript').typescript;
const Python = require('tree-sitter-python');
const Java = require('tree-sitter-java');
const Cpp = require('tree-sitter-cpp');
const Go = require('tree-sitter-go');
const Rust = require('tree-sitter-rust');
const CSharp = require('tree-sitter-c-sharp');
const Scala = require('tree-sitter-scala');
// Node types that represent logical code units
const SPLITTABLE_NODE_TYPES = {
    javascript: ['function_declaration', 'arrow_function', 'class_declaration', 'method_definition', 'export_statement'],
    typescript: ['function_declaration', 'arrow_function', 'class_declaration', 'method_definition', 'export_statement', 'interface_declaration', 'type_alias_declaration'],
    python: ['function_definition', 'class_definition', 'decorated_definition', 'async_function_definition'],
    java: ['method_declaration', 'class_declaration', 'interface_declaration', 'constructor_declaration'],
    cpp: ['function_definition', 'class_specifier', 'namespace_definition', 'declaration'],
    go: ['function_declaration', 'method_declaration', 'type_declaration', 'var_declaration', 'const_declaration'],
    rust: ['function_item', 'impl_item', 'struct_item', 'enum_item', 'trait_item', 'mod_item'],
    csharp: ['method_declaration', 'class_declaration', 'interface_declaration', 'struct_declaration', 'enum_declaration'],
    scala: ['method_declaration', 'class_declaration', 'interface_declaration', 'constructor_declaration']
};
class AstCodeSplitter {
    constructor(chunkSize, chunkOverlap) {
        this.chunkSize = 2500;
        this.chunkOverlap = 300;
        if (chunkSize)
            this.chunkSize = chunkSize;
        if (chunkOverlap)
            this.chunkOverlap = chunkOverlap;
        this.parser = new tree_sitter_1.default();
        // Initialize fallback splitter
        const { LangChainCodeSplitter } = require('./langchain-splitter');
        this.langchainFallback = new LangChainCodeSplitter(chunkSize, chunkOverlap);
    }
    async split(code, language, filePath) {
        // Check if language is supported by AST splitter
        const langConfig = this.getLanguageConfig(language);
        if (!langConfig) {
            console.log(`📝 Language ${language} not supported by AST, using LangChain splitter for: ${filePath || 'unknown'}`);
            return await this.langchainFallback.split(code, language, filePath);
        }
        try {
            console.log(`🌳 Using AST splitter for ${language} file: ${filePath || 'unknown'}`);
            this.parser.setLanguage(langConfig.parser);
            const tree = this.parser.parse(code);
            if (!tree.rootNode) {
                console.warn(`[ASTSplitter] ⚠️  Failed to parse AST for ${language}, falling back to LangChain: ${filePath || 'unknown'}`);
                return await this.langchainFallback.split(code, language, filePath);
            }
            // Extract chunks based on AST nodes
            const chunks = this.extractChunks(tree.rootNode, code, langConfig.nodeTypes, language, filePath);
            // If chunks are too large, split them further
            const refinedChunks = await this.refineChunks(chunks, code);
            return refinedChunks;
        }
        catch (error) {
            console.warn(`[ASTSplitter] ⚠️  AST splitter failed for ${language}, falling back to LangChain: ${error}`);
            return await this.langchainFallback.split(code, language, filePath);
        }
    }
    setChunkSize(chunkSize) {
        this.chunkSize = chunkSize;
        this.langchainFallback.setChunkSize(chunkSize);
    }
    setChunkOverlap(chunkOverlap) {
        this.chunkOverlap = chunkOverlap;
        this.langchainFallback.setChunkOverlap(chunkOverlap);
    }
    getLanguageConfig(language) {
        const langMap = {
            'javascript': { parser: JavaScript, nodeTypes: SPLITTABLE_NODE_TYPES.javascript },
            'js': { parser: JavaScript, nodeTypes: SPLITTABLE_NODE_TYPES.javascript },
            'typescript': { parser: TypeScript, nodeTypes: SPLITTABLE_NODE_TYPES.typescript },
            'ts': { parser: TypeScript, nodeTypes: SPLITTABLE_NODE_TYPES.typescript },
            'python': { parser: Python, nodeTypes: SPLITTABLE_NODE_TYPES.python },
            'py': { parser: Python, nodeTypes: SPLITTABLE_NODE_TYPES.python },
            'java': { parser: Java, nodeTypes: SPLITTABLE_NODE_TYPES.java },
            'cpp': { parser: Cpp, nodeTypes: SPLITTABLE_NODE_TYPES.cpp },
            'c++': { parser: Cpp, nodeTypes: SPLITTABLE_NODE_TYPES.cpp },
            'c': { parser: Cpp, nodeTypes: SPLITTABLE_NODE_TYPES.cpp },
            'go': { parser: Go, nodeTypes: SPLITTABLE_NODE_TYPES.go },
            'rust': { parser: Rust, nodeTypes: SPLITTABLE_NODE_TYPES.rust },
            'rs': { parser: Rust, nodeTypes: SPLITTABLE_NODE_TYPES.rust },
            'cs': { parser: CSharp, nodeTypes: SPLITTABLE_NODE_TYPES.csharp },
            'csharp': { parser: CSharp, nodeTypes: SPLITTABLE_NODE_TYPES.csharp },
            'scala': { parser: Scala, nodeTypes: SPLITTABLE_NODE_TYPES.scala }
        };
        return langMap[language.toLowerCase()] || null;
    }
    extractChunks(node, code, splittableTypes, language, filePath) {
        const chunks = [];
        const codeLines = code.split('\n');
        const traverse = (currentNode) => {
            // Check if this node type should be split into a chunk
            if (splittableTypes.includes(currentNode.type)) {
                const startLine = currentNode.startPosition.row + 1;
                const endLine = currentNode.endPosition.row + 1;
                const nodeText = code.slice(currentNode.startIndex, currentNode.endIndex);
                // Only create chunk if it has meaningful content
                if (nodeText.trim().length > 0) {
                    chunks.push({
                        content: nodeText,
                        metadata: {
                            startLine,
                            endLine,
                            language,
                            filePath,
                        }
                    });
                }
            }
            // Continue traversing child nodes
            for (const child of currentNode.children) {
                traverse(child);
            }
        };
        traverse(node);
        // If no meaningful chunks found, create a single chunk with the entire code
        if (chunks.length === 0) {
            chunks.push({
                content: code,
                metadata: {
                    startLine: 1,
                    endLine: codeLines.length,
                    language,
                    filePath,
                }
            });
        }
        return chunks;
    }
    async refineChunks(chunks, originalCode) {
        const refinedChunks = [];
        for (const chunk of chunks) {
            if (chunk.content.length <= this.chunkSize) {
                refinedChunks.push(chunk);
            }
            else {
                // Split large chunks using character-based splitting
                const subChunks = this.splitLargeChunk(chunk, originalCode);
                refinedChunks.push(...subChunks);
            }
        }
        return this.addOverlap(refinedChunks);
    }
    splitLargeChunk(chunk, originalCode) {
        const lines = chunk.content.split('\n');
        const subChunks = [];
        let currentChunk = '';
        let currentStartLine = chunk.metadata.startLine;
        let currentLineCount = 0;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineWithNewline = i === lines.length - 1 ? line : line + '\n';
            if (currentChunk.length + lineWithNewline.length > this.chunkSize && currentChunk.length > 0) {
                // Create a sub-chunk
                subChunks.push({
                    content: currentChunk.trim(),
                    metadata: {
                        startLine: currentStartLine,
                        endLine: currentStartLine + currentLineCount - 1,
                        language: chunk.metadata.language,
                        filePath: chunk.metadata.filePath,
                    }
                });
                currentChunk = lineWithNewline;
                currentStartLine = chunk.metadata.startLine + i;
                currentLineCount = 1;
            }
            else {
                currentChunk += lineWithNewline;
                currentLineCount++;
            }
        }
        // Add the last sub-chunk
        if (currentChunk.trim().length > 0) {
            subChunks.push({
                content: currentChunk.trim(),
                metadata: {
                    startLine: currentStartLine,
                    endLine: currentStartLine + currentLineCount - 1,
                    language: chunk.metadata.language,
                    filePath: chunk.metadata.filePath,
                }
            });
        }
        return subChunks;
    }
    addOverlap(chunks) {
        if (chunks.length <= 1 || this.chunkOverlap <= 0) {
            return chunks;
        }
        const overlappedChunks = [];
        for (let i = 0; i < chunks.length; i++) {
            let content = chunks[i].content;
            const metadata = { ...chunks[i].metadata };
            // Add overlap from previous chunk
            if (i > 0 && this.chunkOverlap > 0) {
                const prevChunk = chunks[i - 1];
                const overlapText = prevChunk.content.slice(-this.chunkOverlap);
                content = overlapText + '\n' + content;
                metadata.startLine = Math.max(1, metadata.startLine - this.getLineCount(overlapText));
            }
            overlappedChunks.push({
                content,
                metadata
            });
        }
        return overlappedChunks;
    }
    getLineCount(text) {
        return text.split('\n').length;
    }
    /**
     * Check if AST splitting is supported for the given language
     */
    static isLanguageSupported(language) {
        const supportedLanguages = [
            'javascript', 'js', 'typescript', 'ts', 'python', 'py',
            'java', 'cpp', 'c++', 'c', 'go', 'rust', 'rs', 'cs', 'csharp', 'scala'
        ];
        return supportedLanguages.includes(language.toLowerCase());
    }
}
exports.AstCodeSplitter = AstCodeSplitter;
//# sourceMappingURL=ast-splitter.js.map