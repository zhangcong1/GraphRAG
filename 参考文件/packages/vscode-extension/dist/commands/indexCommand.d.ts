import { Context } from '@zilliz/claude-context-core';
export declare class IndexCommand {
    private context;
    constructor(context: Context);
    /**
     * Update the Context instance (used when configuration changes)
     */
    updateContext(context: Context): void;
    execute(): Promise<void>;
    clearIndex(): Promise<void>;
}
//# sourceMappingURL=indexCommand.d.ts.map