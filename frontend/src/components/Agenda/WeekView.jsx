import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Clock,
  FileText,
  CheckCircle2,
  Trash2,
  CircleDollarSign,
  GripVertical,
  CalendarCheck2,
} from 'lucide-react';
import {
  useSessionDragAndDrop,
  isSessaoArrastavel,
  formatLocalDiaMes,
} from './useSessionDragAndDrop';

export default function WeekView({
  sessoes = [],
  bloqueios = [],
  inicioSemana,
  onOpenAgendar,
  onStatusChange,
  onPagamentoChange,
  onDeletarBloqueio,
  onRemarcarSessao,
  onEditHorario,
  justDroppedId = null,
  isSecretaria = false,
}) {
  const navigate = useNavigate();
  const { dragState, isDragging, getCardDragProps } = useSessionDragAndDrop({
    onRemarcarSessao,
  });

  // Gerar os 7 dias a partir de inicioSemana (segunda a domingo)
  const diasDaSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${inicioSemana}T00:00:00`);
    d.setDate(d.getDate() + i);
    const pad = (n) => String(n).padStart(2, '0');
    const dataIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const hoje = new Date();
    const hojeIso = `${hoje.getFullYear()}-${pad(hoje.getMonth() + 1)}-${pad(hoje.getDate())}`;
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
   * Retorna a hora de exibição de um bloqueio para o dia (string YYYY-MM-DD).
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

  const destinoValidoHover =
    dragState?.hoverDia && dragState.hoverDia !== dragState.originDia
      ? dragState.hoverDia
      : null;

  return (
    <div className="bg-paper-50 rounded-2xl border border-paper-300 shadow-xs overflow-hidden flex flex-col h-full min-w-[780px]">
      {onRemarcarSessao && (
        <div className="px-4 py-2 bg-paper-100 border-b border-paper-300 flex flex-wrap items-center justify-between gap-2 text-[11px] text-ink-600">
          <span className="flex items-center gap-1.5">
            <GripVertical className="w-3.5 h-3.5 text-leaf-700 shrink-0" />
            <span>
              Arraste sessões <strong>agendadas</strong>, <strong>canceladas</strong> ou com <strong>falta</strong> para outro dia da semana para remarcar automaticamente como <strong>Agendada</strong>.
            </span>
          </span>
          {isDragging && (
            <span className="font-semibold text-leaf-800 animate-pulse">
              {destinoValidoHover
                ? `Solte para remarcar em ${formatLocalDiaMes(destinoValidoHover)}`
                : 'Arrastando sessão...'}
            </span>
          )}
        </div>
      )}

      {/* Cabeçalho das Colunas (Dias da Semana) */}
      <div className="grid grid-cols-7 border-b border-paper-300 bg-paper-200">
        {diasDaSemana.map((dia) => {
          const isDropTarget = destinoValidoHover === dia.data;
          return (
            <div
              key={dia.data}
              data-drop-day={dia.data}
              className={`p-3 text-center border-r border-paper-300 last:border-r-0 transition-colors duration-150 ${
                isDropTarget
                  ? 'bg-leaf-200/80 ring-2 ring-inset ring-leaf-600'
                  : dia.isHoje
                  ? 'bg-leaf-100 font-semibold'
                  : ''
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
          );
        })}
      </div>

      {/* Grade Semanal */}
      <div className="grid grid-cols-7 flex-1 min-h-[500px] overflow-y-auto divide-x divide-paper-300">
        {diasDaSemana.map((dia) => {
          const sessoesDia = sessoes.filter(
            (s) => s.dataHoraInicio && s.dataHoraInicio.startsWith(dia.data)
          );
          const bloqueiosDia = bloqueios.filter(
            (b) =>
              b.dataHoraInicio &&
              b.dataHoraFim &&
              b.dataHoraInicio.substring(0, 10) <= dia.data &&
              b.dataHoraFim.substring(0, 10) >= dia.data
          );
          const isDropTarget = destinoValidoHover === dia.data;
          const isOriginColumn = dragState?.originDia === dia.data;

          return (
            <div
              key={dia.data}
              data-drop-day={dia.data}
              className={`p-2 flex flex-col gap-2 relative transition-all duration-150 ${
                isDropTarget
                  ? 'bg-leaf-100/75 ring-2 ring-inset ring-leaf-600 scale-[1.005]'
                  : isDragging && !isOriginColumn
                  ? 'bg-paper-100/50'
                  : dia.isHoje
                  ? 'bg-leaf-50/40'
                  : 'bg-paper-50'
              }`}
            >
              {/* Indicador animado de destino ao arrastar */}
              {isDropTarget && (
                <div className="px-2 py-1.5 rounded-lg border-2 border-dashed border-leaf-600 bg-leaf-50 text-leaf-800 text-[10px] font-bold flex items-center justify-center gap-1 animate-drag-dock pointer-events-none">
                  <CalendarCheck2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Soltar · Agendada</span>
                </div>
              )}

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
                const arrastavel = Boolean(onRemarcarSessao) && isSessaoArrastavel(sessao);
                const isBeingDragged = dragState?.sessao?.id === sessao.id;
                const wasJustDropped = justDroppedId === sessao.id;

                return (
                  <div
                    key={sessao.id}
                    {...getCardDragProps(sessao)}
                    title={arrastavel ? 'Arraste para outro dia para remarcar como Agendada' : undefined}
                    className={`p-2 rounded-lg border border-paper-300 border-l-4 ${borderStyle} text-xs shadow-2xs flex flex-col gap-1 transition-all duration-200 select-none ${
                      arrastavel ? 'cursor-grab active:cursor-grabbing hover:shadow-sm hover:-translate-y-0.5' : ''
                    } ${
                      isBeingDragged
                        ? 'opacity-35 scale-[0.97] border-dashed ring-1 ring-leaf-500'
                        : ''
                    } ${wasJustDropped ? 'animate-session-drop ring-2 ring-leaf-500' : ''}`}
                    style={arrastavel ? { touchAction: 'none' } : undefined}
                  >
                    <div className="flex items-center justify-between gap-1 text-[11px]">
                      <div className="flex items-center gap-1 min-w-0">
                        {arrastavel && (
                          <GripVertical className="w-3 h-3 text-ink-400 shrink-0" aria-hidden="true" />
                        )}
                        {onEditHorario ? (
                          <button
                            type="button"
                            data-no-drag="true"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditHorario(sessao);
                            }}
                            title="Clique para alterar o horário"
                            className="font-mono font-semibold text-ink-900 hover:text-leaf-800 hover:bg-paper-200/90 px-1 -mx-1 py-0.5 rounded transition cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-leaf-500"
                          >
                            {formatHora(sessao.dataHoraInicio)}
                          </button>
                        ) : (
                          <span className="font-mono font-semibold text-ink-900">
                            {formatHora(sessao.dataHoraInicio)}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-paper-200/80 text-ink-600 font-medium">
                        {sessao.tipo === 'AVALIATIVA' ? 'Av' : 'Int'}
                      </span>
                    </div>

                    <p className="font-semibold text-ink-900 line-clamp-2 text-[11px]">
                      {sessao.paciente_nome}
                    </p>

                    <div className="flex items-center justify-between gap-1 pt-1 border-t border-paper-200/60 mt-0.5 text-[10px]">
                      <select
                        value={sessao.status}
                        onChange={(e) => onStatusChange(sessao.id, e.target.value)}
                        className="bg-transparent text-[10px] font-medium text-ink-600 cursor-pointer focus:outline-none max-w-[65px] truncate"
                      >
                        <option value="AGENDADA">Agendada</option>
                        <option value="REALIZADA">Realizada</option>
                        <option value="FALTA">Falta</option>
                        <option value="CANCELADA">Cancelada</option>
                      </select>

                      <div className="flex items-center gap-1">
                        {onPagamentoChange && (
                          <button
                            type="button"
                            onClick={() => onPagamentoChange(sessao.id, !sessao.pago)}
                            className={`p-0.5 rounded transition cursor-pointer select-none ${
                              sessao.pago
                                ? 'text-emerald-600 hover:text-emerald-800'
                                : 'text-ink-400 hover:text-ink-600'
                            }`}
                            title={sessao.pago ? 'Pago (clique para marcar pendente)' : 'Pendente (clique para marcar pago)'}
                          >
                            {sessao.pago ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <CircleDollarSign className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}

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
                  </div>
                );
              })}

              {sessoesDia.length === 0 && bloqueiosDia.length === 0 && !isDropTarget && (
                <div className="flex-1 flex items-center justify-center text-ink-400 text-[10px] min-h-[60px]">
                  Livre
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Cartão flutuante animado durante o arraste */}
      {dragState && (
        <div
          aria-hidden="true"
          className={`fixed top-0 left-0 z-50 pointer-events-none p-2.5 rounded-xl border border-paper-300 border-l-4 ${getStatusBorder(
            dragState.sessao.status
          )} bg-paper-50 shadow-2xl ring-2 ring-leaf-600 flex flex-col gap-1`}
          style={{
            width: dragState.width,
            transform: `translate3d(${dragState.x - dragState.offsetX}px, ${
              dragState.y - dragState.offsetY
            }px, 0) rotate(1.5deg) scale(1.04)`,
            transition: 'transform 35ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-mono font-bold text-ink-900 flex items-center gap-1">
              <GripVertical className="w-3 h-3 text-leaf-700" />
              {formatHora(dragState.sessao.dataHoraInicio)}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-leaf-100 text-leaf-800 font-bold">
              {destinoValidoHover
                ? `→ ${formatLocalDiaMes(destinoValidoHover)} · Agendada`
                : 'Arraste p/ outro dia'}
            </span>
          </div>
          <p className="font-semibold text-ink-900 text-xs truncate">
            {dragState.sessao.paciente_nome}
          </p>
        </div>
      )}
    </div>
  );
}
