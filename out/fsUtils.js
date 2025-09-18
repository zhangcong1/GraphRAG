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
exports.EXCLUDE_PATTERNS = exports.SUPPORTED_EXTENSIONS = void 0;
exports.scanWorkspace = scanWorkspace;
exports.readFileContent = readFileContent;
exports.writeFileContent = writeFileContent;
exports.ensureDirectory = ensureDirectory;
exports.getRelativePath = getRelativePath;
exports.getLanguageFromPath = getLanguageFromPath;
exports.isSupportedFile = isSupportedFile;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const glob_1 = require("glob");
/**
 * 支持的文件类型
 */
exports.SUPPORTED_EXTENSIONS = [
    '.vue',
    '.js',
    '.ts',
    '.jsx',
    '.tsx',
    '.json',
    '.md',
    '.html',
    '.css',
    '.scss',
    '.sass',
    '.less'
];
/**
 * 排除的目录和文件模式
 */
exports.EXCLUDE_PATTERNS = [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**',
    '**/.vscode/**',
    '**/.idea/**',
    '**/coverage/**',
    '**/.next/**', // Next.js 构建目录
    '**/.nuxt/**', // Nuxt.js 构建目录
    '**/public/assets/**', // 静态资源目录
    '**/static/**', // 静态文件目录
    '**/*.min.js',
    '**/*.min.css',
    '**/*.bundle.js', // 打包文件
    '**/*.chunk.js', // webpack chunk
    '**/*.map', // source map 文件
    '**/.DS_Store',
    '**/thumbs.db',
    '**/.env', // 环境变量文件
    '**/.env.*',
    '**/package-lock.json', // 锁定文件
    '**/yarn.lock',
    '**/pnpm-lock.yaml'
];
/**
 * 扫描工作区获取所有支持的文件
 * @param workspacePath 工作区路径
 * @returns 文件信息数组
 */
async function scanWorkspace(workspacePath) {
    const pattern = `**/*{${exports.SUPPORTED_EXTENSIONS.join(',')}}`;
    const files = await (0, glob_1.glob)(pattern, {
        cwd: workspacePath,
        ignore: exports.EXCLUDE_PATTERNS,
        absolute: true,
        nodir: true
    });
    const fileInfos = [];
    for (const filePath of files) {
        try {
            const stats = await fs.promises.stat(filePath);
            const parsedPath = path.parse(filePath);
            fileInfos.push({
                path: filePath,
                extension: parsedPath.ext,
                name: parsedPath.name,
                size: stats.size,
                isDirectory: false
            });
        }
        catch (error) {
            console.warn(`无法获取文件信息: ${filePath}`, error);
        }
    }
    return fileInfos;
}
/**
 * 读取文件内容
 * @param filePath 文件路径
 * @returns 文件内容字符串
 */
async function readFileContent(filePath) {
    try {
        return await fs.promises.readFile(filePath, 'utf-8');
    }
    catch (error) {
        throw new Error(`读取文件失败: ${filePath} - ${error}`);
    }
}
/**
 * 写入文件内容
 * @param filePath 文件路径
 * @param content 文件内容
 */
async function writeFileContent(filePath, content) {
    try {
        await fs.promises.writeFile(filePath, content, 'utf-8');
    }
    catch (error) {
        throw new Error(`写入文件失败: ${filePath} - ${error}`);
    }
}
/**
 * 确保目录存在
 * @param dirPath 目录路径
 */
async function ensureDirectory(dirPath) {
    try {
        await fs.promises.mkdir(dirPath, { recursive: true });
    }
    catch (error) {
        throw new Error(`创建目录失败: ${dirPath} - ${error}`);
    }
}
/**
 * 获取相对路径
 * @param from 起始路径
 * @param to 目标路径
 * @returns 相对路径
 */
function getRelativePath(from, to) {
    return path.relative(from, to);
}
/**
 * 获取文件的语言类型
 * @param filePath 文件路径
 * @returns 语言类型
 */
function getLanguageFromPath(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.vue':
            return 'vue';
        case '.js':
        case '.jsx':
            return 'javascript';
        case '.ts':
        case '.tsx':
            return 'typescript';
        case '.json':
            return 'json';
        case '.md':
            return 'markdown';
        case '.html':
            return 'html';
        case '.css':
            return 'css';
        case '.scss':
        case '.sass':
            return 'scss';
        case '.less':
            return 'less';
        default:
            return 'unknown';
    }
}
/**
 * 判断是否为支持的文件类型
 * @param filePath 文件路径
 * @returns 是否支持
 */
function isSupportedFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return exports.SUPPORTED_EXTENSIONS.includes(ext);
}
//# sourceMappingURL=fsUtils.js.map