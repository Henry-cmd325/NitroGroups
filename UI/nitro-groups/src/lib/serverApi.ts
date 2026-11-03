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
