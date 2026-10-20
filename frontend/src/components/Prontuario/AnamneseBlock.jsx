import React, { useState, useEffect } from 'react';
import { Save, FileCheck, Calendar, Sparkles, AlertCircle } from 'lucide-react';
import { atualizarAnamnese } from '../../services/prontuarioService';
import { useNotification } from '../../context/NotificationContext';

export default function AnamneseBlock({ pacienteId, anamneseInicial, onUpdate }) {
  const { notifySuccess, notifyError } = useNotification();
  const [salvando, setSalvando] = useState(false);
  const [formData, setFormData] = useState({
    escolaridade: '',
    tipoParto: '',
    intercorrencias: '',
    seletividadeAlimentar: '',
    dificuldadeRotina: '',
    sensibilidadeEtiquetas: '',
    historicoFamiliar: '',
    adesaoRegras: '',
    observacoesGerais: '',
  });

  useEffect(() => {
    if (anamneseInicial) {
      setFormData({
        escolaridade: anamneseInicial.escolaridade || '',
        tipoParto: anamneseInicial.tipoParto || '',
        intercorrencias: anamneseInicial.intercorrencias || '',
        seletividadeAlimentar: anamneseInicial.seletividadeAlimentar || '',
        dificuldadeRotina: anamneseInicial.dificuldadeRotina || '',
        sensibilidadeEtiquetas: anamneseInicial.sensibilidadeEtiquetas || '',
        historicoFamiliar: anamneseInicial.historicoFamiliar || '',
        adesaoRegras: anamneseInicial.adesaoRegras || '',
        observacoesGerais: anamneseInicial.observacoesGerais || '',
      });
    }
  }, [anamneseInicial]);

  const handleChange = (campo, valor) => {
    setFormData((prev) => ({ ...prev, [campo]: valor }));
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    try {
      setSalvando(true);
      const atualizada = await atualizarAnamnese(pacienteId, formData);
      notifySuccess('Anamnese clínica salva com sucesso!');
      if (onUpdate) onUpdate(atualizada);
    } catch (err) {
      console.error('Erro ao salvar anamnese:', err);
      notifyError('Erro ao salvar as informações da anamnese.');
    } finally {
      setSalvando(false);
    }
  };

  const formatData = (dataStr) => {
    if (!dataStr) return '';
    return new Date(dataStr).toLocaleString('pt-BR');
  };

  return (
    <div className="bg-paper-50 rounded-2xl border border-paper-300 shadow-xs overflow-hidden">
      {/* Cabeçalho do Bloco */}
      <div className="px-6 py-4 bg-paper-200 border-b border-paper-300 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-ink-900 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-leaf-700" />
            Anamnese Clínica Inicial
          </h3>
          <p className="text-xs text-ink-600 mt-0.5">
            Critérios estruturados de neurodesenvolvimento e histórico familiar do paciente.
          </p>
        </div>
        {anamneseInicial?.dataUltimaAtualizacao && (
          <span className="text-[11px] text-ink-400 font-mono">
            Última atualização: {formatData(anamneseInicial.dataUltimaAtualizacao)}
          </span>
        )}
      </div>

      {/* Formulário com Critérios Estruturados */}
      <form onSubmit={handleSalvar} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Escolaridade */}
          <div>
            <label className="block text-xs font-semibold text-ink-600 uppercase tracking-wider mb-1">
              Escolaridade
            </label>
            <input
              type="text"
              value={formData.escolaridade}
              onChange={(e) => handleChange('escolaridade', e.target.value)}
              placeholder="Ex: 2º ano do Ensino Fundamental..."
              className="w-full px-3 py-2 rounded-lg bg-paper-50 border border-paper-300 text-ink-900 focus:outline-none focus:ring-2 focus:ring-leaf-500 text-sm"
            />
          </div>

          {/* Tipo de Parto */}
          <div>
            <label className="block text-xs font-semibold text-ink-600 uppercase tracking-wider mb-1">
              Tipo de Parto
            </label>
            <input
              type="text"
              value={formData.tipoParto}
              onChange={(e) => handleChange('tipoParto', e.target.value)}
              placeholder="Ex: Normal, Cesariana, fórceps..."
              className="w-full px-3 py-2 rounded-lg bg-paper-50 border border-paper-300 text-ink-900 focus:outline-none focus:ring-2 focus:ring-leaf-500 text-sm"
            />
          </div>

          {/* Intercorrências */}
          <div>
            <label className="block text-xs font-semibold text-ink-600 uppercase tracking-wider mb-1">
              Intercorrências no Parto/Gestação
            </label>
            <textarea
              rows={2}
              value={formData.intercorrencias}
              onChange={(e) => handleChange('intercorrencias', e.target.value)}
              placeholder="Intercorrências pré, peri ou pós-natais relevantes..."
              className="w-full px-3 py-2 rounded-lg bg-paper-50 border border-paper-300 text-ink-900 focus:outline-none focus:ring-2 focus:ring-leaf-500 text-sm resize-none"
            />
          </div>

          {/* Seletividade Alimentar */}
          <div>
            <label className="block text-xs font-semibold text-ink-600 uppercase tracking-wider mb-1">
              Seletividade Alimentar
            </label>
            <textarea
              rows={2}
              value={formData.seletividadeAlimentar}
              onChange={(e) => handleChange('seletividadeAlimentar', e.target.value)}
              placeholder="Recusa alimentar, textura, cores, rigidez na dieta..."
              className="w-full px-3 py-2 rounded-lg bg-paper-50 border border-paper-300 text-ink-900 focus:outline-none focus:ring-2 focus:ring-leaf-500 text-sm resize-none"
            />
          </div>

          {/* Dificuldade com Rotina */}
          <div>
            <label className="block text-xs font-semibold text-ink-600 uppercase tracking-wider mb-1">
              Dificuldade com Mudança de Rotina
            </label>
            <textarea
              rows={2}
              value={formData.dificuldadeRotina}
              onChange={(e) => handleChange('dificuldadeRotina', e.target.value)}
              placeholder="Reações comportamentais a imprevistos e alterações de rotina..."
              className="w-full px-3 py-2 rounded-lg bg-paper-50 border border-paper-300 text-ink-900 focus:outline-none focus:ring-2 focus:ring-leaf-500 text-sm resize-none"
            />
          </div>

          {/* Sensibilidade a Etiquetas */}
          <div>
            <label className="block text-xs font-semibold text-ink-600 uppercase tracking-wider mb-1">
              Sensibilidade Sensorial (Roupas/Etiquetas)
            </label>
            <textarea
              rows={2}
              value={formData.sensibilidadeEtiquetas}
              onChange={(e) => handleChange('sensibilidadeEtiquetas', e.target.value)}
              placeholder="Reação a etiquetas, texturas de tecido, meias, sons..."
              className="w-full px-3 py-2 rounded-lg bg-paper-50 border border-paper-300 text-ink-900 focus:outline-none focus:ring-2 focus:ring-leaf-500 text-sm resize-none"
            />
          </div>

          {/* Histórico Familiar */}
          <div>
            <label className="block text-xs font-semibold text-ink-600 uppercase tracking-wider mb-1">
              Histórico Familiar
            </label>
            <textarea
              rows={2}
              value={formData.historicoFamiliar}
              onChange={(e) => handleChange('historicoFamiliar', e.target.value)}
              placeholder="Histórico de TEA, TDAH ou outros transtornos na família..."
              className="w-full px-3 py-2 rounded-lg bg-paper-50 border border-paper-300 text-ink-900 focus:outline-none focus:ring-2 focus:ring-leaf-500 text-sm resize-none"
            />
          </div>

          {/* Adesão a Regras */}
          <div>
            <label className="block text-xs font-semibold text-ink-600 uppercase tracking-wider mb-1">
              Adesão a Regras e Limites
            </label>
            <textarea
              rows={2}
              value={formData.adesaoRegras}
              onChange={(e) => handleChange('adesaoRegras', e.target.value)}
              placeholder="Compreensão e aceitação de regras sociais e domésticas..."
              className="w-full px-3 py-2 rounded-lg bg-paper-50 border border-paper-300 text-ink-900 focus:outline-none focus:ring-2 focus:ring-leaf-500 text-sm resize-none"
            />
          </div>
        </div>

        {/* Campo de Texto Livre Adicional Solicitado */}
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4 h-4 text-leaf-700" />
            <label className="text-xs font-bold text-leaf-800 uppercase tracking-wider">
              Observações Gerais e Texto Livre da Anamnese
            </label>
          </div>
          <p className="text-xs text-ink-600 mb-2">
            Espaço livre para a doutora anotar qualquer percepção, detalhe clínico ou histórico adicional que desejar.
          </p>
          <textarea
            rows={4}
            value={formData.observacoesGerais}
            onChange={(e) => handleChange('observacoesGerais', e.target.value)}
            placeholder="Digite anotações livres, hipóteses iniciais, dinâmica familiar ou relatos espontâneos dos pais..."
            className="w-full p-3 rounded-xl bg-paper-50 border border-leaf-500 text-ink-900 focus:outline-none focus:ring-2 focus:ring-leaf-600 text-sm shadow-2xs"
          />
        </div>

        {/* Botão de Salvar */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={salvando}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-leaf-700 hover:bg-leaf-600 text-paper-50 text-sm font-semibold shadow-sm transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{salvando ? 'Salvando Anamnese...' : 'Salvar Alterações da Anamnese'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
