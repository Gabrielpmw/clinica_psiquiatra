from unittest.mock import patch
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date
from django.utils import timezone

from apps.usuarios.models import Usuario
from apps.pacientes.models import Paciente, Responsavel, ConcessaoAcessoPaciente
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

    def test_rota_antiga_ia_gerar_removida_404(self):
        """Task 5.2: Verifica que a rota antiga ia/gerar/ já não responde (HTTP 404)."""
        self.client.force_authenticate(user=self.doutora)
        url_legada = f"/api/prontuario/pacientes/{self.paciente.id}/ia/gerar/"
        response = self.client.post(url_legada, {'prompt_id': 1}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

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
        # Dra. Mariana tem concessão ativa -> 200 OK
        self.client.force_authenticate(user=self.doutora)
        url_contexto = reverse('prontuario-ia-contexto', kwargs={'paciente_id': self.paciente.id})
        res_autorizada = self.client.post(url_contexto, {'prompt_id': 1}, format='json')
        self.assertEqual(res_autorizada.status_code, status.HTTP_200_OK)

        # Dra. Juliana é DOUTORA mas NÃO tem concessão -> HTTP 404 (negativa por padrão)
        self.client.force_authenticate(user=self.outra_doutora)
        res_nao_autorizada = self.client.post(url_contexto, {'prompt_id': 1}, format='json')
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
        res_com_agendamento = self.client.post(url_contexto, {'prompt_id': 1}, format='json')
        self.assertEqual(res_com_agendamento.status_code, status.HTTP_404_NOT_FOUND)

    def test_task_2_2_contexto_ia_sanitizacao_e_validacao_estrita(self):
        """2.2: POST /api/prontuario/pacientes/<id>/ia/contexto/ sanitização e validação estrita."""
        self.client.force_authenticate(user=self.doutora)
        url = reverse('prontuario-ia-contexto', kwargs={'paciente_id': self.paciente.id})

        # Testar os 4 códigos válidos
        for prompt_id in (1, 2, 3, 4):
            resp = self.client.post(url, {'prompt_id': prompt_id}, format='json')
            self.assertEqual(resp.status_code, status.HTTP_200_OK)
            self.assertEqual(resp.data['prompt_id'], prompt_id)
            self.assertTrue(len(resp.data['instrucao']) > 0)
            self.assertTrue(len(resp.data['contexto']) > 0)
            self.assertTrue('referencias_sessao' in resp.data)

            # Verificar que nomes do paciente e responsável foram mascarados
            self.assertNotIn("Guilherme", resp.data['contexto'])
            self.assertNotIn("Renata", resp.data['contexto'])
            self.assertIn("[Paciente]", resp.data['contexto'])
            self.assertIn("[Responsável]", resp.data['contexto'])

        # Adicionar nota já sanitizada com negações, datas e ordem
        anotacao = AnotacaoSessao.objects.create(
            sessao=self.sessao,
            textoLivre="[Paciente] não apresentou crises em 10/05/2026. Nega agressividade."
        )
        resp_sanit = self.client.post(url, {'prompt_id': 1}, format='json')
        self.assertEqual(resp_sanit.status_code, status.HTTP_200_OK)
        self.assertIn("não apresentou crises em 10/05/2026", resp_sanit.data['contexto'])
        self.assertIn("Nega agressividade", resp_sanit.data['contexto'])
        data_sessao = timezone.localdate(self.sessao.dataHoraInicio).strftime('%d/%m/%Y')
        data_registro = timezone.localtime(anotacao.dataRegistro).strftime('%d/%m/%Y %H:%M')
        self.assertIn(f"[Nota 1 | sessão de {data_sessao} | registro em {data_registro}", resp_sanit.data['contexto'])
        self.assertEqual(resp_sanit.data['referencias_sessao'][0]['data'], data_sessao)

        # Validação estrita: HTTP 400 sem contexto nem instrução
        casos_invalidos = [
            {},                                      # ausente
            {'prompt_id': 0},                        # fora de 1..4
            {'prompt_id': 5},                        # fora de 1..4
            {'prompt_id': "1"},                      # texto numérico
            {'prompt_id': 1.5},                      # decimal
            {'prompt_id': True},                     # booleano
            {'prompt_id': 1, 'instrucao': 'livre'},  # instrução livre / campo extra
            {'prompt_id': 1, 'outro_campo': 'abc'},  # campo extra
        ]
        for payload in casos_invalidos:
            res_bad = self.client.post(url, payload, format='json')
            self.assertEqual(res_bad.status_code, status.HTTP_400_BAD_REQUEST, f"Falhou para payload: {payload}")
            self.assertNotIn('contexto', res_bad.data)
            self.assertNotIn('instrucao', res_bad.data)

    def test_task_2_3_autorizacao_completa_e_revogacao(self):
        """2.3: 401 unauth, 403 secretaria/admin, 404 sem acesso/alheio e revogação."""
        url_contexto = reverse('prontuario-ia-contexto', kwargs={'paciente_id': self.paciente.id})
        url_resumos = reverse('prontuario-ia-resumos', kwargs={'paciente_id': self.paciente.id})
        url_pareceres = reverse('prontuario-pareceres-paciente', kwargs={'paciente_id': self.paciente.id})

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
        for u in [url_contexto, url_resumos, url_resumo_detalhe, url_pareceres, url_parecer_detalhe]:
            self.assertEqual(self.client.get(u).status_code, status.HTTP_401_UNAUTHORIZED)

        # 2. Perfil SECRETARIA e ADMINISTRACAO -> HTTP 403
        for user in [self.secretaria, self.admin_user]:
            self.client.force_authenticate(user=user)
            self.assertEqual(self.client.post(url_contexto, {'prompt_id': 1}, format='json').status_code, status.HTTP_403_FORBIDDEN)
            self.assertEqual(self.client.get(url_resumos).status_code, status.HTTP_403_FORBIDDEN)
            self.assertEqual(self.client.get(url_resumo_detalhe).status_code, status.HTTP_403_FORBIDDEN)
            self.assertEqual(self.client.get(url_pareceres).status_code, status.HTTP_403_FORBIDDEN)
            self.assertEqual(self.client.get(url_parecer_detalhe).status_code, status.HTTP_403_FORBIDDEN)

        # 3. Profissional sem acesso -> HTTP 404 (inclusive com UUID de detalhe alheio)
        self.client.force_authenticate(user=self.outra_doutora)
        self.assertEqual(self.client.post(url_contexto, {'prompt_id': 1}, format='json').status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get(url_resumos).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get(url_resumo_detalhe).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get(url_pareceres).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get(url_parecer_detalhe).status_code, status.HTTP_404_NOT_FOUND)

        # 4. Revogação da concessão após preparar contexto -> recusa em salvar resumo ou parecer
        self.client.force_authenticate(user=self.doutora)
        res_prep = self.client.post(url_contexto, {'prompt_id': 1}, format='json')
        self.assertEqual(res_prep.status_code, status.HTTP_200_OK)

        # Revogar concessão
        self.concessao.ativo = False
        self.concessao.save()

        # Tentativa de salvar resumo deve ser recusada com HTTP 404
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

        # 1. Verificar Cache-Control: no-store em preparação de contexto
        url_contexto = reverse('prontuario-ia-contexto', kwargs={'paciente_id': self.paciente.id})
        res_ctx = self.client.post(url_contexto, {'prompt_id': 1}, format='json')
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
