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
exports.envManager = exports.EnvManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
class EnvManager {
    envFilePath;
    constructor() {
        const homeDir = os.homedir();
        this.envFilePath = path.join(homeDir, '.context', '.env');
    }
    /**
     * Get environment variable by name
     * Priority: process.env > .env file > undefined
     */
    get(name) {
        // First try to get from process environment variables
        if (process.env[name]) {
            return process.env[name];
        }
        // If not found in process env, try to read from .env file
        try {
            if (fs.existsSync(this.envFilePath)) {
                const content = fs.readFileSync(this.envFilePath, 'utf-8');
                const lines = content.split('\n');
                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (trimmedLine.startsWith(`${name}=`)) {
                        return trimmedLine.substring(name.length + 1);
                    }
                }
            }
        }
        catch (error) {
            // Ignore file read errors
        }
        return undefined;
    }
    /**
     * Set environment variable to the .env file
     */
    set(name, value) {
        try {
            // Ensure directory exists
            const envDir = path.dirname(this.envFilePath);
            if (!fs.existsSync(envDir)) {
                fs.mkdirSync(envDir, { recursive: true });
            }
            let content = '';
            let found = false;
            // Read existing content if file exists
            if (fs.existsSync(this.envFilePath)) {
                content = fs.readFileSync(this.envFilePath, 'utf-8');
                // Update existing variable
                const lines = content.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].trim().startsWith(`${name}=`)) {
                        // Replace the existing value
                        lines[i] = `${name}=${value}`;
                        found = true;
                        console.log(`[EnvManager] ✅ Updated ${name} in ${this.envFilePath}`);
                        break;
                    }
                }
                content = lines.join('\n');
            }
            // If variable not found, append it
            if (!found) {
                if (content && !content.endsWith('\n')) {
                    content += '\n';
                }
                content += `${name}=${value}\n`;
                console.log(`[EnvManager] ✅ Added ${name} to ${this.envFilePath}`);
            }
            fs.writeFileSync(this.envFilePath, content, 'utf-8');
        }
        catch (error) {
            console.error(`[EnvManager] ❌ Failed to write env file: ${error}`);
            throw error;
        }
    }
    /**
     * Get the path to the .env file
     */
    getEnvFilePath() {
        return this.envFilePath;
    }
}
exports.EnvManager = EnvManager;
// Export a default instance for convenience
exports.envManager = new EnvManager();
//# sourceMappingURL=env-manager.js.map