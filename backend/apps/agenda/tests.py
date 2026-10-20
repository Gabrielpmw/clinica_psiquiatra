from django.urls import reverse
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.test import APITestCase
from apps.usuarios.models import Usuario
from apps.pacientes.models import Paciente
from apps.agenda.models import Sessao, Disponibilidade, Bloqueio


class AgendaAPITestCase(APITestCase):
    """
    Testes de integração para a API da Agenda (Desafio 6, RF03, RF04, RF05, RF06).
    """

    def setUp(self):
        self.doutora = Usuario.objects.create_user(
            email='dra.ana@clinica.com',
            nome='Dra. Ana Clínica',
            password='Password123!',
            role=Usuario.Role.DOUTORA
        )
        self.secretaria = Usuario.objects.create_user(
            email='sec.clara@clinica.com',
            nome='Clara Secretária',
            password='Password123!',
            role=Usuario.Role.SECRETARIA
        )
        self.paciente = Paciente.objects.create(
            nomeCompleto='Pedro Henrique Teste',
            dataNascimento='2017-04-12',
            sexo='M',
            status=True
        )

        self.agora = timezone.now().replace(microsecond=0)
        self.url_sessoes = reverse('sessao-list')
        self.url_disponibilidade = reverse('disponibilidade-list')
        self.url_bloqueios = reverse('bloqueio-list')

    def test_secretaria_agenda_sessao_com_tipo_sucesso(self):
        """RF03: Secretária marca nova consulta e define hora/tempo e tipo de sessão."""
        self.client.force_authenticate(user=self.secretaria)
        inicio = self.agora + timedelta(days=1, hours=2)
        fim = inicio + timedelta(minutes=50)

        payload = {
            'paciente': str(self.paciente.id),
            'dataHoraInicio': inicio.isoformat(),
            'dataHoraFim': fim.isoformat(),
            'tipo': Sessao.TipoChoices.AVALIATIVA,
        }

        response = self.client.post(self.url_sessoes, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], Sessao.StatusChoices.AGENDADA)
        self.assertEqual(response.data['tipo'], Sessao.TipoChoices.AVALIATIVA)
        self.assertEqual(response.data['paciente_nome'], 'Pedro Henrique Teste')

    def test_doutora_agenda_sessao_continuidade(self):
        """RF04: Doutora agenda sessão de continuidade clínica diretamente."""
        self.client.force_authenticate(user=self.doutora)
        inicio = self.agora + timedelta(days=2, hours=4)
        fim = inicio + timedelta(minutes=60)

        payload = {
            'paciente': str(self.paciente.id),
            'dataHoraInicio': inicio.isoformat(),
            'dataHoraFim': fim.isoformat(),
            'tipo': Sessao.TipoChoices.INTERVENTIVA,
        }

        response = self.client.post(self.url_sessoes, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['tipo'], Sessao.TipoChoices.INTERVENTIVA)
        self.assertEqual(response.data['usuario'], self.doutora.id)

    def test_rejeita_sobreposicao_de_horarios_mesmo_paciente(self):
        """Validação: não permite duas sessões agendadas simultâneas para o mesmo paciente."""
        self.client.force_authenticate(user=self.secretaria)
        inicio = self.agora + timedelta(days=3, hours=1)
        fim = inicio + timedelta(minutes=50)

        Sessao.objects.create(
            paciente=self.paciente,
            usuario=self.doutora,
            dataHoraInicio=inicio,
            dataHoraFim=fim,
            status=Sessao.StatusChoices.AGENDADA
        )

        payload_conflitante = {
            'paciente': str(self.paciente.id),
            'dataHoraInicio': (inicio + timedelta(minutes=15)).isoformat(),
            'dataHoraFim': (fim + timedelta(minutes=15)).isoformat(),
            'tipo': Sessao.TipoChoices.AVALIATIVA
        }

        response = self.client.post(self.url_sessoes, payload_conflitante, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_alteracao_status_sessao(self):
        """RF06: Alteração do status da sessão (agendada, cancelada, falta, realizada)."""
        self.client.force_authenticate(user=self.secretaria)
        inicio = self.agora + timedelta(days=1)
        fim = inicio + timedelta(minutes=50)
        sessao = Sessao.objects.create(
            paciente=self.paciente,
            usuario=self.doutora,
            dataHoraInicio=inicio,
            dataHoraFim=fim,
            status=Sessao.StatusChoices.AGENDADA
        )

        url_status = reverse('sessao-atualizar-status', kwargs={'pk': sessao.id})

        # Atualiza para REALIZADA
        res = self.client.patch(url_status, {'status': 'REALIZADA'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        sessao.refresh_from_db()
        self.assertEqual(sessao.status, Sessao.StatusChoices.REALIZADA)

        # Atualiza para FALTA
        res = self.client.patch(url_status, {'status': 'FALTA'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        sessao.refresh_from_db()
        self.assertEqual(sessao.status, Sessao.StatusChoices.FALTA)

    def test_doutora_define_disponibilidade_e_bloqueio(self):
        """RF05: Doutora define horários de disponibilidade e bloqueios com motivo."""
        self.client.force_authenticate(user=self.doutora)

        # Disponibilidade
        payload_disp = {
            'diaSemana': 1,  # Terça
            'horaInicio': '08:00:00',
            'horaFim': '12:00:00'
        }
        res_disp = self.client.post(self.url_disponibilidade, payload_disp, format='json')
        self.assertEqual(res_disp.status_code, status.HTTP_201_CREATED)

        # Bloqueio
        inicio_bloq = self.agora + timedelta(days=4, hours=1)
        fim_bloq = inicio_bloq + timedelta(hours=3)
        payload_bloq = {
            'dataHoraInicio': inicio_bloq.isoformat(),
            'dataHoraFim': fim_bloq.isoformat(),
            'motivo': 'Congresso de Psiquiatria Infantil'
        }
        res_bloq = self.client.post(self.url_bloqueios, payload_bloq, format='json')
        self.assertEqual(res_bloq.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_bloq.data['motivo'], 'Congresso de Psiquiatria Infantil')
