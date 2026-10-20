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
  Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUsuariosApi, createUsuarioApi, toggleUsuarioStatusApi } from '../services/api';

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

  useEffect(() => {
    if (isAdmin) {
      fetchUsuarios();
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
      setUserSuccess(`${role === 'DOUTORA' ? 'Psiquiatra' : 'Funcionária'} cadastrada com sucesso!`);
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

  const getRoleLabel = () => {
    if (isAdmin) return 'Administração';
    if (isDoutora) return 'Doutora / Psiquiatra';
    if (isSecretaria) return 'Secretária / Recepção';
    return user?.role || 'Usuário';
  };

  // ── nav items ──────────────────────────────────────────────────────────────
  const navItems = isAdmin
    ? [{ icon: Shield, label: 'Usuários', path: 'admin', active: true }]
    : [
        { icon: Calendar, label: 'Agenda', path: '/agenda', active: false },
        { icon: Users,    label: 'Pacientes', path: '/pacientes', active: false },
        ...(isDoutora
          ? [
              { icon: FileText, label: 'Prontuário', path: '/prontuario', active: false },
              { icon: Sparkles, label: 'Pareceres',  path: '/pareceres',  active: false },
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

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: C.paper100, color: C.ink900 }}>

      {/* ── MENU LATERAL ─────────────────────────────────────────────────── */}
      <aside
        className="w-60 shrink-0 flex flex-col h-screen sticky top-0"
        style={{ backgroundColor: C.leaf900 }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b" style={{ borderColor: C.leaf800 }}>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
            style={{ backgroundColor: C.leaf700, color: C.paper50 }}
          >
            SC
          </div>
          <div>
            <p className="text-xs font-bold leading-tight" style={{ color: C.paper50 }}>
              Sistema de Apoio
            </p>
            <p className="text-[10px]" style={{ color: C.leaf200 }}>
              Psiquiatria Infantojuvenil
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {navItems.map(({ icon: Icon, label, path, active }) => (
            <button
              key={label}
              onClick={() => path !== 'admin' && navigate(path)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left"
              style={{
                backgroundColor: active ? C.leaf700 : 'transparent',
                color: active ? C.paper50 : C.leaf200,
                borderLeft: active ? `4px solid ${C.paper50}` : '4px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.backgroundColor = C.leaf800;
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className={active ? 'font-bold' : ''}>{label}</span>
            </button>
          ))}
        </nav>

        {/* Rodapé do menu */}
        <div className="px-4 py-4 border-t space-y-2" style={{ borderColor: C.leaf800 }}>
          <p className="text-xs font-semibold truncate" style={{ color: C.paper50 }}>
            {user?.nome || 'Usuário'}
          </p>
          <p className="text-[10px]" style={{ color: C.leaf200 }}>
            {getRoleLabel()}
          </p>
          <button
            onClick={logout}
            className="mt-1 flex items-center gap-1.5 text-xs font-medium transition-colors"
            style={{ color: C.leaf200 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = C.paper50; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = C.leaf200; }}
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>
      </aside>

      {/* ── ÁREA PRINCIPAL ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen">

        {/* Barra superior */}
        <header
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 shadow-sm border-b"
          style={{ backgroundColor: C.paper50, borderColor: C.paper300 }}
        >
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs" style={{ color: C.ink400 }}>
            <span style={{ color: C.ink600 }}>Início</span>
            {isAdmin && (
              <>
                <span>›</span>
                <span style={{ color: C.ink900, fontWeight: 600 }}>Usuários</span>
              </>
            )}
            {!isAdmin && (
              <>
                <span>›</span>
                <span style={{ color: C.ink900, fontWeight: 600 }}>Painel Principal</span>
              </>
            )}
          </nav>

          {/* Usuário logado */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold" style={{ color: C.ink900 }}>
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
        </header>

        {/* Conteúdo */}
        <main className="flex-1 p-6 sm:p-8">

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
                  onClick={fetchUsuarios}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors min-h-[40px]"
                  style={{ backgroundColor: C.paper50, borderColor: C.leaf700, color: C.leaf700 }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.leaf100; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = C.paper50; }}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingUsuarios ? 'animate-spin' : ''}`} />
                  Atualizar
                </button>
              </div>

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
                        <option value="DOUTORA">Doutora / Psiquiatra</option>
                        <option value="SECRETARIA">Secretária / Funcionária</option>
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
                                <p className="font-medium" style={{ color: C.ink900 }}>{u.nome}</p>
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
                                    Psiquiatra
                                  </span>
                                )}
                                {u.role === 'SECRETARIA' && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium border"
                                    style={{ backgroundColor: '#E4EEF6', color: '#4A86B5', borderColor: '#c0d8ed' }}
                                  >
                                    Secretária
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
                <p className="text-sm mt-1" style={{ color: C.ink600 }}>
                  Selecione um módulo para começar.
                </p>
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
                    className="rounded-xl border shadow-sm flex flex-col justify-between overflow-hidden opacity-70"
                    style={{ backgroundColor: C.paper50, borderColor: C.paper300 }}
                  >
                    <div
                      className="px-5 py-3 border-b"
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
                        className="mt-3 inline-block text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: C.paper200, color: C.ink400 }}
                      >
                        Em breve
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
