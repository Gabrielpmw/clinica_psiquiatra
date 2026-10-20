import React, { useState } from 'react';
import { X, Lock, AlertCircle } from 'lucide-react';
import { criarBloqueio } from '../../services/agendaService';
import { useNotification } from '../../context/NotificationContext';

export default function BloqueioModal({ isOpen, onClose, onSuccess, initialDate }) {
  const { notifySuccess, notifyError } = useNotification();
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState('');

  const [formData, setFormData] = useState({
    dataInicio: initialDate || new Date().toISOString().split('T')[0],
    horaInicio: '08:00',
    dataFim: initialDate || new Date().toISOString().split('T')[0],
    horaFim: '12:00',
    motivo: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    if (!formData.motivo.trim()) {
      setErro('Informe o motivo do bloqueio.');
      return;
    }

    try {
      setSubmitting(true);
      const inicio = new Date(`${formData.dataInicio}T${formData.horaInicio}:00`);
      const fim = new Date(`${formData.dataFim}T${formData.horaFim}:00`);

      if (fim <= inicio) {
        setErro('O horário de término do bloqueio deve ser posterior ao início.');
        setSubmitting(false);
        return;
      }

      const payload = {
        dataHoraInicio: inicio.toISOString(),
        dataHoraFim: fim.toISOString(),
        motivo: formData.motivo,
      };

      const novoBloqueio = await criarBloqueio(payload);
      notifySuccess('Horário bloqueado com sucesso na agenda.');
      if (onSuccess) onSuccess(novoBloqueio);
      onClose();
    } catch (err) {
      console.error('Erro ao criar bloqueio:', err);
      const msg = err.response?.data?.motivo || 'Erro ao registrar bloqueio de horário.';
      setErro(msg);
      notifyError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 backdrop-blur-xs p-4">
      <div className="bg-paper-50 rounded-2xl border border-paper-300 shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 bg-paper-200 border-b border-paper-300">
          <div>
            <h2 className="text-lg font-semibold text-ink-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-700" />
              Bloquear Horário na Agenda
            </h2>
            <p className="text-xs text-ink-600 mt-0.5">
              Bloqueie intervalos para reuniões, congressos ou folgas.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-ink-400 hover:text-ink-900 p-1 rounded-lg hover:bg-paper-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {erro && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* Início */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-600 uppercase tracking-wider mb-1">
                Data Início *
              </label>
              <input
                type="date"
                value={formData.dataInicio}
                onChange={(e) => setFormData({ ...formData, dataInicio: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-paper-50 border border-paper-300 text-ink-900 focus:outline-none focus:ring-2 focus:ring-leaf-500 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-600 uppercase tracking-wider mb-1">
                Hora Início *
              </label>
              <input
                type="time"
                value={formData.horaInicio}
                onChange={(e) => setFormData({ ...formData, horaInicio: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-paper-50 border border-paper-300 text-ink-900 focus:outline-none focus:ring-2 focus:ring-leaf-500 text-sm"
                required
              />
            </div>
          </div>

          {/* Fim */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-600 uppercase tracking-wider mb-1">
                Data Término *
              </label>
              <input
                type="date"
                value={formData.dataFim}
                onChange={(e) => setFormData({ ...formData, dataFim: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-paper-50 border border-paper-300 text-ink-900 focus:outline-none focus:ring-2 focus:ring-leaf-500 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-600 uppercase tracking-wider mb-1">
                Hora Término *
              </label>
              <input
                type="time"
                value={formData.horaFim}
                onChange={(e) => setFormData({ ...formData, horaFim: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-paper-50 border border-paper-300 text-ink-900 focus:outline-none focus:ring-2 focus:ring-leaf-500 text-sm"
                required
              />
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-xs font-semibold text-ink-600 uppercase tracking-wider mb-1">
              Motivo do Bloqueio *
            </label>
            <textarea
              rows={3}
              value={formData.motivo}
              onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
              placeholder="Ex: Reunião clínica, consulta médica externa, folga programada..."
              className="w-full px-3 py-2 rounded-lg bg-paper-50 border border-paper-300 text-ink-900 focus:outline-none focus:ring-2 focus:ring-leaf-500 text-sm resize-none"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-paper-300">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-paper-300 text-ink-600 hover:bg-paper-200 text-sm font-medium transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-amber-700 hover:bg-amber-800 text-paper-50 text-sm font-medium shadow-sm transition disabled:opacity-50"
            >
              {submitting ? 'Bloqueando...' : 'Confirmar Bloqueio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
