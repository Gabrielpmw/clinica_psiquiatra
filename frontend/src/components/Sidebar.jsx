import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Calendar,
  Users,
  FileText,
  LogOut,
  UserCheck,
  Shield,
  Settings,
  User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ProfileModal from './ProfileModal';

export default function Sidebar({ activePage }) {
  const navigate = useNavigate();
  const { user, logout, isAdmin, isDoutora } = useAuth();
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const getRoleLabel = () => {
    if (isAdmin) return 'Administração';
    if (isDoutora) return 'Médico(a) / Psiquiatra';
    return 'Secretaria / Atendimento';
  };

  const navItems = isAdmin
    ? [{ id: 'inicio', label: 'Gestão de Usuários', path: '/dashboard', icon: Shield }]
    : [
        { id: 'inicio', label: 'Início', path: '/dashboard', icon: Activity },
        { id: 'agenda', label: 'Agenda', path: '/agenda', icon: Calendar },
        { id: 'pacientes', label: 'Pacientes', path: '/pacientes', icon: Users },
        ...(isDoutora
          ? [{ id: 'prontuario', label: 'Prontuário & IA', path: '/prontuario', icon: FileText }]
          : []),
      ];

  return (
    <>
      <aside className="w-64 bg-leaf-900 text-paper-100 flex flex-col flex-shrink-0 shadow-lg h-screen sticky top-0 select-none">
        {/* Logo / Título */}
        <div className="p-6 border-b border-leaf-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-leaf-700 rounded-xl shadow-xs">
              <Activity className="w-6 h-6 text-paper-50" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight text-paper-50">Clínica Apoio</h1>
              <p className="text-xs text-leaf-200">Psiquiatria Infantojuvenil</p>
            </div>
          </div>
        </div>

        {/* Itens do Menu */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-leaf-700 text-paper-50 font-bold shadow-xs border-l-4 border-leaf-200'
                    : 'text-leaf-200 hover:text-paper-50 hover:bg-leaf-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-paper-50' : 'text-leaf-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Rodapé Usuário */}
        <div className="p-4 border-t border-leaf-800 bg-leaf-900/60">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setProfileModalOpen(true)}
              className="min-w-0 flex-1 text-left p-1.5 rounded-lg hover:bg-leaf-800/80 transition group"
              title="Clique para editar seu perfil e alterar senha"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-leaf-700 text-paper-50 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-leaf-600 transition">
                  {user?.nome?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-paper-50 truncate group-hover:text-leaf-200 transition">
                    {user?.nome || 'Usuário'}
                  </p>
                  <p className="text-[10px] text-leaf-300 uppercase tracking-wider">
                    {getRoleLabel()}
                  </p>
                </div>
                <Settings className="w-3.5 h-3.5 text-leaf-400 group-hover:text-paper-50 opacity-0 group-hover:opacity-100 transition shrink-0" />
              </div>
            </button>

            <button
              onClick={logout}
              className="p-2 rounded-lg text-leaf-300 hover:text-paper-50 hover:bg-leaf-800 transition shrink-0"
              title="Sair do sistema"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Modal de Configurações de Perfil e Senha */}
      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </>
  );
}
