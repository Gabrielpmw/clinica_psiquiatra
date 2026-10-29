"""
Serviço de Sanitização e Anonimização de Dados Sensíveis (RF10, RNF04).
Garante conformidade estrita com a LGPD impedindo o envio de dados pessoais
identificáveis (PII) para provedores externos de Inteligência Artificial.
"""
import re
from typing import List, Optional

# Preposições e palavras comuns que não devem ser tratadas como nomes próprios isolados
STOP_WORDS = {
    'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'com', 'por', 'que',
    'um', 'uma', 'uns', 'umas', 'o', 'a', 'os', 'as', 'no', 'na', 'nos', 'nas'
}

# Regex pré-compiladas para PII estruturado
CPF_REGEX = re.compile(r'\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b')
EMAIL_REGEX = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
PHONE_REGEX = re.compile(r'(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9?\d{4}[-\s]?\d{4})\b')
CEP_REGEX = re.compile(r'\b\d{5}-?\d{3}\b')


def _extract_name_tokens(full_name: str) -> List[str]:
    """Extrai partes significativas de um nome (tokens >= 3 caracteres e não stopwords)."""
    if not full_name:
        return []
    tokens = []
    cleaned_full = full_name.strip()
    if cleaned_full:
        tokens.append(cleaned_full)
    for part in cleaned_full.split():
        clean_part = re.sub(r'[^\w]', '', part)
        if len(clean_part) >= 3 and clean_part.lower() not in STOP_WORDS:
            tokens.append(clean_part)
    # Ordena por comprimento decrescente para substituir frases completas antes de palavras isoladas
    return sorted(list(set(tokens)), key=len, reverse=True)


def sanitize_text(
    text: str,
    patient_name: str = "",
    guardian_names: Optional[List[str]] = None
) -> str:
    """
    Varre o texto clínico e substitui nomes do paciente e responsáveis por tags
    genéricas, além de mascarar CPFs, e-mails, telefones e CEPs.
    """
    if not text:
        return ""

    sanitized = text

    # 1. Mascarar documentos e contatos estruturados
    sanitized = CPF_REGEX.sub('[CPF]', sanitized)
    sanitized = EMAIL_REGEX.sub('[E-mail]', sanitized)
    sanitized = PHONE_REGEX.sub('[Telefone]', sanitized)
    sanitized = CEP_REGEX.sub('[CEP]', sanitized)

    # 2. Sanitizar nomes de responsáveis
    if guardian_names:
        for guardian_name in guardian_names:
            tokens = _extract_name_tokens(guardian_name)
            for token in tokens:
                pattern = re.compile(rf'\b{re.escape(token)}\b', re.IGNORECASE)
                sanitized = pattern.sub('[Responsável]', sanitized)

    # 3. Sanitizar nome do paciente
    if patient_name:
        tokens = _extract_name_tokens(patient_name)
        for token in tokens:
            pattern = re.compile(rf'\b{re.escape(token)}\b', re.IGNORECASE)
            sanitized = pattern.sub('[Paciente]', sanitized)

    # Normalizar marcações duplicadas consecutivas como "[Paciente] [Paciente]" -> "[Paciente]"
    sanitized = re.sub(r'(\[Paciente\]\s*)+', '[Paciente] ', sanitized)
    sanitized = re.sub(r'(\[Responsável\]\s*)+', '[Responsável] ', sanitized)

    return sanitized.strip()


def sanitize_clinical_data(paciente, anamnese=None, anotacoes=None) -> dict:
    """
    Sanitiza todo o histórico de um paciente (anamnese + anotações).
    Retorna dicionário pronto e seguro para injeção no prompt da IA.
    """
    patient_name = paciente.nomeCompleto if paciente else ""
    guardian_names = []
    if paciente and hasattr(paciente, 'responsaveis'):
        guardian_names = [r.nomeCompleto for r in paciente.responsaveis.all() if r.nomeCompleto]

    sanitized_anamnese = {}
    if anamnese:
        fields = [
            'escolaridade', 'tipoParto', 'intercorrencias', 'seletividadeAlimentar',
            'dificuldadeRotina', 'sensibilidadeEtiquetas', 'historicoFamiliar',
            'adesaoRegras', 'observacoesGerais'
        ]
        for field in fields:
            val = getattr(anamnese, field, '')
            sanitized_anamnese[field] = sanitize_text(val, patient_name, guardian_names) if val else ''

    sanitized_anotacoes = []
    if anotacoes:
        for anotacao in anotacoes:
            sessao_tipo = ''
            if hasattr(anotacao, 'sessao') and anotacao.sessao:
                sessao_tipo = getattr(anotacao.sessao, 'tipo', 'Sessão')
            data_reg = anotacao.dataRegistro.strftime('%d/%m/%Y %H:%M') if anotacao.dataRegistro else ''

            clean_text = sanitize_text(anotacao.textoLivre, patient_name, guardian_names)
            sanitized_anotacoes.append({
                'id': str(anotacao.id),
                'data': data_reg,
                'tipo': sessao_tipo,
                'texto': clean_text
            })

    return {
        'anamnese': sanitized_anamnese,
        'anotacoes': sanitized_anotacoes
    }
