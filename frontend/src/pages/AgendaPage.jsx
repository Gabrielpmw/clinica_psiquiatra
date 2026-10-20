import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Lock,
  Clock,
  User,
  Users,
  LogOut,
  FileText,
  Activity,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import {
  getSessoesDia,
  getSessoesSemanais,
  getBloqueios,
  atualizarStatusSessao,
} from '../services/agendaService';
import DayView from '../components/Agenda/DayView';
import WeekView from '../components/Agenda/WeekView';
import PatientDayList from '../components/Agenda/PatientDayList';
import SessionFormModal from '../components/Agenda/SessionFormModal';
import BloqueioModal from '../components/Agenda/BloqueioModal';

export default function AgendaPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { notifySuccess, notifyError, notifyInfo } = useNotification();

  const [viewMode, setViewMode] = useState('dia'); // 'dia' | 'semana'
  const [dataSelecionada, setDataSelecionada] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [sessoes, setSessoes] = useState([]);
  const [bloqueios, setBloqueios] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modais
  const [modalAgendarOpen, setModalAgendarOpen] = useState(false);
  const [modalBloqueioOpen, setModalBloqueioOpen] = useState(false);
  const [agendarDataInicial, setAgendarDataInicial] = useState('');

  // Obter início da semana (segunda-feira) para a data selecionada
  const getInicioSemana = (dateStr) => {
    const d = new Date(`${dateStr}T00:00:00`);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // ajusta quando domingo
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  };

  const inicioSemana = getInicioSemana(dataSelecionada);

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      if (viewMode === 'dia') {
        const [resSessoes, resBloqueios] = await Promise.all([
          getSessoesDia(dataSelecionada),
          getBloqueios({ data: dataSelecionada }),
        ]);
        const listaSessoes = resSessoes.results || resSessoes;
        const listaBloqueios = resBloqueios.results || resBloqueios;
        setSessoes(Array.isArray(listaSessoes) ? listaSessoes : []);
        setBloqueios(Array.isArray(listaBloqueios) ? listaBloqueios : []);
      } else {
        // Modo semana: 7 dias a partir de inicioSemana
        const dFim = new Date(`${inicioSemana}T00:00:00`);
        dFim.setDate(dFim.getDate() + 6);
        const fimSemana = dFim.toISOString().split('T')[0];

        const [resSessoes, resBloqueios] = await Promise.all([
          getSessoesSemanais(inicioSemana, fimSemana),
          getBloqueios({ data_inicio: inicioSemana, data_fim: fimSemana }),
        ]);
        const listaSessoes = resSessoes.results || resSessoes;
        const listaBloqueios = resBloqueios.results || resBloqueios;
        setSessoes(Array.isArray(listaSessoes) ? listaSessoes : []);
        setBloqueios(Array.isArray(listaBloqueios) ? listaBloqueios : []);
      }
    } catch (err) {
      console.error('Erro ao carregar dados da agenda:', err);
      notifyError('Erro ao carregar sessões da agenda.');
    } finally {
      setLoading(false);
    }
  }, [viewMode, dataSelecionada, inicioSemana, notifyError]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Navegação de datas
  const handleNavegar = (direcao) => {
    const d = new Date(`${dataSelecionada}T00:00:00`);
    const dias = viewMode === 'dia' ? 1 : 7;
    d.setDate(d.getDate() + direcao * dias);
    setDataSelecionada(d.toISOString().split('T')[0]);
  };

  const handleIrHoje = () => {
    setDataSelecionada(new Date().toISOString().split('T')[0]);
  };

  const handleStatusChange = async (sessaoId, novoStatus) => {
    try {
      await atualizarStatusSessao(sessaoId, novoStatus);
      notifySuccess(`Status da sessão atualizado para ${novoStatus.toLowerCase()}!`);
      // Atualiza localmente o estado
      setSessoes((prev) =>
        prev.map((s) => (s.id === sessaoId ? { ...s, status: novoStatus } : s))
      );
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      notifyError('Não foi possível alterar o status da sessão.');
    }
  };

  const handleAbrirAgendar = (dataPrevia = '') => {
    setAgendarDataInicial(dataPrevia || dataSelecionada);
    setModalAgendarOpen(true);
  };

  return (
    <div className="flex h-screen bg-paper-100 font-sans text-ink-900">
      {/* Menu Lateral Fixo */}
      <aside className="w-64 bg-leaf-900 text-paper-100 flex flex-col flex-shrink-0 shadow-lg">
        {/* Logo / Título */}
        <div className="p-6 border-b border-leaf-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-leaf-700 rounded-xl">
              <Activity className="w-6 h-6 text-paper-50" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight text-paper-50">Clínica Apoio</h1>
              <p className="text-xs text-leaf-200">Psiquiatria & Desenvolvimento</p>
            </div>
          </div>
        </div>

        {/* Itens do Menu */}
        <nav className="flex-1 p-4 space-y-1.5">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-paper-100 hover:bg-leaf-800 transition"
          >
            <Activity className="w-4 h-4 text-leaf-500" />
            <span>Início</span>
          </button>

          <button
            onClick={() => navigate('/agenda')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold bg-leaf-700 text-paper-50 shadow-xs border-l-4 border-leaf-200 transition"
          >
            <CalendarIcon className="w-4 h-4 text-paper-50" />
            <span>Agenda</span>
          </button>

          <button
            onClick={() => navigate('/pacientes')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-paper-100 hover:bg-leaf-800 transition"
          >
            <Users className="w-4 h-4 text-leaf-500" />
            <span>Pacientes</span>
          </button>
        </nav>

        {/* Rodapé Usuário */}
        <div className="p-4 border-t border-leaf-800 bg-leaf-900/60">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-paper-50 truncate">{user?.nome}</p>
              <p className="text-xs text-leaf-200 uppercase tracking-wider">{user?.role}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg text-leaf-200 hover:text-paper-50 hover:bg-leaf-800 transition"
              title="Sair do sistema"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Barra Superior / Breadcrumb */}
        <header className="h-16 bg-paper-50 border-b border-paper-300 px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-ink-600">
            <span className="hover:text-ink-900 cursor-pointer" onClick={() => navigate('/dashboard')}>
              Início
            </span>
            <span>›</span>
            <span className="font-semibold text-leaf-700">Agenda de Atendimento</span>
          </div>
          <div className="text-xs text-ink-600 flex items-center gap-2">
            <span>Logado como</span>
            <span className="font-semibold text-ink-900">{user?.nome}</span>
          </div>
        </header>

        {/* Área Central Rolável */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* Título da Página e Descrição */}
          <div>
            <h2 className="text-2xl font-bold text-ink-900">Agenda Clínica</h2>
            <p className="text-sm text-ink-600 mt-1">
              Visualize sessões agendadas por dia ou semana, marque novas consultas e defina disponibilidades.
            </p>
          </div>

          {/* Barra de Ações Agrupadas (RF03, RF04, RF05) */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-paper-200 border border-paper-300">
            {/* Controles de Modo e Navegação de Data */}
            <div className="flex items-center gap-3">
              {/* Toggle Dia / Semana */}
              <div className="inline-flex rounded-lg border border-paper-300 bg-paper-50 p-1 shadow-2xs">
                <button
                  onClick={() => setViewMode('dia')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                    viewMode === 'dia'
                      ? 'bg-leaf-700 text-paper-50 shadow-xs'
                      : 'text-ink-600 hover:text-ink-900'
                  }`}
                >
                  Dia
                </button>
                <button
                  onClick={() => setViewMode('semana')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                    viewMode === 'semana'
                      ? 'bg-leaf-700 text-paper-50 shadow-xs'
                      : 'text-ink-600 hover:text-ink-900'
                  }`}
                >
                  Semana
                </button>
              </div>

              {/* Botões Anterior / Hoje / Próximo */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleNavegar(-1)}
                  className="p-1.5 rounded-lg border border-paper-300 bg-paper-50 hover:bg-paper-100 text-ink-900 transition"
                  title="Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleIrHoje}
                  className="px-3 py-1.5 rounded-lg border border-paper-300 bg-paper-50 hover:bg-paper-100 text-xs font-semibold text-ink-900 transition"
                >
                  Hoje
                </button>
                <button
                  onClick={() => handleNavegar(1)}
                  className="p-1.5 rounded-lg border border-paper-300 bg-paper-50 hover:bg-paper-100 text-ink-900 transition"
                  title="Próximo"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Seletor de Data */}
              <input
                type="date"
                value={dataSelecionada}
                onChange={(e) => setDataSelecionada(e.target.value)}
                className="text-xs py-1.5 px-3 rounded-lg border border-paper-300 bg-paper-50 text-ink-900 focus:outline-none focus:ring-1 focus:ring-leaf-500 font-medium"
              />
            </div>

            {/* Botões de Ação Primária e Secundária */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setModalBloqueioOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-paper-300 bg-paper-50 hover:bg-paper-100 text-ink-900 text-xs font-semibold transition shadow-2xs"
              >
                <Lock className="w-4 h-4 text-amber-600" />
                <span>Bloquear Horário</span>
              </button>

              <button
                onClick={() => handleAbrirAgendar()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-leaf-700 hover:bg-leaf-600 text-paper-50 text-xs font-semibold transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Agendar Sessão</span>
              </button>
            </div>
          </div>

          {/* Área de Visualização da Agenda */}
          {viewMode === 'dia' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Coluna 1 & 2: Grade/Lista de Sessões do Dia */}
              <div className="lg:col-span-2">
                <DayView
                  sessoes={sessoes}
                  bloqueios={bloqueios}
                  dataSelecionada={dataSelecionada}
                  onOpenAgendar={handleAbrirAgendar}
                  onStatusChange={handleStatusChange}
                />
              </div>

              {/* Coluna 3: Lista de Pacientes do Dia (RF06) */}
              <div className="lg:col-span-1">
                <PatientDayList
                  sessoes={sessoes}
                  selectedDate={dataSelecionada}
                  onStatusChange={handleStatusChange}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <WeekView
                sessoes={sessoes}
                bloqueios={bloqueios}
                inicioSemana={inicioSemana}
                onOpenAgendar={handleAbrirAgendar}
                onStatusChange={handleStatusChange}
              />
            </div>
          )}
        </div>
      </main>

      {/* Modais */}
      <SessionFormModal
        isOpen={modalAgendarOpen}
        onClose={() => setModalAgendarOpen(false)}
        onSuccess={() => carregarDados()}
        initialDate={agendarDataInicial}
      />

      <BloqueioModal
        isOpen={modalBloqueioOpen}
        onClose={() => setModalBloqueioOpen(false)}
        onSuccess={() => carregarDados()}
        initialDate={dataSelecionada}
      />
    </div>
  );
}
