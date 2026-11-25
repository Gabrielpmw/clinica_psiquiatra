import React, { useEffect, useState } from 'react';
import { Clock, X, AlertCircle } from 'lucide-react';

const pad = (n) => String(n).padStart(2, '0');

export default function EditSessionTimeModal({ sessao, isOpen, onClose, onSave }) {
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [duracaoMin, setDuracaoMin] = useState(50);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!isOpen || !sessao) return;
    const ini = new Date(sessao.dataHoraInicio);
    const fim = new Date(sessao.dataHoraFim);
    const diffMin = Math.round((fim.getTime() - ini.getTime()) / 60000);
    setHoraInicio(`${pad(ini.getHours())}:${pad(ini.getMinutes())}`);
    setDuracaoMin(diffMin > 0 ? diffMin : 50);
    setErro('');
    setSaving(false);
  }, [isOpen, sessao]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, saving, onClose]);

  if (!isOpen || !sessao) return null;

  const dataStr = (sessao.dataHoraInicio || '').substring(0, 10);
  const dataFormatada = dataStr ? dataStr.split('-').reverse().join('/') : '';

  const calcularFimPreview = () => {
    if (!horaInicio || !horaInicio.includes(':')) return '--:--';
    const [h, m] = horaInicio.split(':').map(Number);
    const base = new Date(2000, 0, 1, h, m, 0);
    const fim = new Date(base.getTime() + duracaoMin * 60000);
    return `${pad(fim.getHours())}:${pad(fim.getMinutes())}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!horaInicio) {
      setErro('Informe o novo horário.');
      return;
    }
    setErro('');
    try {
      setSaving(true);
      await onSave(sessao, horaInicio, duracaoMin);
      onClose();
    } catch (err) {
      const dataErr = err?.response?.data;
      const msg =
        dataErr?.error ||
        dataErr?.detail ||
        (Array.isArray(dataErr) ? dataErr[0] : null) ||
        (Array.isArray(dataErr?.non_field_errors) ? dataErr.non_field_errors[0] : null) ||
        (Array.isArray(dataErr?.dataHoraFim) ? dataErr.dataHoraFim[0] : null) ||
        'Não foi possível alterar o horário da sessão.';
      setErro(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 backdrop-blur-[1px] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="editar-hora-sessao-title"
        className="w-full max-w-xs rounded-2xl border border-paper-300 bg-paper-50 shadow-xl overflow-hidden animate-fadeIn"
      >
        <div className="flex items-center justify-between px-4 py-3 bg-paper-200 border-b border-paper-300">
          <h3 id="editar-hora-sessao-title" className="text-sm font-bold text-ink-900 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-leaf-700" />
            <span>Alterar horário</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Fechar"
            className="p-1 rounded-lg text-ink-500 hover:text-ink-900 hover:bg-paper-300 transition disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="text-xs text-ink-600">
            <p className="font-semibold text-ink-900 truncate">{sessao.paciente_nome}</p>
            {dataFormatada && <p className="mt-0.5">Dia {dataFormatada}</p>}
          </div>

          {erro && (
            <div className="flex items-start gap-1.5 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          <div>
            <label htmlFor="novo-horario-sessao" className="block text-xs font-semibold text-ink-700 mb-1">
              Novo horário de início
            </label>
            <input
              id="novo-horario-sessao"
              type="time"
              autoFocus
              required
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-paper-300 bg-paper-100 text-sm font-mono font-semibold text-ink-900 focus:outline-none focus:ring-2 focus:ring-leaf-500"
            />
            <p className="text-[11px] text-ink-500 mt-1">
              Duração de {duracaoMin} min · Término às <span className="font-mono font-semibold text-ink-700">{calcularFimPreview()}</span>
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-paper-200">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg border border-paper-300 bg-paper-100 hover:bg-paper-200 text-xs font-semibold text-ink-700 transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 rounded-lg bg-leaf-700 hover:bg-leaf-800 text-xs font-semibold text-white shadow-xs transition disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
