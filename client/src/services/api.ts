import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    const isLoginRequest = error.config?.url?.includes('/login');
    const isOnPublicPage = window.location.pathname === '/auth' || window.location.pathname === '/';
    if (error.response?.status === 401 && !isLoginRequest && !isOnPublicPage) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      toast.error('Сессия истекла или требуется авторизация');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

export default api;
