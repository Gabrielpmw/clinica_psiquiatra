import React, { useState, useEffect } from 'react';
import { X, User, MapPin, Users, Save, AlertCircle, Loader2 } from 'lucide-react';
import { createPacienteApi, updatePacienteApi } from '../services/api';

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

export default function PatientFormModal({ isOpen, onClose, onSaved, pacienteToEdit = null }) {
  const [activeTab, setActiveTab] = useState('dados'); // 'dados', 'endereco', 'responsavel'
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Dados Pessoais
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [sexo, setSexo] = useState('M');

  // 2. Endereço
  const [tituloLocal, setTituloLocal] = useState('');
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepNotice, setCepNotice] = useState('');

  // 3. Responsável Legal
  const [respNome, setRespNome] = useState('');
  const [respCpf, setRespCpf] = useState('');
  const [respContato, setRespContato] = useState('');
  const [respParentesco, setRespParentesco] = useState('');

  useEffect(() => {
    if (pacienteToEdit) {
      setNomeCompleto(pacienteToEdit.nomeCompleto || '');
      setDataNascimento(pacienteToEdit.dataNascimento || '');
      setSexo(pacienteToEdit.sexo || 'M');

      const end = pacienteToEdit.enderecos?.[0] || {};
      setTituloLocal(end.tituloLocal || '');
      setCep(end.cep || '');
      setLogradouro(end.logradouro || '');
      setNumero(end.numero || '');
      setBairro(end.bairro || '');
      setCidade(end.cidade || '');
      setEstado(end.estado || '');

      const resp = pacienteToEdit.responsaveis?.[0] || {};
      setRespNome(resp.nomeCompleto || '');
      setRespCpf(resp.cpf || '');
      setRespContato(resp.contato || '');
      setRespParentesco(resp.parentesco || '');
    } else {
      // Limpa formulário sem dados pré-preenchidos
      setNomeCompleto('');
      setDataNascimento('');
      setSexo('M');
      setTituloLocal('');
      setCep('');
      setLogradouro('');
      setNumero('');
      setBairro('');
      setCidade('');
      setEstado('');
      setRespNome('');
      setRespCpf('');
      setRespContato('');
      setRespParentesco('');
    }
    setActiveTab('dados');
    setErrorMessage('');
    setCepNotice('');
  }, [pacienteToEdit, isOpen]);

  if (!isOpen) return null;

  // Máscara estrita de CPF - limita rigorosamente a 11 dígitos
  const maskCpf = (v) => {
    const digits = v.replace(/\D/g, '').slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  // Máscara de CEP (00000-000)
  const maskCep = (v) => {
    const digits = v.replace(/\D/g, '').slice(0, 8);
    return digits.replace(/(\d{5})(\d)/, '$1-$2');
  };

  // Máscara de Telefone ((00) 00000-0000)
  const maskPhone = (v) => {
    const digits = v.replace(/\D/g, '').slice(0, 11);
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2');
  };

  // Integração com a API do ViaCEP
  const handleCepChange = async (e) => {
    const rawValue = e.target.value;
    const masked = maskCep(rawValue);
    setCep(masked);
    setCepNotice('');

    const clean = masked.replace(/\D/g, '');
    if (clean.length === 8) {
      setLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const data = await response.json();
        if (data.erro) {
          setCepNotice('CEP não encontrado. Preencha os campos manualmente.');
        } else {
          if (data.logradouro) setLogradouro(data.logradouro);
          if (data.bairro) setBairro(data.bairro);
          if (data.localidade) setCidade(data.localidade);
          if (data.uf) setEstado(data.uf);
        }
      } catch {
        setCepNotice('Não foi possível consultar o CEP. Preencha o endereço manualmente.');
      } finally {
        setLoadingCep(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Validações com explicações claras para o usuário
    if (!nomeCompleto.trim()) {
      setActiveTab('dados');
      setErrorMessage('Por favor, informe o Nome Completo da criança ou adolescente.');
      return;
    }

    if (!dataNascimento) {
      setActiveTab('dados');
      setErrorMessage('Por favor, selecione a Data de Nascimento do paciente.');
      return;
    }

    if (!respNome.trim()) {
      setActiveTab('responsavel');
      setErrorMessage('Por favor, preencha o Nome Completo do responsável legal.');
      return;
    }

    const cleanCpf = respCpf.replace(/\D/g, '');
    if (!respCpf.trim() || cleanCpf.length !== 11) {
      setActiveTab('responsavel');
      setErrorMessage('Por favor, informe um CPF válido para o responsável.');
      return;
    }

    if (!respContato.trim()) {
      setActiveTab('responsavel');
      setErrorMessage('Por favor, preencha o Telefone ou WhatsApp de contato do responsável.');
      return;
    }

    if (!respParentesco.trim()) {
      setActiveTab('responsavel');
      setErrorMessage('Por favor, informe o Grau de Parentesco do responsável (Ex: Mãe, Pai, Avó, Tutor).');
      return;
    }

    const payload = {
      nomeCompleto: nomeCompleto.trim(),
      dataNascimento,
      sexo,
      enderecos: [
        {
          tituloLocal: tituloLocal.trim() || 'Principal',
          cep: cep.trim(),
          logradouro: logradouro.trim(),
          numero: numero.trim(),
          bairro: bairro.trim(),
          cidade: cidade.trim(),
          estado: estado.trim().toUpperCase(),
        },
      ],
      responsaveis: [
        {
          nomeCompleto: respNome.trim(),
          cpf: respCpf.trim(),
          contato: respContato.trim(),
          parentesco: respParentesco.trim(),
        },
      ],
    };

    setSubmitting(true);
    try {
      if (pacienteToEdit) {
        await updatePacienteApi(pacienteToEdit.id, payload);
      } else {
        await createPacienteApi(payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      if (err.response?.data) {
        const errorData = err.response.data;

        // Mapeia mensagens do backend para termos claros e fáceis
        if (errorData.responsaveis) {
          setActiveTab('responsavel');
          const respMsg = Array.isArray(errorData.responsaveis)
            ? JSON.stringify(errorData.responsaveis)
            : errorData.responsaveis;
          setErrorMessage(`Erro nos dados do responsável: ${respMsg}`);
        } else if (errorData.enderecos) {
          setActiveTab('endereco');
          setErrorMessage('Erro nos dados do endereço. Verifique os campos informados.');
        } else if (errorData.nomeCompleto) {
          setActiveTab('dados');
          setErrorMessage(`Nome do paciente: ${errorData.nomeCompleto}`);
        } else if (errorData.dataNascimento) {
          setActiveTab('dados');
          setErrorMessage(`Data de nascimento: ${errorData.dataNascimento}`);
        } else {
          const detail = typeof errorData === 'object'
            ? Object.entries(errorData)
                .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                .join(' | ')
            : 'Erro ao cadastrar paciente.';
          setErrorMessage(detail);
        }
      } else {
        setErrorMessage('Não foi possível conectar ao servidor. Verifique se o backend está em execução.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── helper de estilo para inputs ──────────────────────────────────────────
  const inputStyle = {
    backgroundColor: C.paper50,
    borderColor:     C.paper300,
    color:           C.ink900,
  };
  const inputEvents = {
    onFocus: (e) => { e.target.style.borderColor = C.leaf500; e.target.style.outline = 'none'; e.target.style.boxShadow = `0 0 0 2px ${C.leaf500}33`; },
    onBlur:  (e) => { e.target.style.borderColor = C.paper300; e.target.style.boxShadow = 'none'; },
  };
  const baseInput = 'w-full px-3 py-2 text-sm border rounded-lg transition-colors focus:outline-none';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(23,56,42,0.45)', backdropFilter: 'blur(2px)' }}
    >
      <div
        className="rounded-2xl shadow-xl border w-full max-w-2xl my-8 overflow-hidden flex flex-col max-h-[90vh]"
        style={{ backgroundColor: C.paper50, borderColor: C.paper300 }}
      >
        {/* Header do modal */}
        <div
          className="px-6 py-4 flex items-center justify-between border-b"
          style={{ backgroundColor: C.leaf900, borderColor: C.leaf800 }}
        >
          <div>
            <h2 className="text-base font-semibold" style={{ color: C.paper50 }}>
              {pacienteToEdit ? 'Editar Paciente' : 'Novo Cadastro de Paciente'}
            </h2>
            <p className="text-xs" style={{ color: C.leaf200 }}>
              Preencha as informações do paciente, responsável e endereço
            </p>
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

        {/* Tabs */}
        <div
          className="flex border-b px-6 pt-3 gap-2"
          style={{ backgroundColor: C.paper100, borderColor: C.paper300 }}
        >
          {[
            { key: 'dados',      icon: User,   label: '1. Dados Pessoais' },
            { key: 'responsavel', icon: Users,  label: '2. Responsável Legal' },
            { key: 'endereco',   icon: MapPin,  label: '3. Endereço' },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className="pb-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors"
              style={{
                borderColor: activeTab === key ? C.leaf700 : 'transparent',
                color: activeTab === key ? C.leaf700 : C.ink400,
              }}
              onMouseEnter={(e) => {
                if (activeTab !== key) e.currentTarget.style.color = C.ink900;
              }}
              onMouseLeave={(e) => {
                if (activeTab !== key) e.currentTarget.style.color = C.ink400;
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Mensagem de erro */}
        {errorMessage && (
          <div
            className="mx-6 mt-4 p-3 rounded-lg text-xs flex items-start gap-2 border"
            style={{ backgroundColor: C.cancelledBg, borderColor: `${C.cancelled}44`, color: C.cancelled }}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Atenção:</p>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Corpo do formulário */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'dados' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: C.ink600 }}>
                  Nome Completo do Paciente *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome do paciente"
                  value={nomeCompleto}
                  onChange={(e) => setNomeCompleto(e.target.value)}
                  className={baseInput}
                  style={inputStyle}
                  {...inputEvents}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: C.ink600 }}>
                    Data de Nascimento *
                  </label>
                  <input
                    type="date"
                    required
                    value={dataNascimento}
                    onChange={(e) => setDataNascimento(e.target.value)}
                    className={baseInput}
                    style={inputStyle}
                    {...inputEvents}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: C.ink600 }}>
                    Sexo / Gênero
                  </label>
                  <select
                    value={sexo}
                    onChange={(e) => setSexo(e.target.value)}
                    className={baseInput}
                    style={{ ...inputStyle, backgroundColor: C.paper50 }}
                    {...inputEvents}
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                    <option value="OUTRO">Outro / Não especificado</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'responsavel' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: C.ink600 }}>
                  Nome Completo do Responsável *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome do responsável"
                  value={respNome}
                  onChange={(e) => setRespNome(e.target.value)}
                  className={baseInput}
                  style={inputStyle}
                  {...inputEvents}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: C.ink600 }}>
                    CPF do Responsável *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={14}
                    placeholder="000.000.000-00"
                    value={respCpf}
                    onChange={(e) => setRespCpf(maskCpf(e.target.value))}
                    className={baseInput}
                    style={inputStyle}
                    {...inputEvents}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: C.ink600 }}>
                    Telefone / WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    placeholder="(00) 00000-0000"
                    value={respContato}
                    onChange={(e) => setRespContato(maskPhone(e.target.value))}
                    className={baseInput}
                    style={inputStyle}
                    {...inputEvents}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: C.ink600 }}>
                    Grau de Parentesco *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Mãe, Pai, Avó, Tutor"
                    value={respParentesco}
                    onChange={(e) => setRespParentesco(e.target.value)}
                    className={baseInput}
                    style={inputStyle}
                    {...inputEvents}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'endereco' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: C.ink600 }}>
                    CEP
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={9}
                      placeholder="00000-000"
                      value={cep}
                      onChange={handleCepChange}
                      className={`${baseInput} pr-8`}
                      style={inputStyle}
                      {...inputEvents}
                    />
                    {loadingCep && (
                      <Loader2
                        className="w-4 h-4 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2"
                        style={{ color: C.leaf500 }}
                      />
                    )}
                  </div>
                  {cepNotice && (
                    <p
                      className="text-[11px] mt-1"
                      style={{ color: cepNotice.includes('não encontrado') ? '#C98A1B' : C.leaf600 }}
                    >
                      {cepNotice}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1" style={{ color: C.ink600 }}>
                    Identificação do Local (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Residencial, Casa da Mãe, Casa do Pai"
                    value={tituloLocal}
                    onChange={(e) => setTituloLocal(e.target.value)}
                    className={baseInput}
                    style={inputStyle}
                    {...inputEvents}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-3">
                  <label className="block text-xs font-medium mb-1" style={{ color: C.ink600 }}>
                    Logradouro (Rua, Avenida)
                  </label>
                  <input
                    type="text"
                    placeholder="Rua ou Avenida"
                    value={logradouro}
                    onChange={(e) => setLogradouro(e.target.value)}
                    className={baseInput}
                    style={inputStyle}
                    {...inputEvents}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: C.ink600 }}>
                    Número
                  </label>
                  <input
                    type="text"
                    placeholder="Número ou S/N"
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    className={baseInput}
                    style={inputStyle}
                    {...inputEvents}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: C.ink600 }}>
                    Bairro
                  </label>
                  <input
                    type="text"
                    placeholder="Bairro"
                    value={bairro}
                    onChange={(e) => setBairro(e.target.value)}
                    className={baseInput}
                    style={inputStyle}
                    {...inputEvents}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: C.ink600 }}>
                    Cidade
                  </label>
                  <input
                    type="text"
                    placeholder="Cidade"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    className={baseInput}
                    style={inputStyle}
                    {...inputEvents}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: C.ink600 }}>
                    Estado (UF)
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    placeholder="UF"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value.toUpperCase())}
                    className={baseInput}
                    style={inputStyle}
                    {...inputEvents}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer do formulário */}
          <div
            className="pt-4 border-t flex items-center justify-between"
            style={{ borderColor: C.paper300 }}
          >
            <div className="text-xs" style={{ color: C.ink400 }}>
              * Campos de preenchimento obrigatório
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium rounded-lg border transition-colors"
                style={{ borderColor: C.paper300, color: C.ink600, backgroundColor: C.paper50 }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = C.paper200; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = C.paper50; }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 min-h-[36px]"
                style={{ backgroundColor: C.leaf700, color: C.paper50 }}
                onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.backgroundColor = C.leaf600; }}
                onMouseLeave={(e) => { if (!submitting) e.currentTarget.style.backgroundColor = C.leaf700; }}
              >
                <Save className="w-3.5 h-3.5" />
                {submitting ? 'Salvando...' : pacienteToEdit ? 'Atualizar Paciente' : 'Salvar Cadastro'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
