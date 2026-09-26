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
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getUsuariosApi, createUsuarioApi, toggleUsuarioStatusApi } from '../services/api';

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

  const getRoleBadge = () => {
    if (isAdmin) return { title: 'Administração', color: 'bg-purple-100 text-purple-800 border-purple-200' };
    if (isDoutora) return { title: 'Doutora / Psiquiatra', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    if (isSecretaria) return { title: 'Secretária / Recepção', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    return { title: user?.role || 'Usuário', color: 'bg-slate-100 text-slate-800 border-slate-200' };
  };

  const roleInfo = getRoleBadge();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header Comum */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white font-bold shadow-sm">
            SC
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800">Sistema de Apoio à Clínica</h1>
            <p className="text-xs text-slate-500">Psiquiatria Infantojuvenil</p>
          </div>
        </div>

        {/* Informações do Usuário e Sair */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-800">{user?.nome || 'Usuário'}</p>
            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border ${roleInfo.color}`}>
              {roleInfo.title}
            </span>
          </div>

          <div className="h-5 w-px bg-slate-200"></div>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8">
        {/* VISÃO 1: PERFIL ADMINISTRADOR (Apenas Gestão de Usuários) */}
        {isAdmin ? (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-800">Gestão de Usuários</h2>
              <p className="text-xs text-slate-500 mt-1">
                Cadastro e controle de acesso de profissionais da clínica
              </p>
            </div>

            {/* Mensagens de Sucesso ou Erro */}
            {userError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{userError}</span>
              </div>
            )}
            {userSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{userSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Formulário de Criação com APENAS UM BOTÃO */}
              <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-semibold text-slate-800 text-sm mb-4">
                  Cadastrar Nova Profissional
                </h3>

                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nome da profissional"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      E-mail de Acesso
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="email@clinica.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Perfil de Acesso
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:outline-none bg-white"
                    >
                      <option value="DOUTORA">Doutora / Psiquiatra</option>
                      <option value="SECRETARIA">Secretária / Funcionária</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Senha de Acesso (mínimo 8 dígitos)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:outline-none"
                    />
                  </div>

                  {/* Único botão de cadastro */}
                  <button
                    type="submit"
                    disabled={submittingUser}
                    className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 mt-2"
                  >
                    {submittingUser ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Cadastrando...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        Cadastrar Profissional
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Tabela de Usuários Registrados */}
              <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-800 text-sm">
                    Profissionais Cadastrados ({usuarios.length})
                  </h3>
                  <button
                    onClick={fetchUsuarios}
                    className="text-xs text-slate-500 hover:text-teal-600 flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingUsuarios ? 'animate-spin' : ''}`} />
                    Atualizar
                  </button>
                </div>

                <div className="border border-slate-100 rounded-lg overflow-x-auto flex-1">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold">
                      <tr>
                        <th className="px-3.5 py-2.5">Nome / E-mail</th>
                        <th className="px-3.5 py-2.5">Perfil</th>
                        <th className="px-3.5 py-2.5">Status</th>
                        <th className="px-3.5 py-2.5 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {usuarios.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                            Nenhum usuário cadastrado.
                          </td>
                        </tr>
                      ) : (
                        usuarios.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/50">
                            <td className="px-3.5 py-2.5">
                              <p className="font-medium text-slate-800">{u.nome}</p>
                              <p className="text-[11px] text-slate-400">{u.email}</p>
                            </td>
                            <td className="px-3.5 py-2.5">
                              {u.role === 'ADMINISTRACAO' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                                  Admin
                                </span>
                              )}
                              {u.role === 'DOUTORA' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Psiquiatra
                                </span>
                              )}
                              {u.role === 'SECRETARIA' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                  Secretária
                                </span>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5">
                              {u.status ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Ativo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] text-rose-500 font-medium">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span> Inativo
                                </span>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 text-right">
                              {u.id !== user?.id && (
                                <button
                                  onClick={() => handleToggleStatus(u.id, u.status)}
                                  title={u.status ? 'Inativar acesso' : 'Reativar acesso'}
                                  className={`p-1.5 rounded-md border text-xs font-medium transition-colors ${
                                    u.status
                                      ? 'border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50'
                                      : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                                  }`}
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
          /* VISÃO 2: OPERACIONAL (Secretária ou Doutora) */
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-800">Painel Principal</h2>
            </div>

            {/* Grid dinâmico por perfil */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1: Gestão de Pacientes (Visível para Secretária e Doutora) */}
              <div
                onClick={() => navigate('/pacientes')}
                className="group cursor-pointer bg-white p-6 rounded-xl border border-teal-200 shadow-sm hover:shadow-md hover:border-teal-500 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-base group-hover:text-teal-600 transition-colors">
                    1. Gestão de Pacientes
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    Cadastro de pacientes, endereços e responsáveis legais, busca e inativação lógica.
                  </p>
                </div>
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-teal-600">
                  <span>Abrir Módulo</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              {/* Card 2: Agenda (Visível para Secretária e Doutora) */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm opacity-80 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-slate-800">2. Agenda & Sessões</h3>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    Visões diárias e semanais, alteração de status e agendamentos de sessões.
                  </p>
                </div>
              </div>

              {/* Card 3: Prontuário Clínico (RESTRITO APENAS À DOUTORA) */}
              {isDoutora && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm opacity-80 flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-4">
                      <FileText className="w-6 h-6" />
                    </div>
                    <h3 className="font-semibold text-slate-800">3. Prontuário Clínico</h3>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      Anamnese inicial estruturada e linha do tempo de anotações por sessão.
                    </p>
                  </div>
                </div>
              )}

              {/* Card 4: Apoio de IA & Laudos (RESTRITO APENAS À DOUTORA) */}
              {isDoutora && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm opacity-80 flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mb-4">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h3 className="font-semibold text-slate-800">4. Apoio de IA & Laudos</h3>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                      Sanitização prévia, integração com IA e Parecer Conclusivo em PDF.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
