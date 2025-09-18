"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LangChainCodeSplitter = void 0;
const text_splitter_1 = require("langchain/text_splitter");
class LangChainCodeSplitter {
    constructor(chunkSize, chunkOverlap) {
        this.chunkSize = 1000;
        this.chunkOverlap = 200;
        if (chunkSize)
            this.chunkSize = chunkSize;
        if (chunkOverlap)
            this.chunkOverlap = chunkOverlap;
    }
    async split(code, language, filePath) {
        try {
            // Create language-specific splitter
            const mappedLanguage = this.mapLanguage(language);
            if (mappedLanguage) {
                const splitter = text_splitter_1.RecursiveCharacterTextSplitter.fromLanguage(mappedLanguage, {
                    chunkSize: this.chunkSize,
                    chunkOverlap: this.chunkOverlap,
                });
                // Split code
                const documents = await splitter.createDocuments([code]);
                // Convert to CodeChunk format
                return documents.map((doc, index) => {
                    const lines = doc.metadata?.loc?.lines || { from: 1, to: 1 };
                    return {
                        content: doc.pageContent,
                        metadata: {
                            startLine: lines.from,
                            endLine: lines.to,
                            language,
                            filePath,
                        },
                    };
                });
            }
            else {
                // If language is not supported, use generic splitter directly
                return this.fallbackSplit(code, language, filePath);
            }
        }
        catch (error) {
            console.error('[LangChainSplitter] ❌ Error splitting code:', error);
            // If specific language splitting fails, use generic splitter
            return this.fallbackSplit(code, language, filePath);
        }
    }
    setChunkSize(chunkSize) {
        this.chunkSize = chunkSize;
    }
    setChunkOverlap(chunkOverlap) {
        this.chunkOverlap = chunkOverlap;
    }
    mapLanguage(language) {
        // Map common language names to LangChain supported formats
        const languageMap = {
            'javascript': 'js',
            'typescript': 'js',
            'python': 'python',
            'java': 'java',
            'cpp': 'cpp',
            'c++': 'cpp',
            'c': 'cpp',
            'go': 'go',
            'rust': 'rust',
            'php': 'php',
            'ruby': 'ruby',
            'swift': 'swift',
            'scala': 'scala',
            'html': 'html',
            'markdown': 'markdown',
            'md': 'markdown',
            'latex': 'latex',
            'tex': 'latex',
            'solidity': 'sol',
            'sol': 'sol',
        };
        return languageMap[language.toLowerCase()] || null;
    }
    async fallbackSplit(code, language, filePath) {
        // Generic splitter as fallback
        const splitter = new text_splitter_1.RecursiveCharacterTextSplitter({
            chunkSize: this.chunkSize,
            chunkOverlap: this.chunkOverlap,
        });
        const documents = await splitter.createDocuments([code]);
        return documents.map((doc, index) => {
            const lines = this.estimateLines(doc.pageContent, code);
            return {
                content: doc.pageContent,
                metadata: {
                    startLine: lines.start,
                    endLine: lines.end,
                    language,
                    filePath,
                },
            };
        });
    }
    estimateLines(chunk, originalCode) {
        // Simple line number estimation
        const codeLines = originalCode.split('\n');
        const chunkLines = chunk.split('\n');
        // Find chunk position in original code
        const chunkStart = originalCode.indexOf(chunk);
        if (chunkStart === -1) {
            return { start: 1, end: chunkLines.length };
        }
        const beforeChunk = originalCode.substring(0, chunkStart);
        const startLine = beforeChunk.split('\n').length;
        const endLine = startLine + chunkLines.length - 1;
        return { start: startLine, end: endLine };
    }
}
exports.LangChainCodeSplitter = LangChainCodeSplitter;
//# sourceMappingURL=langchain-splitter.js.map