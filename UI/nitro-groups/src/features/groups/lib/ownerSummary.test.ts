import { describe, expect, it } from "vitest";
import { joinSpanish, ownerFacts, profileGaps } from "./ownerSummary";
import type { MusicGroup } from "../types/MusicGroup";

const base: MusicGroup = {
    id: 1, ownerUserId: 1, slug: "los-relampagos", groupName: "Los Relámpagos", description: "Cumbia en vivo",
    biography: "Desde 2010.", numMembers: 6, yearsExperience: 12, phone: "", email: "",
    locationText: "Guadalajara, Jalisco", serviceRadiusKm: 80, currency: "MXN", basePrice: 18000,
    hourlyRate: 0, minimumDurationHours: 3, setupTimeMinutes: 60, averageRating: 4.75, totalReviews: 12,
    viewCount: 0, bookingCount: 0, isVerified: false, isFeatured: false, isAcceptingBookings: true, active: true,
    coverImageUrl: "https://cdn.example/cover.jpg",
    genres: [{ id: 1, name: "Cumbia" } as NonNullable<MusicGroup["genres"]>[number]],
};

describe("profileGaps", () => {
    it("no reporta huecos en un perfil completo", () => {
        expect(profileGaps(base)).toEqual([]);
    });

    it("lista lo que falta en orden de peso", () => {
        const g = { ...base, coverImageUrl: undefined, media: [], basePrice: 0, genres: [], description: " ", biography: "", locationText: "" };
        expect(profileGaps(g)).toEqual(["una foto de portada", "un precio", "tus géneros", "una descripción corta", "tu biografía", "tu ciudad"]);
    });

    it("una foto de la galería cuenta como portada", () => {
        const media = [{ id: 1, type: "Photo", url: "x" } as NonNullable<MusicGroup["media"]>[number]];
        expect(profileGaps({ ...base, coverImageUrl: undefined, media })).toEqual([]);
    });
});

describe("joinSpanish", () => {
    it("une con comas y una y final", () => {
        expect(joinSpanish([])).toBe("");
        expect(joinSpanish(["a"])).toBe("a");
        expect(joinSpanish(["a", "b"])).toBe("a y b");
        expect(joinSpanish(["a", "b", "c"])).toBe("a, b y c");
    });
});

describe("ownerFacts", () => {
    it("muestra precio, ciudad, alcance, integrantes, experiencia y calificación", () => {
        const facts = Object.fromEntries(ownerFacts(base).map((f) => [f.label, f.value]));
        expect(facts["Precio"]).toMatch(/^Desde \$18,000$/);
        expect(facts["Ciudad"]).toBe("Guadalajara, Jalisco");
        expect(facts["Viaja hasta"]).toBe("80 km");
        expect(facts["Integrantes"]).toBe("6");
        expect(facts["Experiencia"]).toBe("12 años");
        expect(facts["Calificación"]).toBe("4.8 de 5 (12 reseñas)");
        expect(ownerFacts(base).some((f) => f.missing)).toBe(false);
    });

    it("marca como sin definir lo que está vacío", () => {
        const g = { ...base, basePrice: 0, hourlyRate: 0, locationText: "", serviceRadiusKm: 0, numMembers: 0, yearsExperience: 0, totalReviews: 0 };
        const facts = ownerFacts(g);
        expect(facts.filter((f) => f.missing).map((f) => f.label)).toEqual(["Precio", "Ciudad", "Viaja hasta", "Integrantes", "Experiencia", "Calificación"]);
        expect(facts.find((f) => f.label === "Calificación")?.value).toBe("Sin reseñas aún");
    });

    it("usa el precio por hora cuando no hay precio base", () => {
        const facts = ownerFacts({ ...base, basePrice: undefined, hourlyRate: 2500 });
        expect(facts[0].value).toBe("$2,500 por hora");
    });
});

describe("datos incompletos de la API", () => {
    it("no rompe con calificación nula ni medios sin tipo", async () => {
        const { ownerFacts, profileGaps } = await import("./ownerSummary");
        const g = { totalReviews: 3, averageRating: null, media: [{ type: undefined }] } as unknown as Parameters<typeof ownerFacts>[0];
        expect(() => ownerFacts(g)).not.toThrow();
        expect(() => profileGaps(g)).not.toThrow();
    });
});
