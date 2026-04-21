import fs from "fs";
import path from "path";

export function getServicePrompt(featureName: string, exampleContext: string | null): string {
    const contractPath = path.join(__dirname, "../contracts/service.contract.json");
    const contract = fs.readFileSync(contractPath, "utf-8");
    
    let patternInfo = "";
    const patternPath = path.join(__dirname, "../patterns/service.pattern.json");
    if (fs.existsSync(patternPath)) {
        patternInfo = fs.readFileSync(patternPath, "utf-8");
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
