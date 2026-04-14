import axios from 'axios';

// API client — always use relative '/api' so requests go through Next.js rewrites.
// Next.js rewrites proxy these to the backend (BACKEND_API_URL in next.config.ts).
export const apiClient = axios.create({
    baseURL: '/api',
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
