import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Calendar,
  CheckSquare,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Info,
  ArrowLeft,
  XCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

export default function AiSourcesAndReview({
  fontesRef,
  revisaoRef,
  fontes,
  loadingFontes,
  erroFontes,
  onRecarregarFontes,
  sessaoIdsSelecionadas,
  onToggleSessao,
  preparandoRevisao,
  onSolicitarRevisao,
  onCancelarPreparacao,
  revisao,
  avisoAlteracao,
  onVoltarSelecao,
  onCancelarRevisao,
  onConfirmarGerar,
  onIrParaProntuario,
  activeGeneration,
  confirmandoGeracao,
}) {
  const [mostrarInfoPrivacidade, setMostrarInfoPrivacidade] = useState(false);
  const [mostrarConfirmacaoPrivacidade, setMostrarConfirmacaoPrivacidade] = useState(false);

  // Reinicia estados locais de aviso e confirmação sempre que a revisão mudar ou for encerrada
  useEffect(() => {
    setMostrarInfoPrivacidade(false);
    setMostrarConfirmacaoPrivacidade(false);
  }, [revisao]);

  // Permite fechar o diálogo ou aviso por teclado (Escape) sem disparar geração
  useEffect(() => {
    if (!mostrarConfirmacaoPrivacidade && !mostrarInfoPrivacidade) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (mostrarConfirmacaoPrivacidade) setMostrarConfirmacaoPrivacidade(false);
        else setMostrarInfoPrivacidade(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mostrarConfirmacaoPrivacidade, mostrarInfoPrivacidade]);

  const sessoes = Array.isArray(fontes?.sessoes) ? fontes.sessoes : [];
  const sessoesComAnotacao = sessoes.filter((s) => s.tem_anotacao);
  const algumaFonteDisponivel = sessoesComAnotacao.length > 0;
  const algumaFonteSelecionada = sessaoIdsSelecionadas.length > 0;
  const bloqueioInteracao = preparandoRevisao || !!activeGeneration || confirmandoGeracao;

  if (revisao) {
    const fontesBloqueadas = (revisao.avisos?.fontes || []).filter((f) => f.bloqueada);
    const bloqueado = Boolean(revisao.bloqueado || revisao.avisos?.bloqueado);
    const desabilitarEnvio = bloqueado || !!activeGeneration || confirmandoGeracao;

    return (
      <section
        ref={revisaoRef}
        tabIndex={-1}
        aria-labelledby="revisar-dados-heading"
        className="mt-5 rounded-2xl border-2 border-leaf-500/80 bg-paper-50 p-4 sm:p-5 space-y-5 animate-fadeIn focus:outline-none"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-paper-300">
          <div>
            <h4 id="revisar-dados-heading" className="text-sm sm:text-base font-bold text-ink-900 flex items-center gap-2">
              {bloqueado ? (
                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" aria-hidden="true" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-leaf-700 shrink-0" aria-hidden="true" />
              )}
              <span>Revisar dados</span>
            </h4>
            <p className="text-xs text-ink-600 mt-0.5">
              Roteiro: <strong className="text-ink-900">Prompt #{revisao.promptId} — {revisao.promptTitulo}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onVoltarSelecao}
            disabled={confirmandoGeracao || !!activeGeneration}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-paper-300 bg-paper-100 hover:bg-paper-200 text-xs font-semibold text-ink-800 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500 disabled:opacity-50"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Alterar sessões</span>
          </button>
        </div>

        {/* Fontes incluídas (apenas sessões anotadas selecionadas) */}
        <div className="space-y-2">
          <h5 className="text-xs font-bold uppercase tracking-wider text-ink-700">
            Sessões incluídas nesta revisão
          </h5>
          <div className="flex flex-wrap gap-2">
            {revisao.referenciasSessao.map((refSessao) => (
              <span
                key={refSessao.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-paper-200 text-ink-900 border border-paper-300 text-xs font-medium"
              >
                <Calendar className="w-3.5 h-3.5 text-leaf-700" aria-hidden="true" />
                <span>
                  {refSessao.data || 'Sem data'} — {refSessao.tipo === 'AVALIATIVA' ? 'Avaliativa' : 'Interventiva'}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Bloqueio global caso haja identificador sem tratamento seguro */}
        {bloqueado && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-xs text-red-900 space-y-2.5"
          >
            <div className="flex items-start gap-2 font-semibold">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                A geração está bloqueada porque há possível identificador sem tratamento seguro (<code className="px-1 py-0.5 rounded bg-red-100 font-mono">[Trecho retido]</code>) em uma ou mais sessões selecionadas. Remova a sessão afetada ou ajuste o registro no prontuário e revise novamente.
              </span>
            </div>
            {fontesBloqueadas.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pl-6">
                {fontesBloqueadas.map((fonte) => (
                  <div key={`${fonte.tipo}-${fonte.id}`} className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-red-950">{fonte.titulo}:</span>
                    {onIrParaProntuario && (
                      <button
                        type="button"
                        onClick={() => onIrParaProntuario(fonte)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-700 text-white font-semibold hover:bg-red-800 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                      >
                        <ExternalLink className="w-3 h-3" aria-hidden="true" />
                        <span>Abrir no prontuário</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Contexto tratado que será enviado */}
        <div className="space-y-2">
          <h5 className="text-xs font-bold uppercase tracking-wider text-ink-700">
            Versão tratada que será enviada para geração do resumo
          </h5>
          <pre
            aria-label="Contexto clínico tratado para geração"
            className="max-h-96 overflow-auto rounded-xl border border-paper-300 bg-paper-100 p-3.5 text-xs text-ink-900 font-mono leading-relaxed whitespace-pre-wrap break-words"
          >
            {revisao.contexto}
          </pre>
        </div>

        {/* Aviso curto acionado pelo botão de informação */}
        {mostrarInfoPrivacidade && (
          <div
            id="info-privacidade-gemini"
            role="note"
            className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-950 flex items-start justify-between gap-3"
          >
            <div className="flex items-start gap-2 leading-relaxed">
              <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" aria-hidden="true" />
              <p>
                As anotações das sessões não devem conter nome, contato, documento ou outro dado capaz de identificar o paciente. Apenas o conteúdo tratado das sessões selecionadas será enviado ao Gemini (a anamnese nunca é enviada).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMostrarInfoPrivacidade(false)}
              aria-label="Fechar aviso de privacidade"
              className="shrink-0 text-blue-800 hover:text-blue-950 font-semibold px-1.5 py-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Fechar
            </button>
          </div>
        )}

        <div className="pt-3 border-t border-paper-300 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancelarRevisao}
            disabled={confirmandoGeracao || !!activeGeneration}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-paper-300 text-xs font-bold text-ink-700 hover:bg-paper-200/70 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500 disabled:opacity-50"
          >
            <XCircle className="w-4 h-4 text-ink-500" aria-hidden="true" />
            <span>Cancelar</span>
          </button>

          <button
            type="button"
            onClick={onVoltarSelecao}
            disabled={confirmandoGeracao || !!activeGeneration}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-paper-300 bg-paper-100 text-xs font-bold text-ink-800 hover:bg-paper-200 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500 disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Voltar à seleção</span>
          </button>

          <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setMostrarInfoPrivacidade((prev) => !prev)}
              aria-expanded={mostrarInfoPrivacidade}
              aria-controls="info-privacidade-gemini"
              aria-label="Informações de privacidade do envio ao Gemini"
              title="Informações de privacidade"
              className="inline-flex items-center justify-center min-h-[40px] min-w-[40px] px-2.5 py-2 rounded-xl border border-paper-300 bg-paper-100 text-ink-700 hover:bg-paper-200 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500"
            >
              <Info className="w-4 h-4 text-leaf-700" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (desabilitarEnvio) return;
                setMostrarConfirmacaoPrivacidade(true);
              }}
              disabled={desabilitarEnvio}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 min-h-[40px] px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500 ${
                desabilitarEnvio
                  ? 'bg-ink-400 cursor-not-allowed'
                  : 'bg-leaf-700 hover:bg-leaf-800 active:scale-[0.98]'
              }`}
            >
              {confirmandoGeracao ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Gerando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" aria-hidden="true" />
                  <span>Gerar rascunho</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Diálogo curto de confirmação de privacidade por tentativa */}
        {mostrarConfirmacaoPrivacidade && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirmar-privacidade-heading"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/50 backdrop-blur-[1px]"
            onClick={(e) => {
              if (e.target === e.currentTarget) setMostrarConfirmacaoPrivacidade(false);
            }}
          >
            <div className="w-full max-w-md rounded-2xl border border-paper-300 bg-paper-50 p-5 shadow-xl space-y-4">
              <div className="flex items-start gap-2.5">
                <Info className="w-5 h-5 text-leaf-700 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-1.5">
                  <h5 id="confirmar-privacidade-heading" className="text-sm font-bold text-ink-900">
                    Confirmar envio ao Gemini
                  </h5>
                  <p className="text-xs text-ink-700 leading-relaxed">
                    As anotações das sessões não devem conter nome, contato, documento ou outro dado capaz de identificar o paciente. Apenas o conteúdo tratado das sessões selecionadas será enviado ao Gemini.
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-paper-200">
                <button
                  type="button"
                  onClick={() => setMostrarConfirmacaoPrivacidade(false)}
                  className="inline-flex items-center justify-center min-h-[40px] px-4 py-2 rounded-xl border border-paper-300 bg-paper-100 hover:bg-paper-200 text-xs font-bold text-ink-800 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const revisaoAlvo = revisao;
                    setMostrarConfirmacaoPrivacidade(false);
                    onConfirmarGerar({
                      confirmacaoPrivacidade: true,
                      revisaoAlvo,
                    });
                  }}
                  disabled={desabilitarEnvio}
                  className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-4 py-2 rounded-xl bg-leaf-700 hover:bg-leaf-800 text-xs font-bold text-white shadow-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Confirmar e gerar</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section
      ref={fontesRef}
      tabIndex={-1}
      aria-labelledby="fontes-resumo-heading"
      className="mt-5 pt-5 border-t border-paper-300 space-y-4 focus:outline-none"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 id="fontes-resumo-heading" className="text-sm font-bold text-ink-900 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-leaf-700" aria-hidden="true" />
            <span>Fontes do resumo</span>
          </h4>
          <p className="text-xs text-ink-600 mt-0.5">
            Todas as sessões começam desmarcadas. Escolha apenas as sessões com anotação para revisar antes de gerar.
          </p>
        </div>

        <button
          type="button"
          onClick={onRecarregarFontes}
          disabled={loadingFontes || bloqueioInteracao}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-paper-300 text-xs font-semibold text-ink-700 hover:bg-paper-100 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingFontes ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span>Atualizar fontes</span>
        </button>
      </div>

      {avisoAlteracao && (
        <p role="status" className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700" aria-hidden="true" />
          <span>{avisoAlteracao}</span>
        </p>
      )}

      {loadingFontes ? (
        <div className="py-6 flex items-center justify-center gap-2 text-xs text-ink-600">
          <Loader2 className="w-4 h-4 animate-spin text-leaf-700" aria-hidden="true" />
          <span>Carregando sessões anotadas...</span>
        </div>
      ) : erroFontes ? (
        <div role="alert" className="p-3.5 rounded-xl border border-amber-300 bg-amber-50 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" aria-hidden="true" />
            <span>{erroFontes}</span>
          </span>
          <button
            type="button"
            onClick={onRecarregarFontes}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold"
          >
            Tentar novamente
          </button>
        </div>
      ) : !algumaFonteDisponivel ? (
        <div className="p-4 rounded-xl border border-paper-300 bg-paper-100 text-xs text-ink-700 space-y-1">
          <p className="font-semibold text-ink-900">Nenhuma sessão com anotação disponível.</p>
          <p>
            Registre anotações nas sessões do prontuário para preparar um novo resumo. O histórico de resumos salvos continua acessível abaixo.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Lista apenas de sessões anotadas autorizadas */}
          <div className="space-y-2">
            <span className="block text-xs font-bold uppercase tracking-wider text-ink-600">
              Sessões anotadas ({sessoesComAnotacao.length})
            </span>

            <ul className="space-y-2">
              {sessoesComAnotacao.map((sessao) => {
                const selecionada = sessaoIdsSelecionadas.includes(sessao.id);
                return (
                  <li key={sessao.id}>
                    <label
                      className={`flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-3 rounded-xl border transition cursor-pointer ${
                        selecionada
                          ? 'bg-leaf-100/60 border-leaf-600'
                          : 'bg-paper-100 border-paper-300 hover:border-leaf-400'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={selecionada}
                          disabled={bloqueioInteracao}
                          onChange={() => onToggleSessao(sessao.id)}
                          className="mt-0.5 sm:mt-0 h-4 w-4 rounded border-paper-400 text-leaf-700 focus:ring-2 focus:ring-leaf-500 shrink-0"
                        />
                        <div className="min-w-0 text-xs">
                          <div className="font-bold text-ink-900 flex flex-wrap items-center gap-1.5">
                            <span>{sessao.data || 'Data não informada'}</span>
                            <span>·</span>
                            <span>Sessão {sessao.tipo_label || sessao.tipo}</span>
                          </div>
                          <div className="text-ink-600 mt-0.5">
                            Status: {sessao.status}
                          </div>
                        </div>
                      </div>

                      <span className="shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-leaf-50 text-leaf-800 border-leaf-300">
                        Com anotação
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>

          {!algumaFonteSelecionada && (
            <p className="text-xs text-ink-600">
              Marque pelo menos uma sessão com anotação para habilitar a revisão dos dados.
            </p>
          )}
        </div>
      )}

      {preparandoRevisao && (
        <div role="status" className="p-3.5 rounded-xl bg-leaf-50 border border-leaf-200 flex flex-wrap items-center justify-between gap-2 text-xs text-leaf-900">
          <span className="flex items-center gap-2 font-semibold">
            <Loader2 className="w-4 h-4 animate-spin text-leaf-700" aria-hidden="true" />
            <span>Preparando e mascarando sessões selecionadas para revisão...</span>
          </span>
          <button
            type="button"
            onClick={onCancelarPreparacao}
            className="text-cancelled font-semibold hover:underline"
          >
            Cancelar preparação
          </button>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onSolicitarRevisao}
          disabled={!algumaFonteDisponivel || !algumaFonteSelecionada || bloqueioInteracao}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-xs transition focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500 ${
            !algumaFonteDisponivel || !algumaFonteSelecionada || bloqueioInteracao
              ? 'bg-ink-400 cursor-not-allowed'
              : 'bg-leaf-700 hover:bg-leaf-800 active:scale-[0.98]'
          }`}
        >
          {preparandoRevisao ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>Preparando revisão...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span>Revisar dados</span>
            </>
          )}
        </button>
      </div>
    </section>
  );
}
