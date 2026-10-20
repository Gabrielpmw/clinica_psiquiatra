import api from './api';

/**
 * Serviços para Gestão do Prontuário e Anamnese (RF07, RF09)
 */

export const getAnamnese = async (pacienteId) => {
  const response = await api.get(`/prontuario/anamnese/${pacienteId}/`);
  return response.data;
};

export const atualizarAnamnese = async (pacienteId, dadosAnamnese) => {
  const response = await api.put(`/prontuario/anamnese/${pacienteId}/`, dadosAnamnese);
  return response.data;
};

export const getAnotacoes = async (pacienteId) => {
  const response = await api.get(`/prontuario/anotacoes/${pacienteId}/`);
  return response.data;
};

export const criarAnotacao = async (pacienteId, dadosAnotacao) => {
  const response = await api.post(`/prontuario/anotacoes/${pacienteId}/`, dadosAnotacao);
  return response.data;
};
