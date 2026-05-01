"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServicePrompt = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function getServicePrompt(featureName, exampleContext) {
    const contractPath = path_1.default.join(__dirname, "../contracts/service.contract.json");
    const contract = fs_1.default.readFileSync(contractPath, "utf-8");
    let patternInfo = "";
    const patternPath = path_1.default.join(__dirname, "../patterns/service.pattern.json");
    if (fs_1.default.existsSync(patternPath)) {
        patternInfo = fs_1.default.readFileSync(patternPath, "utf-8");
    }
    let prompt = `
ERES UN INGENIERO DE SOFTWARE SENIOR.
TU TAREA ES GENERAR UN SERVICIO PARA EL RECURSO: "${featureName}".

=== CONTRATO ARQUITECTÓNICO ABSOLUTO ===
Debes obedecer rígidamente estas reglas JSON. Si violas CUALQUIERA, tu código será rechazado:
${contract}

=== PREFERENCIAS DE PATRONES EN EL REPOSITORIO ===
${patternInfo ? patternInfo : "No hay patrones recolectados todavía."}
`;
    if (exampleContext) {
        prompt += `\n=== CONTEXTO DE EJEMPLO DE OTRO SERVICIO ===\nPara que imites el estilo puro:\n${exampleContext}\n`;
    }
    prompt += `
REGLAS FINALES:
- Output solo código Typescript, rodeado en \`\`\`ts
- Importa dependencias internas correctamente desde "@/"
- Usa apiClient dentro de los métodos exportados como const.
    `;
    return prompt;
}
exports.getServicePrompt = getServicePrompt;
