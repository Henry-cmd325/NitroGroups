import { describe, expect, it } from "vitest";
import { formatRangeLabel } from "./formatRange";

const tz = "America/Mexico_City";

describe("formatRangeLabel", () => {
    it("un bloque dentro de un día muestra el día y las horas", () => {
        expect(formatRangeLabel("2026-12-12T20:00:00-06:00", "2026-12-12T23:00:00-06:00", tz)).toBe("sábado 12 de diciembre, 20:00 a 23:00");
    });

    it("un día completo se dice como tal", () => {
        expect(formatRangeLabel("2026-12-12T00:00:00-06:00", "2026-12-13T00:00:00-06:00", tz)).toBe("sábado 12 de diciembre, todo el día");
    });

    it("un bloque que cruza la medianoche muestra ambos días", () => {
        expect(formatRangeLabel("2026-12-12T22:00:00-06:00", "2026-12-13T02:00:00-06:00", tz)).toBe("12 dic 22:00 a 13 dic 02:00");
    });

    it("devuelve el texto crudo si una fecha no es válida", () => {
        expect(formatRangeLabel("x", "y", tz)).toBe("x a y");
    });
});
