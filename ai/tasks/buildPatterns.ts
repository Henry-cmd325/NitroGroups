import fs from "fs";
import path from "path";
import { PATHS } from "../config/paths";

export async function buildPatterns() {
    console.log("🔍 Iniciando Extracción de Patrones (Pattern Registry)...");
    const featuresDir = path.join(PATHS.frontend, "features");

    if (!fs.existsSync(featuresDir)) {
        console.error(`❌ Directorio base no encontrado: ${featuresDir}`);
        return;
    }

    const directories = fs.readdirSync(featuresDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    let methodCounts: Record<string, number> = {};
    let dtoSuffixes: Set<string> = new Set();
    
    // Extracción por regex simple sin parsear AST completo
    directories.forEach(feature => {
        const servicePath = path.join(featuresDir, feature, "services", `${feature}.service.ts`);
        if (fs.existsSync(servicePath)) {
            const content = fs.readFileSync(servicePath, "utf-8");

            // Buscar funciones asíncronas dentro de "XService = {"
            const methodMatches = content.match(/(\w+):\s*async/g) || [];
            methodMatches.forEach(match => {
                const funcName = match.split(":")[0].trim();
                methodCounts[funcName] = (methodCounts[funcName] || 0) + 1;
            });

            // Buscar DTOs (Cualquier cosa que empiece en mayuscula y termine en Response, Request o Dto)
            const dtoMatches = content.match(/[A-Z]\w*(Response|Request|Dto)\b/g) || [];
            dtoMatches.forEach(dto => {
                const suffixMatch = dto.match(/(Response|Request|Dto)$/);
                if (suffixMatch) dtoSuffixes.add(suffixMatch[1]);
            });
        }
    });

    const patterns = {
        naming: {
            preferred: Object.entries(methodCounts)
                .sort((a, b) => b[1] - a[1]) // Más frecuentes primero
                .slice(0, 5) // Tomar el Top 5
                .map(entry => entry[0]),
            rawFrequency: methodCounts
        },
        dtoPatterns: Array.from(dtoSuffixes)
    };

    const outPath = path.join(__dirname, "../patterns/service.pattern.json");
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(patterns, null, 2));

    console.log("✅ Patrones compilados exitosamente en:", outPath);
}
