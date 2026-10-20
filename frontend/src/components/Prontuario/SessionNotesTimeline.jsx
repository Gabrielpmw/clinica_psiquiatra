import React, { useState } from 'react';
import {
  Clock,
  Plus,
  Send,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { criarAnotacao } from '../../services/prontuarioService';
import { useNotification } from '../../context/NotificationContext';

export default function SessionNotesTimeline({
  pacienteId,
  anotacoes = [],
  sessoes = [],
  onNovaAnotacao,
}) {
  const { notifySuccess, notifyError } = useNotification();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const [formData, setFormData] = useState({
    sessao: '',
    textoLivre: '',
  });

  const formatDataHora = (dataStr) => {
    if (!dataStr) return '';
    return new Date(dataStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleSalvarAnotacao = async (e) => {
    e.preventDefault();
    setErro('');

    if (!formData.sessao) {
      setErro('Selecione a sessão correspondente para vincular a anotação.');
      return;
    }

    if (!formData.textoLivre.trim()) {
      setErro('Digite o conteúdo da anotação da sessão.');
      return;
    }

    try {
      setSalvando(true);
      const nova = await criarAnotacao(pacienteId, {
        sessao: formData.sessao,
        textoLivre: formData.textoLivre,
      });

      notifySuccess('Anotação de sessão registrada com sucesso!');
      if (onNovaAnotacao) onNovaAnotacao(nova);

      setFormData({ sessao: '', textoLivre: '' });
      setMostrarForm(false);
    } catch (err) {
      console.error('Erro ao salvar anotação:', err);
      const msg =
        err.response?.data?.sessao?.[0] ||
        err.response?.data?.detail ||
        'Erro ao salvar anotação da sessão.';
      setErro(msg);
      notifyError(msg);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="bg-paper-50 rounded-2xl border border-paper-300 shadow-xs overflow-hidden">
      {/* Cabeçalho */}
      <div className="px-6 py-4 bg-paper-200 border-b border-paper-300 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-ink-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-leaf-700" />
            Linha do Tempo de Sessões (Evolução Clínica)
          </h3>
          <p className="text-xs text-ink-600 mt-0.5">
            Histórico cronológico das sessões avaliativas e interventivas realizadas.
          </p>
        </div>

        <button
          onClick={() => setMostrarForm(!mostrarForm)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-leaf-700 hover:bg-leaf-600 text-paper-50 text-xs font-semibold shadow-xs transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{mostrarForm ? 'Fechar Formulário' : 'Nova Anotação'}</span>
        </button>
      </div>

      {/* Formulário Inline para Inserção de Nova Anotação */}
      {mostrarForm && (
        <form onSubmit={handleSalvarAnotacao} className="p-6 bg-paper-100 border-b border-paper-300 space-y-4 animate-fade-in">
          <h4 className="text-sm font-semibold text-ink-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-leaf-700" />
            Registrar Anotação para a Sessão
          </h4>

          {erro && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-600 uppercase tracking-wider mb-1">
                Sessão Correspondente *
              </label>
              <select
                value={formData.sessao}
                onChange={(e) => setFormData({ ...formData, sessao: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-paper-50 border border-paper-300 text-ink-900 focus:outline-none focus:ring-2 focus:ring-leaf-500 text-xs font-medium"
                required
              >
                <option value="">Selecione a sessão...</option>
                {sessoes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {new Date(s.dataHoraInicio).toLocaleDateString('pt-BR')} às{' '}
                    {new Date(s.dataHoraInicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                    — {s.tipo === 'AVALIATIVA' ? 'Sessão Avaliativa' : 'Sessão Interventiva'} ({s.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-600 uppercase tracking-wider mb-1">
              Texto Livre da Sessão ("Sessão Avaliativa/Interventiva") *
            </label>
            <textarea
              rows={4}
              value={formData.textoLivre}
              onChange={(e) => setFormData({ ...formData, textoLivre: e.target.value })}
              placeholder="Descreva a evolução do paciente na sessão, respostas a estímulos, engajamento e condutas planejadas..."
              className="w-full p-3 rounded-xl bg-paper-50 border border-paper-300 text-ink-900 focus:outline-none focus:ring-2 focus:ring-leaf-500 text-sm resize-none"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setMostrarForm(false)}
              className="px-4 py-2 rounded-lg border border-paper-300 text-ink-600 hover:bg-paper-200 text-xs font-medium transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-leaf-700 hover:bg-leaf-600 text-paper-50 text-xs font-semibold shadow-xs transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{salvando ? 'Salvando...' : 'Registrar na Linha do Tempo'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Linha do Tempo Cronológica */}
      <div className="p-6">
        {anotacoes.length === 0 ? (
          <div className="text-center py-12 text-ink-400">
            <Clock className="w-10 h-10 mx-auto mb-2 text-paper-300 stroke-[1.5]" />
            <p className="text-sm font-medium text-ink-600">Nenhuma anotação de sessão registrada ainda.</p>
            <p className="text-xs text-ink-400 mt-1">
              Conforme as sessões forem realizadas, registre as anotações para construir a linha do tempo.
            </p>
          </div>
        ) : (
          <div className="relative border-l-2 border-leaf-200 ml-4 pl-6 space-y-6">
            {anotacoes.map((anotacao) => {
              const isAvaliativa = anotacao.sessao_tipo === 'AVALIATIVA';
              return (
                <div key={anotacao.id} className="relative group">
                  {/* Ponto na linha */}
                  <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-paper-50 border-2 border-leaf-700 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-leaf-700" />
                  </div>

                  {/* Cartão de Conteúdo da Anotação */}
                  <div className="p-4 rounded-xl border border-paper-300 bg-paper-50 shadow-2xs hover:border-leaf-500 transition">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-paper-200">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            isAvaliativa
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-leaf-100 text-leaf-800 border border-leaf-300'
                          }`}
                        >
                          {isAvaliativa ? 'Sessão Avaliativa' : 'Sessão Interventiva'}
                        </span>
                        <span className="text-xs text-ink-600 font-mono">
                          {formatDataHora(anotacao.sessao_dataHoraInicio || anotacao.dataRegistro)}
                        </span>
                      </div>

                      {anotacao.sessao_status && (
                        <span className="text-[11px] font-medium text-ink-400">
                          Status: {anotacao.sessao_status}
                        </span>
                      )}
                    </div>

                    <div className="text-ink-900 text-sm leading-relaxed whitespace-pre-wrap">
                      {anotacao.textoLivre}
                    </div>
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
