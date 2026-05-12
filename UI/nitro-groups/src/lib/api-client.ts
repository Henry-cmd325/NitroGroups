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

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // TODO: Manejo centralizado de errores (toast, logging)
        return Promise.reject(error);
    }
);
