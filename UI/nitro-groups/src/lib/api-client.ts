import axios from 'axios';

// El navegador siempre pasa por Next para que el proxy adjunte el token desde la cookie httpOnly.
const baseURL = '/api';

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
