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
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getBrowserAccessToken(): Promise<string | null> {
    if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
    try {
        const response = await fetch('/api/auth/token');
        if (!response.ok) return null;
        const data = (await response.json()) as { accessToken?: string };
        if (!data.accessToken) return null;
        cachedToken = { value: data.accessToken, expiresAt: Date.now() + 60_000 };
        return data.accessToken;
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
        // TODO: Manejo centralizado de errores (toast, logging)
        return Promise.reject(error);
    }
);
