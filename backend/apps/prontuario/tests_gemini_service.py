from unittest.mock import patch, MagicMock
from django.test import TestCase, override_settings
from google.genai import errors

from apps.prontuario.services.gemini_service import (
    call_gemini_api,
    is_transient_error,
    get_available_models,
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
        mock_client.models.generate_content.return_value = mock_response

        resultado = call_gemini_api("Instrução", "Dados clínicos")
        self.assertEqual(resultado, "Conteúdo gerado pela IA")
        self.assertEqual(mock_client.models.generate_content.call_count, 1)

    @override_settings(GEMINI_API_KEY="test_key_abc123")
    @patch('apps.prontuario.services.gemini_service.time.sleep')
    @patch('apps.prontuario.services.gemini_service.genai.Client')
    def test_call_gemini_api_retries_transient_503_and_succeeds(self, mock_client_cls, mock_sleep):
        mock_client = MagicMock()
        mock_client_cls.return_value = mock_client

        err_503 = errors.ServerError(503, {'error': {'message': 'This model is currently experiencing high demand.'}}, None)
        mock_success = MagicMock()
        mock_success.text = "Recuperado após retry"

        # Falha na 1ª tentativa com 503 e tem sucesso na 2ª tentativa com o mesmo modelo
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

        # Modelo 1 esgota tentativas (3 tentativas com 503), modelo 2 sucede de primeira
        mock_client.models.generate_content.side_effect = [err_503, err_503, err_503, mock_success]

        resultado = call_gemini_api("Instrução", "Dados clínicos")
        self.assertEqual(resultado, "Sucesso no modelo secundário")
        self.assertEqual(mock_client.models.generate_content.call_count, 4)

    @override_settings(GEMINI_API_KEY="test_key_abc123", GEMINI_MODELS=['modelo-teste'])
    @patch('apps.prontuario.services.gemini_service.requests.post')
    @patch('apps.prontuario.services.gemini_service.genai.Client')
    def test_call_gemini_api_fallback_to_rest(self, mock_client_cls, mock_post):
        mock_client_cls.side_effect = Exception("SDK indisponível")

        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            'candidates': [{'content': {'parts': [{'text': 'Resposta REST'}]}}]
        }
        mock_post.return_value = mock_resp

        resultado = call_gemini_api("Instrução", "Dados clínicos")
        self.assertEqual(resultado, "Resposta REST")
        mock_post.assert_called_once()

    @override_settings(GEMINI_API_KEY="")
    def test_call_gemini_api_raises_when_no_key(self):
        with self.assertRaises(ValueError):
            call_gemini_api("Instrução", "Dados clínicos")
