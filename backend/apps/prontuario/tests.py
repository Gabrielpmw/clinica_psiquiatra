from django.urls import reverse
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.test import APITestCase
from apps.usuarios.models import Usuario
from apps.pacientes.models import Paciente
from apps.agenda.models import Sessao
from apps.prontuario.models import Anamnese, AnotacaoSessao


class ProntuarioAPITestCase(APITestCase):
    """
    Testes de integração para o Prontuário Clínico e Anamnese (Desafio 7, RF07, RF09).
    """

    def setUp(self):
        self.doutora = Usuario.objects.create_user(
            email='dra.beatriz@clinica.com',
            nome='Dra. Beatriz Santos',
            password='Password123!',
            role=Usuario.Role.DOUTORA
        )
        self.paciente = Paciente.objects.create(
            nomeCompleto='Gabrielzinho Silva',
            dataNascimento='2018-09-22',
            sexo='M',
            status=True
        )
        self.agora = timezone.now()
        self.sessao = Sessao.objects.create(
            paciente=self.paciente,
            usuario=self.doutora,
            dataHoraInicio=self.agora,
            dataHoraFim=self.agora + timedelta(minutes=50),
            status=Sessao.StatusChoices.REALIZADA,
            tipo=Sessao.TipoChoices.AVALIATIVA
        )

        self.url_anamnese = reverse('prontuario-anamnese', kwargs={'paciente_id': self.paciente.id})
        self.url_anotacoes = reverse('prontuario-anotacoes-paciente', kwargs={'paciente_id': self.paciente.id})

    def test_consulta_anamnese_retorna_cabecalho_com_data_nascimento(self):
        """RF07: Cabeçalho da Anamnese exibe data de nascimento do paciente."""
        self.client.force_authenticate(user=self.doutora)
        response = self.client.get(self.url_anamnese)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['paciente_dataNascimento'], '2018-09-22')
        self.assertEqual(response.data['paciente_nome'], 'Gabrielzinho Silva')

    def test_edicao_anamnese_com_criterios_e_observacoes_gerais(self):
        """RF07: Edição a qualquer momento dos critérios e campo de texto livre (observacoesGerais)."""
        self.client.force_authenticate(user=self.doutora)

        payload = {
            'escolaridade': '1º Ano do Ensino Fundamental',
            'tipoParto': 'Cesariana a termo',
            'intercorrencias': 'Sem intercorrências',
            'seletividadeAlimentar': 'Recusa alimentos com textura pastosa',
            'dificuldadeRotina': 'Crises de choro ao alterar caminho da escola',
            'sensibilidadeEtiquetas': 'Extrema irritabilidade com etiquetas de camisetas',
            'historicoFamiliar': 'Tio materno diagnosticado com TEA leve',
            'adesaoRegras': 'Boa resposta a reforço visual',
            'observacoesGerais': 'Paciente demonstrou bom contato visual durante a consulta inicial.'
        }

        response = self.client.put(self.url_anamnese, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['observacoesGerais'], payload['observacoesGerais'])
        self.assertEqual(response.data['sensibilidadeEtiquetas'], payload['sensibilidadeEtiquetas'])

        # Valida no banco
        anamnese = Anamnese.objects.get(paciente=self.paciente)
        self.assertEqual(anamnese.observacoesGerais, payload['observacoesGerais'])

    def test_registro_e_listagem_cronologica_anotacoes_sessao(self):
        """RF09: Registro em texto livre e listagem cronológica de anotações."""
        self.client.force_authenticate(user=self.doutora)

        # 1ª anotação (Sessão Avaliativa)
        payload1 = {
            'sessao': str(self.sessao.id),
            'textoLivre': 'Primeira sessão avaliativa: aplicação de protocolos lúdicos.'
        }
        res1 = self.client.post(self.url_anotacoes, payload1, format='json')
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res1.data['sessao_tipo'], Sessao.TipoChoices.AVALIATIVA)

        # Cria 2ª sessão e anotação (Sessão Interventiva)
        sessao2 = Sessao.objects.create(
            paciente=self.paciente,
            usuario=self.doutora,
            dataHoraInicio=self.agora + timedelta(days=7),
            dataHoraFim=self.agora + timedelta(days=7, minutes=50),
            status=Sessao.StatusChoices.REALIZADA,
            tipo=Sessao.TipoChoices.INTERVENTIVA
        )
        payload2 = {
            'sessao': str(sessao2.id),
            'textoLivre': 'Segunda sessão (interventiva): treino de flexibilidade cognitiva.'
        }
        res2 = self.client.post(self.url_anotacoes, payload2, format='json')
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)

        # Listagem cronológica
        res_list = self.client.get(self.url_anotacoes)
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res_list.data), 2)
        self.assertEqual(res_list.data[0]['sessao_tipo'], Sessao.TipoChoices.AVALIATIVA)
        self.assertEqual(res_list.data[1]['sessao_tipo'], Sessao.TipoChoices.INTERVENTIVA)
