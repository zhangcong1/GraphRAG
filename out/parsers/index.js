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
exports.OtherFormatParser = exports.LanguageParser = exports.VueParser = exports.JavaScriptParser = void 0;
// 解析器模块入口文件
__exportStar(require("./types"), exports);
var JavaScriptParser_1 = require("./JavaScriptParser");
Object.defineProperty(exports, "JavaScriptParser", { enumerable: true, get: function () { return JavaScriptParser_1.JavaScriptParser; } });
var VueParser_1 = require("./VueParser");
Object.defineProperty(exports, "VueParser", { enumerable: true, get: function () { return VueParser_1.VueParser; } });
var LanguageParser_1 = require("./LanguageParser");
Object.defineProperty(exports, "LanguageParser", { enumerable: true, get: function () { return LanguageParser_1.LanguageParser; } });
var OtherFormatParser_1 = require("./OtherFormatParser");
Object.defineProperty(exports, "OtherFormatParser", { enumerable: true, get: function () { return OtherFormatParser_1.OtherFormatParser; } });
//# sourceMappingURL=index.js.map