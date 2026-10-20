import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Clock, FileText, CheckCircle2, XCircle, AlertTriangle, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function PatientDayList({ sessoes = [], onStatusChange, selectedDate }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isDoctor = user?.role === 'DOUTORA';

  const formatHora = (dataStr) => {
    if (!dataStr) return '--:--';
    const date = new Date(dataStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'REALIZADA':
        return {
          bg: 'bg-leaf-200 text-leaf-800 border-leaf-500',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-leaf-700" />,
          label: 'Realizada',
        };
      case 'CANCELADA':
        return {
          bg: 'bg-red-100 text-red-800 border-red-300',
          icon: <XCircle className="w-3.5 h-3.5 text-red-600" />,
          label: 'Cancelada',
        };
      case 'FALTA':
        return {
          bg: 'bg-amber-100 text-amber-800 border-amber-300',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
          label: 'Falta',
        };
      default:
        return {
          bg: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: <Calendar className="w-3.5 h-3.5 text-blue-600" />,
          label: 'Agendada',
        };
    }
  };

  return (
    <div className="bg-paper-50 rounded-2xl border border-paper-300 shadow-xs overflow-hidden flex flex-col h-full">
      {/* Cabeçalho da Lista */}
      <div className="px-5 py-4 bg-paper-200 border-b border-paper-300 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-ink-900 flex items-center gap-2">
            <User className="w-4 h-4 text-leaf-700" />
            Pacientes do Dia
          </h3>
          <p className="text-xs text-ink-600 mt-0.5">
            {sessoes.length} {sessoes.length === 1 ? 'consulta agendada' : 'consultas agendadas'}
          </p>
        </div>
      </div>

      {/* Conteúdo da Lista */}
      <div className="p-4 flex-1 overflow-y-auto space-y-3">
        {sessoes.length === 0 ? (
          <div className="text-center py-8 text-ink-400 text-xs">
            Nenhum paciente agendado para esta data.
          </div>
        ) : (
          sessoes.map((sessao) => {
            const badge = getStatusBadge(sessao.status);
            return (
              <div
                key={sessao.id}
                className="p-3.5 rounded-xl border border-paper-300 bg-paper-50 hover:border-leaf-500 transition-all shadow-xs flex flex-col gap-2.5"
              >
                {/* Linha 1: Nome do paciente e Horário */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-ink-900 truncate">
                      {sessao.paciente_nome}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-ink-600">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-leaf-600" />
                        {formatHora(sessao.dataHoraInicio)} – {formatHora(sessao.dataHoraFim)}
                      </span>
                      <span>•</span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-paper-200 text-ink-600">
                        {sessao.tipo === 'AVALIATIVA' ? 'Avaliativa' : 'Interventiva'}
                      </span>
                    </div>
                  </div>

                  {/* Status atual badge */}
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${badge.bg}`}
                  >
                    {badge.icon}
                    {badge.label}
                  </span>
                </div>

                {/* Linha 2: Alteração de status e Ações */}
                <div className="flex items-center justify-between pt-2 border-t border-paper-200 text-xs">
                  {/* Seletor de Status (RF06) */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-ink-400 text-[11px]">Status:</span>
                    <select
                      value={sessao.status}
                      onChange={(e) => onStatusChange(sessao.id, e.target.value)}
                      className="text-xs py-1 px-2 rounded-lg bg-paper-100 border border-paper-300 text-ink-900 focus:outline-none focus:ring-1 focus:ring-leaf-500 cursor-pointer"
                    >
                      <option value="AGENDADA">Agendada</option>
                      <option value="REALIZADA">Realizada</option>
                      <option value="FALTA">Falta</option>
                      <option value="CANCELADA">Cancelada</option>
                    </select>
                  </div>

                  {/* Botão Ver Prontuário */}
                  <button
                    onClick={() => navigate(`/prontuario/${sessao.paciente_id || sessao.paciente}`)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-leaf-700 bg-leaf-100 hover:bg-leaf-200 font-medium transition text-xs"
                    title="Abrir Prontuário do Paciente"
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
