import api from './api';

/**
 * Serviços para Gestão da Agenda (RF03, RF04, RF05, RF06)
 */

export const getSessoesDia = async (data) => {
  // data no formato YYYY-MM-DD
  const response = await api.get('/agenda/sessoes/', {
    params: { data },
  });
  return response.data;
};

export const getSessoesSemanais = async (dataInicio, dataFim) => {
  const params = {};
  if (dataInicio) params.data_inicio = dataInicio;
  if (dataFim) params.data_fim = dataFim;

  const response = await api.get('/agenda/sessoes/', { params });
  return response.data;
};

export const getSessoes = async (params = {}) => {
  const response = await api.get('/agenda/sessoes/', { params });
  return response.data;
};

export const criarSessao = async (dadosSessao) => {
  const response = await api.post('/agenda/sessoes/', dadosSessao);
  return response.data;
};

export const atualizarStatusSessao = async (sessaoId, status) => {
  const response = await api.patch(`/agenda/sessoes/${sessaoId}/atualizar_status/`, {
    status,
  });
  return response.data;
};

export const cancelarSessao = async (sessaoId) => {
  return atualizarStatusSessao(sessaoId, 'CANCELADA');
};

export const getDisponibilidades = async (usuarioId) => {
  const params = usuarioId ? { usuario: usuarioId } : {};
  const response = await api.get('/agenda/disponibilidade/', { params });
  return response.data;
};

export const criarDisponibilidade = async (dadosDisponibilidade) => {
  const response = await api.post('/agenda/disponibilidade/', dadosDisponibilidade);
  return response.data;
};

export const getBloqueios = async (params = {}) => {
  const response = await api.get('/agenda/bloqueios/', { params });
  return response.data;
};

export const criarBloqueio = async (dadosBloqueio) => {
  const response = await api.post('/agenda/bloqueios/', dadosBloqueio);
  return response.data;
};

export const deletarBloqueio = async (bloqueioId) => {
  const response = await api.delete(`/agenda/bloqueios/${bloqueioId}/`);
  return response.data;
};
