export function compararContextoRevisado(revisaoAprovada, dadosContexto, { pacienteId, sessionId, promptId }) {
  if (!revisaoAprovada || !dadosContexto) return false;
  if (revisaoAprovada.pacienteId !== pacienteId) return false;
  if (revisaoAprovada.sessionId !== sessionId) return false;
  if (Number(revisaoAprovada.promptId) !== Number(promptId)) return false;
  if (Number(dadosContexto.prompt_id) !== Number(promptId)) return false;
  if (revisaoAprovada.bloqueado || dadosContexto.bloqueado || dadosContexto.avisos?.bloqueado) {
    return false;
  }
  if (revisaoAprovada.instrucao !== dadosContexto.instrucao) return false;
  if (revisaoAprovada.contexto !== dadosContexto.contexto) return false;
  if (
    JSON.stringify(revisaoAprovada.referenciasSessao || []) !==
    JSON.stringify(dadosContexto.referencias_sessao || [])
  ) {
    return false;
  }
  if (
    JSON.stringify(revisaoAprovada.avisos || null) !==
    JSON.stringify(dadosContexto.avisos || null)
  ) {
    return false;
  }
  return true;
}

export function montarPayloadContexto({ promptId, sessaoIds = [] }) {
  return {
    promptId: Number(promptId),
    sessaoIds: Array.isArray(sessaoIds) ? sessaoIds : [],
    incluirAnamnese: false,
  };
}

export function podeConfirmarEnvioExterno({
  revisao,
  confirmacaoPrivacidade,
  activeGeneration,
  pacienteId,
  sessionId,
}) {
  if (!revisao || confirmacaoPrivacidade !== true) return false;
  if (activeGeneration) return false;
  if (revisao.bloqueado || revisao.avisos?.bloqueado) return false;
  if (revisao.pacienteId !== pacienteId || revisao.sessionId !== sessionId) return false;
  if (!Array.isArray(revisao.sessaoIds) || revisao.sessaoIds.length === 0) return false;
  return true;
}
