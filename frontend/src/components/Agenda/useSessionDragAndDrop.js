import { useEffect, useRef, useState } from 'react';

const DRAG_THRESHOLD_PX = 6;
const NON_DRAGGABLE_SELECTOR = 'select, option, button, a, input, textarea, [data-no-drag="true"]';

export function formatLocalDiaMes(dateStr) {
  if (!dateStr || dateStr.length < 10) return '';
  const [, month, day] = dateStr.substring(0, 10).split('-');
  return `${day}/${month}`;
}

export function isSessaoArrastavel(sessao) {
  return Boolean(sessao && sessao.status !== 'REALIZADA');
}

/**
 * Hook compartilhado de arrastar e soltar com Pointer Events (mouse e toque)
 * para remarcar sessões (ex.: Cancelada, Falta ou Agendada) entre dias da agenda.
 */
export function useSessionDragAndDrop({ onRemarcarSessao }) {
  const [dragState, setDragState] = useState(null);
  const pendingRef = useRef(null);
  const activeDragRef = useRef(null);
  const onRemarcarRef = useRef(onRemarcarSessao);

  useEffect(() => {
    onRemarcarRef.current = onRemarcarSessao;
  }, [onRemarcarSessao]);

  useEffect(() => {
    const clearDrag = () => {
      pendingRef.current = null;
      activeDragRef.current = null;
      document.body.style.userSelect = '';
      setDragState(null);
    };

    const findDropDay = (clientX, clientY) => {
      const el = document.elementFromPoint(clientX, clientY);
      const dropTarget = el?.closest?.('[data-drop-day]');
      return dropTarget?.getAttribute('data-drop-day') || null;
    };

    const handlePointerMove = (e) => {
      const pending = pendingRef.current;
      const active = activeDragRef.current;

      if (!pending && !active) return;

      if (pending && !active) {
        if (e.pointerId !== pending.pointerId) return;
        const dist = Math.hypot(e.clientX - pending.startX, e.clientY - pending.startY);
        if (dist < DRAG_THRESHOLD_PX) return;

        document.body.style.userSelect = 'none';
        const nextActive = {
          sessao: pending.sessao,
          originDia: pending.originDia,
          width: pending.width,
          offsetX: pending.offsetX,
          offsetY: pending.offsetY,
          x: e.clientX,
          y: e.clientY,
          hoverDia: findDropDay(e.clientX, e.clientY),
          pointerId: pending.pointerId,
        };
        activeDragRef.current = nextActive;
        pendingRef.current = null;
        setDragState(nextActive);
        return;
      }

      if (active && e.pointerId === active.pointerId) {
        const hoverDia = findDropDay(e.clientX, e.clientY);
        const updated = {
          ...active,
          x: e.clientX,
          y: e.clientY,
          hoverDia,
        };
        activeDragRef.current = updated;
        setDragState(updated);
      }
    };

    const handlePointerUp = (e) => {
      const active = activeDragRef.current;
      if (active && e.pointerId === active.pointerId) {
        const dropDia = findDropDay(e.clientX, e.clientY) || active.hoverDia;
        const { sessao, originDia } = active;
        clearDrag();
        if (dropDia && dropDia !== originDia && onRemarcarRef.current) {
          onRemarcarRef.current(sessao, dropDia);
        }
        return;
      }
      if (pendingRef.current && e.pointerId === pendingRef.current.pointerId) {
        clearDrag();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && (activeDragRef.current || pendingRef.current)) {
        clearDrag();
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', clearDrag);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', clearDrag);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.userSelect = '';
    };
  }, []);

  const getCardDragProps = (sessao) => {
    if (!onRemarcarSessao || !isSessaoArrastavel(sessao)) return {};
    return {
      onPointerDown: (e) => {
        if (e.button !== 0) return;
        if (e.target.closest(NON_DRAGGABLE_SELECTOR)) return;

        const rect = e.currentTarget.getBoundingClientRect();
        pendingRef.current = {
          pointerId: e.pointerId,
          sessao,
          originDia: (sessao.dataHoraInicio || '').substring(0, 10),
          startX: e.clientX,
          startY: e.clientY,
          offsetX: Math.min(Math.max(16, e.clientX - rect.left), rect.width - 16),
          offsetY: Math.min(Math.max(12, e.clientY - rect.top), rect.height - 12),
          width: Math.max(150, Math.min(rect.width, 320)),
        };
      },
    };
  };

  return {
    dragState,
    isDragging: Boolean(dragState),
    getCardDragProps,
  };
}
