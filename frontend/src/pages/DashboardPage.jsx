import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Calendar,
  FileText,
  Sparkles,
  LogOut,
  UserPlus,
  ArrowRight,
  UserCheck,
  UserX,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Shield,
  KeyRound,
  Clock,
  Bell,
  X,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getUsuariosApi,
  createUsuarioApi,
  toggleUsuarioStatusApi,
  resetUsuarioPasswordApi,
  getSolicitacoesResetApi,
  resolverSolicitacaoResetApi,
  cancelarSolicitacaoResetApi
} from '../services/api';
import AppLayout from '../components/AppLayout';

// ── helpers de estilo ───────────────────────────────────────────────────────
const C = {
  // superfícies
  paper50:  '#F9FAF6',
  paper100: '#F2F5EF',
  paper200: '#E6ECE2',
  paper300: '#D5DED0',
  // verde
  leaf100:  '#E3F0E8',
  leaf200:  '#CFE5D8',
  leaf500:  '#4A9E7A',
  leaf600:  '#368262',
  leaf700:  '#2B6A4F',
  leaf800:  '#1F4D3A',
  leaf900:  '#17382A',
  // tinta
  ink400:   '#7C8B83',
  ink600:   '#4A5A52',
  ink900:   '#1E2A24',
  // status
  cancelledBg: '#F6E3E1',
  cancelled:   '#B5645C',
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout, isAdmin, isSecretaria, isDoutora } = useAuth();

  // Estados exclusivos do perfil de Administração
  const [usuarios, setUsuarios] = useState([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [submittingUser, setSubmittingUser] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('DOUTORA');
  const [userSuccess, setUserSuccess] = useState('');
  const [userError, setUserError] = useState('');

  // Solicitações e gestão de redefinição de senha
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [loadingSolicitacoes, setLoadingSolicitacoes] = useState(false);
  const [solicitacaoModal, setSolicitacaoModal] = useState(null);
  const [userResetModal, setUserResetModal] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState('');

  const fetchUsuarios = async () => {
    if (!isAdmin) return;
    setLoadingUsuarios(true);
    setUserError('');
    try {
      const data = await getUsuariosApi();
      setUsuarios(Array.isArray(data) ? data : data.results || []);
    } catch {
      setUserError('Erro ao carregar lista de usuários.');
    } finally {
      setLoadingUsuarios(false);
    }
  };

  const fetchSolicitacoes = async () => {
    if (!isAdmin) return;
    setLoadingSolicitacoes(true);
    try {
      const data = await getSolicitacoesResetApi({ status: 'PENDENTE' });
      setSolicitacoes(Array.isArray(data) ? data : data.results || []);
    } catch {
      // ignore
    } finally {
      setLoadingSolicitacoes(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsuarios();
      fetchSolicitacoes();
    }
  }, [isAdmin]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setUserError('');
    setUserSuccess('');
    setSubmittingUser(true);

    try {
      await createUsuarioApi({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      });
      setUserSuccess(`${role === 'DOUTORA' ? 'Médico(a) Psiquiatra' : 'Secretário(a)'} cadastrado(a) com sucesso!`);
      setNome('');
      setEmail('');
      setPassword('');
      fetchUsuarios();
    } catch (err) {
      if (err.response?.data) {
        const errorData = err.response.data;
        const msg = Object.entries(errorData)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(' ') : val}`)
          .join(' | ');
        setUserError(msg || 'Falha ao cadastrar usuário.');
      } else {
        setUserError('Erro na conexão com o servidor.');
      }
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await toggleUsuarioStatusApi(id);
      fetchUsuarios();
    } catch {
      setUserError('Não foi possível alterar o status do usuário.');
    }
  };

  const handleResolverSolicitacao = async (e) => {
    e.preventDefault();
    if (!solicitacaoModal || !newPassword) return;
    setResetSubmitting(true);
    setResetError('');
    try {
      await resolverSolicitacaoResetApi(solicitacaoModal.id, newPassword);
      setUserSuccess(`Senha de ${solicitacaoModal.usuario_nome || solicitacaoModal.email} redefinida com sucesso!`);
      setSolicitacaoModal(null);
      setNewPassword('');
      fetchSolicitacoes();
      fetchUsuarios();
    } catch (err) {
      setResetError(err.response?.data?.error || 'Erro ao redefinir senha.');
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleCancelarSolicitacao = async (id) => {
    try {
      await cancelarSolicitacaoResetApi(id);
      fetchSolicitacoes();
    } catch {
      setUserError('Erro ao descartar solicitação.');
    }
  };

  const handleResetDirectUser = async (e) => {
    e.preventDefault();
    if (!userResetModal || !newPassword) return;
    setResetSubmitting(true);
    setResetError('');
    try {
      await resetUsuarioPasswordApi(userResetModal.id, newPassword);
      setUserSuccess(`Senha de ${userResetModal.nome} alterada com sucesso!`);
      setUserResetModal(null);
      setNewPassword('');
      fetchSolicitacoes();
      fetchUsuarios();
    } catch (err) {
      setResetError(err.response?.data?.error || err.response?.data?.password?.[0] || 'Erro ao redefinir senha.');
    } finally {
      setResetSubmitting(false);
    }
  };

  const getRoleLabel = () => {
    if (isAdmin) return 'Administração';
    if (isDoutora) return 'Médico(a) / Psiquiatra';
    if (isSecretaria) return 'Secretaria / Atendimento';
    return user?.role || 'Usuário';
  };

  // ── nav items ──────────────────────────────────────────────────────────────
  const canAccessProntuario = isDoutora || isAdmin;
  const navItems = isAdmin
    ? [
        { icon: Shield, label: 'Usuários', path: 'admin', active: true },
        { icon: Calendar, label: 'Agenda', path: '/agenda', active: false },
        { icon: Users,    label: 'Pacientes', path: '/pacientes', active: false },
        { icon: FileText, label: 'Prontuário & IA', path: '/prontuario', active: false },
      ]
    : [
        { icon: Calendar, label: 'Agenda', path: '/agenda', active: false },
        { icon: Users,    label: 'Pacientes', path: '/pacientes', active: false },
        ...(isDoutora
          ? [
              { icon: FileText, label: 'Prontuário & IA', path: '/prontuario', active: false },
            ]
          : []),
      ];

  // ── input style helpers ────────────────────────────────────────────────────
  const inputCls = {
    style: {
      backgroundColor: C.paper50,
      borderColor:     C.paper300,
      color:           C.ink900,
    },
  };

  const headerLeft = (
    <nav className="flex items-center gap-1.5 text-xs text-ink-400">
      <span className="text-ink-600">Início</span>
      {isAdmin && (
        <>
          <span>›</span>
          <span className="text-ink-900 font-semibold">Usuários</span>
        </>
      )}
      {!isAdmin && (
        <>
          <span>›</span>
          <span className="text-ink-900 font-semibold">Painel Principal</span>
        </>
      )}
    </nav>
  );

  const headerRight = (
    <div className="flex items-center gap-2 sm:gap-3">
      <span className="text-xs font-semibold text-ink-900 max-w-[120px] sm:max-w-none truncate">
        {user?.nome || 'Usuário'}
      </span>
      <span
        className="px-2 py-0.5 rounded-full text-[10px] font-medium border"
        style={{
          backgroundColor: isAdmin ? '#f3e8ff' : isDoutora ? C.leaf100 : '#E4EEF6',
          color: isAdmin ? '#7e22ce' : isDoutora ? C.leaf800 : '#4A86B5',
          borderColor: isAdmin ? '#d8b4fe' : isDoutora ? C.leaf200 : '#bfdbfe',
        }}
      >
        {getRoleLabel()}
      </span>
    </div>
  );

  return (
    <AppLayout
      activePage="inicio"
      headerLeft={headerLeft}
      headerRight={headerRight}
    >
      <div className="p-4 sm:p-6 lg:p-8">

          {/* ══ VISÃO ADMIN ══════════════════════════════════════════════ */}
          {isAdmin ? (
            <div>
              {/* Cabeçalho de página */}
              <div className="mb-2">
                <h1 className="text-[26px] font-semibold" style={{ color: C.ink900 }}>
                  Gestão de Usuários
                </h1>
                <p className="text-sm mt-1" style={{ color: C.ink600 }}>
                  Cadastre e gerencie os profissionais com acesso ao sistema.
                </p>
              </div>

              {/* Barra de ações */}
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-lg mb-6 mt-4"
                style={{ backgroundColor: C.paper200, border: `1px solid ${C.paper300}` }}
              >
                <button
                  form="create-user-form"
                  type="submit"
                  disabled={submittingUser}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 min-h-[40px]"
                  style={{ backgroundColor: C.leaf700, color: C.paper50 }}
                  onMouseEnter={(e) => { if (!submittingUser) e.currentTarget.style.backgroundColor = C.leaf600; }}
                  onMouseLeave={(e) => { if (!submittingUser) e.currentTarget.style.backgroundColor = C.leaf700; }}
                >
                  {submittingUser ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Cadastrando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Cadastrar Profissional
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    fetchUsuarios();
                    fetchSolicitacoes();
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors min-h-[40px]"
                  style={{ backgroundColor: C.paper50, borderColor: C.leaf700, color: C.leaf700 }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.leaf100; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = C.paper50; }}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingUsuarios || loadingSolicitacoes ? 'animate-spin' : ''}`} />
                  Atualizar
                </button>
              </div>

              {/* Notificação de Solicitações Pendentes de Senha */}
              {solicitacoes.length > 0 && (
                <div className="mb-6 p-4 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-200 text-amber-800 flex items-center justify-center shrink-0">
                      <Bell className="w-5 h-5 animate-bounce" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm">
                        {solicitacoes.length === 1
                          ? '1 solicitação de redefinição de senha pendente'
                          : `${solicitacoes.length} solicitações de redefinição de senha pendentes`}
                      </h4>
                      <p className="text-xs text-amber-700 mt-0.5">
                        Profissionais solicitaram nova senha na tela de login. Atenda a solicitação definindo uma nova credencial.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Card de Solicitações Pendentes */}
              {solicitacoes.length > 0 && (
                <div
                  className="mb-6 rounded-xl border shadow-sm overflow-hidden"
                  style={{ backgroundColor: C.paper50, borderColor: C.paper300 }}
                >
                  <div
                    className="px-5 py-3 border-b flex items-center justify-between"
                    style={{ backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }}
                  >
                    <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
                      <KeyRound className="w-4 h-4 text-amber-700" />
                      <span>Solicitações de Redefinição de Senha ({solicitacoes.length})</span>
                    </div>
                  </div>
                  <div className="divide-y divide-paper-300">
                    {solicitacoes.map((s) => (
                      <div
                        key={s.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-amber-50/50 transition"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-ink-900">
                              {s.usuario_nome || s.email}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-800 border border-amber-200">
                              {s.usuario_role === 'DOUTORA'
                                ? 'Médico(a) Psiquiatra'
                                : s.usuario_role === 'SECRETARIA'
                                ? 'Secretaria / Atendimento'
                                : 'Usuário'}
                            </span>
                          </div>
                          <p className="text-xs text-ink-600 flex items-center gap-3">
                            <span>E-mail: <strong>{s.email}</strong></span>
                            <span className="flex items-center gap-1 text-ink-400">
                              <Clock className="w-3 h-3" />
                              {new Date(s.dataSolicitacao).toLocaleString('pt-BR')}
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            onClick={() => {
                              setSolicitacaoModal(s);
                              setUserResetModal(null);
                              setNewPassword('');
                              setResetError('');
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-leaf-700 hover:bg-leaf-800 text-white flex items-center gap-1.5 shadow-xs transition"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            Redefinir Senha
                          </button>
                          <button
                            onClick={() => handleCancelarSolicitacao(s.id)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-paper-300 text-ink-600 hover:bg-paper-200 transition"
                            title="Descartar solicitação"
                          >
                            Descartar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mensagens */}
              {userError && (
                <div
                  className="mb-4 p-3 rounded-lg text-xs flex items-center gap-2 border"
                  style={{ backgroundColor: C.cancelledBg, borderColor: `${C.cancelled}44`, color: C.cancelled }}
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{userError}</span>
                </div>
              )}
              {userSuccess && (
                <div
                  className="mb-4 p-3 rounded-lg text-xs flex items-center gap-2 border"
                  style={{ backgroundColor: C.leaf100, borderColor: C.leaf200, color: C.leaf800 }}
                >
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{userSuccess}</span>
                </div>
              )}

              {/* Grid: formulário + tabela */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* Formulário */}
                <div
                  className="lg:col-span-5 rounded-xl border overflow-hidden shadow-sm"
                  style={{ backgroundColor: C.paper50, borderColor: C.paper300 }}
                >
                  {/* Header do cartão */}
                  <div
                    className="px-5 py-3 border-b"
                    style={{ backgroundColor: C.paper200, borderColor: C.paper300 }}
                  >
                    <h3 className="text-sm font-semibold" style={{ color: C.ink900 }}>
                      Cadastrar Nova Profissional
                    </h3>
                  </div>

                  <form id="create-user-form" onSubmit={handleCreateUser} className="p-5 space-y-4">
                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: C.ink600 }}>
                        Nome Completo
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Nome da profissional"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none transition-colors"
                        style={inputCls.style}
                        onFocus={(e) => { e.target.style.borderColor = C.leaf500; }}
                        onBlur={(e) => { e.target.style.borderColor = C.paper300; }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: C.ink600 }}>
                        E-mail de Acesso
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="email@clinica.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none transition-colors"
                        style={inputCls.style}
                        onFocus={(e) => { e.target.style.borderColor = C.leaf500; }}
                        onBlur={(e) => { e.target.style.borderColor = C.paper300; }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: C.ink600 }}>
                        Perfil de Acesso *
                      </label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none transition-colors"
                        style={{ ...inputCls.style, backgroundColor: C.paper50 }}
                        onFocus={(e) => { e.target.style.borderColor = C.leaf500; }}
                        onBlur={(e) => { e.target.style.borderColor = C.paper300; }}
                      >
                        <option value="DOUTORA">Médico(a) / Psiquiatra</option>
                        <option value="SECRETARIA">Secretário(a) / Atendimento</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium mb-1" style={{ color: C.ink600 }}>
                        Senha de Acesso (mínimo 8 dígitos)
                      </label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 text-sm rounded-lg border focus:outline-none transition-colors"
                        style={inputCls.style}
                        onFocus={(e) => { e.target.style.borderColor = C.leaf500; }}
                        onBlur={(e) => { e.target.style.borderColor = C.paper300; }}
                      />
                    </div>
                  </form>
                </div>

                {/* Tabela de usuários */}
                <div
                  className="lg:col-span-7 rounded-xl border overflow-hidden shadow-sm flex flex-col"
                  style={{ backgroundColor: C.paper50, borderColor: C.paper300 }}
                >
                  {/* Header do cartão */}
                  <div
                    className="px-5 py-3 border-b flex items-center justify-between"
                    style={{ backgroundColor: C.paper200, borderColor: C.paper300 }}
                  >
                    <h3 className="text-sm font-semibold" style={{ color: C.ink900 }}>
                      Profissionais Cadastrados ({usuarios.length})
                    </h3>
                  </div>

                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left text-xs">
                      <thead style={{ backgroundColor: C.paper200, color: C.ink600 }}>
                        <tr>
                          <th className="px-4 py-2.5 font-semibold">Nome / E-mail</th>
                          <th className="px-4 py-2.5 font-semibold">Perfil</th>
                          <th className="px-4 py-2.5 font-semibold">Status</th>
                          <th className="px-4 py-2.5 font-semibold text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usuarios.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-4 py-8 text-center text-sm"
                              style={{ color: C.ink400 }}
                            >
                              Nenhum usuário cadastrado ainda.
                            </td>
                          </tr>
                        ) : (
                          usuarios.map((u) => (
                            <tr
                              key={u.id}
                              className="border-t transition-colors"
                              style={{ borderColor: C.paper300 }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.leaf100; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                            >
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium" style={{ color: C.ink900 }}>{u.nome}</p>
                                  {u.tem_reset_pendente && (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                                      ⚠️ Solicitou nova senha
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px]" style={{ color: C.ink400 }}>{u.email}</p>
                              </td>
                              <td className="px-4 py-2.5">
                                {u.role === 'ADMINISTRACAO' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                    Admin
                                  </span>
                                )}
                                {u.role === 'DOUTORA' && (
                                  <span
                                    className="px-2 py-0.5 rounded-full text-[10px] font-medium border"
                                    style={{ backgroundColor: C.leaf100, color: C.leaf800, borderColor: C.leaf200 }}
                                  >
                                    Médico(a) Psiquiatra
                                  </span>
                                )}
                                {u.role === 'SECRETARIA' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium border"
                                    style={{ backgroundColor: '#E4EEF6', color: '#4A86B5', borderColor: '#c0d8ed' }}
                                  >
                                    Secretaria / Atendimento
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                {u.status ? (
                                  <span
                                    className="inline-flex items-center gap-1 text-[11px] font-medium"
                                    style={{ color: C.leaf700 }}
                                  >
                                    <span
                                      className="w-1.5 h-1.5 rounded-full"
                                      style={{ backgroundColor: C.leaf700 }}
                                    ></span>
                                    Ativo
                                  </span>
                                ) : (
                                  <span
                                    className="inline-flex items-center gap-1 text-[11px] font-medium"
                                    style={{ color: C.ink400 }}
                                  >
                                    <span
                                      className="w-1.5 h-1.5 rounded-full"
                                      style={{ backgroundColor: C.ink400 }}
                                    ></span>
                                    Inativo
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {u.id !== user?.id && (
                                    <button
                                      onClick={() => {
                                        setUserResetModal(u);
                                        setSolicitacaoModal(null);
                                        setNewPassword('');
                                        setResetError('');
                                      }}
                                      title="Redefinir senha deste usuário"
                                      className="p-1.5 rounded-md border text-xs font-medium transition-colors"
                                      style={{ borderColor: C.leaf200, color: C.leaf700 }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = C.leaf100;
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                      }}
                                    >
                                      <KeyRound className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {u.id !== user?.id && (
                                    <button
                                      onClick={() => handleToggleStatus(u.id, u.status)}
                                      title={u.status ? 'Inativar acesso' : 'Reativar acesso'}
                                      className="p-1.5 rounded-md border text-xs font-medium transition-colors"
                                      style={
                                        u.status
                                          ? { borderColor: `${C.cancelled}55`, color: C.cancelled }
                                          : { borderColor: C.leaf200, color: C.leaf700 }
                                      }
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = u.status ? C.cancelledBg : C.leaf100;
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                      }}
                                    >
                                      {u.status ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

          ) : (
            /* ══ VISÃO OPERACIONAL ═══════════════════════════════════════ */
            <div>
              <div className="mb-6">
                <h1 className="text-[26px] font-semibold" style={{ color: C.ink900 }}>
                  Painel Principal
                </h1>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Card Pacientes — clicável */}
                <div
                  onClick={() => navigate('/pacientes')}
                  className="group cursor-pointer rounded-xl border shadow-sm transition-all flex flex-col justify-between overflow-hidden"
                  style={{ backgroundColor: C.paper50, borderColor: C.paper300 }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = C.leaf500;
                    e.currentTarget.style.backgroundColor = C.leaf100;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = C.paper300;
                    e.currentTarget.style.backgroundColor = C.paper50;
                  }}
                >
                  {/* header cartão */}
                  <div
                    className="px-5 py-3 border-b"
                    style={{ backgroundColor: C.paper200, borderColor: C.paper300 }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: C.leaf100, color: C.leaf700 }}
                      >
                        <Users className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-semibold" style={{ color: C.ink900 }}>
                        Gestão de Pacientes
                      </h3>
                    </div>
                  </div>
                  <div className="p-5 flex-1">
                    <p className="text-xs leading-relaxed" style={{ color: C.ink600 }}>
                      Cadastro de pacientes, endereços e responsáveis legais, busca e inativação lógica.
                    </p>
                  </div>
                  <div
                    className="px-5 py-3 border-t flex items-center justify-between text-xs font-semibold"
                    style={{ borderColor: C.paper300, color: C.leaf700 }}
                  >
                    <span>Abrir módulo</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Card Agenda — ativo */}
                <div
                  onClick={() => navigate('/agenda')}
                  className="group cursor-pointer rounded-xl border shadow-sm transition-all flex flex-col justify-between overflow-hidden"
                  style={{ backgroundColor: C.paper50, borderColor: C.paper300 }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = C.leaf500;
                    e.currentTarget.style.backgroundColor = C.leaf100;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = C.paper300;
                    e.currentTarget.style.backgroundColor = C.paper50;
                  }}
                >
                  <div
                    className="px-5 py-3 border-b"
                    style={{ backgroundColor: C.paper200, borderColor: C.paper300 }}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: '#E4EEF6', color: '#4A86B5' }}
                      >
                        <Calendar className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-semibold" style={{ color: C.ink900 }}>
                        Agenda &amp; Sessões
                      </h3>
                    </div>
                  </div>
                  <div className="p-5 flex-1">
                    <p className="text-xs leading-relaxed" style={{ color: C.ink600 }}>
                      Visões diárias e semanais, alteração de status e agendamentos de sessões.
                    </p>
                  </div>
                  <div
                    className="px-5 py-3 border-t flex items-center justify-between text-xs font-semibold"
                    style={{ borderColor: C.paper300, color: C.leaf700 }}
                  >
                    <span>Abrir agenda</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Cards exclusivos da Doutora — Prontuário ativo */}
                {isDoutora && (
                  <div
                    onClick={() => navigate('/pacientes')}
                    className="group cursor-pointer rounded-xl border shadow-sm transition-all flex flex-col justify-between overflow-hidden"
                    style={{ backgroundColor: C.paper50, borderColor: C.paper300 }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = C.leaf500;
                      e.currentTarget.style.backgroundColor = C.leaf100;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = C.paper300;
                      e.currentTarget.style.backgroundColor = C.paper50;
                    }}
                  >
                    <div
                      className="px-5 py-3 border-b"
                      style={{ backgroundColor: C.paper200, borderColor: C.paper300 }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: C.leaf100, color: C.leaf700 }}
                        >
                          <FileText className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-semibold" style={{ color: C.ink900 }}>
                          Prontuário Clínico
                        </h3>
                      </div>
                    </div>
                    <div className="p-5 flex-1">
                      <p className="text-xs leading-relaxed" style={{ color: C.ink600 }}>
                        Anamnese inicial estruturada, texto livre e linha do tempo de anotações por sessão.
                      </p>
                    </div>
                    <div
                      className="px-5 py-3 border-t flex items-center justify-between text-xs font-semibold"
                      style={{ borderColor: C.paper300, color: C.leaf700 }}
                    >
                      <span>Selecionar paciente</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                )}

                {isDoutora && (
                  <div
                    onClick={() => navigate('/prontuario')}
                    className="rounded-xl border shadow-sm flex flex-col justify-between overflow-hidden cursor-pointer hover:border-leaf-600 hover:shadow-md transition-all group"
                    style={{ backgroundColor: C.paper50, borderColor: C.paper300 }}
                  >
                    <div
                      className="px-5 py-3 border-b group-hover:bg-leaf-100 transition-colors"
                      style={{ backgroundColor: C.paper200, borderColor: C.paper300 }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: '#EAF1EC', color: C.leaf700 }}
                        >
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-semibold" style={{ color: C.ink900 }}>
                          Apoio de IA &amp; Laudos
                        </h3>
                      </div>
                    </div>
                    <div className="p-5 flex-1">
                      <p className="text-xs leading-relaxed" style={{ color: C.ink600 }}>
                        Sanitização prévia, integração com IA e Parecer Conclusivo em PDF.
                      </p>
                      <span
                        className="mt-3 inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-semibold bg-leaf-100 text-leaf-800 border border-leaf-300 group-hover:bg-leaf-200 transition"
                      >
                        Acessar Módulo &rarr;
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      {/* Modal de Redefinição de Senha pelo Admin */}
      {(solicitacaoModal || userResetModal) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-paper-50 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-paper-300 shadow-2xl p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-paper-300">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-leaf-100 text-leaf-800 rounded-xl">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-ink-900">
                    Redefinir Senha do Usuário
                  </h3>
                  <p className="text-xs text-ink-600">
                    {solicitacaoModal
                      ? (solicitacaoModal.usuario_nome || solicitacaoModal.email)
                      : `${userResetModal.nome} (${userResetModal.email})`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSolicitacaoModal(null);
                  setUserResetModal(null);
                }}
                className="p-1.5 rounded-lg text-ink-400 hover:text-ink-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetError && (
              <div className="p-3 rounded-lg text-xs flex items-center gap-2 border bg-rose-50 border-rose-200 text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            <form
              onSubmit={solicitacaoModal ? handleResolverSolicitacao : handleResetDirectUser}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-ink-700 mb-1">
                  Nova Senha (mínimo 8 caracteres):
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Digite a nova senha..."
                  className="w-full py-2 px-3 rounded-xl border border-paper-300 text-xs text-ink-900 font-medium focus:ring-1 focus:ring-leaf-500 focus:outline-none"
                />
              </div>

              <p className="text-[11px] text-ink-500 leading-relaxed">
                Ao salvar, a senha do usuário será atualizada imediatamente e ele poderá acessar a plataforma com esta nova credencial.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-paper-200">
                <button
                  type="button"
                  onClick={() => {
                    setSolicitacaoModal(null);
                    setUserResetModal(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-ink-600 hover:bg-paper-200 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resetSubmitting}
                  className="px-5 py-2 bg-leaf-700 hover:bg-leaf-800 text-white font-bold text-xs rounded-xl transition shadow-xs disabled:opacity-50"
                >
                  {resetSubmitting ? 'Salvando...' : 'Confirmar e Atualizar Senha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
