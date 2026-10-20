import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Plus, Lock, FileText, CheckCircle2, XCircle, AlertTriangle, Calendar as CalendarIcon } from 'lucide-react';

export default function DayView({
  sessoes = [],
  bloqueios = [],
  dataSelecionada,
  onOpenAgendar,
  onStatusChange,
}) {
  const navigate = useNavigate();

  const formatHora = (dataStr) => {
    if (!dataStr) return '';
    const date = new Date(dataStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'REALIZADA':
        return {
          border: 'border-l-leaf-700 bg-leaf-100/50',
          badge: 'bg-leaf-200 text-leaf-800 border-leaf-500',
          icon: <CheckCircle2 className="w-4 h-4 text-leaf-700" />,
          label: 'Realizada',
        };
      case 'CANCELADA':
        return {
          border: 'border-l-[#B5645C] bg-[#F6E3E1]/60',
          badge: 'bg-red-100 text-red-800 border-red-300',
          icon: <XCircle className="w-4 h-4 text-red-600" />,
          label: 'Cancelada',
        };
      case 'FALTA':
        return {
          border: 'border-l-[#C98A1B] bg-[#FBEFD9]/60',
          badge: 'bg-amber-100 text-amber-800 border-amber-300',
          icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
          label: 'Falta',
        };
      default:
        return {
          border: 'border-l-[#4A86B5] bg-[#E4EEF6]/60',
          badge: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: <CalendarIcon className="w-4 h-4 text-blue-600" />,
          label: 'Agendada',
        };
    }
  };

  return (
    <div className="bg-paper-50 rounded-2xl border border-paper-300 shadow-xs overflow-hidden flex flex-col h-full">
      {/* Cabeçalho */}
      <div className="px-6 py-4 bg-paper-200 border-b border-paper-300 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-ink-900">
            Agenda do Dia — {new Date(`${dataSelecionada}T00:00:00`).toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </h3>
          <p className="text-xs text-ink-600 mt-0.5">
            Visão detalhada por horário das consultas e bloqueios do dia selecionado.
          </p>
        </div>
        <button
          onClick={() => onOpenAgendar(dataSelecionada)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-leaf-700 hover:bg-leaf-600 text-paper-50 text-xs font-medium shadow-xs transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nova Consulta</span>
        </button>
      </div>

      {/* Lista de Sessões e Bloqueios */}
      <div className="p-6 overflow-y-auto space-y-4 flex-1">
        {/* Bloqueios do dia */}
        {bloqueios.length > 0 && (
          <div className="space-y-2 mb-4">
            <h4 className="text-xs font-semibold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-700" />
              Horários Bloqueados
            </h4>
            {bloqueios.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between p-3.5 rounded-xl border-l-4 border-l-amber-600 border border-paper-300 bg-amber-50/70 text-xs shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-amber-900">
                    {formatHora(b.dataHoraInicio)} – {formatHora(b.dataHoraFim)}
                  </span>
                  <span className="text-ink-600">• Motivo:</span>
                  <span className="font-medium text-ink-900">{b.motivo}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-medium text-[11px]">
                  Indisponível
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Sessões agendadas */}
        {sessoes.length === 0 && bloqueios.length === 0 ? (
          <div className="text-center py-16 flex flex-col items-center justify-center text-ink-400">
            <CalendarIcon className="w-12 h-12 stroke-[1.5] mb-2 text-paper-300" />
            <p className="text-sm font-medium text-ink-600">Nenhum agendamento para este dia</p>
            <p className="text-xs text-ink-400 mt-1 max-w-sm">
              Clique no botão "Nova Consulta" para marcar uma sessão avaliativa ou interventiva.
            </p>
            <button
              onClick={() => onOpenAgendar(dataSelecionada)}
              className="mt-4 px-4 py-2 rounded-lg bg-leaf-700 hover:bg-leaf-600 text-paper-50 text-xs font-medium transition shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Agendar para este dia
            </button>
          </div>
        ) : (
          sessoes.map((sessao) => {
            const statusInfo = getStatusInfo(sessao.status);
            return (
              <div
                key={sessao.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-paper-300 border-l-4 ${statusInfo.border} shadow-xs gap-3 transition hover:shadow-sm`}
              >
                {/* Informações da Consulta */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-sm text-ink-900">
                      {formatHora(sessao.dataHoraInicio)} – {formatHora(sessao.dataHoraFim)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusInfo.badge}`}
                    >
                      {statusInfo.icon}
                      {statusInfo.label}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-paper-200 text-ink-600">
                      {sessao.tipo === 'AVALIATIVA' ? 'Sessão Avaliativa' : 'Sessão Interventiva'}
                    </span>
                  </div>

                  <p className="text-base font-semibold text-ink-900">
                    {sessao.paciente_nome}
                  </p>
                </div>

                {/* Ações e Seletor de Status */}
                <div className="flex items-center gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-paper-200">
                  <div className="flex items-center gap-1.5 text-xs">
                    <label className="text-ink-400 font-medium">Status:</label>
                    <select
                      value={sessao.status}
                      onChange={(e) => onStatusChange(sessao.id, e.target.value)}
                      className="py-1.5 px-2.5 rounded-lg bg-paper-50 border border-paper-300 text-ink-900 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-leaf-500 cursor-pointer"
                    >
                      <option value="AGENDADA">Agendada</option>
                      <option value="REALIZADA">Realizada</option>
                      <option value="FALTA">Falta</option>
                      <option value="CANCELADA">Cancelada</option>
                    </select>
                  </div>

                  <button
                    onClick={() => navigate(`/prontuario/${sessao.paciente_id || sessao.paciente}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-leaf-100 hover:bg-leaf-200 text-leaf-800 text-xs font-semibold transition"
                    title="Acessar prontuário"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Prontuário</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
