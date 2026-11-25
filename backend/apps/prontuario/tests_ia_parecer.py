from unittest.mock import patch
import uuid
from datetime import date, timedelta
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone

from apps.usuarios.models import Usuario
from apps.pacientes.models import Paciente, Responsavel, Endereco, ConcessaoAcessoPaciente
from apps.agenda.models import Sessao
from apps.prontuario.models import Anamnese, AnotacaoSessao, ResumoIa, ParecerConclusivo
from apps.prontuario.services.gemini_service import IncompleteGeminiResponseError


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
        # Concessão explícita de acesso da Dra. Mariana ao paciente
        self.concessao = ConcessaoAcessoPaciente.objects.create(
            paciente=self.paciente,
            profissional=self.doutora,
            ativo=True
        )

        # Outra médica sem concessão de acesso
        self.outra_doutora = Usuario.objects.create_user(
            email="outra.doutora@clinica.com",
            password="password123",
            nome="Dra. Juliana Mendes",
            role="DOUTORA"
        )

        # Administrador
        self.admin_user = Usuario.objects.create_user(
            email="admin@teste.com",
            password="password123",
            nome="Admin Master",
            role="ADMINISTRACAO"
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

    def test_gerar_resumo_ia_nao_entrega_rascunho_interrompido(self):
        AnotacaoSessao.objects.create(sessao=self.sessao, textoLivre='Atendimento sem identificadores adicionais.')
        self.client.force_authenticate(user=self.doutora)
        url = reverse('prontuario-ia-gerar', kwargs={'paciente_id': self.paciente.id})
        payload = {
            'prompt_id': 1,
            'sessao_ids': [str(self.sessao.id)],
            'incluir_anamnese': False,
            'confirmacao_privacidade': True,
        }
        with patch(
            'apps.prontuario.services.gemini_service.call_gemini_api',
            side_effect=IncompleteGeminiResponseError('O Gemini atingiu o limite de resposta.'),
        ):
            response = self.client.post(url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertIn('limite de resposta', response.data['error'])
        self.assertNotIn('conteudo', response.data)
        self.assertEqual(ResumoIa.objects.filter(paciente=self.paciente).count(), 0)

    def test_gerar_resumo_ia_gemini_fluxo_completo_e_bloqueios(self):
        """2.2/2.3: POST /ia/gerar/ com Gemini, no-store, autorização, bloqueio, hash de revisão e erros."""
        url_contexto = reverse('prontuario-ia-contexto', kwargs={'paciente_id': self.paciente.id})
        url_gerar = reverse('prontuario-ia-gerar', kwargs={'paciente_id': self.paciente.id})

        sessao2 = Sessao.objects.create(
            paciente=self.paciente,
            usuario=self.doutora,
            dataHoraInicio=timezone.now() + timedelta(days=1),
            dataHoraFim=timezone.now() + timedelta(days=1, hours=1),
            status="REALIZADA",
            tipo="INTERVENTIVA",
        )
        AnotacaoSessao.objects.create(
            sessao=self.sessao,
            textoLivre="Guilherme chorou menos hoje com Renata presente.",
        )
        AnotacaoSessao.objects.create(
            sessao=sessao2,
            textoLivre="Sessão não selecionada com conteúdo reservado.",
        )

        # 1. Sem autenticação -> 401; perfil não médico -> 403; doutora sem concessão -> 404
        self.client.logout()
        base_payload = {
            'prompt_id': 1,
            'sessao_ids': [str(self.sessao.id)],
            'incluir_anamnese': False,
            'confirmacao_privacidade': True,
        }
        self.assertEqual(
            self.client.post(url_gerar, base_payload, format='json').status_code,
            status.HTTP_401_UNAUTHORIZED,
        )
        for user in (self.secretaria, self.admin_user):
            self.client.force_authenticate(user=user)
            self.assertEqual(
                self.client.post(url_gerar, base_payload, format='json').status_code,
                status.HTTP_403_FORBIDDEN,
            )
        self.client.force_authenticate(user=self.outra_doutora)
        self.assertEqual(
            self.client.post(url_gerar, base_payload, format='json').status_code,
            status.HTTP_404_NOT_FOUND,
        )

        # 2. Fluxo autorizado: revisar em /ia/contexto/ -> gerar em /ia/gerar/ com seleção parcial
        self.client.force_authenticate(user=self.doutora)
        res_ctx = self.client.post(
            url_contexto,
            {'prompt_id': 1, 'sessao_ids': [str(self.sessao.id)], 'incluir_anamnese': False},
            format='json',
        )
        self.assertEqual(res_ctx.status_code, status.HTTP_200_OK)
        ctx_hash = res_ctx.data['contexto_hash']

        with patch('apps.prontuario.services.gemini_service.call_gemini_api', return_value="Rascunho gerado pelo Gemini") as mock_gemini:
            res_gerar = self.client.post(
                url_gerar,
                {
                    'prompt_id': 1,
                    'sessao_ids': [str(self.sessao.id)],
                    'incluir_anamnese': False,
                    'confirmacao_privacidade': True,
                    'contexto_hash': ctx_hash,
                },
                format='json',
            )
            self.assertEqual(res_gerar.status_code, status.HTTP_200_OK)
            self.assertEqual(res_gerar.headers.get('Cache-Control'), 'no-store')
            self.assertEqual(res_gerar.data['conteudo'], "Rascunho gerado pelo Gemini")
            self.assertEqual(res_gerar.data['prompt_id'], 1)
            self.assertEqual(len(res_gerar.data['referencias_sessao']), 1)

            mock_gemini.assert_called_once()
            sent_user_content = mock_gemini.call_args.kwargs['user_content']
            self.assertIn("[Paciente]", sent_user_content)
            self.assertIn("[Responsável]", sent_user_content)
            self.assertNotIn("Guilherme", sent_user_content)
            self.assertNotIn("Renata", sent_user_content)
            self.assertNotIn("Sessão não selecionada", sent_user_content)
            self.assertNotIn("[Anamnese]", sent_user_content)

        # Nenhuma gravação automática em ResumoIa
        self.assertEqual(ResumoIa.objects.filter(paciente=self.paciente).count(), 0)

        # 3. Se o conteúdo mudar após a revisão, /ia/gerar/ retorna 409 sem chamar Gemini
        self.sessao.anotacao.textoLivre = "Guilherme apresentou mudança após revisão."
        self.sessao.anotacao.save()
        with patch('apps.prontuario.services.gemini_service.call_gemini_api') as mock_gemini_stale:
            res_stale = self.client.post(
                url_gerar,
                {
                    'prompt_id': 1,
                    'sessao_ids': [str(self.sessao.id)],
                    'incluir_anamnese': False,
                    'confirmacao_privacidade': True,
                    'contexto_hash': ctx_hash,
                },
                format='json',
            )
            self.assertEqual(res_stale.status_code, status.HTTP_409_CONFLICT)
            self.assertTrue(res_stale.data.get('revisao_desatualizada'))
            mock_gemini_stale.assert_not_called()

        # 4. Fonte com trecho retido (bloqueada) retorna 400 sem chamar Gemini MESMO com confirmação
        self.sessao.anotacao.textoLivre = "Matrícula: EXT-554433 do paciente."
        self.sessao.anotacao.save()
        with patch('apps.prontuario.services.gemini_service.call_gemini_api') as mock_gemini_blocked:
            res_blocked = self.client.post(
                url_gerar,
                {
                    'prompt_id': 1,
                    'sessao_ids': [str(self.sessao.id)],
                    'incluir_anamnese': False,
                    'confirmacao_privacidade': True,
                },
                format='json',
            )
            self.assertEqual(res_blocked.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertTrue(res_blocked.data.get('bloqueado'))
            mock_gemini_blocked.assert_not_called()

        # 5. Chave ausente -> 503 com mensagem clara ao enviar sessão anotada válida
        self.sessao.anotacao.textoLivre = "Texto sem retenção."
        self.sessao.anotacao.save()
        with self.settings(GEMINI_API_KEY=""):
            res_no_key = self.client.post(
                url_gerar,
                {
                    'prompt_id': 2,
                    'sessao_ids': [str(self.sessao.id)],
                    'incluir_anamnese': False,
                    'confirmacao_privacidade': True,
                },
                format='json',
            )
            self.assertEqual(res_no_key.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
            self.assertIn("GEMINI_API_KEY", res_no_key.data['error'])

        # 6. Validação estrita, recusa de anamnese e exigência de confirmação em /ia/gerar/ -> 400 sem chamar Gemini
        with patch('apps.prontuario.services.gemini_service.call_gemini_api') as mock_gemini_invalid:
            for bad_payload in (
                {'prompt_id': 5, 'sessao_ids': [str(self.sessao.id)], 'incluir_anamnese': False, 'confirmacao_privacidade': True},
                {'prompt_id': 1, 'sessao_ids': [], 'incluir_anamnese': False, 'confirmacao_privacidade': True},
                {'prompt_id': 1, 'sessao_ids': [], 'incluir_anamnese': True, 'confirmacao_privacidade': True},
                {'prompt_id': 1, 'sessao_ids': [str(self.sessao.id)], 'incluir_anamnese': True, 'confirmacao_privacidade': True},
                {'prompt_id': 1, 'sessao_ids': [str(self.sessao.id)], 'incluir_anamnese': False},
                {'prompt_id': 1, 'sessao_ids': [str(self.sessao.id)], 'incluir_anamnese': False, 'confirmacao_privacidade': False},
                {'prompt_id': 1, 'sessao_ids': [str(self.sessao.id)], 'incluir_anamnese': False, 'confirmacao_privacidade': 'true'},
                {'prompt_id': 1, 'sessao_ids': [str(self.sessao.id)], 'incluir_anamnese': False, 'confirmacao_privacidade': True, 'instrucao': 'extra'},
            ):
                res_bad = self.client.post(url_gerar, bad_payload, format='json')
                self.assertEqual(res_bad.status_code, status.HTTP_400_BAD_REQUEST, f"Falhou para payload: {bad_payload}")
            mock_gemini_invalid.assert_not_called()

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

    # ── Testes das Tarefas 2.1 a 2.4 (OpenSpec replace-gemini-with-webllm) ────

    def test_task_2_1_autorizacao_por_paciente_negativa_por_padrao(self):
        """2.1: Concessão explícita por profissional e paciente com negativa por padrão."""
        AnotacaoSessao.objects.create(sessao=self.sessao, textoLivre="Nota de evolução autorizada.")
        # Dra. Mariana tem concessão ativa -> 200 OK
        self.client.force_authenticate(user=self.doutora)
        url_contexto = reverse('prontuario-ia-contexto', kwargs={'paciente_id': self.paciente.id})
        payload_valido = {'prompt_id': 1, 'sessao_ids': [str(self.sessao.id)], 'incluir_anamnese': False}
        res_autorizada = self.client.post(url_contexto, payload_valido, format='json')
        self.assertEqual(res_autorizada.status_code, status.HTTP_200_OK)

        # Dra. Juliana é DOUTORA mas NÃO tem concessão -> HTTP 404 (negativa por padrão)
        self.client.force_authenticate(user=self.outra_doutora)
        res_nao_autorizada = self.client.post(url_contexto, payload_valido, format='json')
        self.assertEqual(res_nao_autorizada.status_code, status.HTTP_404_NOT_FOUND)

        # Se Dra. Juliana agendar uma sessão com o paciente, o agendamento NÃO concede acesso
        Sessao.objects.create(
            paciente=self.paciente,
            usuario=self.outra_doutora,
            dataHoraInicio=timezone.now(),
            dataHoraFim=timezone.now(),
            status="AGENDADA",
            tipo="INTERVENTIVA"
        )
        res_com_agendamento = self.client.post(url_contexto, payload_valido, format='json')
        self.assertEqual(res_com_agendamento.status_code, status.HTTP_404_NOT_FOUND)

    def test_task_2_2_contexto_ia_sanitizacao_e_validacao_estrita(self):
        """2.2: POST /api/prontuario/pacientes/<id>/ia/contexto/ sanitização, exclusão de anamnese e validação estrita."""
        self.client.force_authenticate(user=self.doutora)
        url = reverse('prontuario-ia-contexto', kwargs={'paciente_id': self.paciente.id})
        anotacao = AnotacaoSessao.objects.create(
            sessao=self.sessao,
            textoLivre="[Paciente] Guilherme não apresentou crises em 10/05/2026 com Renata. Nega agressividade."
        )

        # Testar os 4 códigos válidos apenas com sessão anotada (e cruzamento interno de PII)
        for prompt_id in (1, 2, 3, 4):
            resp = self.client.post(
                url,
                {'prompt_id': prompt_id, 'sessao_ids': [str(self.sessao.id)], 'incluir_anamnese': False},
                format='json',
            )
            self.assertEqual(resp.status_code, status.HTTP_200_OK)
            self.assertEqual(resp.data['prompt_id'], prompt_id)
            self.assertTrue(len(resp.data['instrucao']) > 0)
            self.assertTrue(len(resp.data['contexto']) > 0)
            self.assertTrue('referencias_sessao' in resp.data)
            self.assertEqual(len(resp.data['referencias_sessao']), 1)
            self.assertFalse(resp.data['fontes_incluidas']['incluir_anamnese'])

            # Verificar que nomes do paciente e responsável foram mascarados e anamnese não vaza
            self.assertNotIn("Guilherme", resp.data['contexto'])
            self.assertNotIn("Renata", resp.data['contexto'])
            self.assertNotIn("[Anamnese]", resp.data['contexto'])
            self.assertNotIn("etiquetas", resp.data['contexto'])
            self.assertIn("[Paciente]", resp.data['contexto'])
            self.assertIn("[Responsável]", resp.data['contexto'])
            self.assertIn("não apresentou crises em 10/05/2026", resp.data['contexto'])
            self.assertIn("Nega agressividade", resp.data['contexto'])
            data_sessao = timezone.localdate(self.sessao.dataHoraInicio).strftime('%d/%m/%Y')
            data_registro = timezone.localtime(anotacao.dataRegistro).strftime('%d/%m/%Y %H:%M')
            self.assertIn(f"[Nota 1 | sessão de {data_sessao} | registro em {data_registro}", resp.data['contexto'])
            self.assertEqual(resp.data['referencias_sessao'][0]['data'], data_sessao)

        # Validação estrita e recusa de anamnese: HTTP 400 sem contexto nem instrução
        casos_invalidos = [
            {},                                                                           # ausente
            {'prompt_id': 1},                                                             # sem selecao
            {'prompt_id': 0, 'sessao_ids': [str(self.sessao.id)], 'incluir_anamnese': False},  # fora de 1..4
            {'prompt_id': 5, 'sessao_ids': [str(self.sessao.id)], 'incluir_anamnese': False},  # fora de 1..4
            {'prompt_id': "1", 'sessao_ids': [str(self.sessao.id)], 'incluir_anamnese': False},
            {'prompt_id': 1.5, 'sessao_ids': [str(self.sessao.id)], 'incluir_anamnese': False},
            {'prompt_id': True, 'sessao_ids': [str(self.sessao.id)], 'incluir_anamnese': False},
            {'prompt_id': 1, 'sessao_ids': [str(self.sessao.id)], 'incluir_anamnese': "false"},
            {'prompt_id': 1, 'sessao_ids': [], 'incluir_anamnese': True},                 # anamnese isolada proibida
            {'prompt_id': 1, 'sessao_ids': [str(self.sessao.id)], 'incluir_anamnese': True}, # anamnese + sessão proibida
            {'prompt_id': 1, 'sessao_ids': "abc", 'incluir_anamnese': False},
            {'prompt_id': 1, 'sessao_ids': [123], 'incluir_anamnese': False},
            {'prompt_id': 1, 'sessao_ids': ["nao-uuid"], 'incluir_anamnese': False},
            {'prompt_id': 1, 'sessao_ids': [], 'incluir_anamnese': False},                # seleção vazia
            {'prompt_id': 1, 'sessao_ids': [str(self.sessao.id), str(self.sessao.id)], 'incluir_anamnese': False},
            {'prompt_id': 1, 'sessao_ids': [str(self.sessao.id).upper(), str(self.sessao.id).lower()], 'incluir_anamnese': False},
            {'prompt_id': 1, 'sessao_ids': [str(self.sessao.id)], 'incluir_anamnese': False, 'instrucao': 'livre'},
            {'prompt_id': 1, 'sessao_ids': [str(self.sessao.id)], 'incluir_anamnese': False, 'outro_campo': 'abc'},
        ]
        for payload in casos_invalidos:
            res_bad = self.client.post(url, payload, format='json')
            self.assertEqual(res_bad.status_code, status.HTTP_400_BAD_REQUEST, f"Falhou para payload: {payload}")
            self.assertNotIn('contexto', res_bad.data)
            self.assertNotIn('instrucao', res_bad.data)

    def test_task_2_3_autorizacao_completa_e_revogacao(self):
        """2.3: 401 unauth, 403 secretaria/admin, 404 sem acesso/alheio e revogação."""
        AnotacaoSessao.objects.create(sessao=self.sessao, textoLivre="Nota para autorização completa.")
        url_fontes = reverse('prontuario-ia-fontes', kwargs={'paciente_id': self.paciente.id})
        url_contexto = reverse('prontuario-ia-contexto', kwargs={'paciente_id': self.paciente.id})
        url_resumos = reverse('prontuario-ia-resumos', kwargs={'paciente_id': self.paciente.id})
        url_pareceres = reverse('prontuario-pareceres-paciente', kwargs={'paciente_id': self.paciente.id})
        payload_valido = {'prompt_id': 1, 'sessao_ids': [str(self.sessao.id)], 'incluir_anamnese': False}

        resumo = ResumoIa.objects.create(
            paciente=self.paciente,
            titulo="Resumo Existente",
            promptTipo=1,
            conteudoGerado="Conteúdo prévio"
        )
        parecer = ParecerConclusivo.objects.create(
            paciente=self.paciente,
            titulo="Parecer Existente",
            corpoTexto="Parecer prévio"
        )
        url_resumo_detalhe = reverse('prontuario-ia-resumo-detalhe', kwargs={'pk': resumo.id})
        url_parecer_detalhe = reverse('prontuario-parecer-detalhe', kwargs={'pk': parecer.id})

        # 1. Sem autenticação -> HTTP 401
        self.client.logout()
        for u in [url_fontes, url_contexto, url_resumos, url_resumo_detalhe, url_pareceres, url_parecer_detalhe]:
            self.assertEqual(self.client.get(u).status_code, status.HTTP_401_UNAUTHORIZED)

        # 2. Perfil SECRETARIA e ADMINISTRACAO -> HTTP 403
        for user in [self.secretaria, self.admin_user]:
            self.client.force_authenticate(user=user)
            self.assertEqual(self.client.get(url_fontes).status_code, status.HTTP_403_FORBIDDEN)
            self.assertEqual(self.client.post(url_contexto, payload_valido, format='json').status_code, status.HTTP_403_FORBIDDEN)
            self.assertEqual(self.client.get(url_resumos).status_code, status.HTTP_403_FORBIDDEN)
            self.assertEqual(self.client.get(url_resumo_detalhe).status_code, status.HTTP_403_FORBIDDEN)
            self.assertEqual(self.client.get(url_pareceres).status_code, status.HTTP_403_FORBIDDEN)
            self.assertEqual(self.client.get(url_parecer_detalhe).status_code, status.HTTP_403_FORBIDDEN)

        # 3. Profissional sem acesso -> HTTP 404 (inclusive com UUID de detalhe alheio)
        self.client.force_authenticate(user=self.outra_doutora)
        self.assertEqual(self.client.get(url_fontes).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.post(url_contexto, payload_valido, format='json').status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get(url_resumos).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get(url_resumo_detalhe).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get(url_pareceres).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get(url_parecer_detalhe).status_code, status.HTTP_404_NOT_FOUND)

        # 4. Revogação da concessão após preparar contexto -> recusa em salvar resumo ou parecer
        self.client.force_authenticate(user=self.doutora)
        res_prep = self.client.post(url_contexto, payload_valido, format='json')
        self.assertEqual(res_prep.status_code, status.HTTP_200_OK)

        # Revogar concessão
        self.concessao.ativo = False
        self.concessao.save()

        # Tentativa de listar fontes ou salvar resumo deve ser recusada com HTTP 404
        self.assertEqual(self.client.get(url_fontes).status_code, status.HTTP_404_NOT_FOUND)
        res_salvar_resumo = self.client.post(url_resumos, {
            'titulo': 'Tentativa sem acesso',
            'promptTipo': 1,
            'conteudoGerado': 'Texto'
        }, format='json')
        self.assertEqual(res_salvar_resumo.status_code, status.HTTP_404_NOT_FOUND)

        # Tentativa de salvar parecer deve ser recusada com HTTP 404
        res_salvar_parecer = self.client.post(url_pareceres, {
            'titulo': 'Tentativa sem acesso',
            'corpoTexto': 'Texto'
        }, format='json')
        self.assertEqual(res_salvar_parecer.status_code, status.HTTP_404_NOT_FOUND)

    def test_task_2_4_cache_control_no_store_e_resumos_legados(self):
        """2.4: Cache-Control: no-store e compatibilidade com registros antigos e novos de ResumoIa."""
        self.client.force_authenticate(user=self.doutora)

        # 0. Verificar Cache-Control: no-store em listagem de fontes
        url_fontes = reverse('prontuario-ia-fontes', kwargs={'paciente_id': self.paciente.id})
        res_fontes = self.client.get(url_fontes)
        self.assertEqual(res_fontes.status_code, status.HTTP_200_OK)
        self.assertEqual(res_fontes.headers.get('Cache-Control'), 'no-store')

        # 1. Verificar Cache-Control: no-store em preparação de contexto
        AnotacaoSessao.objects.create(sessao=self.sessao, textoLivre="Nota clínica para teste de cache.")
        url_contexto = reverse('prontuario-ia-contexto', kwargs={'paciente_id': self.paciente.id})
        res_ctx = self.client.post(
            url_contexto,
            {'prompt_id': 1, 'sessao_ids': [str(self.sessao.id)], 'incluir_anamnese': False},
            format='json',
        )
        self.assertEqual(res_ctx.status_code, status.HTTP_200_OK)
        self.assertEqual(res_ctx.headers.get('Cache-Control'), 'no-store')

        # 2. Criar e listar resumos com Cache-Control: no-store
        url_resumos = reverse('prontuario-ia-resumos', kwargs={'paciente_id': self.paciente.id})
        res_save = self.client.post(url_resumos, {
            'titulo': 'Resumo Teste 2.4',
            'promptTipo': 2,
            'conteudoGerado': 'Conteúdo completo do resumo de teste.'
        }, format='json')
        self.assertEqual(res_save.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_save.headers.get('Cache-Control'), 'no-store')
        resumo_id = res_save.data['id']

        res_list = self.client.get(url_resumos)
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        self.assertEqual(res_list.headers.get('Cache-Control'), 'no-store')

        # 3. Detalhe de resumo com Cache-Control: no-store
        url_detalhe = reverse('prontuario-ia-resumo-detalhe', kwargs={'pk': resumo_id})
        res_det = self.client.get(url_detalhe)
        self.assertEqual(res_det.status_code, status.HTTP_200_OK)
        self.assertEqual(res_det.headers.get('Cache-Control'), 'no-store')
        self.assertEqual(res_det.data['titulo'], 'Resumo Teste 2.4')
        self.assertEqual(res_det.data['conteudoGerado'], 'Conteúdo completo do resumo de teste.')
        self.assertEqual(res_det.data['promptTipo'], 2)
        self.assertTrue('dataGeracao' in res_det.data)

        # 4. Pareceres com Cache-Control: no-store
        url_pareceres = reverse('prontuario-pareceres-paciente', kwargs={'paciente_id': self.paciente.id})
        res_par_create = self.client.post(url_pareceres, {
            'titulo': 'Parecer 2.4',
            'corpoTexto': 'Corpo do parecer clínico.'
        }, format='json')
        self.assertEqual(res_par_create.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_par_create.headers.get('Cache-Control'), 'no-store')

        par_id = res_par_create.data['id']
        url_par_det = reverse('prontuario-parecer-detalhe', kwargs={'pk': par_id})
        res_par_get = self.client.get(url_par_det)
        self.assertEqual(res_par_get.status_code, status.HTTP_200_OK)
        self.assertEqual(res_par_get.headers.get('Cache-Control'), 'no-store')

    # ── Testes OpenSpec select-and-review-clinical-summary-sources (1.1, 1.2) ──

    def test_fontes_ia_listagem_minima_e_disponibilidade(self):
        """1.1: Listagem mínima de fontes com disponibilidade de anamnese e sessões sem vazar textos."""
        self.client.force_authenticate(user=self.doutora)
        url_fontes = reverse('prontuario-ia-fontes', kwargs={'paciente_id': self.paciente.id})

        sessao_sem_nota = Sessao.objects.create(
            paciente=self.paciente,
            usuario=self.doutora,
            dataHoraInicio=timezone.now() + timedelta(days=1),
            dataHoraFim=timezone.now() + timedelta(days=1, hours=1),
            status="REALIZADA",
            tipo="INTERVENTIVA",
        )
        sessao_nota_vazia = Sessao.objects.create(
            paciente=self.paciente,
            usuario=self.doutora,
            dataHoraInicio=timezone.now() + timedelta(days=2),
            dataHoraFim=timezone.now() + timedelta(days=2, hours=1),
            status="REALIZADA",
            tipo="INTERVENTIVA",
        )
        AnotacaoSessao.objects.create(sessao=self.sessao, textoLivre="Nota clínica confidencial")
        AnotacaoSessao.objects.create(sessao=sessao_nota_vazia, textoLivre="   \n  ")

        res = self.client.get(url_fontes)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.headers.get('Cache-Control'), 'no-store')
        self.assertTrue(res.data['anamnese']['disponivel'])
        self.assertEqual(len(res.data['sessoes']), 3)

        by_id = {item['id']: item for item in res.data['sessoes']}
        self.assertTrue(by_id[str(self.sessao.id)]['tem_anotacao'])
        self.assertFalse(by_id[str(sessao_sem_nota.id)]['tem_anotacao'])
        self.assertFalse(by_id[str(sessao_nota_vazia.id)]['tem_anotacao'])

        # Nenhum texto clínico deve vazar na listagem de fontes
        serialized = str(res.data)
        self.assertNotIn("Nota clínica confidencial", serialized)
        self.assertNotIn("Guilherme fica muito irritado", serialized)

        # Anamnese vazia -> disponivel False
        self.anamnese.sensibilidadeEtiquetas = "   "
        self.anamnese.seletividadeAlimentar = ""
        self.anamnese.save()
        res_vazia = self.client.get(url_fontes)
        self.assertEqual(res_vazia.status_code, status.HTTP_200_OK)
        self.assertFalse(res_vazia.data['anamnese']['disponivel'])

    def test_contexto_ia_selecao_parcial_anamnese_isolada_e_rejeicoes(self):
        """1.2: Seleção parcial, anamnese isolada, sessão sem conteúdo e UUID alheio/inexistente."""
        self.client.force_authenticate(user=self.doutora)
        url = reverse('prontuario-ia-contexto', kwargs={'paciente_id': self.paciente.id})

        sessao2 = Sessao.objects.create(
            paciente=self.paciente,
            usuario=self.doutora,
            dataHoraInicio=timezone.now() + timedelta(days=1),
            dataHoraFim=timezone.now() + timedelta(days=1, hours=1),
            status="REALIZADA",
            tipo="INTERVENTIVA",
        )
        sessao3_sem_nota = Sessao.objects.create(
            paciente=self.paciente,
            usuario=self.doutora,
            dataHoraInicio=timezone.now() + timedelta(days=2),
            dataHoraFim=timezone.now() + timedelta(days=2, hours=1),
            status="REALIZADA",
            tipo="INTERVENTIVA",
        )
        sessao4 = Sessao.objects.create(
            paciente=self.paciente,
            usuario=self.doutora,
            dataHoraInicio=timezone.now() + timedelta(days=3),
            dataHoraFim=timezone.now() + timedelta(days=3, hours=1),
            status="REALIZADA",
            tipo="INTERVENTIVA",
        )
        AnotacaoSessao.objects.create(sessao=self.sessao, textoLivre="Nota um sobre evolução inicial.")
        AnotacaoSessao.objects.create(sessao=sessao2, textoLivre="Nota dois com observação específica.")
        AnotacaoSessao.objects.create(sessao=sessao4, textoLivre="Nota quatro não selecionada.")

        # 1. Seleção parcial (2 sessões marcadas, 1 desmarcada, anamnese desmarcada)
        res_parcial = self.client.post(
            url,
            {'prompt_id': 1, 'sessao_ids': [str(self.sessao.id), str(sessao2.id)], 'incluir_anamnese': False},
            format='json',
        )
        self.assertEqual(res_parcial.status_code, status.HTTP_200_OK)
        self.assertIn("Nota um sobre evolução inicial", res_parcial.data['contexto'])
        self.assertIn("Nota dois com observação específica", res_parcial.data['contexto'])
        self.assertNotIn("Nota quatro não selecionada", res_parcial.data['contexto'])
        self.assertNotIn("[Anamnese]", res_parcial.data['contexto'])
        self.assertEqual(len(res_parcial.data['referencias_sessao']), 2)
        self.assertEqual([r['id'] for r in res_parcial.data['referencias_sessao']], [str(self.sessao.id), str(sessao2.id)])

        # 2. Tentativa de incluir anamnese isolada -> rejeitada (400)
        res_anam = self.client.post(
            url,
            {'prompt_id': 2, 'sessao_ids': [], 'incluir_anamnese': True},
            format='json',
        )
        self.assertEqual(res_anam.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn('contexto', res_anam.data)

        # 3. Sessão sem anotação -> 400 sem contexto nem instrução
        res_sem_nota = self.client.post(
            url,
            {'prompt_id': 1, 'sessao_ids': [str(sessao3_sem_nota.id)], 'incluir_anamnese': False},
            format='json',
        )
        self.assertEqual(res_sem_nota.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn('contexto', res_sem_nota.data)
        self.assertNotIn('instrucao', res_sem_nota.data)

        # 4. Tentativa de incluir anamnese mesmo junto com sessão anotada -> 400
        res_anam_combo = self.client.post(
            url,
            {'prompt_id': 1, 'sessao_ids': [str(self.sessao.id)], 'incluir_anamnese': True},
            format='json',
        )
        self.assertEqual(res_anam_combo.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn('contexto', res_anam_combo.data)
        self.assertNotIn('instrucao', res_anam_combo.data)

    def test_exclusao_anamnese_marcadores_exclusivos_e_referencia_interna(self):
        """prevent-anamnesis-gemini-disclosure (2.2): Anamnese só apoia sanitização interna e nunca vai ao Gemini."""
        self.client.force_authenticate(user=self.doutora)
        url_contexto = reverse('prontuario-ia-contexto', kwargs={'paciente_id': self.paciente.id})
        url_gerar = reverse('prontuario-ia-gerar', kwargs={'paciente_id': self.paciente.id})

        self.anamnese.sensibilidadeEtiquetas = "MarcadorExclusivoAnamnese999: Guilherme recusa roupas na Escola HorizonteAzul."
        self.anamnese.seletividadeAlimentar = "MarcadorAlimentarSecreto888: Renata relata apenas arroz."
        self.anamnese.observacoesGerais = "Contato secundário TiaHelenaAnamnese777."
        self.anamnese.save()

        AnotacaoSessao.objects.create(
            sessao=self.sessao,
            textoLivre="Hoje Guilherme respondeu bem às atividades após diálogo com Renata.",
        )

        # 1. Contexto contém sessão mascarada, mas NUNCA os marcadores exclusivos da anamnese
        res_ctx = self.client.post(
            url_contexto,
            {'prompt_id': 2, 'sessao_ids': [str(self.sessao.id)], 'incluir_anamnese': False},
            format='json',
        )
        self.assertEqual(res_ctx.status_code, status.HTTP_200_OK)
        self.assertIn("[Paciente]", res_ctx.data['contexto'])
        self.assertIn("[Responsável]", res_ctx.data['contexto'])
        for secret in (
            "MarcadorExclusivoAnamnese999",
            "MarcadorAlimentarSecreto888",
            "TiaHelenaAnamnese777",
            "Escola HorizonteAzul",
            "[Anamnese]",
        ):
            self.assertNotIn(secret, res_ctx.data['contexto'])
            self.assertNotIn(secret, res_ctx.data['instrucao'])

        # 2. Inspecionar argumentos reais de call_gemini_api em /ia/gerar/
        with patch('apps.prontuario.services.gemini_service.call_gemini_api', return_value="Rascunho limpo") as mock_gemini:
            res_gerar = self.client.post(
                url_gerar,
                {
                    'prompt_id': 2,
                    'sessao_ids': [str(self.sessao.id)],
                    'incluir_anamnese': False,
                    'confirmacao_privacidade': True,
                    'contexto_hash': res_ctx.data['contexto_hash'],
                },
                format='json',
            )
            self.assertEqual(res_gerar.status_code, status.HTTP_200_OK)
            mock_gemini.assert_called_once()
            sent_instruction = mock_gemini.call_args.kwargs['system_instruction']
            sent_user_content = mock_gemini.call_args.kwargs['user_content']
            self.assertIn("[Paciente]", sent_user_content)
            self.assertIn("[Responsável]", sent_user_content)
            self.assertNotIn("Guilherme", sent_user_content)
            self.assertNotIn("Renata", sent_user_content)
            for secret in (
                "MarcadorExclusivoAnamnese999",
                "MarcadorAlimentarSecreto888",
                "TiaHelenaAnamnese777",
                "Escola HorizonteAzul",
                "[Anamnese]",
            ):
                self.assertNotIn(secret, sent_instruction)
                self.assertNotIn(secret, sent_user_content)

        # 3. Chamadas com incluir_anamnese=True nunca chegam a call_gemini_api
        with patch('apps.prontuario.services.gemini_service.call_gemini_api') as mock_never:
            r1 = self.client.post(
                url_gerar,
                {
                    'prompt_id': 1,
                    'sessao_ids': [],
                    'incluir_anamnese': True,
                    'confirmacao_privacidade': True,
                },
                format='json',
            )
            r2 = self.client.post(
                url_gerar,
                {
                    'prompt_id': 1,
                    'sessao_ids': [str(self.sessao.id)],
                    'incluir_anamnese': True,
                    'confirmacao_privacidade': True,
                },
                format='json',
            )
            self.assertEqual(r1.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(r2.status_code, status.HTTP_400_BAD_REQUEST)
            mock_never.assert_not_called()

        # 5. UUID inexistente e UUID de outro paciente -> 404 genérico idêntico, sem contexto/instrução
        outro_paciente = Paciente.objects.create(
            nomeCompleto="Outro Paciente",
            dataNascimento=date(2019, 1, 1),
            sexo="F",
        )
        sessao_outro = Sessao.objects.create(
            paciente=outro_paciente,
            usuario=self.doutora,
            dataHoraInicio=timezone.now(),
            dataHoraFim=timezone.now() + timedelta(hours=1),
            status="REALIZADA",
            tipo="AVALIATIVA",
        )
        AnotacaoSessao.objects.create(sessao=sessao_outro, textoLivre="Nota privada de outro paciente.")

        res_inexistente = self.client.post(
            url_contexto,
            {'prompt_id': 1, 'sessao_ids': [str(self.sessao.id), str(uuid.uuid4())], 'incluir_anamnese': False},
            format='json',
        )
        res_alheio = self.client.post(
            url_contexto,
            {'prompt_id': 1, 'sessao_ids': [str(self.sessao.id), str(sessao_outro.id)], 'incluir_anamnese': False},
            format='json',
        )
        self.assertEqual(res_inexistente.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(res_alheio.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(res_inexistente.data, res_alheio.data)
        self.assertNotIn('contexto', res_alheio.data)
        self.assertNotIn('instrucao', res_alheio.data)
