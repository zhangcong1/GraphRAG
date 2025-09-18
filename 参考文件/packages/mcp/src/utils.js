import * as path from "path";
/**
 * Truncate content to specified length
 */
export function truncateContent(content, maxLength) {
    if (content.length <= maxLength) {
        return content;
    }
    return content.substring(0, maxLength) + '...';
}
/**
 * Ensure path is absolute. If relative path is provided, resolve it properly.
 */
export function ensureAbsolutePath(inputPath) {
    // If already absolute, return as is
    if (path.isAbsolute(inputPath)) {
        return inputPath;
    }
    // For relative paths, resolve to absolute path
    const resolved = path.resolve(inputPath);
    return resolved;
}
export function trackCodebasePath(codebasePath) {
    const absolutePath = ensureAbsolutePath(codebasePath);
    console.log(`[TRACKING] Tracked codebase path: ${absolutePath} (not marked as indexed)`);
}
//# sourceMappingURL=utils.js.map