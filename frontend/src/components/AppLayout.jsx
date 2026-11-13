import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

export default function AppLayout({
  activePage,
  children,
  headerLeft,
  headerRight,
  containerClassName = 'flex-1 flex flex-col min-w-0 overflow-hidden',
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, isAdmin, isDoutora } = useAuth();

  const getRoleLabel = () => {
    if (isAdmin) return 'Administração';
    if (isDoutora) return 'Médico(a) / Psiquiatra';
    return 'Secretaria / Atendimento';
  };

  return (
    <div className="flex h-screen bg-paper-100 font-sans text-ink-900 overflow-hidden">
      {/* Menu Lateral Responsivo: Fixo no Desktop (>= md) e Gaveta Off-Canvas no Mobile (< md) */}
      <Sidebar
        activePage={activePage}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Conteúdo Principal com Barra Superior Adaptativa */}
      <div className={containerClassName}>
        {/* Barra superior com botão hambúrguer integrado para Mobile */}
        <header className="h-16 bg-paper-50 border-b border-paper-300 px-4 sm:px-6 lg:px-8 flex items-center justify-between flex-shrink-0 z-10 select-none">
          <div className="flex items-center gap-3 min-w-0">
            {/* Botão de Menu Hambúrguer (Mobile Only) */}
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 -ml-1 rounded-xl text-ink-600 hover:text-ink-900 hover:bg-paper-200 transition focus:outline-none focus:ring-2 focus:ring-leaf-500"
              title="Abrir menu de navegação"
              aria-label="Abrir menu de navegação"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Conteúdo à esquerda do Header (Breadcrumbs, títulos, navegações) */}
            <div className="min-w-0 flex items-center">
              {headerLeft}
            </div>
          </div>

          {/* Conteúdo à direita do Header (Status do usuário, ações secundárias) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {headerRight || (
              <div className="flex items-center gap-2 text-xs text-ink-600">
                <span className="hidden sm:inline">Logado como</span>
                <span className="font-semibold text-ink-900 max-w-[120px] sm:max-w-none truncate">
                  {user?.nome || 'Usuário'}
                </span>
                <span
                  className="hidden xs:inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border"
                  style={{
                    backgroundColor: isAdmin ? '#f3e8ff' : isDoutora ? '#E3F0E8' : '#E4EEF6',
                    color: isAdmin ? '#7e22ce' : isDoutora ? '#1F4D3A' : '#4A86B5',
                    borderColor: isAdmin ? '#d8b4fe' : isDoutora ? '#CFE5D8' : '#bfdbfe',
                  }}
                >
                  {getRoleLabel()}
                </span>
              </div>
            )}
          </div>
        </header>

        {/* Área rolável da página */}
        <main className="flex-1 overflow-y-auto min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
