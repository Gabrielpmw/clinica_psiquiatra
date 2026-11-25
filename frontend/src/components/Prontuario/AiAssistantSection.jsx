import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Sparkles,
  CheckCircle2,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  ArrowRight,
  BookmarkPlus,
  XCircle,
  Copy,
  Check,
  AlertTriangle,
  Maximize2,
  Minimize2,
  Edit3,
  Eye,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import {
  getPromptsIa,
  getFontesIa,
  obterContextoIa,
  getResumosIa,
  salvarResumoIa,
  excluirResumoIa,
} from '../../services/prontuarioService';
import { getApiSessionId } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';
import { useAiGeneration } from '../../context/AiGenerationContext';
import { useAuth } from '../../context/AuthContext';
import AiSourcesAndReview from './AiSourcesAndReview';

function focarRegiao(regiao) {
  regiao?.focus({ preventScroll: true });
  regiao?.scrollIntoView({ block: 'start' });
}

export default function AiAssistantSection({
  pacienteId,
  destinoIa,
  onIrParaParecer,
  onIrParaProntuario,
}) {
  const { notifySuccess, notifyError, notifyWarning } = useNotification();
  const { sessionId } = useAuth();

  const {
    activeGeneration,
    generationError,
    pendingDrafts,
    iniciarGeracao,
    cancelarGeracao,
    marcarRascunhoComoVisto,
    atualizarRascunho,
    descartarRascunho,
    removerRascunhoAposSalvar,
    limparPendenciasPaciente,
    limparErroGeracao,
  } = useAiGeneration();

  const [prompts, setPrompts] = useState([]);
  const [promptSelecionado, setPromptSelecionado] = useState(1);

  // Seleção de fontes e revisão pré-geração (em memória)
  const [fontes, setFontes] = useState(null);
  const [loadingFontes, setLoadingFontes] = useState(false);
  const [erroFontes, setErroFontes] = useState(null);
  const [sessaoIdsSelecionadas, setSessaoIdsSelecionadas] = useState([]);
  const [preparandoRevisao, setPreparandoRevisao] = useState(false);
  const [revisao, setRevisao] = useState(null);
  const [avisoAlteracao, setAvisoAlteracao] = useState(null);
  const [confirmandoGeracao, setConfirmandoGeracao] = useState(false);

  // Estado da prévia aberta para revisão ativa
  const [previa, setPrevia] = useState(null);
  const [tituloResumo, setTituloResumo] = useState('');
  const [modoEdicao, setModoEdicao] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [modalConfirmarSalvar, setModalConfirmarSalvar] = useState(false);
  const [salvandoNoDjango, setSalvandoNoDjango] = useState(false);

  // Revalidação de acesso
  const [alvo, setAlvo] = useState(destinoIa);
  const [verificacao, setVerificacao] = useState(null);
  const [geracaoLocal, setGeracaoLocal] = useState(false);
  const [focarPrevia, setFocarPrevia] = useState(false);
  const previaRef = useRef(null);
  const progressoRef = useRef(null);
  const erroGeracaoRef = useRef(null);
  const erroRevalidacaoRef = useRef(null);
  const fontesRef = useRef(null);
  const revisaoRef = useRef(null);
  const alvoAbertoRef = useRef(null);
  const geracaoLocalRef = useRef(null);
  const fontesAbortRef = useRef(null);
  const revisaoAbortRef = useRef(null);
  const preparandoRevisaoRef = useRef(false);
  const confirmandoGeracaoRef = useRef(false);
  const contextoAtivoRef = useRef({ pacienteId, sessionId });
  const montadoRef = useRef(false);

  // Histórico
  const [resumosSalvos, setResumosSalvos] = useState([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [resumoExpandido, setResumoExpandido] = useState(null);

  // Pendências específicas deste paciente
  const pendentesDestePaciente = pendingDrafts.filter((d) => d.pacienteId === pacienteId);

  // Geração ativa associada a este paciente
  const isGerandoEstePaciente = activeGeneration && activeGeneration.pacienteId === pacienteId;
  const isGerandoOutroPaciente = activeGeneration && activeGeneration.pacienteId !== pacienteId;
  const erroGeracao = generationError?.pacienteId === pacienteId ? generationError.message : null;
  const geracaoAlvo = isGerandoEstePaciente && activeGeneration.id === alvo?.generationId
    ? activeGeneration.id
    : null;
  const erroGeracaoAlvo = erroGeracao && generationError.id === alvo?.generationId
    ? generationError
    : null;
  const draftAlvo = alvo && pendentesDestePaciente.find((draft) =>
    draft.id === alvo.draftId || draft.generationId === alvo.generationId && !!alvo.generationId
  );
  const alvoDisponivel = !!(draftAlvo || geracaoAlvo || erroGeracaoAlvo);
  const revalidando = alvoDisponivel && verificacao?.alvo !== alvo;
  const acessoValidado = !!alvo && verificacao?.alvo === alvo && verificacao.status === 'autorizado';
  const erroRevalidacao = verificacao?.alvo === alvo ? verificacao?.erro : null;
  const previaDisponivel = previa && pendentesDestePaciente.some((draft) => draft.id === previa.draftId);

  const carregarFontes = useCallback(async ({ preservarSelecao = false } = {}) => {
    if (!pacienteId || !sessionId || getApiSessionId() !== sessionId) return null;
    fontesAbortRef.current?.abort();
    const controller = new AbortController();
    fontesAbortRef.current = controller;
    const { signal } = controller;
    const reqPaciente = pacienteId;
    const reqSession = sessionId;

    try {
      setLoadingFontes(true);
      setErroFontes(null);
      const data = await getFontesIa(reqPaciente, { signal, _sessionId: reqSession });
      if (
        signal.aborted ||
        !montadoRef.current ||
        contextoAtivoRef.current.pacienteId !== reqPaciente ||
        contextoAtivoRef.current.sessionId !== reqSession ||
        getApiSessionId() !== reqSession
      ) {
        return null;
      }

      setFontes(data);
      const validIds = new Set((data?.sessoes || []).filter((s) => s.tem_anotacao).map((s) => s.id));
      if (preservarSelecao) {
        setSessaoIdsSelecionadas((prev) => prev.filter((id) => validIds.has(id)));
      } else {
        setSessaoIdsSelecionadas([]);
      }
      return data;
    } catch (err) {
      if (signal.aborted || !montadoRef.current) return null;
      if (
        contextoAtivoRef.current.pacienteId !== reqPaciente ||
        contextoAtivoRef.current.sessionId !== reqSession ||
        getApiSessionId() !== reqSession
      ) {
        return null;
      }
      const httpStatus = err?.response?.status;
      if (httpStatus === 403 || httpStatus === 404) {
        limparPendenciasPaciente(reqPaciente);
        setFontes(null);
        setSessaoIdsSelecionadas([]);
        setRevisao(null);
        setErroFontes('Acesso a este prontuário revogado ou não autorizado.');
      } else {
        setErroFontes('Não foi possível carregar as fontes disponíveis do prontuário.');
      }
      return null;
    } finally {
      if (!signal.aborted && montadoRef.current && fontesAbortRef.current === controller) {
        setLoadingFontes(false);
      }
    }
  }, [pacienteId, sessionId, limparPendenciasPaciente]);

  // Carrega prompts, fontes e histórico na montagem / troca de paciente ou sessão
  useEffect(() => {
    montadoRef.current = true;
    contextoAtivoRef.current = { pacienteId, sessionId };
    revisaoAbortRef.current?.abort();
    setPreparandoRevisao(false);
    setRevisao(null);
    setAvisoAlteracao(null);
    setSessaoIdsSelecionadas([]);
    setPrevia(null);
    setTituloResumo('');
    carregarPrompts();
    carregarHistorico();
    carregarFontes();
    return () => {
      montadoRef.current = false;
      fontesAbortRef.current?.abort();
      revisaoAbortRef.current?.abort();
    };
  }, [pacienteId, sessionId, carregarFontes]);

  useEffect(() => {
    if (!focarPrevia || !previaRef.current) return;
    focarRegiao(previaRef.current);
    setFocarPrevia(false);
  }, [focarPrevia, previaDisponivel]);

  useEffect(() => {
    if (erroRevalidacao) focarRegiao(erroRevalidacaoRef.current);
  }, [erroRevalidacao]);

  useEffect(() => {
    if (!previaDisponivel) return;
    const marcarQuandoVisivel = () => {
      if (document.visibilityState === 'visible') marcarRascunhoComoVisto(previa.draftId);
    };
    marcarQuandoVisivel();
    document.addEventListener('visibilitychange', marcarQuandoVisivel);
    return () => document.removeEventListener('visibilitychange', marcarQuandoVisivel);
  }, [previaDisponivel, previa?.draftId, marcarRascunhoComoVisto]);

  const carregarPrompts = async () => {
    try {
      const data = await getPromptsIa();
      setPrompts(data);
    } catch (err) {
      console.error('Erro ao carregar prompts:', err);
    }
  };

  const carregarHistorico = async () => {
    if (!pacienteId) return;
    try {
      setLoadingHistorico(true);
      const data = await getResumosIa(pacienteId);
      setResumosSalvos(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error('Erro ao carregar resumos:', err);
    } finally {
      setLoadingHistorico(false);
    }
  };

  const mostrarPrevia = useCallback((draft) => {
    setPrevia({
      draftId: draft.id,
      prompt_id: draft.promptId,
      prompt_titulo: draft.promptTitulo,
      conteudo: draft.conteudo,
      limiteDeTokensAtingido: draft.avisoTokens,
      localInference: true,
    });
    setTituloResumo(draft.titulo || `Rascunho - ${draft.promptTitulo}`);
    setModoEdicao(false);
  }, []);

  useEffect(() => {
    if (!alvoDisponivel || !sessionId) return;
    const controller = new AbortController();
    const { signal } = controller;
    getResumosIa(pacienteId, { signal, _sessionId: sessionId })
      .then(() => {
        if (!signal.aborted) setVerificacao({ alvo, status: 'autorizado' });
      })
      .catch((err) => {
        if (signal.aborted) return;
        if (err.response?.status === 403 || err.response?.status === 404) {
          limparPendenciasPaciente(pacienteId);
          setVerificacao({ alvo, erro: 'Acesso a este prontuário revogado ou não autorizado.' });
        } else {
          setVerificacao({ alvo, erro: 'Falha de comunicação ao validar o acesso ao prontuário.', podeTentar: true });
        }
      });
    return () => controller.abort();
  }, [alvo, alvoDisponivel, pacienteId, sessionId, limparPendenciasPaciente]);

  useEffect(() => {
    if (!acessoValidado) return;
    if (draftAlvo && alvoAbertoRef.current !== alvo) {
      alvoAbertoRef.current = alvo;
      mostrarPrevia(draftAlvo);
      setFocarPrevia(true);
    } else if (geracaoAlvo) {
      focarRegiao(progressoRef.current);
    } else if (erroGeracaoAlvo) {
      setPromptSelecionado(erroGeracaoAlvo.promptId);
      focarRegiao(erroGeracaoRef.current);
    }
  }, [acessoValidado, alvo, draftAlvo, geracaoAlvo, erroGeracaoAlvo, mostrarPrevia]);

  const abrirParaRevisao = (draft) => {
    if (geracaoLocalRef.current) geracaoLocalRef.current.abrirPrevia = false;
    setPrevia(null);
    setIsMaximized(false);
    setAlvo({ draftId: draft.id });
  };

  const handleSelecionarPrompt = (novoPromptId) => {
    if (isGerandoEstePaciente || preparandoRevisao || confirmandoGeracao) return;
    if (novoPromptId === promptSelecionado) return;
    setPromptSelecionado(novoPromptId);
    if (revisao) {
      setRevisao(null);
      setAvisoAlteracao('O roteiro foi alterado. Solicite uma nova revisão antes de gerar o rascunho.');
    }
  };

  const handleToggleSessao = (sessaoId) => {
    setSessaoIdsSelecionadas((prev) =>
      prev.includes(sessaoId) ? prev.filter((id) => id !== sessaoId) : [...prev, sessaoId]
    );
    setAvisoAlteracao(null);
    if (revisao) setRevisao(null);
  };

  const handleCancelarPreparacao = () => {
    revisaoAbortRef.current?.abort();
    preparandoRevisaoRef.current = false;
    setPreparandoRevisao(false);
  };

  const handleVoltarSelecao = () => {
    setRevisao(null);
    setAvisoAlteracao(null);
    limparErroGeracao(pacienteId);
    setTimeout(() => focarRegiao(fontesRef.current), 0);
  };

  const handleCancelarRevisao = () => {
    revisaoAbortRef.current?.abort();
    preparandoRevisaoRef.current = false;
    setPreparandoRevisao(false);
    setRevisao(null);
    setAvisoAlteracao(null);
    setSessaoIdsSelecionadas([]);
    limparErroGeracao(pacienteId);
  };

  const handleSolicitarRevisao = async () => {
    if (preparandoRevisaoRef.current || preparandoRevisao || confirmandoGeracao || activeGeneration) return;
    if (sessaoIdsSelecionadas.length === 0) {
      notifyWarning('Selecione ao menos uma sessão com anotação para revisar.');
      return;
    }
    if (!sessionId || getApiSessionId() !== sessionId) return;

    preparandoRevisaoRef.current = true;
    revisaoAbortRef.current?.abort();
    const controller = new AbortController();
    revisaoAbortRef.current = controller;
    const { signal } = controller;
    const reqPaciente = pacienteId;
    const reqSession = sessionId;
    const reqPromptId = promptSelecionado;
    const reqSessaoIds = [...sessaoIdsSelecionadas];

    setPreparandoRevisao(true);
    setAvisoAlteracao(null);
    limparErroGeracao(pacienteId);

    try {
      const dados = await obterContextoIa(
        reqPaciente,
        { promptId: reqPromptId, sessaoIds: reqSessaoIds },
        { signal, _sessionId: reqSession }
      );
      if (
        signal.aborted ||
        !montadoRef.current ||
        contextoAtivoRef.current.pacienteId !== reqPaciente ||
        contextoAtivoRef.current.sessionId !== reqSession ||
        getApiSessionId() !== reqSession
      ) {
        return;
      }

      setRevisao({
        pacienteId: reqPaciente,
        sessionId: reqSession,
        promptId: dados.prompt_id,
        promptTitulo: dados.prompt_titulo,
        instrucao: dados.instrucao,
        contexto: dados.contexto,
        contextoHash: dados.contexto_hash || null,
        referenciasSessao: dados.referencias_sessao || [],
        incluirAnamnese: false,
        sessaoIds: dados.fontes_incluidas?.sessao_ids || reqSessaoIds,
        avisos: dados.avisos || null,
        bloqueado: Boolean(dados.bloqueado || dados.avisos?.bloqueado),
      });
      setTimeout(() => focarRegiao(revisaoRef.current), 0);
    } catch (err) {
      if (signal.aborted || !montadoRef.current) return;
      if (
        contextoAtivoRef.current.pacienteId !== reqPaciente ||
        contextoAtivoRef.current.sessionId !== reqSession ||
        getApiSessionId() !== reqSession
      ) {
        return;
      }

      const httpStatus = err?.response?.status;
      const backendMsg = err?.response?.data?.error;
      if (httpStatus === 403) {
        limparPendenciasPaciente(reqPaciente);
        setFontes(null);
        setSessaoIdsSelecionadas([]);
        setRevisao(null);
        setErroFontes('Acesso a este prontuário revogado ou não autorizado.');
        notifyError('Acesso a este prontuário revogado ou não autorizado.');
      } else if (httpStatus === 404 || httpStatus === 400) {
        const atualizadas = await carregarFontes({ preservarSelecao: true });
        if (atualizadas) {
          setAvisoAlteracao(
            backendMsg || 'As fontes selecionadas mudaram ou não estão disponíveis. Ajuste a seleção e tente novamente.'
          );
          notifyError(backendMsg || 'Ajuste as fontes selecionadas antes de revisar.');
        }
      } else {
        setAvisoAlteracao('Não foi possível preparar a revisão agora. Verifique a conexão e tente novamente.');
        notifyError('Falha ao preparar os dados para revisão.');
      }
    } finally {
      if (revisaoAbortRef.current === controller) {
        preparandoRevisaoRef.current = false;
      }
      if (!signal.aborted && montadoRef.current && revisaoAbortRef.current === controller) {
        setPreparandoRevisao(false);
      }
    }
  };

  const handleGerarResumo = async ({ confirmacaoPrivacidade = false, revisaoAlvo = null } = {}) => {
    if (confirmandoGeracaoRef.current || confirmandoGeracao) return;
    if (activeGeneration) {
      notifyWarning('Já existe uma geração em andamento na aba.');
      return;
    }
    if (confirmacaoPrivacidade !== true) {
      notifyWarning('Confirme a orientação de privacidade antes de iniciar a geração.');
      return;
    }
    if (!revisao || revisao.bloqueado || (revisaoAlvo && revisaoAlvo !== revisao)) {
      notifyWarning('Revise os dados e desbloqueie todas as fontes antes de gerar.');
      return;
    }

    const promptObj = prompts.find((p) => p.id === revisao.promptId);
    const promptTitulo = promptObj ? `Prompt #${promptObj.id} - ${promptObj.titulo}` : `Prompt #${revisao.promptId}`;

    confirmandoGeracaoRef.current = true;
    setConfirmandoGeracao(true);
    setPrevia(null);
    setModoEdicao(false);
    setAlvo(null);
    setGeracaoLocal(true);
    const geracao = { abrirPrevia: true };
    geracaoLocalRef.current = geracao;

    try {
      const draft = await iniciarGeracao({
        pacienteId,
        promptId: revisao.promptId,
        promptTitulo,
        selecao: {
          sessaoIds: revisao.sessaoIds,
        },
        revisaoAprovada: revisao,
        confirmacaoPrivacidade: true,
      });
      if (!montadoRef.current) return;
      if (draft) {
        setRevisao(null);
        if (geracaoLocalRef.current === geracao && geracao.abrirPrevia) {
          mostrarPrevia(draft);
        }
      } else {
        // Falha na revalidação/preparação: invalida revisão anterior e retorna à seleção atualizada
        setRevisao(null);
        await carregarFontes({ preservarSelecao: true });
        focarRegiao(erroGeracaoRef.current || fontesRef.current);
      }
    } finally {
      confirmandoGeracaoRef.current = false;
      if (montadoRef.current) {
        setConfirmandoGeracao(false);
        if (geracaoLocalRef.current === geracao) {
          geracaoLocalRef.current = null;
          setGeracaoLocal(false);
        }
      }
    }
  };

  const handleTituloChange = (novoTitulo) => {
    setTituloResumo(novoTitulo);
    if (previa?.draftId) {
      atualizarRascunho(previa.draftId, { titulo: novoTitulo });
    }
  };

  const handleConteudoChange = (novoConteudo) => {
    setPrevia((prev) => (prev ? { ...prev, conteudo: novoConteudo } : null));
    if (previa?.draftId) {
      atualizarRascunho(previa.draftId, { conteudo: novoConteudo });
    }
  };

  const handleAbrirConfirmacaoSalvar = () => {
    if (!previa || !previa.conteudo.trim()) return;
    if (!tituloResumo.trim()) {
      notifyError('Por favor, defina um título para a anotação.');
      return;
    }
    setModalConfirmarSalvar(true);
  };

  const handleConfirmarSalvarPrevia = async () => {
    try {
      setSalvandoNoDjango(true);
      await salvarResumoIa(pacienteId, {
        titulo: tituloResumo.trim(),
        promptTipo: previa.prompt_id,
        conteudoGerado: previa.conteudo,
      });

      if (previa.draftId) {
        removerRascunhoAposSalvar(previa.draftId);
      }

      notifySuccess('Resumo revisado salvo com sucesso no histórico do prontuário!');
      setModalConfirmarSalvar(false);
      setPrevia(null);
      setAlvo(null);
      setTituloResumo('');
      carregarHistorico();
    } catch (err) {
      console.error('Erro ao salvar resumo:', err);
      notifyError('Não foi possível salvar o resumo no prontuário. Suas edições foram preservadas.');
    } finally {
      setSalvandoNoDjango(false);
    }
  };

  const handleDescartarPrevia = () => {
    if (previa?.draftId) {
      descartarRascunho(previa.draftId);
    }
    setPrevia(null);
    setAlvo(null);
    setTituloResumo('');
    setModoEdicao(false);
  };

  const handleExcluirResumo = async (resumoId) => {
    if (!window.confirm('Tem certeza que deseja excluir este resumo salvo?')) return;
    try {
      await excluirResumoIa(resumoId);
      notifySuccess('Resumo removido do histórico.');
      carregarHistorico();
    } catch (err) {
      console.error('Erro ao excluir resumo:', err);
      notifyError('Erro ao excluir o resumo.');
    }
  };

  const handleCopiarTexto = (texto) => {
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="space-y-6">
      {revalidando && (
        <p role="status" className="flex items-center gap-2 text-sm text-leaf-800">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          Validando acesso ao resumo...
        </p>
      )}
      {/* Alerta de erro de revalidação de rede com opção de tentar novamente */}
      {erroRevalidacao && (
        <div ref={erroRevalidacaoRef} tabIndex={-1} role="alert" className="bg-amber-50 border border-amber-300 p-4 rounded-2xl flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{erroRevalidacao}</span>
          </div>
          {verificacao.podeTentar && (
            <button
              type="button"
              onClick={() => setAlvo({ ...alvo })}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Tentar novamente</span>
            </button>
          )}
        </div>
      )}

      {/* Rascunhos Pendentes de Revisão neste Prontuário */}
      {pendentesDestePaciente.length > 0 && (
        <div className="bg-leaf-50/70 border border-leaf-300 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-leaf-950 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-leaf-700" />
              <span>Rascunhos da IA Pendentes de Revisão ({pendentesDestePaciente.length})</span>
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pendentesDestePaciente.map((draft) => {
              const isAberto = previa?.draftId === draft.id;
              return (
                <div
                  key={draft.id}
                  className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
                    isAberto
                      ? 'bg-paper-50 border-leaf-600 ring-2 ring-leaf-500/20 shadow-xs'
                      : 'bg-paper-50 border-paper-300 hover:border-leaf-400'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-ink-900 truncate">{draft.promptTitulo}</span>
                      <span className="text-[11px] text-ink-500">{draft.geradoEm}</span>
                    </div>
                    {(acessoValidado || previaDisponivel) && (
                      <p className="text-xs text-ink-600 truncate">{draft.titulo}</p>
                    )}
                    {draft.avisoTokens && (
                      <p className="text-[10px] text-amber-700 font-semibold mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Limite de tokens atingido
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-paper-200">
                    <button
                      type="button"
                      onClick={() => descartarRascunho(draft.id)}
                      className="p-1 rounded-md text-ink-400 hover:text-cancelled hover:bg-cancelledBg transition text-xs"
                      title="Descartar da memória"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => abrirParaRevisao(draft)}
                      disabled={revalidando}
                      className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        isAberto
                          ? 'bg-leaf-100 text-leaf-800 border border-leaf-300'
                          : 'bg-leaf-700 hover:bg-leaf-800 text-paper-50'
                      }`}
                    >
                      {revalidando ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Eye className="w-3 h-3" />
                      )}
                      <span>{isAberto ? 'Revisando' : 'Revisar Rascunho'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Seção Principal: Seleção de Prompt, Fontes e Revisão */}
      <div className="bg-paper-50 p-4 sm:p-6 rounded-2xl border border-paper-300 shadow-xs">
        {/* Grade de Prompts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3" role="radiogroup" aria-label="Roteiro de resumo clínico">
          {prompts.map((p) => {
            const isSelected = promptSelecionado === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={isGerandoEstePaciente || preparandoRevisao || confirmandoGeracao}
                onClick={() => handleSelecionarPrompt(p.id)}
                className={`p-4 rounded-xl border transition-all text-left flex flex-col justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500 ${
                  isSelected
                    ? 'bg-leaf-100/60 border-leaf-600 ring-2 ring-leaf-500/20 shadow-xs'
                    : 'bg-paper-100 border-paper-300 hover:border-leaf-400'
                } ${isGerandoEstePaciente || preparandoRevisao || confirmandoGeracao ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <div className="w-full">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-paper-200 text-ink-700">
                      Prompt #{p.id}
                    </span>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-leaf-700">
                        <CheckCircle2 className="w-4 h-4 text-leaf-700" aria-hidden="true" />
                        Selecionado
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-ink-900">{p.titulo}</h4>
                  <p className="text-xs text-ink-600 mt-1 leading-relaxed">{p.descricao}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Seleção de Fontes e Revisão Prévia */}
        <AiSourcesAndReview
          fontesRef={fontesRef}
          revisaoRef={revisaoRef}
          fontes={fontes}
          loadingFontes={loadingFontes}
          erroFontes={erroFontes}
          onRecarregarFontes={() => carregarFontes({ preservarSelecao: true })}
          sessaoIdsSelecionadas={sessaoIdsSelecionadas}
          onToggleSessao={handleToggleSessao}
          preparandoRevisao={preparandoRevisao}
          onSolicitarRevisao={handleSolicitarRevisao}
          onCancelarPreparacao={handleCancelarPreparacao}
          revisao={revisao}
          avisoAlteracao={avisoAlteracao}
          onVoltarSelecao={handleVoltarSelecao}
          onCancelarRevisao={handleCancelarRevisao}
          onConfirmarGerar={handleGerarResumo}
          onIrParaProntuario={onIrParaProntuario}
          activeGeneration={activeGeneration}
          confirmandoGeracao={confirmandoGeracao}
        />

        {/* Barra de Progresso / Carregamento do Modelo */}
        {isGerandoEstePaciente && (
          <div ref={progressoRef} tabIndex={-1} role="region" aria-label="Progresso do resumo" className="mt-4 p-3.5 rounded-xl bg-leaf-50 border border-leaf-200 animate-fadeIn">
            <div className="flex items-center justify-between text-xs font-semibold text-leaf-900 mb-1.5">
              <span className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-leaf-700 animate-spin" />
                {activeGeneration.progresso.text}
              </span>
              {activeGeneration.fase !== 'gerando' && <span>{activeGeneration.progresso.percent}%</span>}
            </div>
            <div className="w-full bg-leaf-200/60 rounded-full h-1.5 overflow-hidden">
              <div
                className={`bg-leaf-700 h-1.5 rounded-full transition-all duration-300 ${activeGeneration.fase === 'gerando' ? 'animate-pulse' : ''}`}
                style={{ width: activeGeneration.fase === 'gerando' ? '100%' : `${Math.max(5, activeGeneration.progresso.percent)}%` }}
              />
            </div>
            <div className="flex justify-end mt-2">
              <button
                type="button"
                onClick={cancelarGeracao}
                className="text-xs text-cancelled hover:underline font-semibold"
              >
                Cancelar geração
              </button>
            </div>
          </div>
        )}

        {erroGeracao && (
          <div ref={erroGeracaoRef} tabIndex={-1} role="alert" className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs sm:text-sm text-amber-900">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{erroGeracao}</span>
            </div>
            {generationError?.codigo !== 'SEM_AUTORIZACAO' && (
              <button
                type="button"
                onClick={handleVoltarSelecao}
                className="shrink-0 self-start sm:self-center px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
              >
                Ajustar fontes do resumo
              </button>
            )}
          </div>
        )}

        {/* Aviso de geração ativa em outro paciente */}
        {isGerandoOutroPaciente && (
          <div className="mt-4 p-3 rounded-xl bg-paper-100 border border-paper-300 text-xs text-ink-700 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-leaf-700" />
              Existe outra geração em andamento nesta aba. Acompanhe em Rascunhos IA.
            </span>
            <button
              type="button"
              onClick={cancelarGeracao}
              className="text-cancelled font-semibold hover:underline text-xs"
            >
              Interromper
            </button>
          </div>
        )}
      </div>

      {/* Prévia do Rascunho Aberto para Revisão */}
      {previaDisponivel && (
        <>
          {isMaximized && (
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity"
              onClick={() => setIsMaximized(false)}
            />
          )}

          <div
            ref={previaRef}
            tabIndex={-1}
            role="region"
            aria-label="Texto do rascunho"
            className={`transition-all duration-200 ${
              isMaximized
                ? 'fixed inset-4 md:inset-8 z-50 bg-paper-50 p-6 rounded-2xl border-2 border-leaf-600 shadow-2xl flex flex-col'
                : 'bg-paper-50 p-6 rounded-2xl border-2 border-leaf-500/80 shadow-md animate-fadeIn'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-paper-300 flex-shrink-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-leaf-800 bg-leaf-100 px-2.5 py-1 rounded-lg">
                  Rascunho — {previa.prompt_titulo}
                </span>
                <span className="text-[11px] font-semibold text-ink-600 bg-paper-200 px-2 py-0.5 rounded-md">
                  Sujeito à Revisão Médica
                </span>
                {previa.draftId && (
                  <span className="text-[10px] font-bold text-leaf-700 bg-leaf-100 px-2 py-0.5 rounded-full border border-leaf-300">
                    Pendente de revisão
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-paper-200 p-0.5 rounded-lg border border-paper-300">
                  <button
                    type="button"
                    onClick={() => setModoEdicao(false)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition ${
                      !modoEdicao
                        ? 'bg-paper-50 text-leaf-800 shadow-xs'
                        : 'text-ink-600 hover:text-ink-900'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Visualizar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoEdicao(true)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition ${
                      modoEdicao
                        ? 'bg-paper-50 text-leaf-800 shadow-xs'
                        : 'text-ink-600 hover:text-ink-900'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopiarTexto(previa.conteudo)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-paper-300 text-xs font-semibold text-ink-700 hover:bg-paper-100 transition"
                >
                  {copiado ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiado ? 'Copiado!' : 'Copiar'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-paper-300 text-xs font-semibold text-ink-700 hover:bg-paper-100 transition"
                >
                  {isMaximized ? (
                    <>
                      <Minimize2 className="w-3.5 h-3.5 text-leaf-700" />
                      <span className="hidden sm:inline">Restaurar</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3.5 h-3.5 text-leaf-700" />
                      <span className="hidden sm:inline">Maximizar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {previa.limiteDeTokensAtingido && (
              <p role="status" className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                O rascunho atingiu o tamanho máximo e pode estar incompleto. Confira as notas e complete o texto antes de usar.
              </p>
            )}

            <div
              className={`mt-4 rounded-xl border border-paper-300 bg-paper-100/70 p-4 ${
                isMaximized
                  ? 'flex-1 overflow-y-auto'
                  : 'min-h-[220px] max-h-[600px] overflow-y-auto resize-y'
              }`}
            >
              {modoEdicao ? (
                <textarea
                  value={previa.conteudo}
                  onChange={(e) => handleConteudoChange(e.target.value)}
                  className="w-full h-full min-h-[180px] bg-transparent text-sm text-ink-900 font-mono leading-relaxed focus:outline-none resize-none"
                  placeholder="Edite o conteúdo em texto ou Markdown..."
                />
              ) : (
                <div className="prose prose-sm max-w-none text-ink-900 leading-relaxed font-sans [&>p]:mb-3 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-3 [&>ul>li]:mb-1.5 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-3 [&>ol>li]:mb-1.5 [&>h1]:text-base [&>h1]:font-bold [&>h1]:text-leaf-900 [&>h1]:mt-4 [&>h1]:mb-2 [&>h2]:text-sm [&>h2]:font-bold [&>h2]:text-leaf-900 [&>h2]:mt-4 [&>h2]:mb-2 [&>h3]:text-sm [&>h3]:font-bold [&>h3]:text-leaf-900 [&>h3]:mt-4 [&>h3]:mb-1.5 [&>strong]:font-bold [&>strong]:text-leaf-900">
                  <ReactMarkdown>{previa.conteudo || '*(Aguardando geração do rascunho...)*'}</ReactMarkdown>
                </div>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-paper-300 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
              <div className="flex-1 max-w-md">
                <label className="block text-xs font-bold text-ink-700 mb-1">
                  Título da Anotação para Salvamento:
                </label>
                <input
                  type="text"
                  value={tituloResumo}
                  onChange={(e) => handleTituloChange(e.target.value)}
                  placeholder="Ex: Síntese Semestral - Evolução Verbal"
                  className="w-full py-2 px-3 rounded-lg border border-paper-300 text-xs text-ink-900 font-medium focus:ring-1 focus:ring-leaf-500 focus:outline-none bg-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDescartarPrevia}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-paper-300 text-xs font-bold text-ink-700 hover:bg-paper-200/60 transition"
                >
                  <XCircle className="w-4 h-4 text-ink-500" />
                  <span>Descartar</span>
                </button>

                <button
                  type="button"
                  disabled={!previa.conteudo.trim()}
                  onClick={handleAbrirConfirmacaoSalvar}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-leaf-700 hover:bg-leaf-800 text-xs font-bold text-white shadow-xs transition"
                >
                  <BookmarkPlus className="w-4 h-4" />
                  <span>Salvar no Prontuário</span>
                </button>

                {previa.prompt_id === 4 && onIrParaParecer && (
                  <button
                    type="button"
                    disabled={!previa.conteudo.trim()}
                    onClick={() => {
                      setIsMaximized(false);
                      onIrParaParecer(previa.conteudo, previa.draftId);
                    }}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white shadow-xs transition"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>Encaminhar para o Parecer Conclusivo</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal de Confirmação Explícita de Salvamento */}
      {modalConfirmarSalvar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-paper-50 rounded-2xl border border-paper-300 shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
              <BookmarkPlus className="w-5 h-5 text-leaf-700" />
              <span>Confirmar Salvamento do Resumo</span>
            </h3>
            <p className="text-xs text-ink-600 leading-relaxed">
              O texto revisado da prévia será transmitido e gravado permanentemente no prontuário do paciente com o título abaixo:
            </p>
            <div className="p-3 bg-paper-100 rounded-xl border border-paper-200 text-xs font-semibold text-ink-900">
              {tituloResumo.trim()}
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={salvandoNoDjango}
                onClick={() => setModalConfirmarSalvar(false)}
                className="px-4 py-2 rounded-xl border border-paper-300 text-xs font-bold text-ink-700 hover:bg-paper-200/60 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={salvandoNoDjango}
                onClick={handleConfirmarSalvarPrevia}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-leaf-700 hover:bg-leaf-800 text-xs font-bold text-white shadow-xs transition"
              >
                {salvandoNoDjango ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Gravando...</span>
                  </>
                ) : (
                  <>
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    <span>Confirmar e Salvar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Histórico de Resumos Salvos */}
      <div className="bg-paper-50 p-6 rounded-2xl border border-paper-300 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-paper-300">
          <div>
            <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-leaf-700" />
              <span>Histórico de Resumos Salvos</span>
            </h3>
            <p className="text-xs text-ink-600 mt-0.5">
              Resumos clínicos validados e persistidos no prontuário do paciente.
            </p>
          </div>
          <button
            type="button"
            onClick={carregarHistorico}
            disabled={loadingHistorico}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-paper-300 text-xs font-semibold text-ink-700 hover:bg-paper-100 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHistorico ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>

        {loadingHistorico ? (
          <div className="py-8 flex items-center justify-center gap-2 text-xs text-ink-500 font-medium">
            <div className="w-4 h-4 border-2 border-leaf-700/30 border-t-leaf-700 rounded-full animate-spin" />
            <span>Carregando histórico...</span>
          </div>
        ) : resumosSalvos.length === 0 ? (
          <div className="py-8 text-center text-xs text-ink-500 font-medium">
            Nenhum resumo clínico gerado ou salvo até o momento para este paciente.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {resumosSalvos.map((resumo) => {
              const isExpanded = resumoExpandido === resumo.id;
              return (
                <div
                  key={resumo.id}
                  className="rounded-xl border border-paper-300 bg-paper-100/50 overflow-hidden transition"
                >
                  <div
                    onClick={() => setResumoExpandido(isExpanded ? null : resumo.id)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-paper-200/50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-leaf-600" />
                      <div>
                        <h4 className="text-sm font-bold text-ink-900">{resumo.titulo}</h4>
                        <div className="flex items-center gap-2 text-xs text-ink-500 mt-0.5">
                          <span>Prompt #{resumo.promptTipo}</span>
                          <span>•</span>
                          <span>
                            {new Date(resumo.dataCriacao).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopiarTexto(resumo.conteudoGerado);
                        }}
                        className="p-1.5 rounded-lg hover:bg-paper-300/50 text-ink-600 transition"
                        title="Copiar texto"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExcluirResumo(resumo.id);
                        }}
                        className="p-1.5 rounded-lg hover:bg-cancelledBg text-ink-600 hover:text-cancelled transition"
                        title="Excluir resumo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-ink-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-ink-500" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 bg-paper-50 border-t border-paper-300 text-xs text-ink-900 leading-relaxed font-sans">
                      <div className="prose prose-sm max-w-none [&>p]:mb-3 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-3 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-3">
                        <ReactMarkdown>{resumo.conteudoGerado}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
