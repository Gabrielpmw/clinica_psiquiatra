import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Identificador em memória da sessão de autenticação ativa na aba
let currentSessionId = null;

export const setApiSessionId = (sessionId) => {
  currentSessionId = sessionId;
};

export const getApiSessionId = () => currentSessionId;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptador de Requisição para injetar o Token JWT Bearer e vincular a sessão de origem
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Vincula a requisição à sessão em memória vigente no momento do disparo
    if (currentSessionId && config._sessionId === undefined) {
      config._sessionId = currentSessionId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptador de Resposta para renovação de token, verificação de sessão e tratamento de 401
api.interceptors.response.use(
  (response) => {
    // Se a requisição foi feita em uma sessão que já foi substituída ou encerrada, descarta a resposta
    if (response.config._sessionId && response.config._sessionId !== currentSessionId) {
      const staleError = new Error('Resposta descartada: a sessão autenticada de origem foi alterada.');
      staleError.isSessionStale = true;
      return Promise.reject(staleError);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Se a sessão expirou ou mudou, rejeita imediatamente sem tentar renovação
    if (originalRequest?._sessionId && originalRequest._sessionId !== currentSessionId) {
      const staleError = new Error('Operação cancelada: a sessão autenticada de origem foi alterada.');
      staleError.isSessionStale = true;
      return Promise.reject(staleError);
    }

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

          // Confere se a sessão ainda é a mesma antes de reenviar
          if (originalRequest._sessionId && originalRequest._sessionId !== currentSessionId) {
            const staleError = new Error('Operação descartada: a sessão autenticada de origem expirou antes do reenvio.');
            staleError.isSessionStale = true;
            return Promise.reject(staleError);
          }

          return api(originalRequest);
        } catch (refreshErr) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          currentSessionId = null;
          window.location.href = '/login';
          return Promise.reject(refreshErr);
        }
      } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        currentSessionId = null;
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

export const updateProfileApi = async (profileData) => {
  const response = await api.patch('/auth/me/', profileData);
  return response.data;
};

export const changePasswordApi = async (passwordData) => {
  const response = await api.post('/auth/change-password/', passwordData);
  return response.data;
};

export const forgotPasswordApi = async (email) => {
  const response = await api.post('/auth/forgot-password/', { email });
  return response.data;
};

export const getSolicitacoesResetApi = async (params = {}) => {
  const response = await api.get('/solicitacoes-reset/', { params });
  return response.data;
};

export const resolverSolicitacaoResetApi = async (id, newPassword) => {
  const response = await api.post(`/solicitacoes-reset/${id}/resolver/`, { new_password: newPassword });
  return response.data;
};

export const cancelarSolicitacaoResetApi = async (id) => {
  const response = await api.post(`/solicitacoes-reset/${id}/cancelar/`);
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
