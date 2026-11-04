/**
 * Reglas puras de los flujos de onboarding (músico y manager).
 * Sin React ni red: así se prueban en node y las páginas solo pintan el resultado.
 */

export const STAGE_NAME_MAX = 80;
export const SHORT_BIO_MAX = 800;
export const GROUP_NAME_MIN = 3;
export const GROUP_NAME_MAX = 80;
export const GROUP_DESCRIPTION_MAX = 500;
export const SLUG_MIN = 3;
export const YEARS_MAX = 50;

/** Error ligado a un campo concreto, para pintarlo debajo de ese campo. */
export interface FieldError<F extends string = string> {
    field: F;
    message: string;
}

/**
 * Convierte el nombre del grupo en la dirección pública (/groups/{slug}).
 * Mismas reglas que `generateSlug` del servicio de grupos, y además quita los guiones
 * de los extremos ("Los Rockers " no termina en "los-rockers-").
 */
export function toGroupSlug(name: string): string {
    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");
}

/** Texto corto que acompaña a los años de experiencia. */
export function experienceLabel(years: number): string {
    if (years <= 0) return "Recién comenzando";
    if (years <= 2) return "Principiante";
    if (years <= 5) return "Intermedio";
    if (years <= 10) return "Experimentado";
    return "Veterano";
}

// ── Músico ──

export interface MusicianStepData {
    stageName: string;
    createGroup: boolean;
    groupName: string;
}

export type MusicianField = "stageName" | "groupName";

export function validateMusicianStep(
    step: number,
    data: MusicianStepData
): FieldError<MusicianField> | null {
    if (step === 1 && !data.stageName.trim()) {
        return {
            field: "stageName",
            message: "Escribe tu nombre artístico. Es el nombre con el que te buscarán los clientes.",
        };
    }
    if (step === 3 && data.createGroup && !data.groupName.trim()) {
        return {
            field: "groupName",
            message: "Escribe el nombre de tu grupo, o elige “Hacerlo después”.",
        };
    }
    return null;
}

// ── Manager ──

export type SlugStatus = "idle" | "checking" | "available" | "taken";

export interface ManagerStepData {
    groupName: string;
    locationText: string;
    basePrice: string;
    hourlyRate: string;
}

export type ManagerField = "groupName" | "locationText" | "basePrice" | "hourlyRate";

/** Un precio opcional: vacío es válido; si se escribe, debe ser un número de 0 en adelante. */
function isValidOptionalPrice(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) return true;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && parsed >= 0;
}

export function validateManagerStep(
    step: number,
    data: ManagerStepData,
    slugStatus: SlugStatus
): FieldError<ManagerField> | null {
    if (step === 2) {
        const name = data.groupName.trim();
        if (!name) {
            return { field: "groupName", message: "Escribe el nombre del grupo. Así aparecerá en su perfil público." };
        }
        if (name.length < GROUP_NAME_MIN) {
            return {
                field: "groupName",
                message: `El nombre necesita al menos ${GROUP_NAME_MIN} caracteres. Prueba con el nombre completo del grupo.`,
            };
        }
        if (slugStatus === "taken") {
            return {
                field: "groupName",
                message: "Otro grupo ya usa esa dirección. Cambia el nombre, por ejemplo agregando tu ciudad.",
            };
        }
        if (!data.locationText.trim()) {
            return {
                field: "locationText",
                message: "Escribe la ciudad y el estado donde toca el grupo, por ejemplo Guadalajara, Jalisco.",
            };
        }
    }
    if (step === 3) {
        if (!isValidOptionalPrice(data.basePrice)) {
            return { field: "basePrice", message: "Escribe el precio solo con números, sin signos, por ejemplo 5000." };
        }
        if (!isValidOptionalPrice(data.hourlyRate)) {
            return { field: "hourlyRate", message: "Escribe la tarifa solo con números, sin signos, por ejemplo 1500." };
        }
    }
    return null;
}

/** Convierte un precio opcional del formulario al valor que espera la API. */
export function parseOptionalPrice(value: string): number | undefined {
    const trimmed = value.trim();
    return trimmed ? parseFloat(trimmed) : undefined;
}

export type InviteResult = { ok: true; email: string } | { ok: false; message: string };

/** Valida un correo antes de sumarlo a la lista de músicos por invitar. */
export function parseInviteEmail(raw: string, existing: readonly string[]): InviteResult {
    const email = raw.trim();
    if (!email) return { ok: false, message: "Escribe el correo del músico que quieres agregar." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { ok: false, message: "Ese correo está incompleto. Debe verse como ana@correo.com." };
    }
    if (existing.some((e) => e.toLowerCase() === email.toLowerCase())) {
        return { ok: false, message: "Ese correo ya está en la lista." };
    }
    return { ok: true, email };
}

// ── Datos del usuario de la sesión ──

export interface SessionName {
    name?: string;
    given_name?: string;
    family_name?: string;
    email?: string;
}

/** Nombre y apellido para la API: usa los de la sesión y, si faltan, los deriva del nombre o el correo. */
export function resolveSignupName(user: SessionName | null | undefined): { firstName: string; lastName: string } {
    const firstName = user?.given_name
        || user?.name?.split(" ")[0]
        || user?.email?.split("@")[0]
        || "Usuario";
    const lastName = user?.family_name
        || user?.name?.split(" ").slice(1).join(" ")
        || ".";
    return { firstName, lastName };
}
