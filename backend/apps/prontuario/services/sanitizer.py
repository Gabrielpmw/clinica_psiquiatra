"""
Serviço de Sanitização e Anonimização de Dados Sensíveis (RF10, RNF04).
Garante conformidade estrita com a LGPD impedindo o envio de dados pessoais
identificáveis (PII) para provedores ou execuções de Inteligência Artificial.
"""
import re
import unicodedata
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

from django.utils import timezone

# Preposições e palavras comuns que não devem ser tratadas como nomes próprios isolados
STOP_WORDS = {
    'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'com', 'por', 'que',
    'um', 'uma', 'uns', 'umas', 'o', 'a', 'os', 'as', 'no', 'na', 'nos', 'nas',
    'ao', 'aos', 'à', 'às', 'se', 'ou', 'em', 'naquele', 'naquela', 'neste', 'nesta'
}

# Palavras comuns ou de contexto clínico que só devem ser mascaradas como token de nome
# quando acompanhadas de contexto pessoal explícito ou maiúscula inicial apropriada
AMBIGUOUS_NAME_WORDS = {
    'dias', 'dia', 'luz', 'paz', 'rosa', 'clara', 'claro', 'mel', 'sol', 'lima',
    'campos', 'costa', 'reis', 'cruz', 'leite', 'franco', 'forte', 'santos',
    'neves', 'ramos', 'lobo', 'leao', 'rocha', 'vale', 'serra', 'flores',
    'mato', 'mata', 'casa', 'terra', 'vida', 'amor', 'graca', 'fe', 'alves',
    'silva', 'branco', 'branca', 'preto', 'preta', 'verde', 'azul', 'mar',
    'boa', 'bom', 'nova', 'novo', 'velho', 'velha', 'alto', 'alta', 'baixo', 'baixa'
}

NON_PERSON_PROPER_WORDS = {
    'ensino', 'fundamental', 'medio', 'infantil', 'educacao', 'especial',
    'transtorno', 'espectro', 'autista', 'tea', 'tdah', 'sindrome', 'avaliacao',
    'sessao', 'terapia', 'psicologia', 'psiquiatria', 'clinica', 'escola',
    'colegio', 'janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
    'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo',
    'brasil', 'portugues', 'observacoes', 'gerais', 'historico', 'familiar'
}

MONTH_NAMES_PT = {
    1: ['janeiro'],
    2: ['fevereiro'],
    3: ['março', 'marco'],
    4: ['abril'],
    5: ['maio'],
    6: ['junho'],
    7: ['julho'],
    8: ['agosto'],
    9: ['setembro'],
    10: ['outubro'],
    11: ['novembro'],
    12: ['dezembro'],
}

ANAMNESE_FIELD_LABELS = {
    'escolaridade': 'Escolaridade',
    'tipoParto': 'Tipo de Parto',
    'intercorrencias': 'Intercorrências',
    'seletividadeAlimentar': 'Seletividade Alimentar',
    'dificuldadeRotina': 'Dificuldade com Rotina',
    'sensibilidadeEtiquetas': 'Sensibilidade a Etiquetas/Tecidos',
    'historicoFamiliar': 'Histórico Familiar',
    'adesaoRegras': 'Adesão a Regras',
    'observacoesGerais': 'Observações Gerais da Anamnese',
}

CATEGORY_META = {
    'paciente_nome': {'label': 'Nome do paciente', 'placeholder': '[Paciente]'},
    'responsavel_nome': {'label': 'Nome de responsável', 'placeholder': '[Responsável]'},
    'pessoa_vinculada': {'label': 'Nome pessoal identificado', 'placeholder': '[Nome]'},
    'cpf': {'label': 'CPF', 'placeholder': '[CPF]'},
    'telefone': {'label': 'Telefone / Contato', 'placeholder': '[Telefone]'},
    'email': {'label': 'E-mail', 'placeholder': '[E-mail]'},
    'cep': {'label': 'CEP', 'placeholder': '[CEP]'},
    'endereco': {'label': 'Endereço', 'placeholder': '[Endereço]'},
    'data_nascimento': {'label': 'Data de nascimento', 'placeholder': '[Data de nascimento]'},
    'documento': {'label': 'Documento', 'placeholder': '[Documento]'},
    'trecho_retido': {'label': 'Possível identificador retido', 'placeholder': '[Trecho retido]'},
}

ORIGIN_LABELS = {
    'cadastro_paciente': 'Cadastro do paciente',
    'responsavel': 'Cadastro de responsável',
    'endereco': 'Cadastro de endereço',
    'anamnese': 'Texto da anamnese',
    'padrao_texto': 'Padrão identificado no texto',
}

# Marcadores já sanitizados que devem ser preservados integralmente
EXISTING_MARKER_REGEX = re.compile(
    r'\[(?:Paciente|Respons[áa]vel|CPF|E-mail|Telefone|CEP|Endere[çc]o|Data de nascimento|Nome|Documento|Trecho retido)\]',
    re.IGNORECASE,
)

# Regex pré-compiladas para PII estruturado
CPF_REGEX = re.compile(r'\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b')
EMAIL_REGEX = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b')
CEP_REGEX = re.compile(r'\b\d{5}-\d{3}\b|\b(?:CEP)\s*[:#-]?\s*(\d{5}-?\d{3})\b', re.IGNORECASE)
PHONE_REGEX = re.compile(
    r'(?:\+?55[\s.-]*)?(?:\(\d{2}\)|\d{2}[\s.-])[\s.-]*(?:9\d{4}|\d{4})[\s.-]*\d{4}\b'
    r'|\b[1-9]{2}9\d{8}\b'
    r'|\b[1-9]{2}[2-5]\d{7}\b'
    r'|\b(?:9\d{4}|\d{4})[-\s.]\d{4}\b'
)
BIRTH_CONTEXT_REGEX = re.compile(
    r'\b(?:data\s+de\s+nascimento|nascid[oa]\s+em|nascimento|d\.?n\.?)\s*[:#-]?\s*'
    r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})',
    re.IGNORECASE,
)
CLINICAL_DATE_PREFIX_REGEX = re.compile(
    r'(?:sess[ãa]o\s+(?:de|em)|atendimento\s+(?:de|em)|consulta\s+(?:de|em)|'
    r'registro\s+(?:de|em)|crise\s+(?:de|em)|evento\s+(?:de|em)|ocorrido\s+(?:em|no\s+dia)|'
    r'relato\s+(?:de|em)|data\s+da\s+sess[ãa]o)\s*[:#-]?\s*$',
    re.IGNORECASE,
)
DOCUMENT_REGEX = re.compile(
    r'\b(?:RG|CNH|CNS|NIS|PIS|Passaporte|Certid[aã]o)\s*[:#-]?\s*[A-Za-z0-9./-]{5,18}\b',
    re.IGNORECASE,
)
GENERAL_ADDRESS_REGEX = re.compile(
    r'\b(?:Rua|R\.|Avenida|Av\.|Travessa|Tv\.|Alameda|Rodovia|Pra[çc]a|Quadra)\s+'
    r'[A-ZÀ-Ú][A-Za-zÀ-Úà-ú0-9\s.-]{2,45}(?:,\s*(?:n[º°]?\.?\s*)?\d{1,5})?',
)
PERSONAL_CONTEXT_PREFIX_REGEX = re.compile(
    r'(?:paciente|crian[çc]a|m[ãa]e|pai|av[óô]|ti[oa]|irm[ãa]o?|respons[áa]vel|tutora?|'
    r'cuidadora?|bab[áa]|sr\.?|sra\.?|dona|seu|chamad[oa])\s*[:#-]?\s*$',
    re.IGNORECASE,
)

# Padrões de tratamento incerto -> retenção e bloqueio
UNCERTAIN_LABELED_REGEX = re.compile(
    r'\b(?:CPF|RG|CNH|CNS|CEP|Telefone|Tel\.?|Celular|WhatsApp|E-mail|Email|Matr[ií]cula|Prontu[aá]rio\s+externo)\s*'
    r'[:#=-]\s*([^\n.;,]+?)(?=\s+(?:e|ou|al[eé]m|mas|que)\b|[.;,\n]|$)'
    r'|\b(?:Endere[çc]o)\s*[:#=-]\s*([^\n.;]+?)(?=\s+(?:e|ou|al[eé]m)\b|[.;\n]|$)',
    re.IGNORECASE,
)
SOCIAL_HANDLE_REGEX = re.compile(r'(?<![\w.])@[A-Za-z0-9_.-]{3,30}\b')
AMBIGUOUS_DIGITS_REGEX = re.compile(r'(?<![/\d])\b\d[\d.-]{6,15}\d\b(?![/\d])')
INITIALS_REGEX = re.compile(r'\b(?:[A-ZÀ-Ú]\.\s*){2,4}(?=\s|$|[.,;!?])')

HARMLESS_LABELED_VALUES = {
    'nao informado', 'não informado', 'nao possui', 'não possui',
    'sem registro', 'desconhecido', 'ignorado', 'ndn', 'n/a', 'nao consta', 'não consta',
}

# Extração em texto livre da anamnese
ANAMNESE_GUARDIAN_CUE_REGEX = re.compile(
    r'\b(?:m[ãa]e|mae|pai|av[óô]|ti[oa]|padrasto|madrasta|respons[áa]vel|tutora?)\s*'
    r'(?:[:=]|chamad[oa]\s*(?:de)?|se\s+chama)?\s+'
    r'([A-ZÀ-Ú][a-zà-ú]+(?:\s+(?:de|da|do|das|dos|e|[A-ZÀ-Ú][a-zà-ú]+)){0,4})'
)
ANAMNESE_PERSON_CUE_REGEX = re.compile(
    r'\b(?:cuidadora?|bab[áa]|contato(?:\s+de\s+emerg[êe]ncia)?|irm[ãa]o?|prim[oa]|sr\.?|sra\.?|dona|seu)\s*'
    r'(?:[:=]|chamad[oa]\s*(?:de)?|se\s+chama)?\s+'
    r'([A-ZÀ-Ú][a-zà-ú]+(?:\s+(?:de|da|do|das|dos|e|[A-ZÀ-Ú][a-zà-ú]+)){0,4})'
)
ANAMNESE_MULTIWORD_PROPER_REGEX = re.compile(
    r'\b([A-ZÀ-Ú][a-zà-ú]{2,}(?:\s+(?:de|da|do|das|dos|e)\s+|\s+)[A-ZÀ-Ú][a-zà-ú]{2,}'
    r'(?:\s+(?:de|da|do|das|dos|e|[A-ZÀ-Ú][a-zà-ú]{2,})){0,3})\b'
)
ANAMNESE_ADDRESS_CUE_REGEX = re.compile(
    r'\b(?:endereço|endereco|mora\s+(?:na|no|em)|reside\s+(?:na|no|em))\s*[:#-]?\s*'
    r'((?:Rua|R\.|Avenida|Av\.|Travessa|Alameda|Quadra|Pra[çc]a|[A-ZÀ-Ú])[^\n.;]{4,60})',
    re.IGNORECASE,
)

# Palavras genéricas descartadas na análise de relevância de coincidências clínicas
GENERIC_CLINICAL_WORDS = STOP_WORDS | {
    'não', 'nao', 'sem', 'com', 'por', 'mais', 'muito', 'pouco', 'bem', 'mal',
    'hoje', 'ontem', 'sempre', 'nunca', 'ainda', 'já', 'ja', 'também', 'tambem',
    'paciente', 'criança', 'crianca', 'sessão', 'sessao', 'atendimento', 'consulta',
    'nota', 'registro', 'acompanhamento', 'compareceu', 'acompanhado', 'acompanhada',
    'relatou', 'relata', 'informa', 'informou', 'apresentou', 'apresenta',
    'alterações', 'alteracoes', 'intercorrências', 'intercorrencias', 'queixas',
    'observações', 'observacoes', 'novidades', 'normal', 'favorável', 'favoravel',
    'adequado', 'adequada', 'declarar', 'dignas', 'período', 'periodo', 'clinico', 'clínico',
    'esta', 'está', 'foi', 'ser', 'ter', 'estar', 'fazer', 'fez', 'manteve', 'mantem', 'mantém',
}

GENERIC_BOILERPLATE_PHRASES = {
    'sem alteracoes',
    'sem intercorrencias',
    'nada a declarar',
    'sem queixas no momento',
    'sem novidades no periodo',
    'paciente compareceu a sessao',
    'paciente compareceu acompanhado',
    'paciente compareceu acompanhada',
    'mantem acompanhamento clinico',
    'evolucao favoravel no periodo',
    'sem alteracoes dignas de nota',
}


@dataclass
class _CandidateMatch:
    start: int
    end: int
    placeholder: str
    category: str
    origin: str
    priority: int
    estado: str = 'mascarado'


def _strip_accents(value: str) -> str:
    if not value:
        return ''
    return ''.join(
        ch for ch in unicodedata.normalize('NFD', value)
        if unicodedata.category(ch) != 'Mn'
    )


def _normalize_text_simple(value: str) -> str:
    return re.sub(r'\s+', ' ', _strip_accents(value or '').lower()).strip()


def _normalize_with_map(text: str) -> Tuple[str, List[int], List[int]]:
    """
    Normaliza o texto removendo acentos, convertendo para minúsculas e colapsando espaços,
    mantendo o mapeamento exato de volta aos índices originais [start, end).
    """
    norm_chars: List[str] = []
    orig_starts: List[int] = []
    orig_ends: List[int] = []

    i = 0
    n = len(text)
    while i < n:
        ch = text[i]
        if ch.isspace():
            ws_start = i
            while i < n and text[i].isspace():
                i += 1
            if norm_chars and norm_chars[-1] != ' ':
                norm_chars.append(' ')
                orig_starts.append(ws_start)
                orig_ends.append(i)
            continue

        decomposed = ''.join(
            c for c in unicodedata.normalize('NFD', ch)
            if unicodedata.category(c) != 'Mn'
        ).lower()
        for dc in decomposed:
            norm_chars.append(dc)
            orig_starts.append(i)
            orig_ends.append(i + 1)
        i += 1

    return ''.join(norm_chars), orig_starts, orig_ends


def _extract_name_tokens(full_name: str) -> Tuple[str, List[str]]:
    """Retorna o nome completo limpo e os tokens individuais significativos."""
    if not full_name:
        return '', []
    cleaned_full = re.sub(r'\s+', ' ', full_name.strip())
    tokens: List[str] = []
    for part in cleaned_full.split():
        clean_part = re.sub(r'[^\w]', '', part)
        norm_part = _normalize_text_simple(clean_part)
        if len(clean_part) >= 3 and norm_part not in STOP_WORDS:
            tokens.append(clean_part)
    # Remove duplicados preservando ordem por tamanho decrescente
    unique_tokens = sorted(list(set(tokens)), key=len, reverse=True)
    return cleaned_full, unique_tokens


def _digit_pattern(digits: str, allow_br_prefix: bool = False) -> Optional[re.Pattern]:
    if not digits:
        return None
    body = r'[\s./()-]*'.join(re.escape(d) for d in digits)
    if allow_br_prefix:
        return re.compile(rf'(?<!\d)(?:\+?55[\s./()-]*)?{body}(?!\d)')
    return re.compile(rf'(?<!\d){body}(?!\d)')


def _address_variants(endereco) -> List[str]:
    variants = []
    logradouro = (getattr(endereco, 'logradouro', '') or '').strip()
    numero = (getattr(endereco, 'numero', '') or '').strip()
    bairro = (getattr(endereco, 'bairro', '') or '').strip()
    cidade = (getattr(endereco, 'cidade', '') or '').strip()

    logradouro_variants = set()
    if logradouro and len(logradouro) >= 4:
        logradouro_variants.add(logradouro)
        norm_log = _normalize_text_simple(logradouro)
        if norm_log.startswith('rua '):
            logradouro_variants.add('r. ' + logradouro[4:])
            logradouro_variants.add('r ' + logradouro[4:])
        elif norm_log.startswith('r. '):
            logradouro_variants.add('rua ' + logradouro[3:])
        elif norm_log.startswith('avenida '):
            logradouro_variants.add('av. ' + logradouro[8:])
            logradouro_variants.add('av ' + logradouro[8:])
        elif norm_log.startswith('av. '):
            logradouro_variants.add('avenida ' + logradouro[4:])

    for lv in logradouro_variants:
        if numero:
            variants.append(f'{lv}, nº {numero}')
            variants.append(f'{lv}, n° {numero}')
            variants.append(f'{lv}, n {numero}')
            variants.append(f'{lv}, {numero}')
            variants.append(f'{lv} {numero}')
        variants.append(lv)

    for loc in (bairro, cidade):
        loc_clean = loc.strip()
        if len(loc_clean) >= 4 and _normalize_text_simple(loc_clean) not in AMBIGUOUS_NAME_WORDS:
            variants.append(loc_clean)

    return sorted(set(v for v in variants if len(v.strip()) >= 4), key=len, reverse=True)


def _birth_date_variants(birth_date) -> List[str]:
    if not birth_date:
        return []
    day = birth_date.day
    month = birth_date.month
    year = birth_date.year
    yy = year % 100
    variants = [
        f'{day:02d}/{month:02d}/{year:04d}',
        f'{day}/{month}/{year:04d}',
        f'{day:02d}-{month:02d}-{year:04d}',
        f'{year:04d}-{month:02d}-{day:02d}',
        f'{day:02d}/{month:02d}/{yy:02d}',
    ]
    for m_name in MONTH_NAMES_PT.get(month, []):
        variants.append(f'{day:02d} de {m_name} de {year:04d}')
        variants.append(f'{day} de {m_name} de {year:04d}')
    return variants


class _IdentifierRegistry:
    """Mantém o conjunto de identificadores conhecidos para cruzamento com os textos."""

    def __init__(self):
        self.full_names: List[Tuple[str, str, str]] = []       # (norm_name, category, origin)
        self.name_tokens: List[Tuple[str, str, str]] = []      # (norm_token, category, origin)
        self.cpf_digits: List[Tuple[str, str]] = []            # (digits, origin)
        self.phone_digits: List[Tuple[str, str]] = []          # (digits, origin)
        self.emails: List[Tuple[str, str]] = []                # (lower_email, origin)
        self.cep_digits: List[Tuple[str, str]] = []            # (digits, origin)
        self.addresses: List[Tuple[str, str]] = []             # (norm_addr, origin)
        self.birth_dates: List[Tuple[str, str]] = []           # (norm_date, origin)

        self._seen_full_names = set()
        self._seen_tokens = set()
        self._seen_cpfs = set()
        self._seen_phones = set()
        self._seen_emails = set()
        self._seen_ceps = set()
        self._seen_addresses = set()
        self._seen_birth_dates = set()

    def add_person_name(self, raw_name: str, category: str, origin: str):
        full, tokens = _extract_name_tokens(raw_name)
        norm_full = _normalize_text_simple(full)
        if norm_full and len(norm_full) >= 3 and norm_full not in self._seen_full_names:
            self._seen_full_names.add(norm_full)
            self.full_names.append((norm_full, category, origin))
        for tok in tokens:
            norm_tok = _normalize_text_simple(tok)
            if norm_tok and norm_tok not in self._seen_tokens and norm_tok not in NON_PERSON_PROPER_WORDS:
                self._seen_tokens.add(norm_tok)
                self.name_tokens.append((norm_tok, category, origin))

    def add_cpf(self, raw_cpf: str, origin: str):
        digits = re.sub(r'\D', '', raw_cpf or '')
        if len(digits) == 11 and digits not in self._seen_cpfs:
            self._seen_cpfs.add(digits)
            self.cpf_digits.append((digits, origin))

    def add_phone(self, raw_phone: str, origin: str):
        digits = re.sub(r'\D', '', raw_phone or '')
        if len(digits) >= 12 and digits.startswith('55'):
            digits = digits[2:]
        if 8 <= len(digits) <= 11 and digits not in self._seen_phones:
            self._seen_phones.add(digits)
            self.phone_digits.append((digits, origin))
            if len(digits) >= 10:
                local_digits = digits[2:]
                if len(local_digits) >= 8 and local_digits not in self._seen_phones:
                    self._seen_phones.add(local_digits)
                    self.phone_digits.append((local_digits, origin))

    def add_email(self, raw_email: str, origin: str):
        norm = (raw_email or '').strip().lower()
        if '@' in norm and norm not in self._seen_emails:
            self._seen_emails.add(norm)
            self.emails.append((norm, origin))

    def add_cep(self, raw_cep: str, origin: str):
        digits = re.sub(r'\D', '', raw_cep or '')
        if len(digits) == 8 and digits not in self._seen_ceps:
            self._seen_ceps.add(digits)
            self.cep_digits.append((digits, origin))

    def add_address(self, raw_addr: str, origin: str):
        norm = _normalize_text_simple(raw_addr)
        if len(norm) >= 4 and norm not in self._seen_addresses:
            self._seen_addresses.add(norm)
            self.addresses.append((norm, origin))

    def add_birth_date_variant(self, raw_date: str, origin: str):
        norm = _normalize_text_simple(raw_date)
        if norm and norm not in self._seen_birth_dates:
            self._seen_birth_dates.add(norm)
            self.birth_dates.append((norm, origin))


def _extract_identifiers_from_anamnese(anamnese, registry: _IdentifierRegistry):
    if not anamnese:
        return
    for field in ANAMNESE_FIELD_LABELS:
        val = getattr(anamnese, field, '') or ''
        if not val.strip():
            continue

        for match in CPF_REGEX.finditer(val):
            registry.add_cpf(match.group(0), 'anamnese')
        for match in EMAIL_REGEX.finditer(val):
            registry.add_email(match.group(0), 'anamnese')
        for match in PHONE_REGEX.finditer(val):
            registry.add_phone(match.group(0), 'anamnese')
        for match in CEP_REGEX.finditer(val):
            cep_val = match.group(1) or match.group(0)
            registry.add_cep(cep_val, 'anamnese')
        for match in BIRTH_CONTEXT_REGEX.finditer(val):
            registry.add_birth_date_variant(match.group(1), 'anamnese')
        for match in ANAMNESE_ADDRESS_CUE_REGEX.finditer(val):
            addr_val = match.group(1).strip(' ,.;:-')
            if len(addr_val) >= 5:
                registry.add_address(addr_val, 'anamnese')
        for match in GENERAL_ADDRESS_REGEX.finditer(val):
            registry.add_address(match.group(0), 'anamnese')

        for match in ANAMNESE_GUARDIAN_CUE_REGEX.finditer(val):
            candidate = match.group(1).strip()
            if _normalize_text_simple(candidate) not in NON_PERSON_PROPER_WORDS:
                registry.add_person_name(candidate, 'responsavel_nome', 'anamnese')
        for match in ANAMNESE_PERSON_CUE_REGEX.finditer(val):
            candidate = match.group(1).strip()
            if _normalize_text_simple(candidate) not in NON_PERSON_PROPER_WORDS:
                registry.add_person_name(candidate, 'pessoa_vinculada', 'anamnese')
        for match in ANAMNESE_MULTIWORD_PROPER_REGEX.finditer(val):
            candidate = match.group(1).strip()
            words = [_normalize_text_simple(w) for w in candidate.split()]
            non_stop = [w for w in words if w not in STOP_WORDS]
            if non_stop and not any(w in NON_PERSON_PROPER_WORDS for w in non_stop):
                registry.add_person_name(candidate, 'pessoa_vinculada', 'anamnese')


def _build_identifier_registry(paciente=None, anamnese=None, patient_name: str = '', guardian_names: Optional[List[str]] = None) -> _IdentifierRegistry:
    registry = _IdentifierRegistry()

    effective_patient_name = paciente.nomeCompleto if paciente and getattr(paciente, 'nomeCompleto', None) else patient_name
    if effective_patient_name:
        registry.add_person_name(effective_patient_name, 'paciente_nome', 'cadastro_paciente')

    if paciente and getattr(paciente, 'dataNascimento', None):
        for variant in _birth_date_variants(paciente.dataNascimento):
            registry.add_birth_date_variant(variant, 'cadastro_paciente')

    if paciente and hasattr(paciente, 'responsaveis'):
        for resp in paciente.responsaveis.all():
            if resp.nomeCompleto:
                registry.add_person_name(resp.nomeCompleto, 'responsavel_nome', 'responsavel')
            if resp.cpf:
                registry.add_cpf(resp.cpf, 'responsavel')
            if resp.contato:
                if '@' in resp.contato:
                    registry.add_email(resp.contato, 'responsavel')
                else:
                    registry.add_phone(resp.contato, 'responsavel')

    if guardian_names:
        for g_name in guardian_names:
            registry.add_person_name(g_name, 'responsavel_nome', 'responsavel')

    if paciente and hasattr(paciente, 'enderecos'):
        for end in paciente.enderecos.all():
            if end.cep:
                registry.add_cep(end.cep, 'endereco')
            for variant in _address_variants(end):
                registry.add_address(variant, 'endereco')

    if anamnese:
        _extract_identifiers_from_anamnese(anamnese, registry)

    # Ordena listas por comprimento decrescente
    registry.full_names.sort(key=lambda item: len(item[0]), reverse=True)
    registry.name_tokens.sort(key=lambda item: len(item[0]), reverse=True)
    registry.addresses.sort(key=lambda item: len(item[0]), reverse=True)
    registry.phone_digits.sort(key=lambda item: len(item[0]), reverse=True)
    registry.birth_dates.sort(key=lambda item: len(item[0]), reverse=True)
    return registry


def _overlaps_any(start: int, end: int, intervals: List[Tuple[int, int]]) -> bool:
    for istart, iend in intervals:
        if start < iend and end > istart:
            return True
    return False


def _add_normalized_phrase_matches(
    text: str,
    norm_text: str,
    orig_starts: List[int],
    orig_ends: List[int],
    phrase: str,
    category: str,
    origin: str,
    priority: int,
    candidates: List[_CandidateMatch],
    require_context_if_ambiguous: bool = False,
    skip_clinical_date_context: bool = False,
):
    if not phrase or not norm_text:
        return
    pattern = re.compile(rf'(?<!\w){re.escape(phrase)}(?!\w)')
    meta = CATEGORY_META[category]
    for m in pattern.finditer(norm_text):
        ns, ne = m.start(), m.end()
        if ns >= len(orig_starts) or ne - 1 >= len(orig_ends):
            continue
        os = orig_starts[ns]
        oe = orig_ends[ne - 1]
        original_slice = text[os:oe]

        if skip_clinical_date_context:
            prefix = text[max(0, os - 40):os]
            if CLINICAL_DATE_PREFIX_REGEX.search(prefix):
                continue

        if require_context_if_ambiguous and phrase in AMBIGUOUS_NAME_WORDS:
            prefix = text[max(0, os - 35):os]
            is_capitalized = bool(original_slice and original_slice[0].isupper())
            has_context = bool(PERSONAL_CONTEXT_PREFIX_REGEX.search(prefix))
            if not (is_capitalized or has_context):
                continue

        candidates.append(_CandidateMatch(
            start=os,
            end=oe,
            placeholder=meta['placeholder'],
            category=category,
            origin=origin,
            priority=priority,
        ))


def _sanitize_text_with_registry(text: str, registry: _IdentifierRegistry) -> Tuple[str, List[dict], bool]:
    """
    Sanitiza um texto individual retornando:
    (texto_sanitizado, lista_de_avisos_de_identificadores, bloqueada)
    """
    if not text:
        return '', [], False

    protected_intervals: List[Tuple[int, int]] = [
        (m.start(), m.end()) for m in EXISTING_MARKER_REGEX.finditer(text)
    ]

    norm_text, orig_starts, orig_ends = _normalize_with_map(text)
    candidates: List[_CandidateMatch] = []

    # 1. Cruzamento com identificadores conhecidos (prioridade mais alta)
    for norm_full, category, origin in registry.full_names:
        _add_normalized_phrase_matches(
            text, norm_text, orig_starts, orig_ends,
            norm_full, category, origin, priority=110, candidates=candidates,
        )

    for norm_tok, category, origin in registry.name_tokens:
        _add_normalized_phrase_matches(
            text, norm_text, orig_starts, orig_ends,
            norm_tok, category, origin, priority=100, candidates=candidates,
            require_context_if_ambiguous=True,
        )

    for norm_addr, origin in registry.addresses:
        _add_normalized_phrase_matches(
            text, norm_text, orig_starts, orig_ends,
            norm_addr, 'endereco', origin, priority=105, candidates=candidates,
        )

    for norm_date, origin in registry.birth_dates:
        _add_normalized_phrase_matches(
            text, norm_text, orig_starts, orig_ends,
            norm_date, 'data_nascimento', origin, priority=105, candidates=candidates,
            skip_clinical_date_context=True,
        )

    for digits, origin in registry.cpf_digits:
        pat = _digit_pattern(digits)
        if pat:
            for m in pat.finditer(text):
                candidates.append(_CandidateMatch(
                    start=m.start(), end=m.end(),
                    placeholder=CATEGORY_META['cpf']['placeholder'],
                    category='cpf', origin=origin, priority=130,
                ))

    for email_val, origin in registry.emails:
        pat = re.compile(rf'(?<!\w){re.escape(email_val)}(?!\w)', re.IGNORECASE)
        for m in pat.finditer(text):
            candidates.append(_CandidateMatch(
                start=m.start(), end=m.end(),
                placeholder=CATEGORY_META['email']['placeholder'],
                category='email', origin=origin, priority=132,
            ))

    for digits, origin in registry.phone_digits:
        pat = _digit_pattern(digits, allow_br_prefix=True)
        if pat:
            for m in pat.finditer(text):
                candidates.append(_CandidateMatch(
                    start=m.start(), end=m.end(),
                    placeholder=CATEGORY_META['telefone']['placeholder'],
                    category='telefone', origin=origin, priority=126,
                ))

    for digits, origin in registry.cep_digits:
        pat = _digit_pattern(digits)
        if pat:
            for m in pat.finditer(text):
                candidates.append(_CandidateMatch(
                    start=m.start(), end=m.end(),
                    placeholder=CATEGORY_META['cep']['placeholder'],
                    category='cep', origin=origin, priority=128,
                ))

    # 2. Padrões estruturados genéricos (prioridade alta/média para não fragmentar e-mails/CPFs por tokens de nome)
    for m in EMAIL_REGEX.finditer(text):
        candidates.append(_CandidateMatch(
            start=m.start(), end=m.end(),
            placeholder=CATEGORY_META['email']['placeholder'],
            category='email', origin='padrao_texto', priority=120,
        ))
    for m in CPF_REGEX.finditer(text):
        candidates.append(_CandidateMatch(
            start=m.start(), end=m.end(),
            placeholder=CATEGORY_META['cpf']['placeholder'],
            category='cpf', origin='padrao_texto', priority=118,
        ))
    for m in CEP_REGEX.finditer(text):
        cs, ce = (m.start(1), m.end(1)) if m.group(1) else (m.start(), m.end())
        candidates.append(_CandidateMatch(
            start=cs, end=ce,
            placeholder=CATEGORY_META['cep']['placeholder'],
            category='cep', origin='padrao_texto', priority=116,
        ))
    for m in PHONE_REGEX.finditer(text):
        candidates.append(_CandidateMatch(
            start=m.start(), end=m.end(),
            placeholder=CATEGORY_META['telefone']['placeholder'],
            category='telefone', origin='padrao_texto', priority=114,
        ))
    for m in BIRTH_CONTEXT_REGEX.finditer(text):
        candidates.append(_CandidateMatch(
            start=m.start(1), end=m.end(1),
            placeholder=CATEGORY_META['data_nascimento']['placeholder'],
            category='data_nascimento', origin='padrao_texto', priority=82,
        ))
    for m in DOCUMENT_REGEX.finditer(text):
        candidates.append(_CandidateMatch(
            start=m.start(), end=m.end(),
            placeholder=CATEGORY_META['documento']['placeholder'],
            category='documento', origin='padrao_texto', priority=82,
        ))
    for m in GENERAL_ADDRESS_REGEX.finditer(text):
        candidates.append(_CandidateMatch(
            start=m.start(), end=m.end(),
            placeholder=CATEGORY_META['endereco']['placeholder'],
            category='endereco', origin='padrao_texto', priority=80,
        ))

    # 3. Resolução inicial dos intervalos seguros (prioridade >= 80) para não reter o que já foi tratado
    safe_candidates = sorted(
        [c for c in candidates if c.priority >= 80],
        key=lambda c: (-c.priority, -(c.end - c.start), c.start),
    )
    accepted: List[_CandidateMatch] = []
    occupied_intervals: List[Tuple[int, int]] = list(protected_intervals)

    for cand in safe_candidates:
        if not _overlaps_any(cand.start, cand.end, occupied_intervals):
            accepted.append(cand)
            occupied_intervals.append((cand.start, cand.end))

    # 4. Detecção de trechos com tratamento incerto (apenas em intervalos ainda não cobertos)
    uncertain_candidates: List[_CandidateMatch] = []
    for m in UNCERTAIN_LABELED_REGEX.finditer(text):
        grp = 1 if m.group(1) is not None else 2
        vs, ve = m.start(grp), m.end(grp)
        val_slice = text[vs:ve].strip()
        norm_val = _normalize_text_simple(val_slice)
        if not val_slice or len(val_slice) < 2 or len(val_slice) > 60 or norm_val in HARMLESS_LABELED_VALUES:
            continue
        if EXISTING_MARKER_REGEX.search(val_slice):
            continue
        if _overlaps_any(vs, ve, occupied_intervals):
            continue
        uncertain_candidates.append(_CandidateMatch(
            start=vs, end=ve,
            placeholder=CATEGORY_META['trecho_retido']['placeholder'],
            category='trecho_retido', origin='padrao_texto', priority=50, estado='retido',
        ))

    for m in SOCIAL_HANDLE_REGEX.finditer(text):
        if not _overlaps_any(m.start(), m.end(), occupied_intervals):
            uncertain_candidates.append(_CandidateMatch(
                start=m.start(), end=m.end(),
                placeholder=CATEGORY_META['trecho_retido']['placeholder'],
                category='trecho_retido', origin='padrao_texto', priority=50, estado='retido',
            ))

    for m in AMBIGUOUS_DIGITS_REGEX.finditer(text):
        digits_only = re.sub(r'\D', '', m.group(0))
        if len(digits_only) >= 7 and not _overlaps_any(m.start(), m.end(), occupied_intervals):
            uncertain_candidates.append(_CandidateMatch(
                start=m.start(), end=m.end(),
                placeholder=CATEGORY_META['trecho_retido']['placeholder'],
                category='trecho_retido', origin='padrao_texto', priority=50, estado='retido',
            ))

    for m in INITIALS_REGEX.finditer(text):
        if not _overlaps_any(m.start(), m.end(), occupied_intervals):
            uncertain_candidates.append(_CandidateMatch(
                start=m.start(), end=m.end(),
                placeholder=CATEGORY_META['trecho_retido']['placeholder'],
                category='trecho_retido', origin='padrao_texto', priority=50, estado='retido',
            ))

    uncertain_candidates.sort(key=lambda c: (-(c.end - c.start), c.start))
    for cand in uncertain_candidates:
        if not _overlaps_any(cand.start, cand.end, occupied_intervals):
            accepted.append(cand)
            occupied_intervals.append((cand.start, cand.end))

    accepted.sort(key=lambda c: c.start)

    # 5. Reconstrução do texto e agregação dos avisos (sem expor valores originais)
    parts: List[str] = []
    cursor = 0
    counts: Dict[Tuple[str, str, str], int] = {}
    bloqueada = False

    for item in accepted:
        parts.append(text[cursor:item.start])
        parts.append(item.placeholder)
        cursor = item.end

        key = (item.category, item.origin, item.estado)
        counts[key] = counts.get(key, 0) + 1
        if item.estado == 'retido':
            bloqueada = True

    parts.append(text[cursor:])
    sanitized = ''.join(parts)

    # Normalizar marcações duplicadas consecutivas preservando quebras e pontuação
    sanitized = re.sub(r'\[Paciente\](?:\s+\[Paciente\])+', '[Paciente]', sanitized)
    sanitized = re.sub(r'\[Responsável\](?:\s+\[Responsável\])+', '[Responsável]', sanitized)
    sanitized = sanitized.strip()

    avisos_identificadores = [
        {
            'categoria': cat,
            'categoria_label': CATEGORY_META[cat]['label'],
            'origem': origin,
            'origem_label': ORIGIN_LABELS[origin],
            'quantidade': qtd,
            'estado': estado,
        }
        for (cat, origin, estado), qtd in counts.items()
    ]

    return sanitized, avisos_identificadores, bloqueada


def _merge_identifier_notices(notices: List[dict]) -> List[dict]:
    merged: Dict[Tuple[str, str, str], dict] = {}
    for item in notices:
        key = (item['categoria'], item['origem'], item['estado'])
        if key in merged:
            merged[key]['quantidade'] += item['quantidade']
        else:
            merged[key] = dict(item)
    return list(merged.values())


def _tokenize_for_overlap(text: str) -> List[str]:
    if not text:
        return []
    collapsed = re.sub(r'\s+', ' ', _strip_accents(text).lower()).strip()
    raw_tokens = collapsed.split(' ')
    cleaned = []
    for tok in raw_tokens:
        # Preserva marcadores como [paciente]
        if tok.startswith('[') and tok.endswith(']'):
            cleaned.append(tok)
        else:
            stripped = tok.strip('.,;:!?()"«»\'')
            if stripped:
                cleaned.append(stripped)
    return cleaned


def _is_relevant_passage(tokens: List[str]) -> bool:
    non_placeholder = [t for t in tokens if not (t.startswith('[') and t.endswith(']'))]
    if len(non_placeholder) < 4:
        return False
    joined = ' '.join(non_placeholder)
    if _normalize_text_simple(joined) in GENERIC_BOILERPLATE_PHRASES:
        return False
    if len(joined) < 18:
        return False
    meaningful = [
        t for t in non_placeholder
        if _normalize_text_simple(t) not in GENERIC_CLINICAL_WORDS and len(t) >= 3
    ]
    return len(meaningful) >= 3


def _has_relevant_overlap(note_tokens: List[str], field_tokens: List[str]) -> bool:
    if len(note_tokens) < 4 or len(field_tokens) < 4:
        return False
    n_len = len(note_tokens)
    f_len = len(field_tokens)

    # Índice de posições na anamnese por token
    positions: Dict[str, List[int]] = {}
    for idx, tok in enumerate(field_tokens):
        positions.setdefault(tok, []).append(idx)

    for i in range(n_len):
        tok = note_tokens[i]
        for j in positions.get(tok, []):
            k = 1
            while i + k < n_len and j + k < f_len and note_tokens[i + k] == field_tokens[j + k]:
                k += 1
            if k >= 4 and _is_relevant_passage(note_tokens[i:i + k]):
                return True
    return False


def sanitize_text(
    text: str,
    patient_name: str = "",
    guardian_names: Optional[List[str]] = None
) -> str:
    """
    Varre o texto clínico e substitui nomes do paciente e responsáveis por tags
    genéricas, além de mascarar documentos, contatos e identificadores conhecidos.
    """
    if not text:
        return ""
    registry = _build_identifier_registry(
        paciente=None,
        anamnese=None,
        patient_name=patient_name,
        guardian_names=guardian_names,
    )
    sanitized, _, _ = _sanitize_text_with_registry(text, registry)
    return sanitized


def sanitize_clinical_data(
    paciente,
    anamnese=None,
    anotacoes=None,
    incluir_anamnese: bool = True,
) -> dict:
    """
    Sanitiza o histórico clínico selecionado de um paciente (anamnese e/ou anotações).
    Cruza identificadores do cadastro, responsáveis, endereços e anamnese (mesmo se desmarcada)
    e gera avisos por fonte sem expor valores originais.
    """
    registry = _build_identifier_registry(paciente=paciente, anamnese=anamnese)

    sanitized_anamnese_all: Dict[str, str] = {}
    anamnese_notices: List[dict] = []
    anamnese_bloqueada = False

    if anamnese:
        for field in ANAMNESE_FIELD_LABELS:
            val = getattr(anamnese, field, '')
            if val and val.strip():
                clean_val, notices, blocked = _sanitize_text_with_registry(val, registry)
                sanitized_anamnese_all[field] = clean_val
                if incluir_anamnese:
                    anamnese_notices.extend(notices)
                    if blocked:
                        anamnese_bloqueada = True
            else:
                sanitized_anamnese_all[field] = ''

    sanitized_anamnese = sanitized_anamnese_all if (anamnese and incluir_anamnese) else {}

    # Pré-tokenizar campos preenchidos e já sanitizados da anamnese para comparação de coincidências
    anamnese_field_tokens = {
        field: _tokenize_for_overlap(val)
        for field, val in sanitized_anamnese_all.items()
        if val and val.strip()
    }

    fontes_avisos: List[dict] = []
    fontes_bloqueadas: List[dict] = []

    if anamnese and incluir_anamnese:
        merged_anamnese_notices = _merge_identifier_notices(anamnese_notices)
        fontes_avisos.append({
            'tipo': 'anamnese',
            'id': 'anamnese',
            'titulo': 'Anamnese Clínica',
            'bloqueada': anamnese_bloqueada,
            'identificadores': merged_anamnese_notices,
            'coincidencias_anamnese': [],
        })
        if anamnese_bloqueada:
            fontes_bloqueadas.append({
                'tipo': 'anamnese',
                'id': 'anamnese',
                'titulo': 'Anamnese Clínica',
            })

    sanitized_anotacoes = []
    if anotacoes:
        for idx, anotacao in enumerate(anotacoes, 1):
            sessao_id = ''
            sessao_tipo = ''
            data_sessao = ''
            if hasattr(anotacao, 'sessao') and anotacao.sessao:
                sessao = anotacao.sessao
                sessao_id = str(sessao.id)
                sessao_tipo = sessao.tipo
                if sessao.dataHoraInicio:
                    data_sessao = timezone.localdate(sessao.dataHoraInicio).strftime('%d/%m/%Y')

            data_reg = ''
            if anotacao.dataRegistro:
                data_reg = timezone.localtime(anotacao.dataRegistro).strftime('%d/%m/%Y %H:%M')

            clean_text, note_notices, note_bloqueada = _sanitize_text_with_registry(
                anotacao.textoLivre, registry
            )

            sessao_tipo_label = 'Avaliativa' if sessao_tipo == 'AVALIATIVA' else 'Interventiva' if sessao_tipo == 'INTERVENTIVA' else sessao_tipo
            sessao_titulo = f"Nota {idx} — Sessão {sessao_tipo_label}" + (f" ({data_sessao})" if data_sessao else "")

            # Detecção de passagens clínicas relevantes repetidas com a anamnese (após mascaramento)
            note_tokens = _tokenize_for_overlap(clean_text)
            coincidencias = []
            for field_key, f_tokens in anamnese_field_tokens.items():
                if _has_relevant_overlap(note_tokens, f_tokens):
                    coincidencias.append({
                        'sessao_id': sessao_id or str(anotacao.id),
                        'sessao_titulo': sessao_titulo,
                        'campo': field_key,
                        'campo_label': ANAMNESE_FIELD_LABELS[field_key],
                    })

            sanitized_anotacoes.append({
                'id': str(anotacao.id),
                'sessao_id': sessao_id,
                'data': data_reg,
                'data_sessao': data_sessao,
                'tipo': sessao_tipo,
                'texto': clean_text,
            })

            merged_note_notices = _merge_identifier_notices(note_notices)
            fontes_avisos.append({
                'tipo': 'sessao',
                'id': sessao_id or str(anotacao.id),
                'titulo': sessao_titulo,
                'data': data_sessao,
                'sessao_tipo': sessao_tipo,
                'bloqueada': note_bloqueada,
                'identificadores': merged_note_notices,
                'coincidencias_anamnese': coincidencias,
            })
            if note_bloqueada:
                fontes_bloqueadas.append({
                    'tipo': 'sessao',
                    'id': sessao_id or str(anotacao.id),
                    'titulo': sessao_titulo,
                })

    bloqueado = len(fontes_bloqueadas) > 0

    return {
        'anamnese': sanitized_anamnese,
        'anotacoes': sanitized_anotacoes,
        'bloqueado': bloqueado,
        'avisos': {
            'bloqueado': bloqueado,
            'fontes_bloqueadas': fontes_bloqueadas,
            'fontes': fontes_avisos,
        },
    }
