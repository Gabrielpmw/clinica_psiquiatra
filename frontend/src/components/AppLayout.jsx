import React, { useState } from 'react';
import { AlertCircle, ChevronDown, Menu, Sparkles, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { useAiGeneration } from '../context/AiGenerationContext';
import AiDraftsModal from './AiDraftsModal';

export default function AppLayout({
  activePage,
  children,
  headerLeft,
  headerRight,
  containerClassName = 'flex-1 flex flex-col min-w-0 overflow-hidden',
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { user, isAdmin, isDoutora } = useAuth();
  const { activeGeneration, generationError, pendingDrafts, isDraftsModalOpen, openDraftsModal, closeDraftsModal } = useAiGeneration();
  const nextDraft = pendingDrafts.find((draft) => !draft.visto) || pendingDrafts[0];
  const draftsLabel = nextDraft ? 'Abrir rascunho da IA pronto' : 'Acompanhar rascunhos da IA';

  const abrirResumo = (pacienteId, destinoIa) => {
    closeDraftsModal();
    navigate(`/prontuario/${pacienteId}`, { state: { destinoIa } });
  };
  const abrirRascunho = (draft) => abrirResumo(draft.pacienteId, { draftId: draft.id });
  const acompanharGeracao = (geracao) => abrirResumo(geracao.pacienteId, { generationId: geracao.id });

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
            <div className="min-w-0 flex items-center truncate">
              {headerLeft}
            </div>
          </div>

          {/* Conteúdo à direita do Header (Status do usuário, ações secundárias) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {isDoutora && (
              <div className="flex rounded-xl border border-leaf-300 bg-leaf-50 text-leaf-900 shadow-xs">
                <button
                  type="button"
                  onClick={nextDraft ? () => abrirRascunho(nextDraft) : openDraftsModal}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-leaf-100 transition"
                  aria-label={draftsLabel}
                  title={draftsLabel}
                >
                  <Sparkles className="w-3.5 h-3.5 text-leaf-700" />
                  <span className="hidden sm:inline">Rascunhos IA</span>
                  {nextDraft ? (
                    <span className="px-1.5 rounded-full bg-leaf-700 text-paper-50 text-[10px] font-bold">
                      {pendingDrafts.length}
                    </span>
                  ) : null}
                  {activeGeneration ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : generationError ? (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                  ) : null}
                </button>
                {nextDraft && (pendingDrafts.length > 1 || activeGeneration || generationError) && (
                  <button
                    type="button"
                    onClick={openDraftsModal}
                    className="px-1.5 rounded-r-xl border-l border-leaf-300 hover:bg-leaf-100"
                    aria-label="Abrir painel de rascunhos da IA"
                    title="Abrir painel de rascunhos da IA"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {headerRight || (
              <div className="flex items-center gap-2 text-xs text-ink-600">
                <span className="hidden sm:inline">Logado como</span>
                <span className="font-semibold text-ink-900 max-w-[120px] sm:max-w-none truncate">
                  {user?.nome || 'Usuário'}
                </span>
                <span
                  className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border"
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

      <AiDraftsModal
        isOpen={isDraftsModalOpen}
        onClose={closeDraftsModal}
        onReview={abrirRascunho}
        onFollow={acompanharGeracao}
      />
    </div>
  );
}
