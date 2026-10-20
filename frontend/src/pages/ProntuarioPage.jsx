import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Calendar,
  User,
  Users,
  Activity,
  LogOut,
  ChevronLeft,
  ArrowLeft,
  Calendar as CalendarIcon,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { getPacienteByIdApi, getPacientesApi } from '../services/api';
import { getAnamnese, getAnotacoes } from '../services/prontuarioService';
import { getSessoes } from '../services/agendaService';
import AnamneseBlock from '../components/Prontuario/AnamneseBlock';
import SessionNotesTimeline from '../components/Prontuario/SessionNotesTimeline';

export default function ProntuarioPage() {
  const { pacienteId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { notifyError } = useNotification();

  const [paciente, setPaciente] = useState(null);
  const [anamnese, setAnamnese] = useState(null);
  const [anotacoes, setAnotacoes] = useState([]);
  const [sessoes, setSessoes] = useState([]);
  const [outrosPacientes, setOutrosPacientes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Calcular idade a partir da data de nascimento
  const calcularIdade = (dataNasc) => {
    if (!dataNasc) return '';
    const hoje = new Date();
    const nasc = new Date(dataNasc);
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
      idade--;
    }
    return `${idade} anos`;
  };

  const formatDataBrasileira = (dataStr) => {
    if (!dataStr) return '--/--/----';
    const partes = dataStr.split('-');
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return new Date(dataStr).toLocaleDateString('pt-BR');
  };

  const carregarDadosProntuario = useCallback(async () => {
    if (!pacienteId) return;
    try {
      setLoading(true);
      const [resPaciente, resAnamnese, resAnotacoes, resSessoes, resPacientes] =
        await Promise.all([
          getPacienteByIdApi(pacienteId),
          getAnamnese(pacienteId),
          getAnotacoes(pacienteId),
          getSessoes({ paciente: pacienteId }),
          getPacientesApi({ status: true }),
        ]);

      setPaciente(resPaciente);
      setAnamnese(resAnamnese);
      setAnotacoes(Array.isArray(resAnotacoes) ? resAnotacoes : resAnotacoes.results || []);
      setSessoes(Array.isArray(resSessoes) ? resSessoes : resSessoes.results || []);

      const todos = resPacientes.results || resPacientes;
      setOutrosPacientes(Array.isArray(todos) ? todos : []);
    } catch (err) {
      console.error('Erro ao carregar prontuário:', err);
      notifyError('Erro ao carregar os dados clínicos do prontuário.');
    } finally {
      setLoading(false);
    }
  }, [pacienteId, notifyError]);

  useEffect(() => {
    carregarDadosProntuario();
  }, [carregarDadosProntuario]);

  return (
    <div className="flex h-screen bg-paper-100 font-sans text-ink-900">
      {/* Menu Lateral */}
      <aside className="w-64 bg-leaf-900 text-paper-100 flex flex-col flex-shrink-0 shadow-lg">
        <div className="p-6 border-b border-leaf-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-leaf-700 rounded-xl">
              <Activity className="w-6 h-6 text-paper-50" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight text-paper-50">Clínica Apoio</h1>
              <p className="text-xs text-leaf-200">Prontuário Eletrônico</p>
            </div>
          </div>
        </div>

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
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-paper-100 hover:bg-leaf-800 transition"
          >
            <CalendarIcon className="w-4 h-4 text-leaf-500" />
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

        <div className="p-4 border-t border-leaf-800 bg-leaf-900/60">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-paper-50 truncate">{user?.nome}</p>
              <p className="text-xs text-leaf-200 uppercase tracking-wider">{user?.role}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg text-leaf-200 hover:text-paper-50 hover:bg-leaf-800 transition"
              title="Sair"
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
            <button
              onClick={() => navigate('/pacientes')}
              className="flex items-center gap-1 hover:text-ink-900 transition font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar aos Pacientes</span>
            </button>
            <span>›</span>
            <span className="font-semibold text-leaf-700">
              Prontuário — {paciente?.nomeCompleto || 'Carregando...'}
            </span>
          </div>

          {/* Troca Rápida de Paciente */}
          <div className="flex items-center gap-2 text-xs">
            <label className="text-ink-600 font-medium">Trocar Paciente:</label>
            <select
              value={pacienteId}
              onChange={(e) => navigate(`/prontuario/${e.target.value}`)}
              className="py-1 px-3 rounded-lg border border-paper-300 bg-paper-50 text-ink-900 font-medium focus:outline-none focus:ring-1 focus:ring-leaf-500 text-xs"
            >
              {outrosPacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nomeCompleto}
                </option>
              ))}
            </select>
          </div>
        </header>

        {/* Área Rolável do Prontuário */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* Cabeçalho Fixo do Paciente com Data de Nascimento (RF07) */}
          <div className="p-6 rounded-2xl bg-paper-50 border border-paper-300 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-leaf-100 border border-leaf-300 flex items-center justify-center text-leaf-800 font-bold text-xl">
                {paciente?.nomeCompleto?.charAt(0) || 'P'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-ink-900">{paciente?.nomeCompleto}</h2>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                      paciente?.status
                        ? 'bg-leaf-200 text-leaf-800 border border-leaf-500'
                        : 'bg-paper-300 text-ink-600'
                    }`}
                  >
                    {paciente?.status ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <div className="flex items-center gap-4 mt-1 text-xs text-ink-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-leaf-600" />
                    <strong>Nascimento:</strong> {formatDataBrasileira(paciente?.dataNascimento)} (
                    {calcularIdade(paciente?.dataNascimento)})
                  </span>
                  <span>•</span>
                  <span>
                    <strong>Sexo:</strong> {paciente?.sexo === 'M' ? 'Masculino' : paciente?.sexo === 'F' ? 'Feminino' : 'Outro'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/agenda')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-leaf-100 hover:bg-leaf-200 text-leaf-800 text-xs font-semibold transition"
            >
              <CalendarIcon className="w-4 h-4 text-leaf-700" />
              <span>Ver na Agenda</span>
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-ink-400 text-sm">
              Carregando dados do prontuário...
            </div>
          ) : (
            <div className="space-y-6">
              {/* Bloco 1: Anamnese Clínica (RF07) */}
              <AnamneseBlock
                pacienteId={pacienteId}
                anamneseInicial={anamnese}
                onUpdate={(novaAnamnese) => setAnamnese(novaAnamnese)}
              />

              {/* Bloco 2: Linha do Tempo de Sessões (RF09) */}
              <SessionNotesTimeline
                pacienteId={pacienteId}
                anotacoes={anotacoes}
                sessoes={sessoes}
                onNovaAnotacao={(nova) => setAnotacoes((prev) => [...prev, nova])}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
