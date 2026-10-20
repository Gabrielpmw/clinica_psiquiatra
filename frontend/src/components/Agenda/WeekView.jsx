import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Clock, FileText, CheckCircle2, XCircle, AlertTriangle, Calendar as CalendarIcon, Trash2 } from 'lucide-react';

export default function WeekView({
  sessoes = [],
  bloqueios = [],
  inicioSemana,
  onOpenAgendar,
  onStatusChange,
  onDeletarBloqueio,
  isSecretaria = false,
}) {
  const navigate = useNavigate();

  // Gerar os 7 dias a partir de inicioSemana (segunda a domingo)
  const diasDaSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${inicioSemana}T00:00:00`);
    d.setDate(d.getDate() + i);
    const dataIso = d.toISOString().split('T')[0];
    const hojeIso = new Date().toISOString().split('T')[0];
    return {
      data: dataIso,
      diaMes: d.getDate(),
      nomeDia: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
      isHoje: dataIso === hojeIso,
    };
  });

  const formatHora = (dataStr) => {
    if (!dataStr) return '';
    const date = new Date(dataStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  /**
   * Retorna a hora de exibição de um bloqueio para o dia dia (string YYYY-MM-DD).
   * Se o bloqueio começa antes do dia: exibe "00:00"; se termina depois: exibe "23:59".
   */
  const getHorarioBloqueioNoDia = (b, diaData) => {
    const diaInicio = b.dataHoraInicio.substring(0, 10);
    const diaFim = b.dataHoraFim.substring(0, 10);
    const horaInicio = diaInicio < diaData ? '00:00' : formatHora(b.dataHoraInicio);
    const horaFim = diaFim > diaData ? '23:59' : formatHora(b.dataHoraFim);
    return { horaInicio, horaFim };
  };

  const getStatusBorder = (status) => {
    switch (status) {
      case 'REALIZADA':
        return 'border-l-leaf-700 bg-leaf-100/60';
      case 'CANCELADA':
        return 'border-l-[#B5645C] bg-[#F6E3E1]/70';
      case 'FALTA':
        return 'border-l-[#C98A1B] bg-[#FBEFD9]/70';
      default:
        return 'border-l-[#4A86B5] bg-[#E4EEF6]/70';
    }
  };

  const handleRemoverBloqueio = (bloqueioId) => {
    if (window.confirm('Deseja realmente remover este bloqueio de horário?')) {
      if (onDeletarBloqueio) onDeletarBloqueio(bloqueioId);
    }
  };

  return (
    <div className="bg-paper-50 rounded-2xl border border-paper-300 shadow-xs overflow-hidden flex flex-col h-full">
      {/* Cabeçalho das Colunas (Dias da Semana) */}
      <div className="grid grid-cols-7 border-b border-paper-300 bg-paper-200">
        {diasDaSemana.map((dia) => (
          <div
            key={dia.data}
            className={`p-3 text-center border-r border-paper-300 last:border-r-0 ${
              dia.isHoje ? 'bg-leaf-100 font-semibold' : ''
            }`}
          >
            <p className="text-[11px] uppercase tracking-wider text-ink-600 font-medium">
              {dia.nomeDia}
            </p>
            <p className={`text-base font-bold mt-0.5 ${dia.isHoje ? 'text-leaf-800' : 'text-ink-900'}`}>
              {dia.diaMes}
              {dia.isHoje && (
                <span className="block text-[10px] font-normal text-leaf-700">Hoje</span>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Grade Semanal */}
      <div className="grid grid-cols-7 flex-1 min-h-[500px] overflow-y-auto divide-x divide-paper-300">
        {diasDaSemana.map((dia) => {
          // Filtrar sessões do dia
          const sessoesDia = sessoes.filter(
            (s) => s.dataHoraInicio && s.dataHoraInicio.startsWith(dia.data)
          );
          // Filtrar bloqueios que intersectam com o dia
          const bloqueiosDia = bloqueios.filter(
            (b) =>
              b.dataHoraInicio &&
              b.dataHoraFim &&
              b.dataHoraInicio.substring(0, 10) <= dia.data &&
              b.dataHoraFim.substring(0, 10) >= dia.data
          );

          return (
            <div
              key={dia.data}
              className={`p-2 flex flex-col gap-2 relative transition ${
                dia.isHoje ? 'bg-leaf-50/40' : 'bg-paper-50'
              }`}
            >
              {/* Botão rápido para agendar neste dia */}
              <button
                onClick={() => onOpenAgendar(dia.data)}
                className="opacity-40 hover:opacity-100 transition flex items-center justify-center gap-1 py-1 text-[11px] text-leaf-700 border border-dashed border-paper-300 hover:border-leaf-500 rounded-lg hover:bg-leaf-100"
                title={`Agendar para ${dia.data}`}
              >
                <Plus className="w-3 h-3" />
                <span>Agendar</span>
              </button>

              {/* Bloqueios */}
              {bloqueiosDia.map((b) => {
                const { horaInicio, horaFim } = getHorarioBloqueioNoDia(b, dia.data);
                return (
                  <div
                    key={b.id}
                    className="p-2 rounded-lg border border-amber-300 bg-amber-50 text-[11px] text-amber-900 border-l-4 border-l-amber-600 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {horaInicio} – {horaFim}
                      </p>
                      {onDeletarBloqueio && (
                        <button
                          onClick={() => handleRemoverBloqueio(b.id)}
                          className="p-0.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="Remover bloqueio"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] mt-0.5 truncate" title={b.motivo}>
                      {b.motivo}
                    </p>
                  </div>
                );
              })}

              {/* Sessões */}
              {sessoesDia.map((sessao) => {
                const borderStyle = getStatusBorder(sessao.status);
                return (
                  <div
                    key={sessao.id}
                    className={`p-2 rounded-lg border border-paper-300 border-l-4 ${borderStyle} text-xs shadow-2xs flex flex-col gap-1 transition hover:shadow-xs`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-mono font-semibold text-ink-900">
                        {formatHora(sessao.dataHoraInicio)}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-paper-200/80 text-ink-600 font-medium">
                        {sessao.tipo === 'AVALIATIVA' ? 'Av' : 'Int'}
                      </span>
                    </div>

                    <p className="font-semibold text-ink-900 line-clamp-2 text-[11px]">
                      {sessao.paciente_nome}
                    </p>

                    <div className="flex items-center justify-between pt-1 border-t border-paper-200/60 mt-0.5 text-[10px]">
                      <select
                        value={sessao.status}
                        onChange={(e) => onStatusChange(sessao.id, e.target.value)}
                        className="bg-transparent text-[10px] font-medium text-ink-600 cursor-pointer focus:outline-none"
                      >
                        <option value="AGENDADA">Agendada</option>
                        <option value="REALIZADA">Realizada</option>
                        <option value="FALTA">Falta</option>
                        <option value="CANCELADA">Cancelada</option>
                      </select>

                      {!isSecretaria && (
                        <button
                          onClick={() => navigate(`/prontuario/${sessao.paciente_id || sessao.paciente}`)}
                          className="text-leaf-700 hover:text-leaf-900 p-0.5"
                          title="Ver Prontuário"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {sessoesDia.length === 0 && bloqueiosDia.length === 0 && (
                <div className="flex-1 flex items-center justify-center text-ink-400 text-[10px] min-h-[60px]">
                  Livre
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
