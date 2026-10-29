import React, { useState, useEffect } from 'react';
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
  Eye
} from 'lucide-react';
import {
  getPromptsIa,
  gerarResumoIa,
  getResumosIa,
  salvarResumoIa,
  excluirResumoIa
} from '../../services/prontuarioService';
import { useNotification } from '../../context/NotificationContext';

export default function AiAssistantSection({ pacienteId, onIrParaParecer }) {
  const { notifySuccess, notifyError } = useNotification();

  const [prompts, setPrompts] = useState([]);
  const [promptSelecionado, setPromptSelecionado] = useState(1);
  const [loadingGeracao, setLoadingGeracao] = useState(false);
  const [previa, setPrevia] = useState(null);
  const [tituloResumo, setTituloResumo] = useState('');
  const [resumosSalvos, setResumosSalvos] = useState([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [resumoExpandido, setResumoExpandido] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);

  useEffect(() => {
    carregarPrompts();
    carregarHistorico();
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
    try {
      setLoadingGeracao(true);
      setPrevia(null);
      const resultado = await gerarResumoIa(pacienteId, promptSelecionado);
      setPrevia(resultado);
      setTituloResumo(`${resultado.prompt_titulo} - ${new Date().toLocaleDateString('pt-BR')}`);
      notifySuccess('Resumo gerado com sucesso em ambiente seguro e anonimizado!');
    } catch (err) {
      console.error('Erro ao gerar resumo com IA:', err);
      const msg = err.response?.data?.error || 'Falha ao conectar com o serviço de IA.';
      notifyError(msg);
    } finally {
      setLoadingGeracao(false);
    }
  };

  const handleSalvarPrevia = async () => {
    if (!previa || !tituloResumo.trim()) {
      notifyError('Por favor, defina um título para a anotação.');
      return;
    }
    try {
      await salvarResumoIa(pacienteId, {
        titulo: tituloResumo.trim(),
        promptTipo: previa.prompt_id,
        conteudoGerado: previa.conteudo
      });
      notifySuccess('Resumo de IA salvo no histórico do prontuário!');
      setPrevia(null);
      setTituloResumo('');
      carregarHistorico();
    } catch (err) {
      console.error('Erro ao salvar resumo:', err);
      notifyError('Não foi possível salvar o resumo no prontuário.');
    }
  };

  const handleDescartarPrevia = () => {
    setPrevia(null);
    setTituloResumo('');
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
      {/* Grade de Seleção de Prompts Fixos (RF11) */}
      <div className="bg-paper-50 p-6 rounded-2xl border border-paper-300 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-ink-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-leaf-700" />
              <span>Catálogo de Prompts Clínicos Especializados</span>
            </h3>
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
                <span>Processando com IA segura...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Gerar Resumo Clínico com IA</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Prévia do Resumo Gerado (RF12) com suporte a Markdown e Janela Flexível/Redimensionável */}
      {previa && (
        <>
          {/* Backdrop quando maximizado em tela cheia */}
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
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-leaf-700 bg-leaf-100 px-2.5 py-1 rounded-lg">
                  Prévia da IA — {previa.prompt_titulo}
                </span>
                <span className="text-xs text-ink-500 font-medium hidden sm:inline">
                  (Formatação em negrito e listas suportada)
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Alternador de Modo: Formatado vs Editar Texto */}
                <div className="flex items-center bg-paper-200 p-0.5 rounded-lg border border-paper-300">
                  <button
                    type="button"
                    onClick={() => setModoEdicao(false)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition ${
                      !modoEdicao
                        ? 'bg-paper-50 text-leaf-800 shadow-xs'
                        : 'text-ink-600 hover:text-ink-900'
                    }`}
                    title="Ver com negrito e formatação"
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
                    title="Editar texto gerado antes de salvar"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                </div>

                {/* Botão Copiar */}
                <button
                  type="button"
                  onClick={() => handleCopiarTexto(previa.conteudo)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-paper-300 text-xs font-semibold text-ink-700 hover:bg-paper-100 transition"
                  title="Copiar para área de transferência"
                >
                  {copiado ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiado ? 'Copiado!' : 'Copiar'}</span>
                </button>

                {/* Botão Maximizar / Reduzir Janela */}
                <button
                  type="button"
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-paper-300 text-xs font-semibold text-ink-700 hover:bg-paper-100 transition"
                  title={isMaximized ? "Reduzir tamanho da janela" : "Expandir para tela cheia"}
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

            {/* Caixa de Conteúdo: Redimensionável verticalmente (resize-y) */}
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
                  <ReactMarkdown>{previa.conteudo}</ReactMarkdown>
                </div>
              )}
            </div>

            {!isMaximized && (
              <p className="text-[11px] text-ink-400 mt-1 flex items-center justify-between">
                <span>Dica: você pode arrastar o canto inferior direito da caixa acima para aumentar ou diminuir a altura.</span>
                <span className="font-medium text-leaf-700">Modo flexível ativo</span>
              </p>
            )}

            {/* Campo para nomear a anotação e ações */}
            <div className="mt-5 pt-4 border-t border-paper-300 flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
              <div className="flex-1 max-w-md">
                <label className="block text-xs font-bold text-ink-700 mb-1">
                  Nome/Título para Salvar no Prontuário:
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
                  onClick={handleSalvarPrevia}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-leaf-700 hover:bg-leaf-800 text-xs font-bold text-white shadow-xs transition"
                >
                  <BookmarkPlus className="w-4 h-4" />
                  <span>Salvar no Prontuário</span>
                </button>

                {/* Botão especial quando o prompt é o 4 (Estruturação para Parecer) */}
                {previa.prompt_id === 4 && onIrParaParecer && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMaximized(false);
                      onIrParaParecer(previa.conteudo);
                    }}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white shadow-xs transition"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>Ir para o Parecer Conclusivo</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
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
            {resumosSalvos.length} resumo(s)
          </span>
        </div>

        {loadingHistorico ? (
          <div className="p-8 text-center text-xs text-ink-400">Carregando histórico de resumos...</div>
        ) : resumosSalvos.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-paper-300 text-center text-xs text-ink-400">
            Nenhum resumo de IA foi salvo para este paciente ainda. Gere uma análise acima e clique em "Salvar no Prontuário".
          </div>
        ) : (
          <div className="space-y-3">
            {resumosSalvos.map((resumo) => {
              const isExpanded = resumoExpandido === resumo.id;
              const dtFormatada = new Date(resumo.dataGeracao).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={resumo.id}
                  className="rounded-xl border border-paper-300 bg-paper-50 overflow-hidden transition"
                >
                  <div
                    onClick={() => setResumoExpandido(isExpanded ? null : resumo.id)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-paper-100/50 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-leaf-100 text-leaf-800 flex-shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-ink-900 truncate">{resumo.titulo}</h4>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-ink-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-leaf-600" />
                            {dtFormatada}
                          </span>
                          <span>•</span>
                          <span className="font-semibold text-leaf-700">Prompt #{resumo.promptTipo}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExcluirResumo(resumo.id);
                        }}
                        className="p-1.5 rounded-lg text-ink-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Excluir resumo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-ink-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-ink-400" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 bg-paper-100/60 border-t border-paper-300 text-xs text-ink-900 leading-relaxed">
                      <div className="flex justify-end mb-2">
                        <button
                          onClick={() => handleCopiarTexto(resumo.conteudoGerado)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-paper-200 text-ink-700 hover:bg-paper-300 text-xs font-medium transition"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copiar</span>
                        </button>
                      </div>
                      <div className="prose prose-sm max-w-none text-ink-900 leading-relaxed font-sans [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-2 [&>strong]:font-bold [&>strong]:text-leaf-900">
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
