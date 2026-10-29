from unittest.mock import patch
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date
from django.utils import timezone

from apps.usuarios.models import Usuario
from apps.pacientes.models import Paciente, Responsavel
from apps.agenda.models import Sessao
from apps.prontuario.models import Anamnese, AnotacaoSessao, ResumoIa, ParecerConclusivo


class IaAndParecerIntegrationTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Usuários
        self.doutora = Usuario.objects.create_user(
            email="doutora@clinica.com",
            password="password123",
            nome="Dra. Mariana Rocha",
            role="DOUTORA"
        )
        self.secretaria = Usuario.objects.create_user(
            email="secretaria@clinica.com",
            password="password123",
            nome="Ana Paula Secretária",
            role="SECRETARIA"
        )

        # Paciente e Responsável
        self.paciente = Paciente.objects.create(
            nomeCompleto="Guilherme Alencar de Souza",
            dataNascimento=date(2017, 3, 15),
            sexo="M"
        )
        self.responsavel = Responsavel.objects.create(
            paciente=self.paciente,
            nomeCompleto="Renata Alencar",
            cpf="111.222.333-44",
            contato="11 98888-7777",
            parentesco="Mãe"
        )

        # Anamnese e Anotações
        self.anamnese = Anamnese.objects.create(
            paciente=self.paciente,
            sensibilidadeEtiquetas="Guilherme fica muito irritado com etiquetas.",
            seletividadeAlimentar="Renata informa que a criança só aceita arroz branco."
        )
        self.sessao = Sessao.objects.create(
            paciente=self.paciente,
            usuario=self.doutora,
            dataHoraInicio=timezone.now(),
            dataHoraFim=timezone.now(),
            status="REALIZADA",
            tipo="AVALIATIVA"
        )
        self.anotacao = AnotacaoSessao.objects.create(
            sessao=self.sessao,
            textoLivre="Guilherme demonstrou evolução na fala, mas Renata relatou crises em casa."
        )

    # ── Testes de Prompts e IA ──────────────────────────────────────────────

    def test_prompt_catalog_doctor_access(self):
        self.client.force_authenticate(user=self.doutora)
        url = reverse('prontuario-ia-prompts')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 4)

    def test_prompt_catalog_secretaria_forbidden(self):
        self.client.force_authenticate(user=self.secretaria)
        url = reverse('prontuario-ia-prompts')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch('apps.prontuario.services.gemini_service.call_gemini_api')
    def test_gerar_resumo_sanitizes_pii(self, mock_gemini):
        mock_gemini.return_value = "Resumo clínico gerado com sucesso sem dados sensíveis."

        self.client.force_authenticate(user=self.doutora)
        url = reverse('prontuario-ia-gerar', kwargs={'paciente_id': self.paciente.id})
        response = self.client.post(url, {'prompt_id': 1}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['prompt_id'], 1)
        self.assertIn("Resumo clínico", response.data['conteudo'])

        # Valida que o payload enviado à IA não contém o nome do paciente nem da mãe
        call_args = mock_gemini.call_args
        sent_content = call_args.kwargs.get('user_content', '') or call_args[1].get('user_content', '')
        if not sent_content and len(call_args[0]) > 1:
            sent_content = call_args[0][1]

        self.assertNotIn("Guilherme", sent_content)
        self.assertNotIn("Renata", sent_content)
        self.assertIn("[Paciente]", sent_content)
        self.assertIn("[Responsável]", sent_content)

    def test_gerar_resumo_secretaria_forbidden(self):
        self.client.force_authenticate(user=self.secretaria)
        url = reverse('prontuario-ia-gerar', kwargs={'paciente_id': self.paciente.id})
        response = self.client.post(url, {'prompt_id': 1}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_resumo_ia_save_multiple_with_title(self):
        self.client.force_authenticate(user=self.doutora)
        url = reverse('prontuario-ia-resumos', kwargs={'paciente_id': self.paciente.id})

        # Salva primeiro resumo
        r1 = self.client.post(url, {
            'titulo': 'Resumo Semestral 1',
            'promptTipo': 1,
            'conteudoGerado': 'Primeira análise evolutiva.'
        }, format='json')
        self.assertEqual(r1.status_code, status.HTTP_201_CREATED)

        # Salva segundo resumo
        r2 = self.client.post(url, {
            'titulo': 'Mapeamento de Gatilhos',
            'promptTipo': 2,
            'conteudoGerado': 'Identificação de gatilhos alimentares.'
        }, format='json')
        self.assertEqual(r2.status_code, status.HTTP_201_CREATED)

        # Lista resumos salvos
        list_res = self.client.get(url)
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_res.data), 2)
        titles = [r['titulo'] for r in list_res.data]
        self.assertIn('Resumo Semestral 1', titles)
        self.assertIn('Mapeamento de Gatilhos', titles)

    # ── Testes de Parecer Conclusivo, PDF e E-mail ──────────────────────────

    def test_parecer_conclusivo_crud(self):
        self.client.force_authenticate(user=self.doutora)
        url = reverse('prontuario-pareceres-paciente', kwargs={'paciente_id': self.paciente.id})

        # Criação
        res_create = self.client.post(url, {
            'titulo': 'Parecer Conclusivo Final',
            'corpoTexto': 'O paciente concluiu o ciclo avaliativo com melhora substancial.'
        }, format='json')
        self.assertEqual(res_create.status_code, status.HTTP_201_CREATED)
        parecer_id = res_create.data['id']

        # Detalhe
        detail_url = reverse('prontuario-parecer-detalhe', kwargs={'pk': parecer_id})
        res_get = self.client.get(detail_url)
        self.assertEqual(res_get.status_code, status.HTTP_200_OK)
        self.assertIn('melhora substancial', res_get.data['corpoTexto'])

        # Edição
        res_update = self.client.patch(detail_url, {
            'corpoTexto': 'Texto atualizado do laudo final.'
        }, format='json')
        self.assertEqual(res_update.status_code, status.HTTP_200_OK)
        self.assertEqual(res_update.data['corpoTexto'], 'Texto atualizado do laudo final.')

    def test_parecer_pdf_generation(self):
        self.client.force_authenticate(user=self.doutora)
        parecer = ParecerConclusivo.objects.create(
            paciente=self.paciente,
            titulo="Laudo Oficial",
            corpoTexto="Relatório completo de acompanhamento para fins escolares."
        )

        pdf_url = reverse('prontuario-parecer-pdf', kwargs={'pk': parecer.id})
        response = self.client.get(pdf_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.headers['Content-Type'], 'application/pdf')
        self.assertTrue(len(response.content) > 100)

    def test_parecer_email_sending(self):
        self.client.force_authenticate(user=self.doutora)
        parecer = ParecerConclusivo.objects.create(
            paciente=self.paciente,
            titulo="Laudo Oficial",
            corpoTexto="Relatório para envio por e-mail."
        )

        email_url = reverse('prontuario-parecer-email', kwargs={'pk': parecer.id})
        response = self.client.post(email_url, {
            'recipient_email': 'mae@exemplo.com',
            'subject': 'Seu laudo clínico',
            'message': 'Mensagem personalizada'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('sucesso', response.data['message'])

    def test_parecer_secretaria_forbidden(self):
        self.client.force_authenticate(user=self.secretaria)
        parecer = ParecerConclusivo.objects.create(
            paciente=self.paciente,
            titulo="Laudo Oficial",
            corpoTexto="Texto sensível."
        )

        # Tentar listar
        url_list = reverse('prontuario-pareceres-paciente', kwargs={'paciente_id': self.paciente.id})
        self.assertEqual(self.client.get(url_list).status_code, status.HTTP_403_FORBIDDEN)

        # Tentar PDF
        url_pdf = reverse('prontuario-parecer-pdf', kwargs={'pk': parecer.id})
        self.assertEqual(self.client.get(url_pdf).status_code, status.HTTP_403_FORBIDDEN)

        # Tentar Email
        url_email = reverse('prontuario-parecer-email', kwargs={'pk': parecer.id})
        self.assertEqual(self.client.post(url_email, {'recipient_email': 'teste@exemplo.com'}).status_code, status.HTTP_403_FORBIDDEN)
