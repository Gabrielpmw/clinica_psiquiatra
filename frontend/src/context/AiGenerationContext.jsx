import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';
import { gerarResumoIa } from '../services/prontuarioService';
import { getApiSessionId } from '../services/api';

const AiGenerationContext = createContext(null);
const INACTIVITY_LIMIT_MS = 120_000;
const INACTIVITY_MESSAGE = 'A resposta do serviço de IA demorou mais de 2 minutos e foi interrompida. Você pode tentar novamente.';

function playCompletionSound(audio) {
  if (audio?.state !== 'running') return;

  const gain = audio.createGain();
  const start = audio.currentTime;
  gain.connect(audio.destination);
  [660, 880].forEach((frequency, index) => {
    const note = audio.createOscillator();
    const time = start + index * 0.15;
    note.frequency.value = frequency;
    note.connect(gain);
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(0.12, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);
    note.start(time);
    note.stop(time + 0.15);
    note.onended = () => {
      note.disconnect();
      if (index === 1) gain.disconnect();
    };
  });
}

export function AiGenerationProvider({ children }) {
  const { sessionId, isDoutora } = useAuth();
  const { notifySuccess, notifyError } = useNotification();
  const prevSessionIdRef = useRef(sessionId);
  const activeGenRef = useRef(null);
  const audioRef = useRef(null);
  const originalTitle = useRef(document.title);

  const [activeGeneration, setActiveGeneration] = useState(null);
  const [generationError, setGenerationError] = useState(null);
  const [pendingDrafts, setPendingDrafts] = useState([]);
  const [isDraftsModalOpen, setIsDraftsModalOpen] = useState(false);

  const openDraftsModal = useCallback(() => setIsDraftsModalOpen(true), []);
  const closeDraftsModal = useCallback(() => setIsDraftsModalOpen(false), []);

  const isCurrentSession = !!sessionId && isDoutora && prevSessionIdRef.current === sessionId;
  const hasUnreadDraft = isCurrentSession && pendingDrafts.some((draft) => !draft.visto);
  useEffect(() => {
    const title = originalTitle.current;
    document.title = hasUnreadDraft ? `Rascunho IA pronto · ${title}` : title;
    return () => { document.title = title; };
  }, [hasUnreadDraft]);

  useEffect(() => () => {
    activeGenRef.current?.stop();
    audioRef.current?.close().catch(() => {});
    audioRef.current = null;
  }, []);

  useEffect(() => {
    const sessionChanged = prevSessionIdRef.current && prevSessionIdRef.current !== sessionId;
    if (!sessionId || !isDoutora || sessionChanged) {
      activeGenRef.current?.stop();
      audioRef.current?.close().catch(() => {});
      audioRef.current = null;
      setGenerationError(null);
      setPendingDrafts([]);
      setIsDraftsModalOpen(false);
    }
    prevSessionIdRef.current = sessionId;
  }, [sessionId, isDoutora]);

  const limparPendenciasPaciente = useCallback((pacienteId) => {
    if (activeGenRef.current?.pacienteId === pacienteId) activeGenRef.current.stop();
    setPendingDrafts((prev) => prev.filter((d) => d.pacienteId !== pacienteId));
    setGenerationError((prev) => prev?.pacienteId === pacienteId ? null : prev);
  }, []);

  const limparErroGeracao = useCallback((pacienteId) => {
    setGenerationError((prev) => {
      if (!prev) return null;
      if (!pacienteId || prev.pacienteId === pacienteId) return null;
      return prev;
    });
  }, []);

  const iniciarGeracao = useCallback(async ({
    pacienteId,
    promptId,
    promptTitulo,
    selecao,
    revisaoAprovada,
    confirmacaoPrivacidade = false,
  }) => {
    if (!sessionId || !isDoutora || getApiSessionId() !== sessionId) return false;
    if (confirmacaoPrivacidade !== true) {
      notifyError('Confirme a orientação de privacidade antes de iniciar a geração.');
      return false;
    }
    if (
      !revisaoAprovada ||
      revisaoAprovada.bloqueado ||
      revisaoAprovada.pacienteId !== pacienteId ||
      revisaoAprovada.sessionId !== sessionId ||
      Number(revisaoAprovada.promptId) !== Number(promptId)
    ) {
      notifyError('Revise e aprove o contexto tratado antes de iniciar a geração.');
      return false;
    }
    if (activeGenRef.current) {
      notifyError('Já existe uma geração em andamento na aba. Aguarde ou cancele a atual.');
      return false;
    }

    const id = crypto.randomUUID();
    const abortController = new AbortController();
    const { signal } = abortController;
    const roteiro = promptTitulo || `Prompt #${promptId}`;
    const sessaoIds = Array.isArray(selecao?.sessaoIds) ? selecao.sessaoIds : [];
    const contextoHash = revisaoAprovada.contextoHash || null;
    const origem = { id, pacienteId, promptId, promptTitulo: roteiro };
    const iniciadoEm = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const deadline = Date.now() + INACTIVITY_LIMIT_MS;
    let watchdog;

    const task = {
      pacienteId,
      stop() {
        abortController.abort();
        finish();
      },
    };
    const isCurrent = () =>
      activeGenRef.current === task && !signal.aborted && getApiSessionId() === sessionId;

    function finish() {
      clearTimeout(watchdog);
      document.removeEventListener('visibilitychange', checkOnReturn);
      if (activeGenRef.current === task) {
        activeGenRef.current = null;
        setActiveGeneration(null);
      }
    }

    function reportError(
      message,
      { porInatividade = false, mensagemGlobal = message, codigo = 'ERRO_GERACAO' } = {}
    ) {
      setGenerationError({ ...origem, fase: 'gerando', codigo, message, mensagemGlobal, porInatividade });
      notifyError(mensagemGlobal);
    }

    function checkInactivity() {
      clearTimeout(watchdog);
      if (!isCurrent()) return;

      const remaining = deadline - Date.now();
      if (remaining > 0) {
        watchdog = setTimeout(checkInactivity, remaining);
        return;
      }
      task.stop();
      reportError(INACTIVITY_MESSAGE, { porInatividade: true, codigo: 'INATIVIDADE' });
    }

    function checkOnReturn() {
      if (document.visibilityState === 'visible') checkInactivity();
    }

    activeGenRef.current = task;
    setGenerationError(null);
    setActiveGeneration({
      ...origem,
      fase: 'gerando',
      progresso: { text: 'Validando seleção e gerando rascunho com Gemini...', percent: 35 },
      iniciadoEm,
    });

    // Desbloqueia o áudio no gesto que inicia a geração.
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (Audio) {
        audioRef.current ??= new Audio();
        audioRef.current.resume().catch(() => {});
      }
    } catch (_) {}

    checkInactivity();
    document.addEventListener('visibilitychange', checkOnReturn);

    try {
      const resultado = await gerarResumoIa(
        pacienteId,
        {
          promptId,
          sessaoIds,
          confirmacaoPrivacidade: true,
          contextoHash,
        },
        { signal, _sessionId: sessionId }
      );
      if (!isCurrent()) return false;

      if (!resultado?.conteudo?.trim()) {
        reportError('O serviço de IA não retornou conteúdo para o rascunho. Tente novamente.');
        return false;
      }

      const draft = {
        id: crypto.randomUUID(),
        generationId: id,
        pacienteId,
        promptId,
        promptTitulo: roteiro,
        titulo: `Rascunho de Resumo - ${roteiro}`,
        conteudo: resultado.conteudo,
        geradoEm: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        avisoTokens: false,
      };
      setPendingDrafts((prev) => [draft, ...prev]);
      notifySuccess('Rascunho da IA pronto para revisão.');
      try {
        playCompletionSound(audioRef.current);
      } catch (_) {}
      return draft;
    } catch (err) {
      if (isCurrent()) {
        const httpStatus = err?.response?.status;
        const backendData = err?.response?.data;
        const backendMsg = backendData?.error;

        if (httpStatus === 403) {
          limparPendenciasPaciente(pacienteId);
          reportError('Acesso a este prontuário revogado ou não autorizado.', {
            codigo: 'SEM_AUTORIZACAO',
            mensagemGlobal: 'Acesso ao prontuário não autorizado.',
          });
        } else if (httpStatus === 409 || backendData?.revisao_desatualizada || backendData?.bloqueado) {
          reportError(
            backendMsg || 'Os dados ou o contexto mudaram desde a revisão aprovada. Faça uma nova revisão antes de gerar.',
            {
              codigo: 'REVISAO_DESATUALIZADA',
              mensagemGlobal: 'É necessária nova revisão dos dados antes de iniciar a geração.',
            }
          );
        } else if (httpStatus === 404) {
          reportError(
            backendMsg || 'Uma ou mais fontes selecionadas não estão mais disponíveis ou o acesso foi revogado.',
            {
              codigo: 'SELECAO_OU_ACESSO_INVALIDO',
              mensagemGlobal: 'Seleção indisponível ou acesso revogado.',
            }
          );
        } else if (httpStatus === 400) {
          reportError(
            backendMsg || 'A seleção de fontes não é mais válida. Volte às fontes e revise novamente.',
            {
              codigo: 'SELECAO_INVALIDA',
              mensagemGlobal: 'Seleção de fontes inválida. Ajuste e revise novamente.',
            }
          );
        } else if (httpStatus === 503) {
          reportError(
            backendMsg || 'A API do Gemini não está configurada ou está temporariamente indisponível.',
            { codigo: 'SERVICO_INDISPONIVEL' }
          );
        } else {
          reportError(
            backendMsg || 'Não foi possível gerar o resumo com o Gemini. Verifique a conexão e tente novamente.',
            { codigo: 'ERRO_GERACAO' }
          );
        }
      }
      return false;
    } finally {
      finish();
    }
  }, [sessionId, isDoutora, notifySuccess, notifyError, limparPendenciasPaciente]);

  const cancelarGeracao = useCallback(() => {
    if (!activeGenRef.current) return;
    activeGenRef.current.stop();
    notifySuccess('Geração de rascunho cancelada com sucesso.');
  }, [notifySuccess]);

  const marcarRascunhoComoVisto = useCallback((draftId) => {
    setPendingDrafts((prev) => {
      if (!prev.some((draft) => draft.id === draftId && !draft.visto)) return prev;
      return prev.map((draft) => draft.id === draftId ? { ...draft, visto: true } : draft);
    });
  }, []);

  /**
   * Atualiza rascunho pendente na memória da aba.
   */
  const atualizarRascunho = useCallback((draftId, { titulo, conteudo }) => {
    setPendingDrafts((prev) =>
      prev.map((d) => (d.id === draftId ? { ...d, ...(titulo !== undefined && { titulo }), ...(conteudo !== undefined && { conteudo }) } : d))
    );
  }, []);

  /**
   * Descarta rascunho pendente explicitamente da memória.
   */
  const descartarRascunho = useCallback((draftId) => {
    setPendingDrafts((prev) => prev.filter((d) => d.id !== draftId));
    notifySuccess('Rascunho pendente descartado.');
  }, [notifySuccess]);

  /**
   * Remove rascunho após confirmação de salvamento no Django.
   */
  const removerRascunhoAposSalvar = useCallback((draftId) => {
    setPendingDrafts((prev) => prev.filter((d) => d.id !== draftId));
  }, []);

  return (
    <AiGenerationContext.Provider
      value={{
        activeGeneration: isCurrentSession ? activeGeneration : null,
        generationError: isCurrentSession ? generationError : null,
        pendingDrafts: isCurrentSession ? pendingDrafts : [],
        isDraftsModalOpen: isCurrentSession && isDraftsModalOpen,
        openDraftsModal,
        closeDraftsModal,
        iniciarGeracao,
        cancelarGeracao,
        marcarRascunhoComoVisto,
        atualizarRascunho,
        descartarRascunho,
        removerRascunhoAposSalvar,
        limparPendenciasPaciente,
        limparErroGeracao,
      }}
    >
      {children}
    </AiGenerationContext.Provider>
  );
}

export function useAiGeneration() {
  const context = useContext(AiGenerationContext);
  if (!context) {
    throw new Error('useAiGeneration deve ser utilizado dentro de um AiGenerationProvider');
  }
  return context;
}
