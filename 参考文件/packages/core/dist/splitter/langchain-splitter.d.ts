import { Splitter, CodeChunk } from './index';
export declare class LangChainCodeSplitter implements Splitter {
    private chunkSize;
    private chunkOverlap;
    constructor(chunkSize?: number, chunkOverlap?: number);
    split(code: string, language: string, filePath?: string): Promise<CodeChunk[]>;
    setChunkSize(chunkSize: number): void;
    setChunkOverlap(chunkOverlap: number): void;
    private mapLanguage;
    private fallbackSplit;
    private estimateLines;
}
//# sourceMappingURL=langchain-splitter.d.ts.map