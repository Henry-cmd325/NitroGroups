import { describe, expect, it } from "vitest";
import { buildApiQuery, parseFilters, pageHref, profileHref } from "./searchParams";

describe("parseFilters", () => {
    it("descarta una fecha que no es YYYY-MM-DD", () => {
        expect(parseFilters({ fecha: "abc" }).fecha).toBeUndefined();
        expect(parseFilters({ fecha: "2026-02-30" }).fecha).toBeUndefined();
        expect(parseFilters({ fecha: "2026-12-12" }).fecha).toBe("2026-12-12");
    });
    it("acota la página y el presupuesto", () => {
        const f = parseFilters({ pagina: "-3", presupuesto: "-100" });
        expect(f.page).toBe(1);
        expect(f.budget).toBeUndefined();
        expect(parseFilters({ pagina: "abc" }).page).toBe(1);
        expect(parseFilters({ presupuesto: "15000" }).budget).toBe(15000);
    });
    it("recorta espacios y quita valores vacíos", () => {
        const f = parseFilters({ ciudad: "  Guadalajara ", genero: "" });
        expect(f.ciudad).toBe("Guadalajara");
        expect(f.genero).toBeUndefined();
    });
});

describe("buildApiQuery", () => {
    it("traduce los filtros de la URL a los de la API", () => {
        const q = buildApiQuery(parseFilters({ genero: "mariachi", ciudad: "Guadalajara", fecha: "2026-12-12", presupuesto: "15000", pagina: "2" }), 12);
        expect(Object.fromEntries(new URLSearchParams(q))).toEqual({
            page: "2", size: "12", genre: "mariachi", city: "Guadalajara", date: "2026-12-12", maxPrice: "15000",
        });
    });
});

describe("pageHref", () => {
    it("conserva los filtros y cambia solo la página", () => {
        const href = pageHref(parseFilters({ genero: "mariachi", ciudad: "León" }), 3);
        expect(href).toBe("/groups?genero=mariachi&ciudad=Le%C3%B3n&pagina=3");
    });
});

describe("profileHref", () => {
    it("codifica la fecha y no deja inyectar parámetros", () => {
        expect(profileHref("vargas", "2026-12-12")).toBe("/groups/vargas?fecha=2026-12-12");
        expect(profileHref("vargas", "x&admin=1")).toBe("/groups/vargas");
    });
});
