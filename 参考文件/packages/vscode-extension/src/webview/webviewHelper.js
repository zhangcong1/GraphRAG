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
exports.WebviewHelper = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class WebviewHelper {
    /**
     * Read HTML template file with support for external resources
     * @param extensionUri Extension root directory URI
     * @param templatePath Template file relative path
     * @param webview webview instance
     * @returns HTML content with resolved resource URIs
     */
    static getHtmlContent(extensionUri, templatePath, webview) {
        const htmlPath = path.join(extensionUri.fsPath, templatePath);
        try {
            let htmlContent = fs.readFileSync(htmlPath, 'utf8');
            // Check if template needs resource URI replacement (modular templates)
            if (htmlContent.includes('{{styleUri}}') || htmlContent.includes('{{scriptUri}}')) {
                // Create URIs for external resources
                const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'styles', 'semanticSearch.css'));
                const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview', 'scripts', 'semanticSearch.js'));
                // Replace template placeholders
                htmlContent = htmlContent
                    .replace('{{styleUri}}', styleUri.toString())
                    .replace('{{scriptUri}}', scriptUri.toString());
            }
            return htmlContent;
        }
        catch (error) {
            console.error('Failed to read HTML template:', error);
            return this.getFallbackHtml();
        }
    }
    /**
     * Get fallback HTML content (used when file reading fails)
     */
    static getFallbackHtml() {
        return `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Semantic Search</title>
			</head>
			<body>
				<h3>Semantic Search</h3>
				<p>Error loading template. Please check console for details.</p>
			</body>
			</html>
		`;
    }
}
exports.WebviewHelper = WebviewHelper;
//# sourceMappingURL=webviewHelper.js.map