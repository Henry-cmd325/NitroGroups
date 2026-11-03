import { describe, expect, it } from "vitest";
import { formatEventDate, formatPrice, priceLabel, todayInMexico } from "./format";

describe("formatPrice", () => {
    it("formatea pesos sin centavos", () => {
        expect(formatPrice(18000)).toBe("$18,000");
    });
    it("devuelve null sin precio", () => {
        expect(formatPrice(null)).toBeNull();
    });
});

describe("priceLabel (misma regla en portada y búsqueda)", () => {
    it("prefiere el precio base", () => {
        expect(priceLabel({ basePrice: 18000, hourlyRate: 3000, currency: "MXN" })).toBe("Desde $18,000");
    });
    it("usa la tarifa por hora si no hay precio base", () => {
        expect(priceLabel({ basePrice: null, hourlyRate: 3000, currency: "MXN" })).toBe("$3,000 por hora");
    });
    it("sin precios, se cotiza", () => {
        expect(priceLabel({ basePrice: null, hourlyRate: null, currency: "MXN" })).toBe("Precio a cotizar");
    });
});

describe("formatEventDate", () => {
    it("escribe la fecha en español", () => {
        expect(formatEventDate("2026-12-12")).toBe("sábado, 12 de diciembre");
    });
    it("no rompe con una fecha inválida", () => {
        expect(formatEventDate("abc")).toBeNull();
    });
});

describe("todayInMexico", () => {
    it("a las 20:00 en México sigue siendo el mismo día (no el de UTC)", () => {
        // 2026-12-12 20:00 en CDMX = 2026-12-13 02:00 UTC
        expect(todayInMexico(new Date("2026-12-13T02:00:00Z"))).toBe("2026-12-12");
    });
});
