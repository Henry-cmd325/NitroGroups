"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmAction = exports.showPreview = void 0;
const readline_1 = __importDefault(require("readline"));
function showPreview(content) {
    console.log("\n\x1b[36m=== PREVIEW DEL CÓDIGO GENERADO ===\x1b[0m\n");
    console.log(`\x1b[32m${content}\x1b[0m`);
    console.log("\n\x1b[36m===================================\x1b[0m\n");
}
exports.showPreview = showPreview;
function confirmAction(question) {
    if (process.env.AUTO_ACCEPT === "true") {
        console.log(`\x1b[33m${question} (y/N): \x1b[0myes (AUTO_ACCEPT)`);
        return Promise.resolve(true);
    }
    const rl = readline_1.default.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question(`\x1b[33m${question} (y/N): \x1b[0m`, (answer) => {
            rl.close();
            resolve(answer.trim().toLowerCase() === "y");
        });
    });
}
exports.confirmAction = confirmAction;
