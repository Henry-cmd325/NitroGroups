import { ROUTES } from "@/config/routes";
import { isIsoDate } from "@/lib/format";
import type { SearchFilters } from "./types";

/** Filtros ya validados. Lo que no es válido se descarta en lugar de romper la página. */
export interface ParsedFilters {
    q?: string;
    genero?: string;
    ciudad?: string;
    fecha?: string;
    budget?: number;
    page: number;
}

const clean = (v?: string) => (v && v.trim() ? v.trim() : undefined);

export function parseFilters(raw: SearchFilters): ParsedFilters {
    const budget = Number(raw.presupuesto);
    const page = Math.trunc(Number(raw.pagina));
    return {
        q: clean(raw.q),
        genero: clean(raw.genero),
        ciudad: clean(raw.ciudad),
        fecha: isIsoDate(raw.fecha) ? raw.fecha : undefined,
        budget: Number.isFinite(budget) && budget > 0 ? budget : undefined,
        page: Number.isFinite(page) && page > 0 ? page : 1,
    };
}

/** Query string de GET /api/groups/search. */
export function buildApiQuery(f: ParsedFilters, size: number): string {
    const q = new URLSearchParams({ page: String(f.page), size: String(size) });
    if (f.q) q.set("q", f.q);
    if (f.genero) q.set("genre", f.genero);
    if (f.ciudad) q.set("city", f.ciudad);
    if (f.fecha) q.set("date", f.fecha);
    if (f.budget) q.set("maxPrice", String(f.budget));
    return q.toString();
}

/** URL pública de los filtros (los mismos nombres que el formulario). */
export function toUrlFilters(f: ParsedFilters): SearchFilters {
    return { q: f.q, genero: f.genero, ciudad: f.ciudad, fecha: f.fecha, presupuesto: f.budget ? String(f.budget) : undefined };
}

export function pageHref(f: ParsedFilters, page: number): string {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...toUrlFilters(f), pagina: String(page) })) if (v) q.set(k, v);
    return `${ROUTES.GROUPS.SEARCH}?${q.toString()}`;
}

/** Perfil del grupo, llevando la fecha buscada solo si es una fecha válida. */
export function profileHref(slug: string, fecha?: string): string {
    const base = ROUTES.GROUPS.PUBLIC_PROFILE(encodeURIComponent(slug));
    return isIsoDate(fecha) ? `${base}?${new URLSearchParams({ fecha })}` : base;
}
