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
  ClipboardList,
  FileCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { getPacienteByIdApi, getPacientesApi } from '../services/api';
import { getAnamnese, getAnotacoes } from '../services/prontuarioService';
import { getSessoes } from '../services/agendaService';
import AnamneseBlock from '../components/Prontuario/AnamneseBlock';
import SessionNotesTimeline from '../components/Prontuario/SessionNotesTimeline';
import AiAssistantSection from '../components/Prontuario/AiAssistantSection';
import ParecerConclusivoSection from '../components/Prontuario/ParecerConclusivoSection';
import Sidebar from '../components/Sidebar';

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

  // Controle de Abas
  const [abaAtiva, setAbaAtiva] = useState('prontuario'); // 'prontuario' | 'ia' | 'parecer'
  const [rascunhoIaReferencia, setRascunhoIaReferencia] = useState(null);

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

  // Transição do prompt 4 ("Estruturação para Parecer") para o Parecer Conclusivo com referência
  const handleIrParaParecer = (conteudoIa) => {
    setRascunhoIaReferencia(conteudoIa);
    setAbaAtiva('parecer');
  };

  return (
    <div className="flex h-screen bg-paper-100 font-sans text-ink-900">
      {/* Menu Lateral */}
      <Sidebar activePage="prontuario" />

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

          {/* Barra de Navegação por Abas */}
          <div className="flex items-center gap-2 border-b border-paper-300 pb-1">
            <button
              onClick={() => setAbaAtiva('prontuario')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition ${
                abaAtiva === 'prontuario'
                  ? 'bg-leaf-700 text-white shadow-xs'
                  : 'text-ink-600 hover:bg-paper-200 hover:text-ink-900'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>Anamnese & Sessões</span>
            </button>

            <button
              onClick={() => setAbaAtiva('ia')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition ${
                abaAtiva === 'ia'
                  ? 'bg-leaf-700 text-white shadow-xs'
                  : 'text-ink-600 hover:bg-paper-200 hover:text-ink-900'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Apoio de IA</span>
            </button>

            <button
              onClick={() => setAbaAtiva('parecer')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition ${
                abaAtiva === 'parecer'
                  ? 'bg-leaf-700 text-white shadow-xs'
                  : 'text-ink-600 hover:bg-paper-200 hover:text-ink-900'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>Parecer Conclusivo</span>
              {rascunhoIaReferencia && (
                <span className="w-2 h-2 rounded-full bg-amber-400" title="Rascunho de IA ativo" />
              )}
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-ink-400 text-sm">
              Carregando dados do prontuário...
            </div>
          ) : (
            <div>
              {/* Aba 1: Anamnese e Sessões */}
              {abaAtiva === 'prontuario' && (
                <div className="space-y-6">
                  <AnamneseBlock
                    pacienteId={pacienteId}
                    anamneseInicial={anamnese}
                    onUpdate={(novaAnamnese) => setAnamnese(novaAnamnese)}
                  />

                  <SessionNotesTimeline
                    pacienteId={pacienteId}
                    anotacoes={anotacoes}
                    sessoes={sessoes}
                    onNovaAnotacao={(nova) => setAnotacoes((prev) => [...prev, nova])}
                  />
                </div>
              )}

              {/* Aba 2: Módulo de IA (Desafios 8 e 9) */}
              {abaAtiva === 'ia' && (
                <AiAssistantSection
                  pacienteId={pacienteId}
                  onIrParaParecer={handleIrParaParecer}
                />
              )}

              {/* Aba 3: Parecer Conclusivo & PDF & E-mail */}
              {abaAtiva === 'parecer' && (
                <ParecerConclusivoSection
                  paciente={paciente}
                  rascunhoIaInicial={rascunhoIaReferencia}
                  onLimparRascunhoIa={() => setRascunhoIaReferencia(null)}
                />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
