import axios from 'axios';
import { normalizeBackendApiBaseUrl } from './backendBaseUrl';

// Cliente: por defecto `/api` (mismo origen que Next) → rewrites a BACKEND_API_URL.
// Si defines NEXT_PUBLIC_API_BASE_URL (p. ej. Aspire), el browser llama al API en ese
// origen: debe ser el mismo servicio (mismos Auth0) y terminar lógicamente en `/api`.
const envBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
const baseURL =
    typeof window !== 'undefined' && envBase
        ? normalizeBackendApiBaseUrl(envBase)
        : '/api';

export const apiClient = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// La API es deny-by-default: en el navegador adjuntamos siempre el access token de la
// sesión, salvo que la llamada ya traiga su propio Authorization. Sin sesión, la petición
// sale anónima (sirve para los endpoints públicos: búsqueda, perfil de grupo, géneros).
type CachedToken = { value: string | null; expiresAt: number };
let cachedToken: CachedToken | null = null;

/** Lee el `exp` del JWT (sin validar: eso lo hace la API) para no cachear un token vencido. */
function tokenExpiry(token: string): number {
    try {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number };
        if (payload.exp) return payload.exp * 1000 - 30_000; // margen de 30 s
    } catch {
        // token opaco: usamos un TTL corto
    }
    return Date.now() + 60_000;
}

/** Olvida el token cacheado (logout o 401). */
export function clearCachedAccessToken() {
    cachedToken = null;
}

async function getBrowserAccessToken(): Promise<string | null> {
    if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
    try {
        const response = await fetch('/api/auth/token');
        const data = response.ok ? ((await response.json()) as { accessToken?: string }) : {};
        const token = data.accessToken ?? null;
        // Sin sesión cacheamos el "anónimo" 5 s para no consultar el token en cada llamada pública.
        cachedToken = { value: token, expiresAt: token ? tokenExpiry(token) : Date.now() + 5_000 };
        return token;
    } catch {
        return null;
    }
}

apiClient.interceptors.request.use(async (config) => {
    if (typeof window !== 'undefined' && !config.headers.Authorization) {
        const token = await getBrowserAccessToken();
        if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // Token vencido o revocado: lo olvidamos para que la próxima llamada pida uno nuevo.
        if (error?.response?.status === 401) clearCachedAccessToken();
        return Promise.reject(error);
    }
);
