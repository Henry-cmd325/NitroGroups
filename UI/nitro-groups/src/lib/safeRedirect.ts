/**
 * Destino seguro después del login: solo rutas internas ("/algo"). Rechaza URLs absolutas,
 * "//host" (protocol-relative) y "/\host", que permitirían un open redirect.
 */
export function safeReturnTo(value: string | null | undefined, fallback = "/dashboard"): string {
    if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
    try {
        const url = new URL(value, "https://nitrogroups.invalid");
        return url.origin === "https://nitrogroups.invalid" ? `${url.pathname}${url.search}${url.hash}` : fallback;
    } catch {
        return fallback;
    }
}
