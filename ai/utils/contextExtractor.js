"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractDbSchema = exports.runImpactAnalysis = exports.calculateSemanticHash = exports.resolveDomainContext = exports.extractDomainContext = exports.extractContext = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
// ─── FRONTEND CONTEXT ───
/**
 * Lee un servicio frontend existente y extrae solo imports y firmas.
 */
function extractContext(featureName) {
    const dir = path_1.default.join("UI/nitro-groups/src", "features", featureName, "services");
    const filePath = path_1.default.join(dir, `${featureName}.service.ts`);
    if (!fs_1.default.existsSync(filePath))
        return null;
    const content = fs_1.default.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    const extractedLines = lines.filter(line => line.trim().startsWith("import") ||
        line.includes(":") ||
        line.includes("async") ||
        line.includes("export"));
    return extractedLines.join("\n").substring(0, 500) + "\n... [Restante omitido]";
}
exports.extractContext = extractContext;
// ─── DOMAIN CONTEXT (.NET) ───
/**
 * Busca la entidad de dominio y extrae sus propiedades y firmas de métodos.
 */
function extractDomainContext(featureName) {
    return resolveDomainContext(featureName)?.context ?? null;
}
exports.extractDomainContext = extractDomainContext;
function extractEntitySignatures(entityDir) {
    if (!fs_1.default.existsSync(entityDir))
        return null;
    const files = fs_1.default.readdirSync(entityDir).filter(f => f.endsWith(".cs"));
    if (files.length === 0)
        return null;
    let allContext = "";
    for (const file of files) {
        const filePath = path_1.default.join(entityDir, file);
        const content = fs_1.default.readFileSync(filePath, "utf-8");
        const lines = content.split("\n");
        const extracted = lines.filter(line => (line.includes("public") && (line.includes("{ get; set; }") || line.includes("("))) &&
            !line.includes("class") && !line.includes("namespace"));
        allContext += `ENTITY: ${file}\n` + extracted.map(l => l.trim()).join("\n") + "\n\n";
    }
    return allContext.trim() || null;
}
function resolveDomainContext(featureName) {
    const coreDir = path_1.default.join(process.cwd(), "Core");
    if (!fs_1.default.existsSync(coreDir))
        return null;
    const normalizedFeature = featureName.trim().toLowerCase();
    const capitalizedFeature = featureName.charAt(0).toUpperCase() + featureName.slice(1);
    const moduleDirs = fs_1.default.readdirSync(coreDir, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
    let bestMatch = null;
    let bestScore = 0;
    for (const moduleName of moduleDirs) {
        const entityDir = path_1.default.join(coreDir, moduleName, `NitroGroups.Core.${moduleName}.Domain`, "Entities");
        if (!fs_1.default.existsSync(entityDir))
            continue;
        const files = fs_1.default.readdirSync(entityDir).filter(f => f.endsWith(".cs"));
        if (files.length === 0)
            continue;
        let score = 0;
        for (const file of files) {
            const filePath = path_1.default.join(entityDir, file);
            const content = fs_1.default.readFileSync(filePath, "utf-8").toLowerCase();
            const fileLower = file.toLowerCase();
            if (fileLower.includes(normalizedFeature))
                score += 3;
            if (content.includes(`class ${normalizedFeature}`))
                score += 4;
            if (content.includes(normalizedFeature))
                score += 1;
        }
        if (moduleName.toLowerCase() === normalizedFeature)
            score += 2;
        if (score > bestScore) {
            bestScore = score;
            bestMatch = { moduleName, context: extractEntitySignatures(entityDir) };
        }
    }
    if (bestMatch && bestScore > 0)
        return bestMatch;
    // Fallback determinista: módulo con mismo nombre del feature (si existe)
    const fallbackEntityDir = path_1.default.join(coreDir, capitalizedFeature, `NitroGroups.Core.${capitalizedFeature}.Domain`, "Entities");
    if (fs_1.default.existsSync(fallbackEntityDir)) {
        return {
            moduleName: capitalizedFeature,
            context: extractEntitySignatures(fallbackEntityDir)
        };
    }
    return null;
}
exports.resolveDomainContext = resolveDomainContext;
// ─── SEMANTIC HASH ───
/**
 * Genera un hash semántico del "genoma" de la entidad.
 * Solo hashea propiedades y métodos públicos, ignorando comentarios y espacios.
 */
function calculateSemanticHash(content) {
    const lines = content.split("\n");
    const structuralParts = lines.filter(line => (line.includes("public") || line.includes("protected")) &&
        (line.includes("{ get; set; }") || line.includes("(")) &&
        !line.trim().startsWith("//") && !line.trim().startsWith("/*")).map(line => line.trim().replace(/\s+/g, " "));
    const genome = structuralParts.sort().join("|");
    return crypto_1.default.createHash("sha256").update(genome).digest("hex").substring(0, 12);
}
exports.calculateSemanticHash = calculateSemanticHash;
// ─── IMPACT ANALYSIS ───
/**
 * Busca recursivamente archivos en un directorio que contengan algún término.
 */
function searchFilesRecursive(dir, terms, extensions) {
    const results = [];
    if (!fs_1.default.existsSync(dir))
        return results;
    function walk(currentDir) {
        const entries = fs_1.default.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path_1.default.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                // Ignorar node_modules, bin, obj, .git
                if (["node_modules", "bin", "obj", ".git", ".next"].includes(entry.name))
                    continue;
                walk(fullPath);
            }
            else if (extensions.some(ext => entry.name.endsWith(ext))) {
                try {
                    const content = fs_1.default.readFileSync(fullPath, "utf-8");
                    const contentLower = content.toLowerCase();
                    for (const term of terms) {
                        if (contentLower.includes(term.toLowerCase())) {
                            results.push(fullPath);
                            break; // No contar el mismo archivo dos veces
                        }
                    }
                }
                catch { /* Ignorar archivos que no se puedan leer */ }
            }
        }
    }
    walk(dir);
    return results;
}
/**
 * Analiza el impacto real de un feature en el repositorio.
 * Busca usos de DTOs y endpoints en Core/ y UI/.
 */
function runImpactAnalysis(feature, contract) {
    // Recopilar términos de búsqueda desde el contrato
    const searchTerms = [contract.endpoint];
    for (const method of contract.methods || []) {
        if (method.request?.name)
            searchTerms.push(method.request.name);
        if (method.response?.name)
            searchTerms.push(method.response.name);
    }
    // Buscar en Core/ (.cs) y UI/ (.ts, .tsx)
    const coreHits = searchFilesRecursive(path_1.default.join(process.cwd(), "Core"), searchTerms, [".cs"]);
    const uiHits = searchFilesRecursive(path_1.default.join(process.cwd(), "UI"), searchTerms, [".ts", ".tsx"]);
    const allHits = [...coreHits, ...uiHits];
    // Clasificar riesgo
    let risk = 'LOW';
    if (allHits.length > 5)
        risk = 'HIGH';
    else if (allHits.length > 0)
        risk = 'MEDIUM';
    return { risk, files: allHits };
}
exports.runImpactAnalysis = runImpactAnalysis;
// ─── DB SCHEMA CONTEXT ───
/**
 * Lee el schema de BD desde GEMINI.md para inyectarlo en el drafting.
 * El schema está en las user rules y contiene la estructura real de tablas.
 */
function extractDbSchema() {
    const geminiPath = path_1.default.join(process.cwd(), "ai", "CLAUDE.md");
    if (!fs_1.default.existsSync(geminiPath))
        return null;
    const content = fs_1.default.readFileSync(geminiPath, "utf-8");
    // Extraer solo las definiciones de tablas (lineas que empiezan con Table, id, o contienen ref/enum)
    const lines = content.split("\n");
    const schemaLines = lines.filter(line => line.trim().startsWith("Table ") ||
        line.includes("[pk") ||
        line.includes("[ref:") ||
        line.includes("enum(") ||
        line.includes("varchar") ||
        line.includes("decimal") ||
        line.includes("boolean") ||
        line.includes("timestamptz") ||
        line.includes("int "));
    return schemaLines.length > 0 ? schemaLines.join("\n") : null;
}
exports.extractDbSchema = extractDbSchema;
