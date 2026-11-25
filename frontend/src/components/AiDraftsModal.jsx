import React, { useEffect, useRef } from 'react';
import { X, Sparkles, Loader2, Clock, Trash2, ArrowRight, AlertTriangle } from 'lucide-react';
import { useAiGeneration } from '../context/AiGenerationContext';

export default function AiDraftsModal({ isOpen, onClose, onReview, onFollow }) {
  const { activeGeneration, generationError, pendingDrafts, cancelarGeracao, descartarRascunho } = useAiGeneration();
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => dialog.close();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none items-center justify-center bg-transparent p-3 sm:p-4 open:flex backdrop:bg-ink-900/60 backdrop:backdrop-blur-xs"
      onClick={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-labelledby="ai-drafts-title"
    >
      <div
        className="w-full max-w-lg bg-paper-50 rounded-2xl shadow-2xl border border-paper-300 overflow-hidden flex flex-col max-h-[85vh] animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-leaf-900 text-paper-50 flex items-center justify-between border-b border-leaf-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-leaf-700">
              <Sparkles className="w-5 h-5 text-paper-50" />
            </div>
            <div>
              <h3 id="ai-drafts-title" className="font-bold text-sm sm:text-base">
                Rascunhos da IA
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-leaf-200 hover:text-paper-50 hover:bg-leaf-800 transition"
            title="Fechar (Esc)"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {generationError && (
            <div className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              <p role="alert" className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                {generationError.mensagemGlobal}
              </p>
              {(generationError.porInatividade || (generationError.pacienteId && generationError.codigo !== 'SEM_AUTORIZACAO')) && (
                <button
                  type="button"
                  onClick={() => onFollow(generationError)}
                  className="flex items-center gap-1 rounded-lg bg-paper-50 px-3 py-1.5 font-semibold text-leaf-900 hover:bg-leaf-100"
                >
                  Ir para o resumo
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          )}
          {/* Geração Ativa */}
          {activeGeneration && (
            <div className="p-4 rounded-xl bg-leaf-50 border border-leaf-300 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-leaf-900 flex items-center gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin text-leaf-700" />
                  Geração em Andamento
                </span>
                <span className="text-[11px] text-ink-600 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-ink-400" />
                  Início: {activeGeneration.iniciadoEm}
                </span>
              </div>

              <p className="text-xs font-semibold text-ink-800 mb-2">
                Roteiro: {activeGeneration.promptTitulo}
              </p>

              {/* Barra de Progresso */}
              <div className="space-y-1 mb-3">
                <div className="flex justify-between text-[11px] text-leaf-800 font-medium">
                  <span className="truncate max-w-[280px]">{activeGeneration.progresso.text}</span>
                  {activeGeneration.fase !== 'gerando' && <span>{activeGeneration.progresso.percent}%</span>}
                </div>
                <div className="w-full bg-leaf-200/60 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`bg-leaf-700 h-1.5 rounded-full transition-all duration-300 ${activeGeneration.fase === 'gerando' ? 'animate-pulse' : ''}`}
                    style={{ width: activeGeneration.fase === 'gerando' ? '100%' : `${Math.max(5, activeGeneration.progresso.percent)}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelarGeracao}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-paper-100 hover:bg-cancelledBg hover:text-cancelled text-ink-700 border border-paper-300 transition"
                >
                  Cancelar geração
                </button>
                <button
                  type="button"
                  onClick={() => onFollow(activeGeneration)}
                  className="flex items-center gap-1 rounded-lg bg-leaf-700 px-3 py-1.5 text-xs font-semibold text-paper-50 hover:bg-leaf-800"
                >
                  Ir para o resumo
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {/* Rascunhos Pendentes */}
          {pendingDrafts.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-ink-700 uppercase tracking-wider">
                Rascunhos Pendentes de Revisão ({pendingDrafts.length})
              </h4>
              {pendingDrafts.map((draft) => (
                <div
                  key={draft.id}
                  className="p-3.5 rounded-xl bg-paper-100 border border-paper-300 flex items-center justify-between gap-3 hover:border-leaf-400 transition"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ink-900 truncate">
                      {draft.promptTitulo}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-ink-600 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-ink-400" />
                        Concluído às {draft.geradoEm}
                      </span>
                      <span>•</span>
                      <span className="text-leaf-700 font-semibold">Pendente</span>
                      {draft.avisoTokens && (
                        <>
                          <span>•</span>
                          <span className="text-amber-700 font-semibold flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3" /> Limite atingido
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onReview(draft)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-leaf-700 hover:bg-leaf-800 text-paper-50 text-xs font-semibold transition"
                      title="Abrir no prontuário para revisar"
                    >
                      <span>Revisar</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => descartarRascunho(draft.id)}
                      className="p-1.5 rounded-lg text-ink-400 hover:text-cancelled hover:bg-cancelledBg transition"
                      title="Descartar rascunho sem salvar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Estado Vazio */}
          {!activeGeneration && !generationError && pendingDrafts.length === 0 && (
            <div className="py-8 text-center text-ink-600">
              <Sparkles className="w-8 h-8 text-leaf-500 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-ink-800">Nenhum rascunho ativo</p>
              <p className="text-xs mt-1 text-ink-600">
                Ao iniciar uma geração no prontuário, você pode acompanhar seu progresso aqui mesmo enquanto navega por outras telas.
              </p>
            </div>
          )}
        </div>

      </div>
    </dialog>
  );
}
