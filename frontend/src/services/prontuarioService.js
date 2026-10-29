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

export const atualizarAnotacao = async (anotacaoId, dados) => {
  const response = await api.put(`/prontuario/anotacoes/detalhe/${anotacaoId}/`, dados);
  return response.data;
};

/**
 * Serviços de IA e Resumos Clínicos (Desafios 8 e 9 - RF10, RF11, RF12)
 */

export const getPromptsIa = async () => {
  const response = await api.get('/prontuario/ia/prompts/');
  return response.data;
};

export const gerarResumoIa = async (pacienteId, promptId) => {
  const response = await api.post(`/prontuario/pacientes/${pacienteId}/ia/gerar/`, {
    prompt_id: promptId
  });
  return response.data;
};

export const getResumosIa = async (pacienteId) => {
  const response = await api.get(`/prontuario/pacientes/${pacienteId}/ia/resumos/`);
  return response.data;
};

export const salvarResumoIa = async (pacienteId, dadosResumo) => {
  const response = await api.post(`/prontuario/pacientes/${pacienteId}/ia/resumos/`, dadosResumo);
  return response.data;
};

export const excluirResumoIa = async (resumoId) => {
  const response = await api.delete(`/prontuario/ia/resumos/${resumoId}/`);
  return response.data;
};

/**
 * Serviços de Parecer Conclusivo, PDF e E-mail (RF13, RF14)
 */

export const getPareceres = async (pacienteId) => {
  const response = await api.get(`/prontuario/pacientes/${pacienteId}/pareceres/`);
  return response.data;
};

export const criarParecer = async (pacienteId, dados) => {
  const response = await api.post(`/prontuario/pacientes/${pacienteId}/pareceres/`, dados);
  return response.data;
};

export const atualizarParecer = async (parecerId, dados) => {
  const response = await api.put(`/prontuario/pareceres/${parecerId}/`, dados);
  return response.data;
};

export const excluirParecer = async (parecerId) => {
  const response = await api.delete(`/prontuario/pareceres/${parecerId}/`);
  return response.data;
};

export const downloadParecerPdf = async (parecerId) => {
  const response = await api.get(`/prontuario/pareceres/${parecerId}/pdf/`, {
    responseType: 'blob'
  });
  return response.data;
};

export const enviarParecerEmail = async (parecerId, payload) => {
  const response = await api.post(`/prontuario/pareceres/${parecerId}/email/`, payload);
  return response.data;
};
