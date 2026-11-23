import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Sparkles,
  ShieldCheck,
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
  Cpu,
  RefreshCw
} from 'lucide-react';
import {
  getPromptsIa,
  obterContextoIa,
  getResumosIa,
  salvarResumoIa,
  excluirResumoIa
} from '../../services/prontuarioService';
import { webllmService } from '../../services/webllmService';
import { useNotification } from '../../context/NotificationContext';

export default function AiAssistantSection({ pacienteId, onIrParaParecer }) {
  const { notifySuccess, notifyError, notifyWarning } = useNotification();

  const [prompts, setPrompts] = useState([]);
  const [promptSelecionado, setPromptSelecionado] = useState(1);
  const [loadingGeracao, setLoadingGeracao] = useState(false);
  const [progressoStatus, setProgressoStatus] = useState(null);
  const [erroGpu, setErroGpu] = useState(null);
  const [avisoTokenBudget, setAvisoTokenBudget] = useState(null);

  const [previa, setPrevia] = useState(null);
  const [tituloResumo, setTituloResumo] = useState('');
  const [resumosSalvos, setResumosSalvos] = useState([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [resumoExpandido, setResumoExpandido] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [modalConfirmarSalvar, setModalConfirmarSalvar] = useState(false);
  const [salvandoNoDjango, setSalvandoNoDjango] = useState(false);

  const activeRequestRef = useRef(null);

  useEffect(() => {
    // Invalida requisições pendentes e limpa estado clínico ao trocar de paciente ou desmontar
    webllmService.invalidateContext();
    activeRequestRef.current = null;
    setLoadingGeracao(false);
    setProgressoStatus(null);
    setPrevia(null);
    setTituloResumo('');
    setAvisoTokenBudget(null);
    setErroGpu(null);

    carregarPrompts();
    carregarHistorico();

    return () => {
      webllmService.invalidateContext();
      activeRequestRef.current = null;
    };
  }, [pacienteId]);

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

  const handleGerarResumo = async () => {
    setAvisoTokenBudget(null);
    setErroGpu(null);

    const requestId = `${Date.now()}-${Math.random()}`;
    activeRequestRef.current = requestId;

    try {
      setLoadingGeracao(true);
      setPrevia(null);
      setModoEdicao(false);
      setProgressoStatus({ text: 'Obtendo contexto clínico minimizado no backend...', percent: 10 });

      // 1. Obter contexto sanitizado e instrução fixa autorizada do Django
      const dadosContexto = await obterContextoIa(pacienteId, promptSelecionado);

      // Se a requisição foi invalidada durante a resposta da API
      if (activeRequestRef.current !== requestId) return;

      setProgressoStatus({ text: 'Inicializando motor WebLLM no navegador...', percent: 25 });

      setPrevia({
        prompt_id: dadosContexto.prompt_id,
        prompt_titulo: dadosContexto.prompt_titulo,
        conteudo: '',
        referencias_sessao: dadosContexto.referencias_sessao || [],
        localInference: true
      });
      setTituloResumo(`${dadosContexto.prompt_titulo} - ${new Date().toLocaleDateString('pt-BR')}`);

      const resultado = await webllmService.generateSummary({
        systemInstruction: dadosContexto.instrucao,
        userContext: dadosContexto.contexto,
        pacienteId,
        requestId,
        onProgress: (prog) => {
          if (activeRequestRef.current === requestId) {
            setProgressoStatus({
              text: prog.text,
              percent: Math.round((prog.progress || 0) * 100)
            });
          }
        },
        onChunk: (deltaAcumulado) => {
          if (activeRequestRef.current === requestId) {
            setPrevia((prev) => (prev ? { ...prev, conteudo: deltaAcumulado } : null));
          }
        }
      });

      if (activeRequestRef.current !== requestId || !resultado) return;

      if (resultado.warning) {
        setPrevia(null);
        setAvisoTokenBudget(resultado.warning);
        notifyWarning('Contexto clínico excede a capacidade de tokens do modelo local.');
        return;
      }

      setPrevia((prev) => (prev ? {
        ...prev,
        conteudo: resultado.text,
        limiteDeTokensAtingido: resultado.reachedTokenLimit,
      } : null));
      if (!resultado.reachedTokenLimit) {
        notifySuccess('Rascunho gerado integralmente no navegador via WebGPU!');
      }
    } catch (err) {
      if (activeRequestRef.current === requestId) {
        console.error('Falha na geração WebLLM:', err);
        setErroGpu(err.message || 'Falha ao executar inferência local com WebGPU.');
        notifyError(err.message || 'Falha na inferência local.');
        setPrevia(null);
      }
    } finally {
      if (activeRequestRef.current === requestId) {
        setLoadingGeracao(false);
        setProgressoStatus(null);
      }
    }
  };

  const handleAbrirConfirmacaoSalvar = () => {
    if (loadingGeracao || !previa?.conteudo.trim()) return;
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
        conteudoGerado: previa.conteudo
      });
      notifySuccess('Resumo revisado salvo com sucesso no histórico do prontuário!');
      setModalConfirmarSalvar(false);
      setPrevia(null);
      setTituloResumo('');
      carregarHistorico();
    } catch (err) {
      console.error('Erro ao salvar resumo:', err);
      notifyError('Não foi possível salvar o resumo no prontuário.');
    } finally {
      setSalvandoNoDjango(false);
    }
  };

  const handleDescartarPrevia = () => {
    webllmService.invalidateContext();
    setPrevia(null);
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
      {/* Alerta de erro de GPU ou Armazenamento com mensagem amigável */}
      {erroGpu && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-start justify-between gap-3 animate-fadeIn">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-rose-900">Falha na Inferência Local</h4>
              <p className="text-xs text-rose-700 mt-1 leading-relaxed">{erroGpu}</p>
              <p className="text-[11px] text-rose-600 mt-1">
                O histórico de resumos existentes e a redação manual do Parecer continuam totalmente operacionais.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setErroGpu(null);
              handleGerarResumo();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shrink-0 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Tentar Novamente</span>
          </button>
        </div>
      )}

      {/* Alerta de Orçamento de Tokens Excedido */}
      {avisoTokenBudget && (
        <div className="bg-amber-50 border border-amber-300 p-4 rounded-2xl flex items-start gap-3 animate-fadeIn">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm text-amber-900">Limite de Orçamento de Contexto Ultrapassado</h4>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">{avisoTokenBudget}</p>
          </div>
        </div>
      )}

      {/* Grade de Seleção de Prompts Fixos (RF11) */}
      <div className="bg-paper-50 p-6 rounded-2xl border border-paper-300 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-lg font-bold text-ink-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-leaf-700" />
              <span>Catálogo de Prompts Clínicos Especializados</span>
            </h3>
            <p className="text-xs text-ink-500 mt-0.5">
              Geração de rascunhos em português brasileiro executada integralmente no navegador com WebLLM/WebGPU.
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <Cpu className="w-3.5 h-3.5 text-emerald-600" />
            <span>Inferência no Navegador (WebGPU)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {prompts.map((p) => {
            const isSelected = promptSelecionado === p.id;
            return (
              <div
                key={p.id}
                onClick={() => setPromptSelecionado(p.id)}
                className={`p-4 rounded-xl border text-left cursor-pointer transition flex flex-col justify-between ${
                  isSelected
                    ? 'border-leaf-600 bg-leaf-50/60 ring-2 ring-leaf-500/20'
                    : 'border-paper-300 bg-paper-50 hover:border-leaf-400 hover:bg-paper-100/50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-paper-200 text-ink-700">
                      Prompt #{p.id}
                    </span>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-leaf-700">
                        <CheckCircle2 className="w-4 h-4 text-leaf-700" />
                        Selecionado
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-ink-900">{p.titulo}</h4>
                  <p className="text-xs text-ink-600 mt-1 leading-relaxed">{p.descricao}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Barra de Progresso / Carregamento do Modelo */}
        {loadingGeracao && progressoStatus && (
          <div className="mt-4 p-3.5 rounded-xl bg-leaf-50 border border-leaf-200 animate-fadeIn">
            <div className="flex items-center justify-between text-xs font-semibold text-leaf-900 mb-1.5">
              <span className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-leaf-700/30 border-t-leaf-700 rounded-full animate-spin" />
                {progressoStatus.text}
              </span>
              <span>{progressoStatus.percent}%</span>
            </div>
            <div className="w-full bg-leaf-200/60 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-leaf-700 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.max(5, progressoStatus.percent)}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            onClick={handleGerarResumo}
            disabled={loadingGeracao}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white shadow-xs transition ${
              loadingGeracao
                ? 'bg-ink-400 cursor-not-allowed'
                : 'bg-leaf-700 hover:bg-leaf-800 active:scale-[0.98]'
            }`}
          >
            {loadingGeracao ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processando no Navegador...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Gerar Rascunho com WebLLM</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Prévia do Rascunho Gerado */}
      {previa && (
        <>
          {isMaximized && (
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity"
              onClick={() => setIsMaximized(false)}
            />
          )}

          <div
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
                    disabled={loadingGeracao}
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
                A geração atingiu o limite de tokens. Revise o fim do rascunho antes de usar.
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
                  onChange={(e) => setPrevia({ ...previa, conteudo: e.target.value })}
                  className="w-full h-full min-h-[180px] bg-transparent text-sm text-ink-900 font-mono leading-relaxed focus:outline-none resize-none"
                  placeholder="Edite o conteúdo em texto ou Markdown..."
                />
              ) : (
                <div className="prose prose-sm max-w-none text-ink-900 leading-relaxed font-sans [&>p]:mb-3 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-3 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-3 [&>h1]:text-base [&>h1]:font-bold [&>h1]:text-leaf-900 [&>h1]:mb-2 [&>h2]:text-sm [&>h2]:font-bold [&>h2]:text-leaf-900 [&>h2]:mb-2 [&>h3]:text-xs [&>h3]:font-bold [&>h3]:text-leaf-900 [&>h3]:mb-1 [&>strong]:font-bold [&>strong]:text-leaf-900">
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
                  onChange={(e) => setTituloResumo(e.target.value)}
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
                  disabled={loadingGeracao || !previa.conteudo.trim()}
                  onClick={handleAbrirConfirmacaoSalvar}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-leaf-700 hover:bg-leaf-800 text-xs font-bold text-white shadow-xs transition"
                >
                  <BookmarkPlus className="w-4 h-4" />
                  <span>Salvar no Prontuário</span>
                </button>

                {previa.prompt_id === 4 && onIrParaParecer && (
                  <button
                    type="button"
                    disabled={loadingGeracao || !previa.conteudo.trim()}
                    onClick={() => {
                      setIsMaximized(false);
                      onIrParaParecer(previa.conteudo);
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
                  <span>Confirmar e Gravar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Histórico de Resumos Salvos da IA */}
      <div className="bg-paper-50 p-6 rounded-2xl border border-paper-300 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-ink-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-leaf-700" />
              <span>Histórico de Resumos de IA Armazenados</span>
            </h3>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-paper-200 text-ink-700">
            {resumosSalvos.length} {resumosSalvos.length === 1 ? 'resumo' : 'resumos'}
          </span>
        </div>

        {loadingHistorico ? (
          <div className="py-8 text-center text-xs text-ink-500">
            Carregando histórico do prontuário...
          </div>
        ) : resumosSalvos.length === 0 ? (
          <div className="py-8 text-center text-xs text-ink-500 bg-paper-100/50 rounded-xl border border-dashed border-paper-300">
            Nenhum resumo de IA gravado para este paciente.
          </div>
        ) : (
          <div className="space-y-3">
            {resumosSalvos.map((resumo) => {
              const expandido = resumoExpandido === resumo.id;
              const dataFormatada = resumo.dataGeracao
                ? new Date(resumo.dataGeracao).toLocaleString('pt-BR')
                : 'Data não registrada';

              return (
                <div
                  key={resumo.id}
                  className="rounded-xl border border-paper-300 bg-paper-50 overflow-hidden transition"
                >
                  <div
                    onClick={() => setResumoExpandido(expandido ? null : resumo.id)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-paper-100/60 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-leaf-100 text-leaf-800 shrink-0">
                        Prompt #{resumo.promptTipo}
                      </span>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-ink-900 truncate">
                          {resumo.titulo}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs text-ink-500 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{dataFormatada}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExcluirResumo(resumo.id);
                        }}
                        className="p-1.5 rounded-lg text-ink-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Excluir Resumo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {expandido ? (
                        <ChevronUp className="w-4 h-4 text-ink-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-ink-600" />
                      )}
                    </div>
                  </div>

                  {expandido && (
                    <div className="px-4 pb-4 pt-2 border-t border-paper-200 bg-paper-100/40">
                      <div className="prose prose-sm max-w-none text-ink-900 text-xs leading-relaxed font-sans mb-3">
                        <ReactMarkdown>{resumo.conteudoGerado}</ReactMarkdown>
                      </div>
                      <div className="flex justify-end gap-2 pt-2 border-t border-paper-200">
                        <button
                          type="button"
                          onClick={() => handleCopiarTexto(resumo.conteudoGerado)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-paper-300 text-xs font-semibold text-ink-700 hover:bg-paper-100 transition"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Conteúdo</span>
                        </button>
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
