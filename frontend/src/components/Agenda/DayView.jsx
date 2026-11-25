import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Lock,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar as CalendarIcon,
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

export default function DayView({
  sessoes = [],
  bloqueios = [],
  dataSelecionada,
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

  const diasDaSemana = inicioSemana
    ? Array.from({ length: 7 }, (_, i) => {
        const d = new Date(`${inicioSemana}T00:00:00`);
        d.setDate(d.getDate() + i);
        const pad = (n) => String(n).padStart(2, '0');
        const dataIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        return {
          data: dataIso,
          diaMes: d.getDate(),
          nomeDia: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
        };
      })
    : [];

  const formatHora = (dataStr) => {
    if (!dataStr) return '';
    const date = new Date(dataStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  /**
   * Retorna a hora de exibição de um bloqueio para o dia dataSelecionada.
   */
  const getHorarioBloqueioNoDia = (b) => {
    const diaInicio = b.dataHoraInicio.substring(0, 10);
    const diaFim = b.dataHoraFim.substring(0, 10);
    const horaInicio = diaInicio < dataSelecionada ? '00:00' : formatHora(b.dataHoraInicio);
    const horaFim = diaFim > dataSelecionada ? '23:59' : formatHora(b.dataHoraFim);
    return { horaInicio, horaFim };
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
    <div className="bg-paper-50 rounded-2xl border border-paper-300 shadow-xs overflow-hidden flex flex-col h-full">
      {/* Cabeçalho */}
      <div className="px-6 py-4 bg-paper-200 border-b border-paper-300 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-ink-900">
            Agenda do Dia — {new Date(`${dataSelecionada}T00:00:00`).toLocaleDateString('pt-BR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </h3>
          {onRemarcarSessao && (
            <p className="text-[11px] text-ink-600 mt-0.5">
              Arraste sessões canceladas, com falta ou agendadas para remarcar para outro dia da semana.
            </p>
          )}
        </div>
        <button
          onClick={() => onOpenAgendar(dataSelecionada)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-leaf-700 hover:bg-leaf-600 text-paper-50 text-xs font-medium shadow-xs transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nova Consulta</span>
        </button>
      </div>

      {/* Barra animada de dias da semana ao arrastar uma sessão na visão Diária */}
      {isDragging && diasDaSemana.length > 0 && (
        <div className="px-4 sm:px-6 py-3 bg-leaf-50 border-b border-leaf-300 animate-drag-dock space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-leaf-900">
            <span className="flex items-center gap-1.5">
              <CalendarCheck2 className="w-4 h-4 text-leaf-700" />
              Solte no dia desejado para remarcar como Agendada:
            </span>
            {destinoValidoHover && (
              <span className="text-leaf-700">
                Destino: {formatLocalDiaMes(destinoValidoHover)}
              </span>
            )}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {diasDaSemana.map((dia) => {
              const isAtual = dia.data === dataSelecionada;
              const isHover = destinoValidoHover === dia.data;
              return (
                <div
                  key={dia.data}
                  data-drop-day={dia.data}
                  className={`py-2 px-1 rounded-xl border text-center transition-all duration-150 ${
                    isAtual
                      ? 'bg-paper-200/70 border-paper-300 text-ink-400 opacity-60'
                      : isHover
                      ? 'bg-leaf-700 border-leaf-800 text-white scale-105 shadow-md ring-2 ring-leaf-400'
                      : 'bg-paper-50 border-leaf-300 text-ink-800'
                  }`}
                >
                  <span className="block text-[10px] uppercase font-semibold">{dia.nomeDia}</span>
                  <span className="block text-sm font-bold">{dia.diaMes}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista de Sessões e Bloqueios */}
      <div className="p-6 overflow-y-auto space-y-4 flex-1">
        {/* Bloqueios do dia */}
        {bloqueios.length > 0 && (
          <div className="space-y-2 mb-4">
            <h4 className="text-xs font-semibold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-700" />
              Horários Bloqueados
            </h4>
            {bloqueios.map((b) => {
              const { horaInicio, horaFim } = getHorarioBloqueioNoDia(b);
              return (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border-l-4 border-l-amber-600 border border-paper-300 bg-amber-50/70 text-xs shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-amber-900">
                      {horaInicio} – {horaFim}
                    </span>
                    <span className="text-ink-600">• Motivo:</span>
                    <span className="font-medium text-ink-900">{b.motivo}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-medium text-[11px]">
                      Indisponível
                    </span>
                    {onDeletarBloqueio && (
                      <button
                        onClick={() => handleRemoverBloqueio(b.id)}
                        className="p-1 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition"
                        title="Remover bloqueio"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
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
            const arrastavel = Boolean(onRemarcarSessao) && isSessaoArrastavel(sessao);
            const isBeingDragged = dragState?.sessao?.id === sessao.id;
            const wasJustDropped = justDroppedId === sessao.id;

            return (
              <div
                key={sessao.id}
                {...getCardDragProps(sessao)}
                title={arrastavel ? 'Arraste para outro dia para remarcar como Agendada' : undefined}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-paper-300 border-l-4 ${statusInfo.border} shadow-xs gap-3 transition-all duration-200 select-none ${
                  arrastavel ? 'cursor-grab active:cursor-grabbing hover:shadow-sm hover:-translate-y-0.5' : ''
                } ${
                  isBeingDragged ? 'opacity-35 scale-[0.98] border-dashed ring-1 ring-leaf-500' : ''
                } ${wasJustDropped ? 'animate-session-drop ring-2 ring-leaf-500' : ''}`}
                style={arrastavel ? { touchAction: 'none' } : undefined}
              >
                {/* Informações da Consulta */}
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {arrastavel && (
                      <GripVertical className="w-4 h-4 text-ink-400 shrink-0" aria-hidden="true" />
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
                        className="font-mono font-semibold text-sm text-ink-900 hover:text-leaf-800 hover:bg-paper-200/90 px-1.5 -mx-1.5 py-0.5 rounded-md transition cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-leaf-500"
                      >
                        {formatHora(sessao.dataHoraInicio)} – {formatHora(sessao.dataHoraFim)}
                      </button>
                    ) : (
                      <span className="font-mono font-semibold text-sm text-ink-900">
                        {formatHora(sessao.dataHoraInicio)} – {formatHora(sessao.dataHoraFim)}
                      </span>
                    )}
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
                <div className="flex flex-wrap items-center gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-paper-200">
                  <button
                    type="button"
                    onClick={() => onPagamentoChange && onPagamentoChange(sessao.id, !sessao.pago)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer select-none ${
                      sessao.pago
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                        : 'bg-paper-100 text-ink-600 border-paper-300 hover:bg-paper-200'
                    }`}
                    title={sessao.pago ? 'Clique para marcar como pendente' : 'Clique para marcar como pago'}
                  >
                    {sessao.pago ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Pago</span>
                      </>
                    ) : (
                      <>
                        <CircleDollarSign className="w-3.5 h-3.5 text-ink-500 shrink-0" />
                        <span>Pendente</span>
                      </>
                    )}
                  </button>

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

                  {!isSecretaria && (
                    <button
                      onClick={() => navigate(`/prontuario/${sessao.paciente_id || sessao.paciente}`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-leaf-100 hover:bg-leaf-200 text-leaf-800 text-xs font-semibold transition"
                      title="Acessar prontuário"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Prontuário</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Cartão flutuante animado durante o arraste */}
      {dragState && (
        <div
          aria-hidden="true"
          className={`fixed top-0 left-0 z-50 pointer-events-none p-3 rounded-xl border border-paper-300 border-l-4 ${
            getStatusInfo(dragState.sessao.status).border
          } bg-paper-50 shadow-2xl ring-2 ring-leaf-600 flex flex-col gap-1`}
          style={{
            width: dragState.width,
            transform: `translate3d(${dragState.x - dragState.offsetX}px, ${
              dragState.y - dragState.offsetY
            }px, 0) rotate(1.5deg) scale(1.03)`,
            transition: 'transform 35ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <div className="flex items-center justify-between text-xs gap-2">
            <span className="font-mono font-bold text-ink-900 flex items-center gap-1">
              <GripVertical className="w-3.5 h-3.5 text-leaf-700" />
              {formatHora(dragState.sessao.dataHoraInicio)}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-leaf-100 text-leaf-800 font-bold">
              {destinoValidoHover
                ? `Soltar em ${formatLocalDiaMes(destinoValidoHover)} · Agendada`
                : 'Arraste para um dia acima'}
            </span>
          </div>
          <p className="font-semibold text-ink-900 text-sm truncate">
            {dragState.sessao.paciente_nome}
          </p>
        </div>
      )}
    </div>
  );
}
