import { describe, expect, it } from "vitest";
import {
    experienceLabel,
    parseInviteEmail,
    parseOptionalPrice,
    resolveSignupName,
    toGroupSlug,
    validateManagerStep,
    validateMusicianStep,
} from "./rules";

describe("toGroupSlug", () => {
    it("quita acentos, signos y espacios", () => {
        expect(toGroupSlug("Los Mariachis del Valle")).toBe("los-mariachis-del-valle");
        expect(toGroupSlug("Banda Peñón ¡Ya!")).toBe("banda-penon-ya");
    });
    it("no deja guiones en los extremos ni repetidos", () => {
        expect(toGroupSlug("  Los Rockers  ")).toBe("los-rockers");
        expect(toGroupSlug("-Grupo -- Norte-")).toBe("grupo-norte");
    });
    it("devuelve vacío si no queda nada", () => {
        expect(toGroupSlug("¡¡!!")).toBe("");
    });
});

describe("experienceLabel", () => {
    it("nombra cada tramo", () => {
        expect(experienceLabel(0)).toBe("Recién comenzando");
        expect(experienceLabel(2)).toBe("Principiante");
        expect(experienceLabel(5)).toBe("Intermedio");
        expect(experienceLabel(10)).toBe("Experimentado");
        expect(experienceLabel(11)).toBe("Veterano");
    });
});

describe("validateMusicianStep", () => {
    const base = { stageName: "DJ Trueno", createGroup: true, groupName: "Trueno" };

    it("pide el nombre artístico en el paso 1", () => {
        expect(validateMusicianStep(1, { ...base, stageName: "  " })?.field).toBe("stageName");
        expect(validateMusicianStep(1, base)).toBeNull();
    });
    it("pide el nombre del grupo solo si va a crearlo", () => {
        expect(validateMusicianStep(3, { ...base, groupName: "" })?.field).toBe("groupName");
        expect(validateMusicianStep(3, { ...base, createGroup: false, groupName: "" })).toBeNull();
    });
    it("el paso 2 no tiene campos obligatorios", () => {
        expect(validateMusicianStep(2, { ...base, stageName: "" })).toBeNull();
    });
});

describe("validateManagerStep", () => {
    const base = { groupName: "Los del Valle", locationText: "Guadalajara, Jalisco", basePrice: "", hourlyRate: "" };

    it("pide nombre de al menos 3 caracteres", () => {
        expect(validateManagerStep(2, { ...base, groupName: "" }, "idle")?.field).toBe("groupName");
        expect(validateManagerStep(2, { ...base, groupName: "Lo" }, "idle")?.message).toMatch(/al menos 3/);
    });
    it("rechaza una dirección ocupada", () => {
        expect(validateManagerStep(2, base, "taken")?.message).toMatch(/ya usa esa dirección/);
    });
    it("pide la ubicación", () => {
        expect(validateManagerStep(2, { ...base, locationText: " " }, "available")?.field).toBe("locationText");
        expect(validateManagerStep(2, base, "available")).toBeNull();
    });
    it("acepta precios vacíos y rechaza los que no son números", () => {
        expect(validateManagerStep(3, base, "idle")).toBeNull();
        expect(validateManagerStep(3, { ...base, basePrice: "-5" }, "idle")?.field).toBe("basePrice");
        expect(validateManagerStep(3, { ...base, hourlyRate: "abc" }, "idle")?.field).toBe("hourlyRate");
        expect(validateManagerStep(3, { ...base, basePrice: "5000", hourlyRate: "1500.5" }, "idle")).toBeNull();
    });
});

describe("parseOptionalPrice", () => {
    it("convierte o deja indefinido", () => {
        expect(parseOptionalPrice("")).toBeUndefined();
        expect(parseOptionalPrice(" 5000 ")).toBe(5000);
    });
});

describe("parseInviteEmail", () => {
    it("acepta un correo completo", () => {
        expect(parseInviteEmail(" ana@correo.com ", [])).toEqual({ ok: true, email: "ana@correo.com" });
    });
    it("explica por qué rechaza", () => {
        expect(parseInviteEmail("", [])).toMatchObject({ ok: false });
        expect(parseInviteEmail("ana@", [])).toMatchObject({ ok: false, message: expect.stringMatching(/incompleto/) });
        expect(parseInviteEmail("Ana@Correo.com", ["ana@correo.com"])).toMatchObject({
            ok: false,
            message: "Ese correo ya está en la lista.",
        });
    });
});

describe("resolveSignupName", () => {
    it("usa nombre y apellido de la sesión", () => {
        expect(resolveSignupName({ given_name: "Ana", family_name: "Ruiz", name: "X Y" })).toEqual({ firstName: "Ana", lastName: "Ruiz" });
    });
    it("deriva del nombre completo o del correo", () => {
        expect(resolveSignupName({ name: "Ana María Ruiz" })).toEqual({ firstName: "Ana", lastName: "María Ruiz" });
        expect(resolveSignupName({ email: "ana@correo.com" })).toEqual({ firstName: "ana", lastName: "." });
        expect(resolveSignupName(null)).toEqual({ firstName: "Usuario", lastName: "." });
    });
});
