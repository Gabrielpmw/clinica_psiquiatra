import React, { useState, useEffect } from 'react';
import { X, UserPlus, Shield, UserCheck, UserX, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { getUsuariosApi, createUsuarioApi, toggleUsuarioStatusApi } from '../services/api';

export default function UserManagementModal({ isOpen, onClose }) {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state para novo usuário
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('DOUTORA'); // Padrão Psiquiatra conforme solicitação do usuário

  const fetchUsuarios = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getUsuariosApi();
      setUsuarios(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError('Erro ao carregar lista de usuários. Verifique as permissões de administrador.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsuarios();
      setSuccess('');
      setError('');
    }
  }, [isOpen]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setFormSubmitting(true);

    try {
      await createUsuarioApi({
        nome,
        email,
        password,
        role,
      });
      setSuccess(`Profissional (${role === 'DOUTORA' ? 'Psiquiatra' : 'Funcionária'}) cadastrada com sucesso!`);
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
        setError(msg || 'Falha ao cadastrar usuário.');
      } else {
        setError('Erro ao criar usuário.');
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (id, nomeUsuario, currentStatus) => {
    try {
      await toggleUsuarioStatusApi(id);
      setSuccess(`Status de ${nomeUsuario} alterado para ${!currentStatus ? 'Ativo' : 'Inativo'}.`);
      fetchUsuarios();
    } catch {
      setError('Não foi possível alterar o status do usuário.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-4xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Gestão de Usuários & Acessos (RBAC)</h2>
              <p className="text-xs text-slate-400">Apenas administradores podem criar e gerenciar profissionais</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Messages */}
        <div className="px-6 pt-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto">
          {/* Formulário de Criação (Coluna Esquerda) */}
          <div className="lg:col-span-5 bg-slate-50 p-5 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-2 mb-4 text-slate-800 font-semibold text-sm">
              <UserPlus className="w-4 h-4 text-teal-600" />
              Cadastrar Nova Profissional
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Dra. Ana Paula ou Marina Secretária"
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
                  placeholder="profissional@clinica.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Perfil de Acesso (Papel / Cargo)
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 focus:outline-none bg-white"
                >
                  <option value="DOUTORA">Doutora / Psiquiatra (Acesso Clínico)</option>
                  <option value="SECRETARIA">Secretária / Funcionária (Recepção)</option>
                  <option value="ADMINISTRACAO">Administração (Gestão Completa)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Senha Provisória (Mín. 8 dígitos)
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

              <button
                type="submit"
                disabled={formSubmitting}
                className="w-full mt-2 py-2 px-4 bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {formSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    Criar Usuário no Sistema
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Tabela de Usuários Existentes (Coluna Direita) */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Usuários Registrados ({usuarios.length})
              </span>
              <button
                onClick={fetchUsuarios}
                className="text-xs text-slate-500 hover:text-teal-600 flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>

            <div className="flex-1 border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="px-3 py-2.5">Nome / E-mail</th>
                    <th className="px-3 py-2.5">Perfil</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {usuarios.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                        Nenhum usuário localizado.
                      </td>
                    </tr>
                  ) : (
                    usuarios.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2.5">
                          <p className="font-medium text-slate-800">{u.nome}</p>
                          <p className="text-[11px] text-slate-400">{u.email}</p>
                        </td>
                        <td className="px-3 py-2.5">
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
                        <td className="px-3 py-2.5">
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
                        <td className="px-3 py-2.5 text-right">
                          {/* Não permite inativar o próprio admin que está logado se for o único */}
                          <button
                            onClick={() => handleToggleStatus(u.id, u.nome, u.status)}
                            title={u.status ? 'Inativar usuário' : 'Reativar usuário'}
                            className={`p-1.5 rounded-md border text-xs font-medium transition-colors ${
                              u.status
                                ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                            }`}
                          >
                            {u.status ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
