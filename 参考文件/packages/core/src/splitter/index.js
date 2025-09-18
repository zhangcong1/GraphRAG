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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SplitterType = void 0;
// Splitter type enumeration
var SplitterType;
(function (SplitterType) {
    SplitterType["LANGCHAIN"] = "langchain";
    SplitterType["AST"] = "ast";
})(SplitterType || (exports.SplitterType = SplitterType = {}));
// Implementation class exports
__exportStar(require("./langchain-splitter"), exports);
__exportStar(require("./ast-splitter"), exports);
//# sourceMappingURL=index.js.map