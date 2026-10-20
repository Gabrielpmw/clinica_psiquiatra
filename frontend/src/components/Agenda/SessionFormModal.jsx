import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, User, Sparkles, AlertCircle } from 'lucide-react';
import { getPacientesApi } from '../../services/api';
import { criarSessao } from '../../services/agendaService';
import { useNotification } from '../../context/NotificationContext';

export default function SessionFormModal({ isOpen, onClose, onSuccess, initialDate, initialTime }) {
  const { notifySuccess, notifyError } = useNotification();
  const [pacientes, setPacientes] = useState([]);
  const [loadingPacientes, setLoadingPacientes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState('');

  const [formData, setFormData] = useState({
    paciente: '',
    data: initialDate || new Date().toISOString().split('T')[0],
    horaInicio: initialTime || '09:00',
    duracaoMinutos: 50,
    tipo: 'AVALIATIVA',
  });

  useEffect(() => {
    if (isOpen) {
      carregarPacientes();
      setFormData((prev) => ({
        ...prev,
        data: initialDate || prev.data,
        horaInicio: initialTime || prev.horaInicio,
      }));
      setErro('');
    }
  }, [isOpen, initialDate, initialTime]);

  const carregarPacientes = async () => {
    try {
      setLoadingPacientes(true);
      const res = await getPacientesApi({ status: true });
      const lista = res.results || res;
      setPacientes(Array.isArray(lista) ? lista : []);
    } catch (err) {
      console.error('Erro ao carregar pacientes:', err);
    } finally {
      setLoadingPacientes(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    if (!formData.paciente) {
      setErro('Selecione um paciente para a sessão.');
      return;
    }

    try {
      setSubmitting(true);

      // Calcular dataHoraInicio e dataHoraFim em ISO
      const inicio = new Date(`${formData.data}T${formData.horaInicio}:00`);
      const fim = new Date(inicio.getTime() + formData.duracaoMinutos * 60000);

      const payload = {
        paciente: formData.paciente,
        dataHoraInicio: inicio.toISOString(),
        dataHoraFim: fim.toISOString(),
        tipo: formData.tipo,
        status: 'AGENDADA',
      };

      const novaSessao = await criarSessao(payload);
      notifySuccess('Consulta agendada com sucesso!');
      if (onSuccess) onSuccess(novaSessao);
      onClose();
    } catch (err) {
      console.error('Erro ao criar sessão:', err);
      const mensagemErro =
        err.response?.data?.dataHoraFim ||
        (typeof err.response?.data === 'string'
          ? err.response.data
          : err.response?.data?.detail ||
            err.response?.data?.[0] ||
            'Não foi possível agendar a sessão. Verifique os horários informados.');
      setErro(mensagemErro);
      notifyError(mensagemErro);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 backdrop-blur-xs p-4">
      <div className="bg-paper-50 rounded-2xl border border-paper-300 shadow-xl w-full max-w-lg overflow-hidden animate-fade-in">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-6 py-4 bg-paper-200 border-b border-paper-300">
          <div>
            <h2 className="text-lg font-semibold text-ink-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-leaf-700" />
              Agendar Nova Sessão
            </h2>
            <p className="text-xs text-ink-600 mt-0.5">
              Defina o paciente, horário e se a sessão é avaliativa ou interventiva.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-ink-400 hover:text-ink-900 p-1 rounded-lg hover:bg-paper-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {erro && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {/* Seleção de Paciente */}
          <div>
            <label className="block text-xs font-semibold text-ink-600 uppercase tracking-wider mb-1">
              Paciente *
            </label>
            <div className="relative">
              <select
                value={formData.paciente}
                onChange={(e) => setFormData({ ...formData, paciente: e.target.value })}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-paper-50 border border-paper-300 text-ink-900 focus:outline-none focus:ring-2 focus:ring-leaf-500 text-sm"
                required
              >
                <option value="">Selecione um paciente...</option>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nomeCompleto}
                  </option>
                ))}
              </select>
              <User className="w-4 h-4 text-ink-400 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Tipo de Sessão */}
          <div>
            <label className="block text-xs font-semibold text-ink-600 uppercase tracking-wider mb-1">
              Tipo de Sessão *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, tipo: 'AVALIATIVA' })}
                className={`py-2 px-3 rounded-lg border text-sm font-medium transition flex items-center justify-center gap-2 ${
                  formData.tipo === 'AVALIATIVA'
                    ? 'bg-leaf-700 border-leaf-700 text-paper-50 shadow-sm'
                    : 'bg-paper-50 border-paper-300 text-ink-600 hover:bg-leaf-100'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Sessão Avaliativa
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, tipo: 'INTERVENTIVA' })}
                className={`py-2 px-3 rounded-lg border text-sm font-medium transition flex items-center justify-center gap-2 ${
                  formData.tipo === 'INTERVENTIVA'
                    ? 'bg-leaf-700 border-leaf-700 text-paper-50 shadow-sm'
                    : 'bg-paper-50 border-paper-300 text-ink-600 hover:bg-leaf-100'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Sessão Interventiva
              </button>
            </div>
          </div>

          {/* Data e Hora Início */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-600 uppercase tracking-wider mb-1">
                Data *
              </label>
              <input
                type="date"
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-paper-50 border border-paper-300 text-ink-900 focus:outline-none focus:ring-2 focus:ring-leaf-500 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-600 uppercase tracking-wider mb-1">
                Hora Início *
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={formData.horaInicio}
                  onChange={(e) => setFormData({ ...formData, horaInicio: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-paper-50 border border-paper-300 text-ink-900 focus:outline-none focus:ring-2 focus:ring-leaf-500 text-sm"
                  required
                />
                <Clock className="w-4 h-4 text-ink-400 absolute left-3 top-2.5" />
              </div>
            </div>
          </div>

          {/* Duração em Minutos */}
          <div>
            <label className="block text-xs font-semibold text-ink-600 uppercase tracking-wider mb-1">
              Duração da Consulta
            </label>
            <div className="flex gap-2">
              {[30, 45, 50, 60, 90].map((dur) => (
                <button
                  key={dur}
                  type="button"
                  onClick={() => setFormData({ ...formData, duracaoMinutos: dur })}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition ${
                    formData.duracaoMinutos === dur
                      ? 'bg-leaf-200 border-leaf-700 text-leaf-900'
                      : 'bg-paper-50 border-paper-300 text-ink-600 hover:bg-paper-200'
                  }`}
                >
                  {dur} min
                </button>
              ))}
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-paper-300">
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
              className="px-5 py-2 rounded-lg bg-leaf-700 hover:bg-leaf-600 text-paper-50 text-sm font-medium shadow-sm transition disabled:opacity-50"
            >
              {submitting ? 'Salvando...' : 'Confirmar Agendamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
