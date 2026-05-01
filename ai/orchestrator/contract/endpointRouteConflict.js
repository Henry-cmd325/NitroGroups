"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findBackendHttpRouteConflicts = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const types_1 = require("../types");
/**
 * Ruta mínima para comparar: minúsculas, sin / inicial, {groupid:long} → {groupid}.
 */
function normalizeRouteKey(route) {
    let r = route.trim().toLowerCase();
    r = r.replace(/^\//, "");
    r = r.replace(/\{([a-z0-9_]+):[^}]+\}/g, "{$1}");
    return r;
}
const mapVerbRe = /\bapp\.(MapGet|MapPost|MapPut|MapPatch|MapDelete)\s*\(\s*["']([^"']+)["']/g;
function mapAspNetMapToHttp(mapKind) {
    const m = {
        MapGet: "GET",
        MapPost: "POST",
        MapPut: "PUT",
        MapPatch: "PATCH",
        MapDelete: "DELETE"
    };
    return m[mapKind] || "GET";
}
/**
 * Escanear Core/.../Infrastructure/Endpoints en disco: si un MapGet/MapPost
 * ya cubre el path del contrato, hay conflicto (no duplicar IEndpoint).
 */
function findBackendHttpRouteConflicts(projectRoot, contract) {
    const coreDir = path_1.default.join(projectRoot, "Core");
    if (!fs_1.default.existsSync(coreDir))
        return [];
    const wanted = [];
    for (const m of contract.methods || []) {
        const h = (m.http || "GET").toUpperCase();
        const ep = String(contract.endpoint || "/api/unknown");
        if (!ep.startsWith("/api")) {
            // extendRoute añade detalles en fallback; aprox: usar endpoint tal cual
        }
        const key = normalizeRouteKey(ep.replace(/^\s*/, ""));
        if (h === "GET")
            wanted.push({ http: "GET", key });
        else if (h === "POST")
            wanted.push({ http: "POST", key });
        else if (h === "PUT")
            wanted.push({ http: "PUT", key });
        else if (h === "PATCH")
            wanted.push({ http: "PATCH", key });
        else if (h === "DELETE")
            wanted.push({ http: "DELETE", key });
    }
    if (wanted.length === 0)
        return [];
    const matches = [];
    const walk = (dir) => {
        let list;
        try {
            list = fs_1.default.readdirSync(dir, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const ent of list) {
            if (ent.isDirectory()) {
                walk(path_1.default.join(dir, ent.name));
            }
            else if (ent.isFile() && ent.name.endsWith(".cs")) {
                const full = path_1.default.join(dir, ent.name);
                const pNorm = full.replace(/\\/g, "/");
                if (!pNorm.includes("Infrastructure/Endpoints") && !pNorm.includes("Infrastructure\\Endpoints")) {
                    continue;
                }
                const content = fs_1.default.readFileSync(full, "utf-8");
                if (!content.includes("MapGet") && !content.includes("MapPost") && !content.includes("IEndpoint")) {
                    continue;
                }
                let mm;
                mapVerbRe.lastIndex = 0;
                while ((mm = mapVerbRe.exec(content)) != null) {
                    const mapKind = mm[1] || "";
                    const verb = mapAspNetMapToHttp(mapKind);
                    const rpat = mm[2] || "";
                    const k = normalizeRouteKey(rpat);
                    for (const w of wanted) {
                        if (w.http === verb && w.key === k) {
                            matches.push({
                                http: w.http,
                                routePattern: rpat,
                                relativePath: (0, types_1.normalizeToPosix)(path_1.default.relative(projectRoot, full))
                            });
                        }
                    }
                }
            }
        }
    };
    walk(coreDir);
    return dedupeByPath(matches);
}
exports.findBackendHttpRouteConflicts = findBackendHttpRouteConflicts;
function dedupeByPath(hits) {
    const seen = new Set();
    return hits.filter(h => {
        const k = h.relativePath + h.http + h.routePattern;
        if (seen.has(k))
            return false;
        seen.add(k);
        return true;
    });
}
