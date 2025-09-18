"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Embedding = void 0;
/**
 * Abstract base class for embedding implementations
 */
class Embedding {
    /**
     * Preprocess text to ensure it's valid for embedding
     * @param text Input text
     * @returns Processed text
     */
    preprocessText(text) {
        // Replace empty string with single space
        if (text === '') {
            return ' ';
        }
        // Simple character-based truncation (approximation)
        // Each token is roughly 4 characters on average for English text
        const maxChars = this.maxTokens * 4;
        if (text.length > maxChars) {
            return text.substring(0, maxChars);
        }
        return text;
    }
    /**
     * Preprocess array of texts
     * @param texts Array of input texts
     * @returns Array of processed texts
     */
    preprocessTexts(texts) {
        return texts.map(text => this.preprocessText(text));
    }
}
exports.Embedding = Embedding;
//# sourceMappingURL=base-embedding.js.map