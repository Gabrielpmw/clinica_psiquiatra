import React, { useState, useEffect } from 'react';
import { X, UserPlus, Shield, UserCheck, UserX, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { getUsuariosApi, createUsuarioApi, toggleUsuarioStatusApi } from '../services/api';

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

  // helpers de input
  const inputStyle = {
    backgroundColor: C.paper50,
    borderColor:     C.paper300,
    color:           C.ink900,
  };
  const inputEvents = {
    onFocus: (e) => { e.target.style.borderColor = C.leaf500; e.target.style.boxShadow = `0 0 0 2px ${C.leaf500}33`; },
    onBlur:  (e) => { e.target.style.borderColor = C.paper300; e.target.style.boxShadow = 'none'; },
  };
  const baseInput = 'w-full px-3 py-2 text-xs border rounded-lg focus:outline-none transition-colors';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(23,56,42,0.45)', backdropFilter: 'blur(2px)' }}
    >
      <div
        className="rounded-2xl shadow-xl border w-full max-w-4xl my-8 overflow-hidden flex flex-col max-h-[90vh]"
        style={{ backgroundColor: C.paper50, borderColor: C.paper300 }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between border-b"
          style={{ backgroundColor: C.leaf900, borderColor: C.leaf800 }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${C.leaf700}66`, color: C.leaf200 }}
            >
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold" style={{ color: C.paper50 }}>
                Gestão de Usuários &amp; Acessos (RBAC)
              </h2>
              <p className="text-xs" style={{ color: C.leaf200 }}>
                Apenas administradores podem criar e gerenciar profissionais
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition-colors"
            style={{ color: C.leaf200 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = C.paper50; e.currentTarget.style.backgroundColor = C.leaf800; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = C.leaf200; e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Messages */}
        <div className="px-6 pt-4">
          {error && (
            <div
              className="p-3 rounded-lg text-xs flex items-center gap-2 mb-3 border"
              style={{ backgroundColor: C.cancelledBg, borderColor: `${C.cancelled}44`, color: C.cancelled }}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div
              className="p-3 rounded-lg text-xs flex items-center gap-2 mb-3 border"
              style={{ backgroundColor: C.leaf100, borderColor: C.leaf200, color: C.leaf800 }}
            >
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto">
          {/* Formulário de Criação (Coluna Esquerda) */}
          <div
            className="lg:col-span-5 rounded-xl border overflow-hidden"
            style={{ backgroundColor: C.paper50, borderColor: C.paper300 }}
          >
            {/* Header do cartão */}
            <div
              className="px-5 py-3 border-b"
              style={{ backgroundColor: C.paper200, borderColor: C.paper300 }}
            >
              <div className="flex items-center gap-2" style={{ color: C.ink900 }}>
                <UserPlus className="w-4 h-4" style={{ color: C.leaf700 }} />
                <span className="text-sm font-semibold">Cadastrar Nova Profissional</span>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: C.ink600 }}>
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Dra. Ana Paula ou Marina Secretária"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className={baseInput}
                  style={inputStyle}
                  {...inputEvents}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: C.ink600 }}>
                  E-mail de Acesso
                </label>
                <input
                  type="email"
                  required
                  placeholder="profissional@clinica.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={baseInput}
                  style={inputStyle}
                  {...inputEvents}
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: C.ink600 }}>
                  Perfil de Acesso (Papel / Cargo) *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className={baseInput}
                  style={{ ...inputStyle, backgroundColor: C.paper50 }}
                  {...inputEvents}
                >
                  <option value="DOUTORA">Doutora / Psiquiatra (Acesso Clínico)</option>
                  <option value="SECRETARIA">Secretária / Funcionária (Recepção)</option>
                  <option value="ADMINISTRACAO">Administração (Gestão Completa)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: C.ink600 }}>
                  Senha Provisória (Mín. 8 dígitos)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={baseInput}
                  style={inputStyle}
                  {...inputEvents}
                />
              </div>

              <button
                type="submit"
                disabled={formSubmitting}
                className="w-full mt-2 py-2 px-4 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 min-h-[36px]"
                style={{ backgroundColor: C.leaf700, color: C.paper50 }}
                onMouseEnter={(e) => { if (!formSubmitting) e.currentTarget.style.backgroundColor = C.leaf600; }}
                onMouseLeave={(e) => { if (!formSubmitting) e.currentTarget.style.backgroundColor = C.leaf700; }}
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
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.ink600 }}>
                Usuários Registrados ({usuarios.length})
              </span>
              <button
                onClick={fetchUsuarios}
                className="text-xs flex items-center gap-1 transition-colors"
                style={{ color: C.ink400 }}
                onMouseEnter={(e) => { e.currentTarget.style.color = C.leaf700; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = C.ink400; }}
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>

            <div
              className="flex-1 rounded-xl border overflow-hidden shadow-sm bg-white overflow-x-auto"
              style={{ borderColor: C.paper300 }}
            >
              <table className="w-full text-left text-xs">
                <thead style={{ backgroundColor: C.paper200, color: C.ink600 }}>
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Nome / E-mail</th>
                    <th className="px-3 py-2.5 font-semibold">Perfil</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center" style={{ color: C.ink400 }}>
                        Nenhum usuário localizado.
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
                        <td className="px-3 py-2.5">
                          <p className="font-medium" style={{ color: C.ink900 }}>{u.nome}</p>
                          <p className="text-[11px]" style={{ color: C.ink400 }}>{u.email}</p>
                        </td>
                        <td className="px-3 py-2.5">
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
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-medium border"
                              style={{ backgroundColor: '#E4EEF6', color: '#4A86B5', borderColor: '#c0d8ed' }}
                            >
                              Secretária
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {u.status ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: C.leaf700 }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: C.leaf700 }}></span>
                              Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: C.ink400 }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: C.ink400 }}></span>
                              Inativo
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            onClick={() => handleToggleStatus(u.id, u.nome, u.status)}
                            title={u.status ? 'Inativar usuário' : 'Reativar usuário'}
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
        <div
          className="px-6 py-3 border-t flex justify-end"
          style={{ backgroundColor: C.paper100, borderColor: C.paper300 }}
        >
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium rounded-lg border transition-colors"
            style={{ borderColor: C.paper300, color: C.ink600, backgroundColor: C.paper50 }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.paper200; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = C.paper50; }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
