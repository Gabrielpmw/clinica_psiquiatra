import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Edit2,
  UserX,
  UserCheck,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Phone,
  MapPin,
  Calendar,
  ChevronRight,
  FileText
} from 'lucide-react';
import { getPacientesApi, togglePacienteStatusApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PatientFormModal from '../components/PatientFormModal';

// ── Paleta de cores ──────────────────────────────────────────────────────────
const C = {
  paper50:  '#F9FAF6',
  paper100: '#F2F5EF',
  paper200: '#E6ECE2',
  paper300: '#D5DED0',
  leaf100:  '#E3F0E8',
  leaf200:  '#CFE5D8',
  leaf500:  '#4A9E7A',
  leaf600:  '#368262',
  leaf700:  '#2B6A4F',
  leaf800:  '#1F4D3A',
  leaf900:  '#17382A',
  ink400:   '#7C8B83',
  ink600:   '#4A5A52',
  ink900:   '#1E2A24',
  cancelled:   '#B5645C',
  cancelledBg: '#F6E3E1',
};

export default function PatientsPage() {
  const navigate = useNavigate();
  const { user, isSecretaria, isAdmin, isDoutora } = useAuth();
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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: C.paper100, color: C.ink900 }}>

      {/* Notificação Toast */}
      {notification && (
        <div
          className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg text-xs font-medium shadow-md flex items-center gap-2 border"
          style={
            notification.type === 'success'
              ? { backgroundColor: C.leaf700, color: C.paper50, borderColor: C.leaf800 }
              : { backgroundColor: C.cancelled, color: '#fff', borderColor: '#8e3d35' }
          }
        >
          {notification.type === 'success' ? (
            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Barra superior */}
      <header
        className="sticky top-0 z-10 px-6 py-3 flex items-center justify-between shadow-sm border-b"
        style={{ backgroundColor: C.paper50, borderColor: C.paper300 }}
      >
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs" style={{ color: C.ink400 }}>
          <button
            onClick={() => navigate('/dashboard')}
            className="transition-colors"
            style={{ color: C.ink600 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = C.leaf700; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = C.ink600; }}
          >
            Início
          </button>
          <ChevronRight className="w-3 h-3" />
          <span style={{ color: C.ink900, fontWeight: 600 }}>Pacientes</span>
        </nav>

        {/* Usuário e Link Agenda */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/agenda')}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition"
            style={{ backgroundColor: C.paper50, borderColor: C.paper300, color: C.leaf700 }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.leaf100; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = C.paper50; }}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Ver Agenda</span>
          </button>
          <span className="text-xs font-semibold" style={{ color: C.ink900 }}>
            {user?.nome || 'Usuário'}
          </span>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8">

        {/* Cabeçalho de página */}
        <div className="mb-2">
          <h1 className="text-[26px] font-semibold" style={{ color: C.ink900 }}>
            Pacientes
          </h1>
          <p className="text-sm mt-1" style={{ color: C.ink600 }}>
            Cadastre e consulte os pacientes da clínica.
          </p>
        </div>

        {/* Barra de ações */}
        <div
          className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-lg mb-6 mt-4"
          style={{ backgroundColor: C.paper200, border: `1px solid ${C.paper300}` }}
        >
          {canEdit && (
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors min-h-[40px]"
              style={{ backgroundColor: C.leaf700, color: C.paper50 }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.leaf600; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = C.leaf700; }}
            >
              <UserPlus className="w-4 h-4" />
              Novo Paciente
            </button>
          )}

          {/* Busca */}
          <div className="relative flex-1 min-w-[180px]">
            <Search
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: C.ink400 }}
            />
            <input
              type="text"
              placeholder="Buscar paciente por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:outline-none transition-colors"
              style={{
                backgroundColor: C.paper50,
                borderColor: C.paper300,
                color: C.ink900,
              }}
              onFocus={(e) => { e.target.style.borderColor = C.leaf500; }}
              onBlur={(e) => { e.target.style.borderColor = C.paper300; }}
            />
          </div>

          {/* Filtro de status */}
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-3.5 h-3.5" style={{ color: C.ink400 }} />
            <div
              className="inline-flex rounded-lg p-0.5 text-xs"
              style={{ border: `1px solid ${C.paper300}`, backgroundColor: C.paper50 }}
            >
              {[
                { key: 'ativo', label: 'Ativos' },
                { key: 'inativo', label: 'Inativos' },
                { key: 'todos', label: 'Todos' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setStatusFilter(key)}
                  className="px-3 py-1 rounded-md transition-colors font-medium"
                  style={{
                    backgroundColor: statusFilter === key ? C.paper50 : 'transparent',
                    color: statusFilter === key
                      ? (key === 'inativo' ? C.cancelled : C.leaf700)
                      : C.ink600,
                    boxShadow: statusFilter === key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    fontWeight: statusFilter === key ? 600 : 400,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              onClick={fetchPacientes}
              title="Recarregar lista"
              className="p-2 rounded-lg border transition-colors"
              style={{ borderColor: C.paper300, color: C.ink400, backgroundColor: C.paper50 }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.leaf100; e.currentTarget.style.color = C.ink900; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = C.paper50; e.currentTarget.style.color = C.ink400; }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Contador */}
          <span className="text-xs ml-auto shrink-0" style={{ color: C.ink400 }}>
            Exibindo: <strong style={{ color: C.ink600 }}>{pacientes.length}</strong>
          </span>
        </div>

        {/* Tabela de pacientes */}
        <div
          className="rounded-xl border shadow-sm overflow-hidden"
          style={{ backgroundColor: C.paper50, borderColor: C.paper300 }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead style={{ backgroundColor: C.paper200, color: C.ink600 }}>
                <tr>
                  <th className="px-5 py-3 font-semibold">Paciente / Nascimento</th>
                  <th className="px-5 py-3 font-semibold">Sexo</th>
                  <th className="px-5 py-3 font-semibold">Responsável Legal</th>
                  <th className="px-5 py-3 font-semibold">Endereço Principal</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  {(canEdit || isDoutora) && (
                    <th className="px-5 py-3 font-semibold text-right">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={canEdit || isDoutora ? 6 : 5} className="px-5 py-12 text-center">
                      <div className="flex items-center justify-center gap-2" style={{ color: C.ink400 }}>
                        <RefreshCw className="w-4 h-4 animate-spin" style={{ color: C.leaf500 }} />
                        Carregando pacientes...
                      </div>
                    </td>
                  </tr>
                ) : pacientes.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit || isDoutora ? 6 : 5} className="px-5 py-12 text-center">
                      <Users className="w-8 h-8 mx-auto mb-2" style={{ color: C.paper300 }} />
                      <p className="font-medium" style={{ color: C.ink600 }}>Nenhum paciente localizado</p>
                      <p className="text-[11px] mt-1" style={{ color: C.ink400 }}>
                        {searchTerm
                          ? 'Tente ajustar os termos da busca.'
                          : 'Nenhum paciente ainda. Clique em ＋ Novo Paciente.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  pacientes.map((p) => {
                    const resp = p.responsaveis?.[0];
                    const end = p.enderecos?.[0];

                    return (
                      <tr
                        key={p.id}
                        className="border-t transition-colors"
                        style={{ borderColor: C.paper300 }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.leaf100; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-sm" style={{ color: C.ink900 }}>{p.nomeCompleto}</p>
                          <div className="flex items-center gap-1.5 text-[11px] mt-0.5" style={{ color: C.ink400 }}>
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(p.dataNascimento)}</span>
                            <span>•</span>
                            <span>{calculateAge(p.dataNascimento)}</span>
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <span className="font-medium" style={{ color: C.ink600 }}>
                            {p.sexo === 'M' ? 'Masculino' : p.sexo === 'F' ? 'Feminino' : 'Outro'}
                          </span>
                        </td>

                        <td className="px-5 py-3.5">
                          {resp ? (
                            <div>
                              <p className="font-medium" style={{ color: C.ink900 }}>
                                {resp.nomeCompleto}{' '}
                                <span className="text-[10px]" style={{ color: C.ink400 }}>
                                  ({resp.parentesco})
                                </span>
                              </p>
                              <div className="flex items-center gap-1 text-[11px] mt-0.5" style={{ color: C.ink600 }}>
                                <Phone className="w-3 h-3" style={{ color: C.ink400 }} />
                                <span>{resp.contato}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="italic" style={{ color: C.ink400 }}>Não informado</span>
                          )}
                        </td>

                        <td className="px-5 py-3.5">
                          {end ? (
                            <div>
                              <p className="truncate max-w-xs" style={{ color: C.ink600 }}>
                                {end.logradouro}, {end.numero}
                              </p>
                              <div className="flex items-center gap-1 text-[11px] mt-0.5" style={{ color: C.ink400 }}>
                                <MapPin className="w-3 h-3" />
                                <span>{end.cidade}/{end.estado}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="italic" style={{ color: C.ink400 }}>Não cadastrado</span>
                          )}
                        </td>

                        <td className="px-5 py-3.5">
                          {p.status ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border"
                              style={{
                                backgroundColor: C.leaf200,
                                color: C.leaf700,
                                borderColor: C.leaf200,
                              }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: C.leaf700 }}></span>
                              Ativo
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border"
                              style={{
                                backgroundColor: C.paper200,
                                color: C.ink600,
                                borderColor: C.paper300,
                              }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: C.ink400 }}></span>
                              Inativo
                            </span>
                          )}
                        </td>

                        {(canEdit || isDoutora) && (
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isDoutora && (
                                <button
                                  onClick={() => navigate(`/prontuario/${p.id}`)}
                                  title="Abrir prontuário clínico"
                                  className="px-2 py-1.5 rounded-md border text-xs font-semibold flex items-center gap-1 transition-colors"
                                  style={{ borderColor: C.leaf200, color: C.leaf700, backgroundColor: C.leaf100 }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = C.leaf200;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = C.leaf100;
                                  }}
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Prontuário</span>
                                </button>
                              )}

                              {canEdit && (
                                <>
                                  <button
                                    onClick={() => handleOpenEditModal(p)}
                                    title="Editar dados cadastrais"
                                    className="p-1.5 rounded-md border transition-colors"
                                    style={{ borderColor: C.paper300, color: C.ink600 }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.color = C.leaf700;
                                      e.currentTarget.style.backgroundColor = C.leaf100;
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.color = C.ink600;
                                      e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => setConfirmToggle(p)}
                                    title={p.status ? 'Inativar paciente' : 'Reativar paciente'}
                                    className="p-1.5 rounded-md border text-xs font-medium transition-colors"
                                    style={
                                      p.status
                                        ? { borderColor: `${C.cancelled}55`, color: C.cancelled }
                                        : { borderColor: C.leaf200, color: C.leaf700 }
                                    }
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = p.status ? C.cancelledBg : C.leaf100;
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                  >
                                    {p.status ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer com contador */}
          <div
            className="px-5 py-3 border-t flex items-center justify-between text-xs"
            style={{ backgroundColor: C.paper100, borderColor: C.paper300, color: C.ink400 }}
          >
            <span>
              Total listado: <strong style={{ color: C.ink600 }}>{pacientes.length}</strong> paciente(s)
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(23,56,42,0.45)', backdropFilter: 'blur(2px)' }}>
          <div
            className="rounded-xl shadow-lg border max-w-sm w-full p-6"
            style={{ backgroundColor: C.paper50, borderColor: C.paper300 }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
              style={{
                backgroundColor: confirmToggle.status ? C.cancelledBg : C.leaf100,
                color: confirmToggle.status ? C.cancelled : C.leaf700,
              }}
            >
              <AlertCircle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold" style={{ color: C.ink900 }}>
              {confirmToggle.status ? 'Inativar Paciente?' : 'Reativar Paciente?'}
            </h3>
            <p className="text-xs mt-1.5 leading-relaxed" style={{ color: C.ink600 }}>
              {confirmToggle.status
                ? `O paciente "${confirmToggle.nomeCompleto}" será marcado como inativo.`
                : `O paciente "${confirmToggle.nomeCompleto}" voltará a constar na lista de ativos.`}
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmToggle(null)}
                className="px-4 py-2 text-xs font-medium rounded-lg border transition-colors"
                style={{ borderColor: C.paper300, color: C.ink600, backgroundColor: C.paper50 }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.paper200; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = C.paper50; }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmToggle}
                className="px-4 py-2 text-xs font-semibold rounded-lg transition-colors min-h-[36px]"
                style={
                  confirmToggle.status
                    ? { backgroundColor: C.cancelled, color: '#fff' }
                    : { backgroundColor: C.leaf700, color: C.paper50 }
                }
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = confirmToggle.status ? '#9b3028' : C.leaf600;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = confirmToggle.status ? C.cancelled : C.leaf700;
                }}
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
