"""
Serviço de Integração com o Google Gemini (RF10, RF11, RF12).
Consome o catálogo de prompts e as fontes clínicas previamente sanitizadas,
garantindo que nenhuma informação pessoal identificável (PII) nem trechos retidos
sejam enviados à API externa.
"""
import hashlib
import json
import logging
import time
from typing import List, Optional
from django.conf import settings
import requests
from google import genai
from google.genai import types

from .clinical_context import format_clinical_context
from .prompt_catalog import get_prompt_by_id
from .sanitizer import sanitize_clinical_data

logger = logging.getLogger(__name__)

DEFAULT_AVAILABLE_MODELS = [
    'gemini-2.5-flash',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-flash-latest',
]

AVAILABLE_MODELS = list(DEFAULT_AVAILABLE_MODELS)

MAX_RETRIES_PER_MODEL = 2
INITIAL_BACKOFF_SECONDS = 1.0
BACKOFF_FACTOR = 2.0
MAX_OUTPUT_TOKENS = 16384


class BlockedClinicalSourceError(Exception):
    """Lançada quando uma fonte possui trecho retido e bloqueia o envio ao Gemini."""
    def __init__(self, message: str, avisos: Optional[dict] = None):
        super().__init__(message)
        self.avisos = avisos or {}


class StaleReviewContextError(Exception):
    """Lançada quando os dados clínicos mudaram após a etapa de revisão."""


class InvalidClinicalSelectionError(ValueError):
    """Lançada quando a seleção de fontes viola as regras de envio externo."""


class IncompleteGeminiResponseError(Exception):
    """A resposta terminou antes de o modelo concluir o rascunho."""


def _finish_reason_name(reason) -> str:
    """Normaliza o motivo de término do SDK ou da resposta REST."""
    return str(getattr(reason, 'name', reason) or '').rsplit('.', 1)[-1].upper()


def _check_finish_reason(reason) -> None:
    name = _finish_reason_name(reason)
    if not name:
        raise IncompleteGeminiResponseError(
            'O Gemini não confirmou a conclusão da resposta. Nenhum rascunho parcial foi criado; tente novamente.'
        )
    if name == 'MAX_TOKENS':
        raise IncompleteGeminiResponseError(
            'O Gemini atingiu o limite de resposta antes de concluir o texto. '
            'Selecione menos sessões e tente novamente; nenhum rascunho parcial foi criado.'
        )
    if name != 'STOP':
        raise RuntimeError(f'O Gemini interrompeu a geração ({name}).')


def compute_context_hash(
    prompt_config: dict,
    contexto: str,
    referencias_sessao: list,
    avisos: Optional[dict] = None,
) -> str:
    """Calcula hash SHA-256 determinístico do pacote revisado."""
    payload = {
        'prompt_id': prompt_config['id'],
        'instrucao': prompt_config['system_instruction'],
        'contexto': contexto,
        'referencias_sessao': referencias_sessao,
        'avisos': avisos or {},
    }
    encoded = json.dumps(payload, sort_keys=True, ensure_ascii=False).encode('utf-8')
    return hashlib.sha256(encoded).hexdigest()


def get_available_models() -> List[str]:
    """Retorna os modelos configurados no settings ou a lista padrão recomendada."""
    configured_models = getattr(settings, 'GEMINI_MODELS', None)
    if configured_models and isinstance(configured_models, (list, tuple)):
        return [str(m).strip() for m in configured_models if str(m).strip()]
    return list(AVAILABLE_MODELS)


def is_transient_error(exc: Exception) -> bool:
    """
    Verifica se o erro retornado pela API ou rede é transitório (503 alta demanda, 429 rate limit, timeouts).
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
            "Configure sua chave real no arquivo .env."
        )

    models_to_try = get_available_models()
    last_error = ""

    # 1. Tentar primeiro via SDK oficial google-genai (v1beta suporta system_instruction)
    try:
        client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(api_version='v1beta'),
        )
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
                            temperature=0.35,
                            max_output_tokens=MAX_OUTPUT_TOKENS,
                        ),
                    )
                    if response.candidates:
                        _check_finish_reason(response.candidates[0].finish_reason)
                    if response.text:
                        return response.text
                except IncompleteGeminiResponseError:
                    raise
                except Exception as exc:
                    last_error = str(exc)
                    if is_transient_error(exc) and attempt < MAX_RETRIES_PER_MODEL:
                        logger.info(
                            "Modelo %s ocupado/transitório (503/429). Tentativa %d/%d em %.1fs...",
                            model_name,
                            attempt + 1,
                            MAX_RETRIES_PER_MODEL + 1,
                            delay,
                        )
                        time.sleep(delay)
                        delay *= BACKOFF_FACTOR
                        continue

                    logger.warning(
                        "Falha ao invocar via SDK google-genai para %s (%s). Tentando próximo modelo...",
                        model_name,
                        exc,
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
                "temperature": 0.35,
                "maxOutputTokens": MAX_OUTPUT_TOKENS,
            },
        }

        delay = INITIAL_BACKOFF_SECONDS
        for attempt in range(MAX_RETRIES_PER_MODEL + 1):
            try:
                resp = requests.post(url, json=payload, timeout=40)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get('candidates', [])
                    if candidates and 'content' in candidates[0]:
                        _check_finish_reason(candidates[0].get('finishReason'))
                        parts = candidates[0]['content'].get('parts', [])
                        result = ''.join(part.get('text', '') for part in parts)
                        if result:
                            return result
                    elif candidates:
                        _check_finish_reason(candidates[0].get('finishReason'))
                elif resp.status_code in (429, 503, 504) and attempt < MAX_RETRIES_PER_MODEL:
                    logger.info(
                        "REST no modelo %s retornou status %d transitório. Tentando em %.1fs...",
                        model_name,
                        resp.status_code,
                        delay,
                    )
                    time.sleep(delay)
                    delay *= BACKOFF_FACTOR
                    continue
                else:
                    last_error = f"Status {resp.status_code}: {resp.text}"
                    logger.warning("Falha REST no modelo %s: %s", model_name, last_error)
                    break
            except IncompleteGeminiResponseError:
                raise
            except Exception as exc:
                last_error = str(exc)
                if is_transient_error(exc) and attempt < MAX_RETRIES_PER_MODEL:
                    time.sleep(delay)
                    delay *= BACKOFF_FACTOR
                    continue
                logger.warning("Erro de conexão no modelo %s: %s", model_name, last_error)
                break

    raise RuntimeError(f"Erro na API do Google Gemini ({last_error})")


def generate_clinical_summary(
    paciente,
    prompt_id: int,
    anamnese=None,
    anotacoes=None,
    incluir_anamnese: bool = False,
    referencias_sessao: Optional[list] = None,
    contexto_hash: Optional[str] = None,
) -> dict:
    """
    Coordena sanitização LGPD, verificação de bloqueio/revisão e envio ao Gemini.
    A anamnese é consultada apenas internamente no sanitizador para cruzar PII nas notas,
    nunca sendo incluída no contexto enviado à API externa.
    """
    if incluir_anamnese:
        raise InvalidClinicalSelectionError(
            "A anamnese não pode ser incluída no envio externo ao Gemini."
        )

    prompt_config = get_prompt_by_id(prompt_id)
    if not prompt_config:
        raise InvalidClinicalSelectionError(f"Identificador de prompt inválido: '{prompt_id}'. Escolha entre 1 e 4.")

    anotacoes_list = list(anotacoes or [])
    if not anotacoes_list:
        raise InvalidClinicalSelectionError(
            "Selecione pelo menos uma sessão com anotação antes de gerar o resumo."
        )

    sanitized_data = sanitize_clinical_data(
        paciente,
        anamnese,
        anotacoes_list,
        incluir_anamnese=False,
    )

    if sanitized_data['bloqueado']:
        raise BlockedClinicalSourceError(
            "Uma fonte selecionada possui identificador sem tratamento seguro e bloqueou o envio ao Gemini. "
            "Ajuste a seleção ou o prontuário e revise novamente.",
            avisos=sanitized_data['avisos'],
        )

    clinical_text = format_clinical_context(
        sanitized_data,
        incluir_anamnese=False,
        incluir_notas=True,
    )

    refs = referencias_sessao or []
    actual_hash = compute_context_hash(
        prompt_config,
        clinical_text,
        refs,
        sanitized_data['avisos'],
    )
    if contexto_hash and contexto_hash != actual_hash:
        raise StaleReviewContextError(
            "Os dados ou o contexto mudaram desde a revisão aprovada. Faça uma nova revisão antes de gerar."
        )

    conteudo_gerado = call_gemini_api(
        system_instruction=prompt_config["system_instruction"],
        user_content=clinical_text,
    )

    return {
        "prompt_id": prompt_config["id"],
        "prompt_titulo": prompt_config["titulo"],
        "conteudo": conteudo_gerado,
    }
