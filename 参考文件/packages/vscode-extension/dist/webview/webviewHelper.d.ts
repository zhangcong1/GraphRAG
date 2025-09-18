import * as vscode from 'vscode';
export declare class WebviewHelper {
    /**
     * Read HTML template file with support for external resources
     * @param extensionUri Extension root directory URI
     * @param templatePath Template file relative path
     * @param webview webview instance
     * @returns HTML content with resolved resource URIs
     */
    static getHtmlContent(extensionUri: vscode.Uri, templatePath: string, webview: vscode.Webview): string;
    /**
     * Get fallback HTML content (used when file reading fails)
     */
    private static getFallbackHtml;
}
//# sourceMappingURL=webviewHelper.d.ts.map