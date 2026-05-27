import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Adjuntar token a cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('civele_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirigir al login si el token expira
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('civele_token');
      localStorage.removeItem('civele_user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;
