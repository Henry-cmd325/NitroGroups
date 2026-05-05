import fs from "fs";
import path from "path";
import type { B2BContract } from "../types";
import { normalizeToPosix } from "../types";

export interface RouteConflictHit {
    http: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "MAP";
    routePattern: string;
    /** Ruta de proyecto relativa */
    relativePath: string;
}

/**
 * Ruta mínima para comparar: minúsculas, sin / inicial, {groupid:long} → {groupid}.
 */
function normalizeRouteKey(route: string): string {
    let r = route.trim().toLowerCase();
    r = r.replace(/^\//, "");
    r = r.replace(/\{([a-z0-9_]+):[^}]+\}/g, "{$1}");
    return r;
}

const mapVerbRe = /\bapp\.(MapGet|MapPost|MapPut|MapPatch|MapDelete)\s*\(\s*["']([^"']+)["']/g;

function mapAspNetMapToHttp(mapKind: string): RouteConflictHit["http"] {
    const m: Record<string, RouteConflictHit["http"]> = {
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
export function findBackendHttpRouteConflicts(
    projectRoot: string,
    contract: B2BContract
): RouteConflictHit[] {
    const coreDir = path.join(projectRoot, "Core");
    if (!fs.existsSync(coreDir)) return [];

    const wanted: { http: string; key: string }[] = [];
    for (const m of contract.methods || []) {
        const h = (m.http || "GET").toUpperCase();
        const ep = String(contract.endpoint || "/api/unknown");
        if (!ep.startsWith("/api")) {
            // extendRoute añade detalles en fallback; aprox: usar endpoint tal cual
        }
        const key = normalizeRouteKey(ep.replace(/^\s*/, ""));
        if (h === "GET") wanted.push({ http: "GET", key });
        else if (h === "POST") wanted.push({ http: "POST", key });
        else if (h === "PUT") wanted.push({ http: "PUT", key });
        else if (h === "PATCH") wanted.push({ http: "PATCH", key });
        else if (h === "DELETE") wanted.push({ http: "DELETE", key });
    }
    if (wanted.length === 0) return [];

    const matches: RouteConflictHit[] = [];
    const walk = (dir: string) => {
        let list: fs.Dirent[];
        try {
            list = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }
        for (const ent of list) {
            if (ent.isDirectory()) {
                walk(path.join(dir, ent.name));
            } else if (ent.isFile() && ent.name.endsWith(".cs")) {
                const full = path.join(dir, ent.name);
                const pNorm = full.replace(/\\/g, "/");
                if (!pNorm.includes("Infrastructure/Endpoints") && !pNorm.includes("Infrastructure\\Endpoints")) {
                    continue;
                }
                const content = fs.readFileSync(full, "utf-8");
                if (!content.includes("MapGet") && !content.includes("MapPost") && !content.includes("IEndpoint")) {
                    continue;
                }
                let mm: RegExpExecArray | null;
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
                                relativePath: normalizeToPosix(path.relative(projectRoot, full))
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

function dedupeByPath(hits: RouteConflictHit[]): RouteConflictHit[] {
    const seen = new Set<string>();
    return hits.filter(h => {
        const k = h.relativePath + h.http + h.routePattern;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });
}
