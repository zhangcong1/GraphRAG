import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

/**
 * 文件类型定义
 */
export interface FileInfo {
    path: string;
    extension: string;
    name: string;
    size: number;
    isDirectory: boolean;
}

/**
 * 支持的文件类型
 */
export const SUPPORTED_EXTENSIONS = [
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
export const EXCLUDE_PATTERNS = [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**',
    '**/.vscode/**',
    '**/.idea/**',
    '**/coverage/**',
    '**/.next/**',           // Next.js 构建目录
    '**/.nuxt/**',           // Nuxt.js 构建目录
    '**/public/assets/**',   // 静态资源目录
    '**/static/**',          // 静态文件目录
    '**/*.min.js',
    '**/*.min.css',
    '**/*.bundle.js',        // 打包文件
    '**/*.chunk.js',         // webpack chunk
    '**/*.map',              // source map 文件
    '**/.DS_Store',
    '**/thumbs.db',
    '**/.env',               // 环境变量文件
    '**/.env.*',
    '**/package-lock.json',  // 锁定文件
    '**/yarn.lock',
    '**/pnpm-lock.yaml'
];

/**
 * 扫描工作区获取所有支持的文件
 * @param workspacePath 工作区路径
 * @returns 文件信息数组
 */
export async function scanWorkspace(workspacePath: string): Promise<FileInfo[]> {
    const pattern = `**/*{${SUPPORTED_EXTENSIONS.join(',')}}`;
    const files: string[] = await glob(pattern, {
        cwd: workspacePath,
        ignore: EXCLUDE_PATTERNS,
        absolute: true,
        nodir: true
    });

    const fileInfos: FileInfo[] = [];
    
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
        } catch (error) {
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
export async function readFileContent(filePath: string): Promise<string> {
    try {
        return await fs.promises.readFile(filePath, 'utf-8');
    } catch (error) {
        throw new Error(`读取文件失败: ${filePath} - ${error}`);
    }
}

/**
 * 写入文件内容
 * @param filePath 文件路径
 * @param content 文件内容
 */
export async function writeFileContent(filePath: string, content: string): Promise<void> {
    try {
        await fs.promises.writeFile(filePath, content, 'utf-8');
    } catch (error) {
        throw new Error(`写入文件失败: ${filePath} - ${error}`);
    }
}

/**
 * 确保目录存在
 * @param dirPath 目录路径
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
    try {
        await fs.promises.mkdir(dirPath, { recursive: true });
    } catch (error) {
        throw new Error(`创建目录失败: ${dirPath} - ${error}`);
    }
}

/**
 * 获取相对路径
 * @param from 起始路径
 * @param to 目标路径
 * @returns 相对路径
 */
export function getRelativePath(from: string, to: string): string {
    return path.relative(from, to);
}

/**
 * 获取文件的语言类型
 * @param filePath 文件路径
 * @returns 语言类型
 */
export function getLanguageFromPath(filePath: string): string {
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
export function isSupportedFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return SUPPORTED_EXTENSIONS.includes(ext);
}