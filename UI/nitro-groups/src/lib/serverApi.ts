import { resolveBackendApiBaseUrl } from "./backendBaseUrl";

// Solo para Server Components: usa la URL interna del backend.

/**
 * GET a la API desde un Server Component. Devuelve null si la API no responde o
 * responde con error: las páginas públicas degradan con gracia en lugar de romperse.
 */
export async function serverGet<T>(path: string, revalidateSeconds = 60): Promise<T | null> {
    try {
        const response = await fetch(`${resolveBackendApiBaseUrl()}${path}`, {
            next: { revalidate: revalidateSeconds },
        });
        if (!response.ok) return null;
        return (await response.json()) as T;
    } catch {
        return null;
    }
}

export type ServerResult<T> = { ok: true; data: T } | { ok: false; status: number };

/** Como serverGet, pero conserva el estado: 404 no es lo mismo que una API caída (status 0). */
export async function serverGetResult<T>(path: string, revalidateSeconds = 60): Promise<ServerResult<T>> {
    try {
        const response = await fetch(`${resolveBackendApiBaseUrl()}${path}`, { next: { revalidate: revalidateSeconds } });
        if (!response.ok) return { ok: false, status: response.status };
        return { ok: true, data: (await response.json()) as T };
    } catch {
        return { ok: false, status: 0 };
    }
}
