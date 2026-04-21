import fs from "fs";
import path from "path";
import crypto from "crypto";

// ─── FRONTEND CONTEXT ───

/**
 * Lee un servicio frontend existente y extrae solo imports y firmas.
 */
export function extractContext(featureName: string): string | null {
    const dir = path.join("UI/nitro-groups/src", "features", featureName, "services");
    const filePath = path.join(dir, `${featureName}.service.ts`);

    if (!fs.existsSync(filePath)) return null;

    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    const extractedLines = lines.filter(line =>
        line.trim().startsWith("import") ||
        line.includes(":") ||
        line.includes("async") ||
        line.includes("export")
    );

    return extractedLines.join("\n").substring(0, 500) + "\n... [Restante omitido]";
}

// ─── DOMAIN CONTEXT (.NET) ───

/**
 * Busca la entidad de dominio y extrae sus propiedades y firmas de métodos.
 */
export function extractDomainContext(featureName: string): string | null {
    const capitalized = featureName.charAt(0).toUpperCase() + featureName.slice(1);
    const entityDir = path.join(process.cwd(), "Core", capitalized, `NitroGroups.Core.${capitalized}.Domain`, "Entities");

    if (!fs.existsSync(entityDir)) return null;

    const files = fs.readdirSync(entityDir).filter(f => f.endsWith(".cs"));
    if (files.length === 0) return null;

    let allContext = "";
    for (const file of files) {
        const filePath = path.join(entityDir, file);
        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.split("\n");
        const extracted = lines.filter(line =>
            (line.includes("public") && (line.includes("{ get; set; }") || line.includes("("))) &&
            !line.includes("class") && !line.includes("namespace")
        );
        allContext += `ENTITY: ${file}\n` + extracted.map(l => l.trim()).join("\n") + "\n\n";
    }

    return allContext.trim() || null;
}

// ─── SEMANTIC HASH ───

/**
 * Genera un hash semántico del "genoma" de la entidad.
 * Solo hashea propiedades y métodos públicos, ignorando comentarios y espacios.
 */
export function calculateSemanticHash(content: string): string {
    const lines = content.split("\n");
    const structuralParts = lines.filter(line =>
        (line.includes("public") || line.includes("protected")) &&
        (line.includes("{ get; set; }") || line.includes("(")) &&
        !line.trim().startsWith("//") && !line.trim().startsWith("/*")
    ).map(line => line.trim().replace(/\s+/g, " "));

    const genome = structuralParts.sort().join("|");
    return crypto.createHash("sha256").update(genome).digest("hex").substring(0, 12);
}

// ─── IMPACT ANALYSIS ───

/**
 * Busca recursivamente archivos en un directorio que contengan algún término.
 */
function searchFilesRecursive(dir: string, terms: string[], extensions: string[]): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;

    function walk(currentDir: string) {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                // Ignorar node_modules, bin, obj, .git
                if (["node_modules", "bin", "obj", ".git", ".next"].includes(entry.name)) continue;
                walk(fullPath);
            } else if (extensions.some(ext => entry.name.endsWith(ext))) {
                try {
                    const content = fs.readFileSync(fullPath, "utf-8");
                    const contentLower = content.toLowerCase();
                    for (const term of terms) {
                        if (contentLower.includes(term.toLowerCase())) {
                            results.push(fullPath);
                            break; // No contar el mismo archivo dos veces
                        }
                    }
                } catch { /* Ignorar archivos que no se puedan leer */ }
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
export function runImpactAnalysis(feature: string, contract: any): { risk: 'LOW' | 'MEDIUM' | 'HIGH'; files: string[] } {
    // Recopilar términos de búsqueda desde el contrato
    const searchTerms: string[] = [contract.endpoint];
    for (const method of contract.methods || []) {
        if (method.request?.name) searchTerms.push(method.request.name);
        if (method.response?.name) searchTerms.push(method.response.name);
    }

    // Buscar en Core/ (.cs) y UI/ (.ts, .tsx)
    const coreHits = searchFilesRecursive(path.join(process.cwd(), "Core"), searchTerms, [".cs"]);
    const uiHits = searchFilesRecursive(path.join(process.cwd(), "UI"), searchTerms, [".ts", ".tsx"]);
    const allHits = [...coreHits, ...uiHits];

    // Clasificar riesgo
    let risk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (allHits.length > 5) risk = 'HIGH';
    else if (allHits.length > 0) risk = 'MEDIUM';

    return { risk, files: allHits };
}

// ─── DB SCHEMA CONTEXT ───

/**
 * Lee el schema de BD desde GEMINI.md para inyectarlo en el drafting.
 * El schema está en las user rules y contiene la estructura real de tablas.
 */
export function extractDbSchema(): string | null {
    const geminiPath = path.join(process.cwd(), "ai", "CLAUDE.md");
    if (!fs.existsSync(geminiPath)) return null;

    const content = fs.readFileSync(geminiPath, "utf-8");
    // Extraer solo las definiciones de tablas (lineas que empiezan con Table, id, o contienen ref/enum)
    const lines = content.split("\n");
    const schemaLines = lines.filter(line =>
        line.trim().startsWith("Table ") ||
        line.includes("[pk") ||
        line.includes("[ref:") ||
        line.includes("enum(") ||
        line.includes("varchar") ||
        line.includes("decimal") ||
        line.includes("boolean") ||
        line.includes("timestamptz") ||
        line.includes("int ")
    );

    return schemaLines.length > 0 ? schemaLines.join("\n") : null;
}
