import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptador de Requisição para injetar o Token JWT Bearer
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptador de Resposta para renovação de token e tratamento de 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Se receber 401 e não for rota de login nem tentativa repetida
    if (
      error.response &&
      error.response.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/token')
    ) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
            refresh: refreshToken,
          });
          const newAccessToken = res.data.access;
          localStorage.setItem('access_token', newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (refreshErr) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(refreshErr);
        }
      } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// --- Serviços de Saúde da API ---
export const checkHealth = async () => {
  const response = await api.get('/health/');
  return response.data;
};

// --- Serviços de Autenticação ---
export const loginApi = async (email, password) => {
  const response = await api.post('/auth/login/', { email, password });
  return response.data;
};

export const getMeApi = async () => {
  const response = await api.get('/auth/me/');
  return response.data;
};

// --- Serviços de Usuários / Gestão de Contas (Restrito à Administração) ---
export const getUsuariosApi = async () => {
  const response = await api.get('/usuarios/');
  return response.data;
};

export const createUsuarioApi = async (userData) => {
  const response = await api.post('/usuarios/', userData);
  return response.data;
};

export const toggleUsuarioStatusApi = async (id) => {
  const response = await api.patch(`/usuarios/${id}/toggle-status/`);
  return response.data;
};

export const resetUsuarioPasswordApi = async (id, password) => {
  const response = await api.post(`/usuarios/${id}/reset-password/`, { password });
  return response.data;
};

// --- Serviços de Gestão de Pacientes ---
export const getPacientesApi = async (params = {}) => {
  const response = await api.get('/pacientes/', { params });
  return response.data;
};

export const getPacienteByIdApi = async (id) => {
  const response = await api.get(`/pacientes/${id}/`);
  return response.data;
};

export const createPacienteApi = async (pacienteData) => {
  const response = await api.post('/pacientes/', pacienteData);
  return response.data;
};

export const updatePacienteApi = async (id, pacienteData) => {
  const response = await api.put(`/pacientes/${id}/`, pacienteData);
  return response.data;
};

export const togglePacienteStatusApi = async (id) => {
  const response = await api.patch(`/pacientes/${id}/toggle-status/`);
  return response.data;
};

export default api;
