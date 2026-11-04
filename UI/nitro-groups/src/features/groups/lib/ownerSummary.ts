import { priceLabel } from "@/lib/format";
import type { MusicGroup } from "../types/MusicGroup";

/** Lo que le falta al perfil para verse completo ante un cliente, en el orden en que pesa. */
export function profileGaps(group: MusicGroup): string[] {
    const gaps: string[] = [];
    const photos = (group.media ?? []).filter((m) => m.type?.toLowerCase() === "photo");
    if (!group.coverImageUrl && photos.length === 0) gaps.push("una foto de portada");
    if (!group.basePrice && !group.hourlyRate) gaps.push("un precio");
    if (!group.genres || group.genres.length === 0) gaps.push("tus géneros");
    if (!group.description?.trim()) gaps.push("una descripción corta");
    if (!group.biography?.trim()) gaps.push("tu biografía");
    if (!group.locationText?.trim()) gaps.push("tu ciudad");
    return gaps;
}

/** "a", "a y b", "a, b y c". */
export function joinSpanish(items: string[]): string {
    if (items.length <= 1) return items[0] ?? "";
    return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

/** `missing`: todavía no hay dato (se muestra atenuado). */
export type OwnerFact = { label: string; value: string; missing: boolean };

/**
 * Los datos con los que un cliente decide, tal como el grupo los tiene hoy. Un dato vacío se
 * muestra como "Sin definir" para que el dueño vea el hueco, en lugar de esconderlo.
 */
export function ownerFacts(group: MusicGroup): OwnerFact[] {
    const empty = "Sin definir";
    const hasPrice = Boolean(group.basePrice || group.hourlyRate);
    const rating =
        group.totalReviews > 0 && Number.isFinite(group.averageRating)
            ? `${group.averageRating.toFixed(1)} de 5 (${group.totalReviews} ${group.totalReviews === 1 ? "reseña" : "reseñas"})`
            : "Sin reseñas aún";
    return [
        {
            label: "Precio",
            value: hasPrice
                ? priceLabel({ basePrice: group.basePrice || null, hourlyRate: group.hourlyRate || null, currency: group.currency || "MXN" })
                : empty,
            missing: !hasPrice,
        },
        { label: "Ciudad", value: group.locationText?.trim() || empty, missing: !group.locationText?.trim() },
        {
            label: "Viaja hasta",
            value: group.serviceRadiusKm > 0 ? `${group.serviceRadiusKm} km` : empty,
            missing: !(group.serviceRadiusKm > 0),
        },
        {
            label: "Integrantes",
            value: group.numMembers > 0 ? String(group.numMembers) : empty,
            missing: !(group.numMembers > 0),
        },
        {
            label: "Experiencia",
            value: group.yearsExperience > 0 ? `${group.yearsExperience} ${group.yearsExperience === 1 ? "año" : "años"}` : empty,
            missing: !(group.yearsExperience > 0),
        },
        { label: "Calificación", value: rating, missing: group.totalReviews === 0 },
    ];
}
