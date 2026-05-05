"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPatterns = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const paths_1 = require("../config/paths");
async function buildPatterns() {
    console.log("🔍 Iniciando Extracción de Patrones (Pattern Registry)...");
    const featuresDir = path_1.default.join(paths_1.PATHS.frontend, "features");
    if (!fs_1.default.existsSync(featuresDir)) {
        console.error(`❌ Directorio base no encontrado: ${featuresDir}`);
        return;
    }
    const directories = fs_1.default.readdirSync(featuresDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    let methodCounts = {};
    let dtoSuffixes = new Set();
    // Extracción por regex simple sin parsear AST completo
    directories.forEach(feature => {
        const servicePath = path_1.default.join(featuresDir, feature, "services", `${feature}.service.ts`);
        if (fs_1.default.existsSync(servicePath)) {
            const content = fs_1.default.readFileSync(servicePath, "utf-8");
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
                if (suffixMatch)
                    dtoSuffixes.add(suffixMatch[1]);
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
    const outPath = path_1.default.join(__dirname, "../patterns/service.pattern.json");
    fs_1.default.mkdirSync(path_1.default.dirname(outPath), { recursive: true });
    fs_1.default.writeFileSync(outPath, JSON.stringify(patterns, null, 2));
    console.log("✅ Patrones compilados exitosamente en:", outPath);
}
exports.buildPatterns = buildPatterns;
