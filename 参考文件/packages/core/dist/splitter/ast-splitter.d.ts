import { Splitter, CodeChunk } from './index';
export declare class AstCodeSplitter implements Splitter {
    private chunkSize;
    private chunkOverlap;
    private parser;
    private langchainFallback;
    constructor(chunkSize?: number, chunkOverlap?: number);
    split(code: string, language: string, filePath?: string): Promise<CodeChunk[]>;
    setChunkSize(chunkSize: number): void;
    setChunkOverlap(chunkOverlap: number): void;
    private getLanguageConfig;
    private extractChunks;
    private refineChunks;
    private splitLargeChunk;
    private addOverlap;
    private getLineCount;
    /**
     * Check if AST splitting is supported for the given language
     */
    static isLanguageSupported(language: string): boolean;
}
//# sourceMappingURL=ast-splitter.d.ts.map