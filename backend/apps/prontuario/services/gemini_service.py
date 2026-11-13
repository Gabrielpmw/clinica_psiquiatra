"""
Serviço de Integração com o Google Gemini (RF10, RF11, RF12).
Consome o catálogo de prompts e as notas previamente sanitizadas,
garantindo que nenhuma informação pessoal identificável (PII) seja enviada à IA.
"""
import logging
import time
from typing import List
from django.conf import settings
import requests
from google import genai
from google.genai import types

from .prompt_catalog import get_prompt_by_id
from .sanitizer import sanitize_clinical_data

logger = logging.getLogger(__name__)

# Modelos recomendados em ordem de preferência (compatíveis com v1/v1beta e google-genai SDK)
# Modelos obsoletos (como gemini-2.5-flash-lite e gemini-1.5-flash) foram removidos pois geram 404.
# Modelos ativos atuais: gemini-2.5-flash, gemini-3.5-flash, gemini-3.5-flash-lite, etc.
DEFAULT_AVAILABLE_MODELS = [
    'gemini-2.5-flash',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-flash-latest',
]

AVAILABLE_MODELS = list(DEFAULT_AVAILABLE_MODELS)

# Configurações de retentativa com backoff para erros transitórios (503 UNAVAILABLE, 429 RATE_LIMIT)
MAX_RETRIES_PER_MODEL = 2
INITIAL_BACKOFF_SECONDS = 1.0
BACKOFF_FACTOR = 2.0


def get_available_models() -> List[str]:
    """Retorna os modelos configurados no settings ou a lista padrão recomendada."""
    configured_models = getattr(settings, 'GEMINI_MODELS', None)
    if configured_models and isinstance(configured_models, (list, tuple)):
        return [str(m).strip() for m in configured_models if str(m).strip()]
    return list(AVAILABLE_MODELS)


def is_transient_error(exc: Exception) -> bool:
    """
    Verifica se o erro retornado pela API ou rede é transitório (503 alta demanda, 429 rate limit, timeouts).
    Nestes casos, uma nova tentativa com backoff exponencial costuma ter êxito.
    """
    code = getattr(exc, 'code', None) or getattr(exc, 'status_code', None)
    if code in (429, 503, 504):
        return True

    msg = str(exc).lower()
    transient_indicators = (
        '503',
        'unavailable',
        'high demand',
        'spikes in demand',
        'temporarily unavailable',
        '429',
        'resource_exhausted',
        'rate limit',
        'quota',
        'timeout',
        'timed out',
        'connection reset',
        'connection refused',
    )
    return any(indicator in msg for indicator in transient_indicators)


def call_gemini_api(system_instruction: str, user_content: str) -> str:
    """
    Executa a chamada ao modelo Gemini com chave segura de ambiente.
    Utiliza o SDK google-genai com retry e backoff para erros 503/429
    e failover automático entre modelos válidos disponíveis, com fallback REST.
    """
    api_key = getattr(settings, 'GEMINI_API_KEY', '').strip()
    if not api_key or api_key == 'your_gemini_api_key_here':
        raise ValueError(
            "A chave de API GEMINI_API_KEY não foi configurada. "
            "Por favor, configure sua chave real no arquivo .env."
        )

    models_to_try = get_available_models()
    last_error = ""

    # 1. Tentar primeiro via SDK oficial google-genai
    try:
        client = genai.Client(api_key=api_key)
    except Exception as exc:
        logger.warning("Falha ao inicializar client google-genai: %s", exc)
        client = None

    if client:
        for model_name in models_to_try:
            delay = INITIAL_BACKOFF_SECONDS
            for attempt in range(MAX_RETRIES_PER_MODEL + 1):
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=user_content,
                        config=types.GenerateContentConfig(
                            system_instruction=system_instruction,
                            temperature=0.2,
                        )
                    )
                    if response.text:
                        return response.text
                except Exception as exc:
                    last_error = str(exc)
                    if is_transient_error(exc) and attempt < MAX_RETRIES_PER_MODEL:
                        logger.info(
                            "Modelo %s ocupado/transitório (503/429). Tentativa %d/%d em %.1fs...",
                            model_name,
                            attempt + 1,
                            MAX_RETRIES_PER_MODEL + 1,
                            delay
                        )
                        time.sleep(delay)
                        delay *= BACKOFF_FACTOR
                        continue

                    logger.warning(
                        "Falha ao invocar via SDK google-genai para %s (%s). Tentando próximo modelo...",
                        model_name,
                        exc
                    )
                    break

    # 2. Fallback REST direto com tentativa nos modelos disponíveis
    for model_name in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        payload = {
            "system_instruction": {
                "parts": [{"text": system_instruction}]
            },
            "contents": [
                {"parts": [{"text": user_content}]}
            ],
            "generationConfig": {
                "temperature": 0.2
            }
        }

        delay = INITIAL_BACKOFF_SECONDS
        for attempt in range(MAX_RETRIES_PER_MODEL + 1):
            try:
                resp = requests.post(url, json=payload, timeout=40)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get('candidates', [])
                    if candidates and 'content' in candidates[0]:
                        parts = candidates[0]['content'].get('parts', [])
                        if parts:
                            return parts[0].get('text', '')
                elif resp.status_code in (429, 503, 504) and attempt < MAX_RETRIES_PER_MODEL:
                    logger.info(
                        "REST no modelo %s retornou status %d transitório. Tentando em %.1fs...",
                        model_name,
                        resp.status_code,
                        delay
                    )
                    time.sleep(delay)
                    delay *= BACKOFF_FACTOR
                    continue
                else:
                    last_error = f"Status {resp.status_code}: {resp.text}"
                    logger.warning("Falha REST no modelo %s: %s", model_name, last_error)
                    break
            except Exception as exc:
                last_error = str(exc)
                if is_transient_error(exc) and attempt < MAX_RETRIES_PER_MODEL:
                    time.sleep(delay)
                    delay *= BACKOFF_FACTOR
                    continue
                logger.warning("Erro de conexão no modelo %s: %s", model_name, last_error)
                break

    raise RuntimeError(f"Erro na API do Google Gemini ({last_error})")


def format_clinical_context(sanitized_data: dict) -> str:
    """Formata os dados já sanitizados em texto legível para o prompt do modelo."""
    sections = []

    # 1. Anamnese
    anamnese = sanitized_data.get('anamnese') or {}
    if anamnese:
        anamnese_lines = ["[DADOS DE ANAMNESE SANITIZADOS]"]
        labels = {
            'escolaridade': 'Escolaridade',
            'tipoParto': 'Tipo de Parto',
            'intercorrencias': 'Intercorrências',
            'seletividadeAlimentar': 'Seletividade Alimentar',
            'dificuldadeRotina': 'Dificuldade com Rotina',
            'sensibilidadeEtiquetas': 'Sensibilidade a Etiquetas/Tecidos',
            'historicoFamiliar': 'Histórico Familiar',
            'adesaoRegras': 'Adesão a Regras',
            'observacoesGerais': 'Observações Gerais da Anamnese'
        }
        for key, label in labels.items():
            val = anamnese.get(key)
            if val:
                anamnese_lines.append(f"- {label}: {val}")
        sections.append("\n".join(anamnese_lines))

    # 2. Anotações cronológicas
    anotacoes = sanitized_data.get('anotacoes') or []
    if anotacoes:
        anotacoes_lines = ["[LINHA DO TEMPO DE ANOTAÇÕES DE SESSÃO SANITIZADAS]"]
        for idx, nota in enumerate(anotacoes, 1):
            data_str = nota.get('data') or 'Data não registrada'
            tipo_str = nota.get('tipo') or 'Sessão'
            texto = nota.get('texto') or ''
            anotacoes_lines.append(f"\n--- Sessão {idx} ({data_str} | Tipo: {tipo_str}) ---\n{texto}")
        sections.append("\n".join(anotacoes_lines))
    else:
        sections.append("[Nenhuma anotação de sessão registrada até o momento.]")

    return "\n\n".join(sections)


def generate_clinical_summary(paciente, prompt_id: int, anamnese=None, anotacoes=None) -> dict:
    """
    Coordena o fluxo de sanitização, seleção do prompt fixo e envio ao Gemini.
    Retorna o texto da prévia gerada junto com metadados do prompt.
    """
    prompt_config = get_prompt_by_id(prompt_id)
    if not prompt_config:
        raise ValueError(f"Identificador de prompt inválido: '{prompt_id}'. Escolha entre 1 e 4.")

    # 1. Sanitizar dados no backend antes de qualquer envio
    sanitized_data = sanitize_clinical_data(paciente, anamnese, anotacoes)

    # 2. Montar texto clínico contextual
    clinical_text = format_clinical_context(sanitized_data)

    # 3. Invocar a IA com a instrução do sistema correspondente
    conteudo_gerado = call_gemini_api(
        system_instruction=prompt_config["system_instruction"],
        user_content=clinical_text
    )

    return {
        "prompt_id": prompt_config["id"],
        "prompt_titulo": prompt_config["titulo"],
        "conteudo": conteudo_gerado
    }
