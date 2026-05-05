/** Valor por defecto alineado con `next.config` y perfil `http` de launchSettings. */
const DEFAULT_BACKEND = "http://localhost:5144/api";

/**
 * Base de la API .NET incluyendo el segmento `/api` (rutas `MapGet("api/...")`).
 * Evita destinos `https://host:port/users/...` cuando falta `/api` (→ 404) o
 * mezclar rewrites hacia un puerto y el navegador hacia otro.
 */
export function normalizeBackendApiBaseUrl(
  value: string | undefined,
  defaultBase: string = DEFAULT_BACKEND
): string {
  const raw = (value?.trim() || defaultBase).replace(/\/+$/, "");
  if (raw.toLowerCase().endsWith("/api")) {
    return raw;
  }
  return `${raw}/api`;
}

/**
 * Route Handlers y `next.config` deben apuntar al mismo host/puerto que el navegador hacia .NET.
 * Aspire inyecta `NEXT_PUBLIC_API_BASE_URL` para el front; en servidor a veces solo existe eso
 * (no `BACKEND_API_URL`) → se caía a localhost:5144 y el BFF hacía `fetch` a un API inexistente (500).
 */
export function resolveBackendApiBaseUrl(): string {
  return normalizeBackendApiBaseUrl(
    process.env.BACKEND_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL
  );
}

/**
 * Base de la API en el navegador: `/api` o `NEXT_PUBLIC_API_BASE_URL` normalizado.
 * Alineado con `apiClient` (mismo origen que el rewrite de Next).
 */
export function getBrowserApiBase(): string {
  if (typeof window === "undefined") {
    return "/api";
  }
  const env = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  return env ? normalizeBackendApiBaseUrl(env) : "/api";
}
