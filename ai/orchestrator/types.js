"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPascalCase = exports.normalizeToPosix = void 0;
function normalizeToPosix(filePath) {
    return filePath.replace(/\\/g, "/");
}
exports.normalizeToPosix = normalizeToPosix;
function toPascalCase(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}
exports.toPascalCase = toPascalCase;
