import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  ArrowLeft,
  Edit2,
  UserX,
  UserCheck,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Phone,
  MapPin,
  Calendar
} from 'lucide-react';
import { getPacientesApi, togglePacienteStatusApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PatientFormModal from '../components/PatientFormModal';

export default function PatientsPage() {
  const navigate = useNavigate();
  const { user, isSecretaria, isAdmin } = useAuth();
  const canEdit = isSecretaria || isAdmin;

  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ativo'); // 'todos', 'ativo', 'inativo'

  // Modal de formulário (criação / edição)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pacienteToEdit, setPacienteToEdit] = useState(null);

  // Notificação minimalista com duração de 2 segundos
  const [notification, setNotification] = useState(null);

  // Modal de confirmação para inativação
  const [confirmToggle, setConfirmToggle] = useState(null);

  // Temporizador para auto-remover notificação em 2 segundos
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const fetchPacientes = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchTerm.trim()) {
        params.q = searchTerm.trim();
      }
      if (statusFilter === 'ativo') {
        params.status = 'true';
      } else if (statusFilter === 'inativo') {
        params.status = 'false';
      }

      const data = await getPacientesApi(params);
      setPacientes(Array.isArray(data) ? data : data.results || []);
    } catch {
      setNotification({
        type: 'error',
        message: 'Erro ao carregar pacientes.',
      });
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPacientes();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchPacientes]);

  const handleOpenCreateModal = () => {
    setPacienteToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (paciente) => {
    setPacienteToEdit(paciente);
    setIsModalOpen(true);
  };

  const handleConfirmToggle = async () => {
    if (!confirmToggle) return;
    try {
      await togglePacienteStatusApi(confirmToggle.id);
      setNotification({
        type: 'success',
        message: `Paciente ${confirmToggle.nomeCompleto} ${confirmToggle.status ? 'inativado' : 'reativado'} com sucesso!`,
      });
      setConfirmToggle(null);
      fetchPacientes();
    } catch {
      setNotification({
        type: 'error',
        message: 'Erro ao alterar o status do paciente.',
      });
    }
  };

  // Helper para formatar data (dd/mm/aaaa)
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // Helper para calcular idade
  const calculateAge = (dateStr) => {
    if (!dateStr) return '';
    const birth = new Date(dateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age > 0 ? `${age} anos` : 'menos de 1 ano';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Notificação Toast Minimalista (Duração de 2s) */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-3.5 py-2 rounded-lg text-xs font-medium shadow-md flex items-center gap-2 border transition-all animate-in fade-in slide-in-from-top-2 duration-150 ${
            notification.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-700'
              : 'bg-rose-600 text-white border-rose-700'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao Painel
          </button>
          <div className="h-4 w-px bg-slate-200"></div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-800">Gestão de Pacientes</h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canEdit && (
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              <UserPlus className="w-4 h-4" /> Novo Paciente
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8">
        {/* Filtros e Barra de Busca */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Busca por texto */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar paciente por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 transition-colors"
            />
          </div>

          {/* Filtro de Status */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-500">Filtrar por:</span>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs">
              <button
                onClick={() => setStatusFilter('ativo')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  statusFilter === 'ativo'
                    ? 'bg-white shadow-sm font-semibold text-teal-700'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ativos
              </button>
              <button
                onClick={() => setStatusFilter('inativo')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  statusFilter === 'inativo'
                    ? 'bg-white shadow-sm font-semibold text-rose-700'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Inativos
              </button>
              <button
                onClick={() => setStatusFilter('todos')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  statusFilter === 'todos'
                    ? 'bg-white shadow-sm font-semibold text-slate-800'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos
              </button>
            </div>

            <button
              onClick={fetchPacientes}
              title="Recarregar lista"
              className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Tabela Desktop de Pacientes */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Paciente / Nascimento</th>
                  <th className="px-5 py-3">Sexo</th>
                  <th className="px-5 py-3">Responsável Legal</th>
                  <th className="px-5 py-3">Endereço Principal</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                        Carregando pacientes...
                      </div>
                    </td>
                  </tr>
                ) : pacientes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center">
                      <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-600 font-medium">Nenhum paciente localizado</p>
                      <p className="text-slate-400 text-[11px] mt-1">
                        {searchTerm ? 'Tente ajustar os termos da busca.' : 'Cadastre um paciente clicando em "Novo Paciente".'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  pacientes.map((p) => {
                    const resp = p.responsaveis?.[0];
                    const end = p.enderecos?.[0];

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-slate-800 text-sm">{p.nomeCompleto}</p>
                          <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mt-0.5">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(p.dataNascimento)}</span>
                            <span>•</span>
                            <span>{calculateAge(p.dataNascimento)}</span>
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <span className="font-medium text-slate-700">
                            {p.sexo === 'M' ? 'Masculino' : p.sexo === 'F' ? 'Feminino' : 'Outro'}
                          </span>
                        </td>

                        <td className="px-5 py-3.5">
                          {resp ? (
                            <div>
                              <p className="font-medium text-slate-800">
                                {resp.nomeCompleto}{' '}
                                <span className="text-[10px] text-slate-400">({resp.parentesco})</span>
                              </p>
                              <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{resp.contato}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Não informado</span>
                          )}
                        </td>

                        <td className="px-5 py-3.5">
                          {end ? (
                            <div>
                              <p className="text-slate-700 truncate max-w-xs">
                                {end.logradouro}, {end.numero}
                              </p>
                              <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                <span>{end.cidade}/{end.estado}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Não cadastrado</span>
                          )}
                        </td>

                        <td className="px-5 py-3.5">
                          {p.status ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Inativo
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {canEdit && (
                              <button
                                onClick={() => handleOpenEditModal(p)}
                                title="Editar dados cadastrais"
                                className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {canEdit && (
                              <button
                                onClick={() => setConfirmToggle(p)}
                                title={p.status ? 'Inativar paciente' : 'Reativar paciente'}
                                className={`p-1.5 rounded-md border text-xs font-medium transition-colors ${
                                  p.status
                                    ? 'border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                                    : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                                }`}
                              >
                                {p.status ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer com contadores */}
          <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>
              Total listado: <strong>{pacientes.length}</strong> paciente(s)
            </span>
          </div>
        </div>
      </main>

      {/* Modal de Cadastro / Edição */}
      <PatientFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => {
          setNotification({
            type: 'success',
            message: pacienteToEdit
              ? 'Dados atualizados com sucesso!'
              : 'Paciente cadastrado com sucesso!',
          });
          fetchPacientes();
        }}
        pacienteToEdit={pacienteToEdit}
      />

      {/* Modal de Confirmação para Soft Delete / Inativação */}
      {confirmToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-sm w-full p-6 animate-in fade-in duration-150">
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {confirmToggle.status ? 'Inativar Paciente?' : 'Reativar Paciente?'}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              {confirmToggle.status
                ? `O paciente "${confirmToggle.nomeCompleto}" será marcado como inativo.`
                : `O paciente "${confirmToggle.nomeCompleto}" voltará a constar na lista de ativos.`}
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmToggle(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmToggle}
                className={`px-3.5 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors ${
                  confirmToggle.status
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {confirmToggle.status ? 'Sim, Inativar' : 'Sim, Reativar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
