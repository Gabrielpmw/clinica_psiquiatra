from unittest.mock import patch, MagicMock
from django.test import TestCase, override_settings
from google.genai import errors

from apps.prontuario.services.gemini_service import (
    call_gemini_api,
    is_transient_error,
    get_available_models,
    IncompleteGeminiResponseError,
    MAX_OUTPUT_TOKENS,
)


class GeminiServiceTests(TestCase):
    def test_is_transient_error(self):
        err_503 = errors.ServerError(503, {'error': {'message': 'This model is currently experiencing high demand.'}}, None)
        self.assertTrue(is_transient_error(err_503))

        err_429 = errors.ClientError(429, {'error': {'message': 'Resource exhausted'}}, None)
        self.assertTrue(is_transient_error(err_429))

        err_text_unavailable = RuntimeError("503 UNAVAILABLE. Spikes in demand are usually temporary.")
        self.assertTrue(is_transient_error(err_text_unavailable))

        err_text_timeout = RuntimeError("Connection timed out waiting for server")
        self.assertTrue(is_transient_error(err_text_timeout))

        err_non_transient = ValueError("Parâmetros inválidos")
        self.assertFalse(is_transient_error(err_non_transient))

        err_404 = errors.ClientError(404, {'error': {'message': 'Model not found'}}, None)
        self.assertFalse(is_transient_error(err_404))

    @override_settings(GEMINI_API_KEY="test_key_abc123")
    @patch('apps.prontuario.services.gemini_service.genai.Client')
    def test_call_gemini_api_success_first_try(self, mock_client_cls):
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client

        mock_response = MagicMock()
        mock_response.text = "Conteúdo gerado pela IA"
        mock_response.candidates = [MagicMock(finish_reason='STOP')]
        mock_client.models.generate_content.return_value = mock_response

        resultado = call_gemini_api("Instrução", "Dados clínicos")
        self.assertEqual(resultado, "Conteúdo gerado pela IA")
        self.assertEqual(mock_client.models.generate_content.call_count, 1)
        _, client_kwargs = mock_client_cls.call_args
        self.assertEqual(client_kwargs['api_key'], "test_key_abc123")
        self.assertEqual(client_kwargs['http_options'].api_version, "v1beta")
        self.assertEqual(mock_client.models.generate_content.call_args.kwargs['config'].max_output_tokens, MAX_OUTPUT_TOKENS)

    @override_settings(GEMINI_API_KEY="test_key_abc123")
    @patch('apps.prontuario.services.gemini_service.time.sleep')
    @patch('apps.prontuario.services.gemini_service.genai.Client')
    def test_call_gemini_api_retries_transient_503_and_succeeds(self, mock_client_cls, mock_sleep):
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client

        err_503 = errors.ServerError(503, {'error': {'message': 'This model is currently experiencing high demand.'}}, None)
        mock_success = MagicMock()
        mock_success.text = "Recuperado após retry"
        mock_success.candidates = [MagicMock(finish_reason='STOP')]

        mock_client.models.generate_content.side_effect = [err_503, mock_success]

        resultado = call_gemini_api("Instrução", "Dados clínicos")
        self.assertEqual(resultado, "Recuperado após retry")
        self.assertEqual(mock_client.models.generate_content.call_count, 2)
        mock_sleep.assert_called_once_with(1.0)

    @override_settings(GEMINI_API_KEY="test_key_abc123", GEMINI_MODELS=['modelo-primario', 'modelo-secundario'])
    @patch('apps.prontuario.services.gemini_service.time.sleep')
    @patch('apps.prontuario.services.gemini_service.genai.Client')
    def test_call_gemini_api_failover_to_next_model(self, mock_client_cls, mock_sleep):
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client

        err_503 = errors.ServerError(503, {'error': {'message': 'High demand'}}, None)
        mock_success = MagicMock()
        mock_success.text = "Sucesso no modelo secundário"
        mock_success.candidates = [MagicMock(finish_reason='STOP')]

        mock_client.models.generate_content.side_effect = [err_503, err_503, err_503, mock_success]

        resultado = call_gemini_api("Instrução", "Dados clínicos")
        self.assertEqual(resultado, "Sucesso no modelo secundário")
        self.assertEqual(mock_client.models.generate_content.call_count, 4)

    @override_settings(GEMINI_API_KEY="test_key_abc123", GEMINI_MODELS=['modelo-teste'])
    @patch('apps.prontuario.services.gemini_service.requests.post')
    @patch('apps.prontuario.services.gemini_service.genai.Client')
    def test_call_gemini_api_rejects_truncated_sdk_response(self, mock_client_cls, mock_post):
        response = MagicMock()
        response.text = "Texto interrompido no meio"
        response.candidates = [MagicMock(finish_reason='MAX_TOKENS')]
        mock_client_cls.return_value.models.generate_content.return_value = response

        with self.assertRaises(IncompleteGeminiResponseError):
            call_gemini_api("Instrução", "Dados clínicos")
        mock_post.assert_not_called()

    @override_settings(GEMINI_API_KEY="test_key_abc123", GEMINI_MODELS=['modelo-teste'])
    @patch('apps.prontuario.services.gemini_service.genai.Client')
    def test_call_gemini_api_rejects_response_without_finish_reason(self, mock_client_cls):
        response = MagicMock()
        response.text = "Texto sem estado final"
        response.candidates = [MagicMock(finish_reason=None)]
        mock_client_cls.return_value.models.generate_content.return_value = response

        with self.assertRaises(IncompleteGeminiResponseError):
            call_gemini_api("Instrução", "Dados clínicos")

    @override_settings(GEMINI_API_KEY="test_key_abc123", GEMINI_MODELS=['modelo-teste'])
    @patch('apps.prontuario.services.gemini_service.requests.post')
    @patch('apps.prontuario.services.gemini_service.genai.Client')
    def test_call_gemini_api_fallback_to_rest(self, mock_client_cls, mock_post):
        mock_client_cls.side_effect = Exception("SDK indisponível")

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            'candidates': [{'finishReason': 'STOP', 'content': {'parts': [{'text': 'Resposta '}, {'text': 'REST'}]}}]
        }
        mock_post.return_value = mock_resp

        resultado = call_gemini_api("Instrução", "Dados clínicos")
        self.assertEqual(resultado, "Resposta REST")
        mock_post.assert_called_once()
        self.assertEqual(mock_post.call_args.kwargs['json']['generationConfig']['maxOutputTokens'], MAX_OUTPUT_TOKENS)

    @override_settings(GEMINI_API_KEY="test_key_abc123", GEMINI_MODELS=['modelo-teste'])
    @patch('apps.prontuario.services.gemini_service.requests.post')
    @patch('apps.prontuario.services.gemini_service.genai.Client')
    def test_call_gemini_api_rejects_truncated_rest_response(self, mock_client_cls, mock_post):
        mock_client_cls.side_effect = Exception("SDK indisponível")
        mock_post.return_value.status_code = 200
        mock_post.return_value.json.return_value = {
            'candidates': [{'finishReason': 'MAX_TOKENS', 'content': {'parts': [{'text': 'Texto incompleto'}]}}]
        }

        with self.assertRaises(IncompleteGeminiResponseError):
            call_gemini_api("Instrução", "Dados clínicos")

    @override_settings(GEMINI_API_KEY="")
    def test_call_gemini_api_raises_when_no_key(self):
        with self.assertRaises(ValueError):
            call_gemini_api("Instrução", "Dados clínicos")

    @override_settings(GEMINI_API_KEY="your_gemini_api_key_here")
    def test_call_gemini_api_raises_when_placeholder_key(self):
        with self.assertRaises(ValueError):
            call_gemini_api("Instrução", "Dados clínicos")
