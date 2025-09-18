export declare class EnvManager {
    private envFilePath;
    constructor();
    /**
     * Get environment variable by name
     * Priority: process.env > .env file > undefined
     */
    get(name: string): string | undefined;
    /**
     * Set environment variable to the .env file
     */
    set(name: string, value: string): void;
    /**
     * Get the path to the .env file
     */
    getEnvFilePath(): string;
}
export declare const envManager: EnvManager;
//# sourceMappingURL=env-manager.d.ts.map