const BASE = "https://nitrogroups.invalid";

/** Una ruta interna empieza con una sola "/" (ni "//host" ni "/\host"). */
function isInternalPath(path: string): boolean {
    return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\");
}

/**
 * Destino seguro después del login: solo rutas internas. Se valida la entrada y también
 * el resultado ya normalizado, porque la normalización de URL puede convertir "/.//host"
 * o "/x/..//host" en "//host", que el navegador trata como otro sitio (open redirect).
 */
export function safeReturnTo(value: string | null | undefined, fallback = "/dashboard"): string {
    if (!value || !isInternalPath(value)) return fallback;
    try {
        const url = new URL(value, BASE);
        if (url.origin !== BASE) return fallback;
        const normalized = `${url.pathname}${url.search}${url.hash}`;
        return isInternalPath(normalized) ? normalized : fallback;
    } catch {
        return fallback;
    }
}
