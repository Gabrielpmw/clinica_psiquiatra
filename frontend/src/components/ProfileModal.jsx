import React, { useState } from 'react';
import {
  X,
  User,
  KeyRound,
  Shield,
  CheckCircle2,
  AlertCircle,
  Save,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { updateProfileApi, changePasswordApi } from '../services/api';

export default function ProfileModal({ isOpen, onClose }) {
  const { user, updateUser } = useAuth();

  const [activeTab, setActiveTab] = useState('perfil'); // 'perfil' | 'senha'

  // Perfil state
  const [nome, setNome] = useState(user?.nome || '');
  const [email, setEmail] = useState(user?.email || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  // Senha state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState(null);

  if (!isOpen) return null;

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileMsg(null);
    if (!nome.trim() || !email.trim()) {
      setProfileMsg({ type: 'error', text: 'Nome e e-mail são obrigatórios.' });
      return;
    }

    try {
      setSavingProfile(true);
      const updated = await updateProfileApi({
        nome: nome.trim(),
        email: email.trim().toLowerCase()
      });
      updateUser(updated);
      setProfileMsg({ type: 'success', text: 'Perfil atualizado com sucesso!' });
      setTimeout(() => setProfileMsg(null), 3000);
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err);
      const errDetail = err.response?.data?.email?.[0] || err.response?.data?.detail || 'Erro ao atualizar os dados do perfil.';
      setProfileMsg({ type: 'error', text: errDetail });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (!currentPassword) {
      setPasswordMsg({ type: 'error', text: 'Informe a senha atual.' });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'A nova senha deve ter pelo menos 8 caracteres.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'A confirmação de senha não confere.' });
      return;
    }

    try {
      setSavingPassword(true);
      await changePasswordApi({
        current_password: currentPassword,
        new_password: newPassword
      });
      setPasswordMsg({ type: 'success', text: 'Senha alterada com sucesso!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMsg(null), 3000);
    } catch (err) {
      console.error('Erro ao alterar senha:', err);
      const errDetail =
        err.response?.data?.current_password?.[0] ||
        err.response?.data?.new_password?.[0] ||
        err.response?.data?.detail ||
        'Não foi possível alterar a senha.';
      setPasswordMsg({ type: 'error', text: errDetail });
    } finally {
      setSavingPassword(false);
    }
  };

  const getRoleBadge = () => {
    switch (user?.role) {
      case 'ADMINISTRACAO':
        return { label: 'Administrador(a)', bg: 'bg-purple-100 text-purple-800 border-purple-300' };
      case 'DOUTORA':
        return { label: 'Médico(a) Psiquiatra', bg: 'bg-leaf-100 text-leaf-800 border-leaf-300' };
      case 'SECRETARIA':
        return { label: 'Secretaria / Atendimento', bg: 'bg-blue-100 text-blue-800 border-blue-300' };
      default:
        return { label: user?.role || 'Usuário', bg: 'bg-paper-200 text-ink-700 border-paper-300' };
    }
  };

  const roleBadge = getRoleBadge();

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-paper-50 w-full max-w-md rounded-2xl border border-paper-300 shadow-2xl overflow-hidden animate-scaleUp">
        {/* Cabeçalho */}
        <div className="p-6 bg-paper-100 border-b border-paper-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-leaf-700 text-paper-50 flex items-center justify-center font-bold text-base shadow-xs">
              {user?.nome?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <h3 className="font-bold text-base text-ink-900 leading-tight">Configurações de Perfil</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleBadge.bg}`}>
                  {roleBadge.label}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-400 hover:text-ink-800 hover:bg-paper-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-paper-300 bg-paper-50 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('perfil')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === 'perfil'
                ? 'border-leaf-700 text-leaf-800'
                : 'border-transparent text-ink-500 hover:text-ink-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Meus Dados</span>
          </button>
          <button
            onClick={() => setActiveTab('senha')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs font-bold border-b-2 transition ${
              activeTab === 'senha'
                ? 'border-leaf-700 text-leaf-800'
                : 'border-transparent text-ink-500 hover:text-ink-800'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Mudar Senha</span>
          </button>
        </div>

        {/* Conteúdo Aba Perfil */}
        {activeTab === 'perfil' && (
          <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
            {profileMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  profileMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {profileMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                )}
                <span>{profileMsg.text}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-ink-700 mb-1">Nome Completo:</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                className="w-full py-2 px-3 rounded-xl border border-paper-300 text-sm font-medium text-ink-900 bg-white focus:outline-none focus:ring-1 focus:ring-leaf-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-700 mb-1">E-mail de Acesso:</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full py-2 px-3 rounded-xl border border-paper-300 text-sm font-medium text-ink-900 bg-white focus:outline-none focus:ring-1 focus:ring-leaf-500"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-leaf-700 hover:bg-leaf-800 text-white rounded-xl text-xs font-bold shadow-xs transition"
              >
                <Save className="w-4 h-4" />
                <span>{savingProfile ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Conteúdo Aba Senha */}
        {activeTab === 'senha' && (
          <form onSubmit={handleChangePassword} className="p-6 space-y-4">
            {passwordMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  passwordMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {passwordMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                )}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-ink-700 mb-1">Senha Atual:</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full py-2 px-3 rounded-xl border border-paper-300 text-sm font-medium text-ink-900 bg-white focus:outline-none focus:ring-1 focus:ring-leaf-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-700 mb-1">Nova Senha:</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo de 8 caracteres"
                required
                minLength={8}
                className="w-full py-2 px-3 rounded-xl border border-paper-300 text-sm font-medium text-ink-900 bg-white focus:outline-none focus:ring-1 focus:ring-leaf-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-700 mb-1">Confirmar Nova Senha:</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                required
                minLength={8}
                className="w-full py-2 px-3 rounded-xl border border-paper-300 text-sm font-medium text-ink-900 bg-white focus:outline-none focus:ring-1 focus:ring-leaf-500"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingPassword}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-leaf-700 hover:bg-leaf-800 text-white rounded-xl text-xs font-bold shadow-xs transition"
              >
                <Lock className="w-4 h-4" />
                <span>{savingPassword ? 'Alterando...' : 'Atualizar Senha'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
