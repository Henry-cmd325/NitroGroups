import { describe, expect, it } from "vitest";
import { splitName } from "./Monument";

describe("splitName", () => {
    it("deja en una línea los nombres cortos", () => {
        expect(splitName("Trío Sierra")).toEqual(["Trío Sierra"]);
    });

    it("parte los nombres largos entre palabras en dos líneas parecidas", () => {
        expect(splitName("Mariachi Vargas de Tlaquepaque")).toEqual(["Mariachi Vargas", "de Tlaquepaque"]);
        expect(splitName("Banda El Recodito")).toEqual(["Banda El", "Recodito"]);
    });

    it("no parte una sola palabra aunque sea larga", () => {
        expect(splitName("Supercalifragilístico")).toEqual(["Supercalifragilístico"]);
    });
});
