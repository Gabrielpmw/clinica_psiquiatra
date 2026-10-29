import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  FileText,
  Save,
  Trash2,
  Clock,
  Sparkles,
  X,
  Download,
  BookmarkPlus,
  CheckCircle2,
  Copy,
  Check,
  PlusCircle,
  Eye,
  Edit3
} from 'lucide-react';
import {
  getPareceres,
  criarParecer,
  atualizarParecer,
  excluirParecer,
  downloadParecerPdf,
  salvarResumoIa
} from '../../services/prontuarioService';
import { useNotification } from '../../context/NotificationContext';

export default function ParecerConclusivoSection({
  paciente,
  rascunhoIaInicial,
  onLimparRascunhoIa
}) {
  const { notifySuccess, notifyError } = useNotification();

  const [pareceres, setPareceres] = useState([]);
  const [loading, setLoading] = useState(false);
  const [parecerAtivoId, setParecerAtivoId] = useState(null);
  const [titulo, setTitulo] = useState('Parecer Conclusivo');
  const [corpoTexto, setCorpoTexto] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [visualizarMarkdown, setVisualizarMarkdown] = useState(false);

  // Painel de Referência com Rascunho de IA (RF12 / RF13 integrado)
  const [rascunhoIa, setRascunhoIa] = useState(rascunhoIaInicial || null);
  const [tituloResumoIa, setTituloResumoIa] = useState('Rascunho de Parecer IA');
  const [salvandoResumoIa, setSalvandoResumoIa] = useState(false);
  const [copiadoIa, setCopiadoIa] = useState(false);

  useEffect(() => {
    if (paciente?.id) {
      carregarPareceres();
    }
  }, [paciente?.id]);

  useEffect(() => {
    if (rascunhoIaInicial) {
      setRascunhoIa(rascunhoIaInicial);
    }
  }, [rascunhoIaInicial]);

  const carregarPareceres = async () => {
    try {
      setLoading(true);
      const data = await getPareceres(paciente.id);
      const lista = Array.isArray(data) ? data : data.results || [];
      setPareceres(lista);
      if (lista.length > 0 && !parecerAtivoId) {
        selecionarParecer(lista[0]);
      } else if (lista.length === 0) {
        novoParecer();
      }
    } catch (err) {
      console.error('Erro ao carregar pareceres:', err);
    } finally {
      setLoading(false);
    }
  };

  const selecionarParecer = (p) => {
    setParecerAtivoId(p.id);
    setTitulo(p.titulo || 'Parecer Conclusivo');
    setCorpoTexto(p.corpoTexto || '');
  };

  const novoParecer = () => {
    setParecerAtivoId(null);
    setTitulo(`Parecer Conclusivo - ${new Date().toLocaleDateString('pt-BR')}`);
    setCorpoTexto('');
    setVisualizarMarkdown(false);
  };

  const handleSalvarParecer = async () => {
    if (!corpoTexto.trim()) {
      notifyError('O corpo do parecer não pode estar em branco.');
      return;
    }
    try {
      setSalvando(true);
      if (parecerAtivoId) {
        await atualizarParecer(parecerAtivoId, {
          titulo: titulo.trim(),
          corpoTexto: corpoTexto.trim()
        });
        notifySuccess('Parecer Conclusivo atualizado com sucesso!');
      } else {
        const criado = await criarParecer(paciente.id, {
          titulo: titulo.trim() || 'Parecer Conclusivo',
          corpoTexto: corpoTexto.trim()
        });
        setParecerAtivoId(criado.id);
        notifySuccess('Novo Parecer Conclusivo salvo com sucesso!');
      }
      carregarPareceres();
    } catch (err) {
      console.error('Erro ao salvar parecer:', err);
      notifyError('Erro ao salvar o parecer.');
    } finally {
      setSalvando(false);
    }
  };

  const handleSalvarComoNovoParecer = async () => {
    if (!corpoTexto.trim()) {
      notifyError('O corpo do parecer não pode estar em branco.');
      return;
    }
    try {
      setSalvando(true);
      const novoTitulo = titulo.includes('(Novo)')
        ? titulo
        : `${titulo.trim()} (Novo)`;
      const criado = await criarParecer(paciente.id, {
        titulo: novoTitulo,
        corpoTexto: corpoTexto.trim()
      });
      setParecerAtivoId(criado.id);
      setTitulo(criado.titulo);
      notifySuccess('Novo Parecer Conclusivo salvo no histórico com sucesso!');
      carregarPareceres();
    } catch (err) {
      console.error('Erro ao salvar como novo parecer:', err);
      notifyError('Erro ao salvar novo parecer.');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluirParecer = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este parecer conclusivo?')) return;
    try {
      await excluirParecer(id);
      notifySuccess('Parecer excluído.');
      if (parecerAtivoId === id) {
        novoParecer();
      }
      carregarPareceres();
    } catch (err) {
      console.error('Erro ao excluir parecer:', err);
      notifyError('Erro ao excluir o parecer.');
    }
  };

  const handleExportarPdf = async () => {
    if (!parecerAtivoId) {
      notifyError('Por favor, salve o parecer antes de exportar o PDF.');
      return;
    }
    try {
      const blob = await downloadParecerPdf(parecerAtivoId);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Parecer_${paciente?.nomeCompleto?.replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      notifySuccess('Download do PDF iniciado com sucesso!');
    } catch (err) {
      console.error('Erro ao exportar PDF:', err);
      notifyError('Erro ao gerar o PDF do parecer.');
    }
  };

  // Salvar o rascunho de IA no banco de resumos diretamente pelo painel
  const handleSalvarRascunhoIa = async () => {
    if (!rascunhoIa || !tituloResumoIa.trim()) return;
    try {
      setSalvandoResumoIa(true);
      await salvarResumoIa(paciente.id, {
        titulo: tituloResumoIa.trim(),
        promptTipo: 4,
        conteudoGerado: rascunhoIa
      });
      notifySuccess('Rascunho de IA salvo no histórico do prontuário!');
    } catch (err) {
      console.error('Erro ao salvar rascunho:', err);
      notifyError('Erro ao salvar o resumo da IA.');
    } finally {
      setSalvandoResumoIa(false);
    }
  };

  const handleFecharRascunho = () => {
    setRascunhoIa(null);
    if (onLimparRascunhoIa) onLimparRascunhoIa();
  };

  const handleCopiarRascunho = () => {
    if (!rascunhoIa) return;
    navigator.clipboard.writeText(rascunhoIa);
    setCopiadoIa(true);
    setTimeout(() => setCopiadoIa(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Barra de Ações do Parecer */}
      <div className="bg-paper-50 p-6 rounded-2xl border border-paper-300 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-ink-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-leaf-700" />
            <span>Parecer Conclusivo</span>
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botão Novo Parecer */}
          <button
            onClick={novoParecer}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-paper-300 text-xs font-bold text-ink-700 hover:bg-paper-200/60 transition"
            title="Criar um novo parecer em branco para este paciente"
          >
            <PlusCircle className="w-4 h-4 text-leaf-600" />
            <span>+ Novo Parecer</span>
          </button>

          {/* Botão Baixar PDF */}
          <button
            onClick={handleExportarPdf}
            disabled={!parecerAtivoId}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-bold transition ${
              parecerAtivoId
                ? 'border-leaf-600 text-leaf-800 bg-leaf-50 hover:bg-leaf-100 shadow-xs'
                : 'border-paper-300 text-ink-400 bg-paper-100 cursor-not-allowed'
            }`}
            title={parecerAtivoId ? "Fazer download do documento em PDF pronto para impressão" : "Salve o parecer para habilitar o download"}
          >
            <Download className="w-4 h-4 text-leaf-700" />
            <span>Baixar em PDF</span>
          </button>

          {/* Salvar como Novo (quando já existe um selecionado) */}
          {parecerAtivoId && (
            <button
              onClick={handleSalvarComoNovoParecer}
              disabled={salvando}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-leaf-700 text-leaf-800 hover:bg-leaf-50 text-xs font-bold transition shadow-xs"
              title="Salvar uma cópia como novo parecer independente"
            >
              <BookmarkPlus className="w-4 h-4 text-leaf-700" />
              <span>Salvar como Novo Parecer</span>
            </button>
          )}

          {/* Salvar Parecer / Atualizar Parecer */}
          <button
            onClick={handleSalvarParecer}
            disabled={salvando}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-leaf-700 hover:bg-leaf-800 text-xs font-bold text-white shadow-xs transition"
          >
            <Save className="w-4 h-4" />
            <span>
              {salvando
                ? 'Salvando...'
                : parecerAtivoId
                ? 'Salvar Alterações'
                : 'Salvar Parecer'}
            </span>
          </button>
        </div>
      </div>

      {/* Layout Split-View: Editor de Parecer + Painel de Referência da IA */}
      <div className={`grid gap-6 ${rascunhoIa ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'}`}>
        {/* Coluna Principal: Editor do Parecer */}
        <div className={rascunhoIa ? 'lg:col-span-7 space-y-4' : 'space-y-4'}>
          <div className="bg-paper-50 p-6 rounded-2xl border border-paper-300 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex-1">
                <label className="block text-xs font-bold text-ink-700 mb-1">
                  Título / Identificação do Parecer:
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Parecer Conclusivo de Avaliação Neuropsicológica"
                  className="w-full py-2 px-3 rounded-lg border border-paper-300 text-sm font-semibold text-ink-900 focus:ring-1 focus:ring-leaf-500 focus:outline-none bg-white"
                />
              </div>

              {parecerAtivoId && (
                <div className="sm:self-end pb-1">
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-leaf-100 text-leaf-800 border border-leaf-300">
                    Editando parecer salvo
                  </span>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-ink-700">
                  Corpo do Parecer Conclusivo:
                </label>

                {/* Alternador de Modo: Editor vs Prévia Formatada */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ink-500">
                    {corpoTexto.length} caracteres
                  </span>

                  <div className="flex items-center bg-paper-200 p-0.5 rounded-lg border border-paper-300">
                    <button
                      type="button"
                      onClick={() => setVisualizarMarkdown(false)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition ${
                        !visualizarMarkdown
                          ? 'bg-paper-50 text-leaf-800 shadow-xs'
                          : 'text-ink-600 hover:text-ink-900'
                      }`}
                      title="Editar texto"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVisualizarMarkdown(true)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition ${
                        visualizarMarkdown
                          ? 'bg-paper-50 text-leaf-800 shadow-xs'
                          : 'text-ink-600 hover:text-ink-900'
                      }`}
                      title="Visualizar formatado com negrito e tópicos"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Prévia Formatada</span>
                    </button>
                  </div>
                </div>
              </div>

              {visualizarMarkdown ? (
                <div className="w-full min-h-[350px] p-5 rounded-xl border border-paper-300 bg-white overflow-y-auto max-h-[550px] shadow-xs">
                  {corpoTexto.trim() ? (
                    <div className="prose prose-sm max-w-none text-ink-900 leading-relaxed font-sans [&>p]:mb-3 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-3 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-3 [&>h1]:text-base [&>h1]:font-bold [&>h1]:text-leaf-900 [&>h1]:mb-2 [&>h2]:text-sm [&>h2]:font-bold [&>h2]:text-leaf-900 [&>h2]:mb-2 [&>h3]:text-xs [&>h3]:font-bold [&>h3]:text-leaf-900 [&>h3]:mb-1 [&>strong]:font-bold [&>strong]:text-leaf-900">
                      <ReactMarkdown>{corpoTexto}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-xs text-ink-400 italic">
                      Nenhum texto inserido ainda. Alterne para o modo "Editar" para redigir o parecer.
                    </p>
                  )}
                </div>
              ) : (
                <textarea
                  value={corpoTexto}
                  onChange={(e) => setCorpoTexto(e.target.value)}
                  rows={rascunhoIa ? 18 : 14}
                  placeholder="Redija aqui o parecer clínico conclusivo. Use **negrito** para destacar termos importantes. O PDF gerado respeitará a formatação..."
                  className="w-full p-4 rounded-xl border border-paper-300 text-sm text-ink-900 font-normal leading-relaxed focus:ring-1 focus:ring-leaf-500 focus:outline-none resize-y bg-white"
                />
              )}

              <p className="text-[11px] text-ink-500 mt-1">
                Dica: Você pode usar <code>**palavra**</code> para deixar em negrito e <code>- item</code> para listas. O PDF será baixado com a mesma formatação visual.
              </p>
            </div>
          </div>
        </div>

        {/* Coluna Lateral: Painel de Referência com Rascunho da IA (Split-View) */}
        {rascunhoIa && (
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-amber-50/70 p-5 rounded-2xl border-2 border-amber-300/80 shadow-sm flex flex-col h-full">
              <div className="flex items-center justify-between pb-3 border-b border-amber-200">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-600 text-white rounded-lg">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                      Referência de IA na Tela
                    </h4>
                    <p className="text-xs text-amber-800">Minuta de apoio para o parecer</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handleCopiarRascunho}
                    className="p-1.5 rounded-lg text-amber-900 hover:bg-amber-200/60 transition"
                    title="Copiar rascunho"
                  >
                    {copiadoIa ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={handleFecharRascunho}
                    className="p-1.5 rounded-lg text-amber-900 hover:bg-amber-200/60 transition"
                    title="Fechar painel de referência"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Conteúdo rolável do rascunho de IA renderizado com Markdown */}
              <div className="mt-3 flex-1 overflow-y-auto max-h-[460px] p-3 rounded-xl bg-white/90 border border-amber-200 text-xs text-ink-900 leading-relaxed">
                <div className="prose prose-sm max-w-none text-ink-900 font-sans [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-4 [&>ul]:mb-2 [&>strong]:font-bold [&>strong]:text-amber-950">
                  <ReactMarkdown>{rascunhoIa}</ReactMarkdown>
                </div>
              </div>

              {/* Opção para a doutora decidir salvar este rascunho no banco ou não */}
              <div className="mt-3 pt-3 border-t border-amber-200 space-y-2">
                <div className="text-xs text-amber-900 font-semibold">
                  Deseja salvar este rascunho de IA no histórico?
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tituloResumoIa}
                    onChange={(e) => setTituloResumoIa(e.target.value)}
                    placeholder="Título para o resumo de IA"
                    className="flex-1 py-1 px-2.5 rounded-lg border border-amber-300 text-xs bg-white text-ink-900 focus:outline-none"
                  />
                  <button
                    onClick={handleSalvarRascunhoIa}
                    disabled={salvandoResumoIa}
                    className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    <span>{salvandoResumoIa ? '...' : 'Salvar'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lista de Pareceres Anteriores deste Paciente (Múltiplos Pareceres) */}
      <div className="bg-paper-50 p-6 rounded-2xl border border-paper-300 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-sm text-ink-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-leaf-700" />
            <span>Histórico de Pareceres Conclusivos deste Paciente ({pareceres.length})</span>
          </h4>
        </div>

        {loading ? (
          <div className="p-4 text-xs text-ink-400">Carregando pareceres...</div>
        ) : pareceres.length === 0 ? (
          <div className="p-6 text-center text-xs text-ink-400 border border-dashed border-paper-300 rounded-xl">
            Nenhum parecer cadastrado. Preencha o formulário acima e clique em "Salvar Parecer".
          </div>
        ) : (
          <div className="space-y-2">
            {pareceres.map((p) => {
              const isSelected = parecerAtivoId === p.id;
              const dt = new Date(p.dataEmissao).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={p.id}
                  onClick={() => selecionarParecer(p)}
                  className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    isSelected
                      ? 'border-leaf-600 bg-leaf-50/80 ring-2 ring-leaf-500/20'
                      : 'border-paper-300 bg-paper-50 hover:bg-paper-100/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-leaf-700 text-white' : 'bg-leaf-100 text-leaf-800'}`}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-ink-900 truncate">{p.titulo}</span>
                        {isSelected && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-leaf-700 text-white">
                            Em Edição
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-ink-500 mt-0.5">Emitido em {dt}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExcluirParecer(p.id);
                      }}
                      className="p-1.5 rounded-lg text-ink-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Excluir este parecer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
