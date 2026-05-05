"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.askLine = void 0;
const readline_1 = __importDefault(require("readline"));
/**
 * Pregunta de consola (una línea). Para respuestas largas, el usuario puede
 * pegar en una sola línea o usar comillas; alternativa: `requirement --file=`.
 */
function askLine(prompt) {
    const rl = readline_1.default.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
        rl.question(prompt, answer => {
            rl.close();
            resolve(answer.trim());
        });
    });
}
exports.askLine = askLine;
