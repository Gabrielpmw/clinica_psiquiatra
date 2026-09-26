from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.usuarios.models import Usuario
from apps.pacientes.models import Paciente, Endereco, Responsavel


class PacienteAPITestCase(APITestCase):
    """
    Testes de integração da API de Pacientes (Desafio 5 + RF02 + RNF03 + RNF05).
    """

    def setUp(self):
        # Usuários com diferentes papéis
        self.admin = Usuario.objects.create_user(
            email='admin_p@clinica.com',
            nome='Admin Pacientes',
            password='Password123!',
            role=Usuario.Role.ADMINISTRACAO
        )

        self.secretaria = Usuario.objects.create_user(
            email='sec_p@clinica.com',
            nome='Secretária Pacientes',
            password='Password123!',
            role=Usuario.Role.SECRETARIA
        )

        self.doutora = Usuario.objects.create_user(
            email='doc_p@clinica.com',
            nome='Dra. Pacientes',
            password='Password123!',
            role=Usuario.Role.DOUTORA
        )

        self.list_create_url = reverse('paciente-list')

        # Paciente de teste pré-existente
        self.paciente_ativo = Paciente.objects.create(
            nomeCompleto='Lucas Silveira Teste',
            dataNascimento='2018-05-10',
            sexo='M',
            status=True
        )
        Endereco.objects.create(
            paciente=self.paciente_ativo,
            tituloLocal='Casa',
            cep='77000-000',
            logradouro='Rua 1',
            numero='100',
            bairro='Centro',
            cidade='Palmas',
            estado='TO'
        )
        Responsavel.objects.create(
            paciente=self.paciente_ativo,
            nomeCompleto='Mariana Silveira',
            cpf='123.456.789-00',
            contato='(63) 99999-0000',
            parentesco='Mãe'
        )

    def test_cadastro_completo_paciente_atomico_com_sucesso(self):
        self.client.force_authenticate(user=self.secretaria)
        payload = {
            'nomeCompleto': 'Enzo Gabriel Ferreira',
            'dataNascimento': '2019-08-15',
            'sexo': 'M',
            'enderecos': [
                {
                    'tituloLocal': 'Residencial',
                    'cep': '77020-100',
                    'logradouro': 'Av. Teotônio Segurado',
                    'numero': '50',
                    'bairro': 'Plano Diretor Sul',
                    'cidade': 'Palmas',
                    'estado': 'TO'
                }
            ],
            'responsaveis': [
                {
                    'nomeCompleto': 'Carla Ferreira',
                    'cpf': '987.654.321-11',
                    'contato': '(63) 98888-7777',
                    'parentesco': 'Mãe'
                }
            ]
        }
        response = self.client.post(self.list_create_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['nomeCompleto'], 'Enzo Gabriel Ferreira')
        self.assertTrue(response.data['status'])
        self.assertEqual(len(response.data['enderecos']), 1)
        self.assertEqual(len(response.data['responsaveis']), 1)

        # Valida no banco
        paciente_db = Paciente.objects.get(id=response.data['id'])
        self.assertEqual(paciente_db.enderecos.count(), 1)
        self.assertEqual(paciente_db.responsaveis.count(), 1)

    def test_rejeita_cadastro_sem_responsavel_legal(self):
        self.client.force_authenticate(user=self.secretaria)
        payload = {
            'nomeCompleto': 'Criança Sem Responsável',
            'dataNascimento': '2020-01-01',
            'sexo': 'F',
            'enderecos': [
                {
                    'tituloLocal': 'Casa',
                    'cep': '77000-000',
                    'logradouro': 'Rua 2',
                    'numero': '20',
                    'bairro': 'Centro',
                    'cidade': 'Palmas',
                    'estado': 'TO'
                }
            ],
            'responsaveis': []
        }
        response = self.client.post(self.list_create_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('responsaveis', response.data)

    def test_busca_paciente_por_termo_no_nome(self):
        self.client.force_authenticate(user=self.doutora)
        response = self.client.get(f"{self.list_create_url}?q=Silveira")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Lê a lista de resultados paginados
        results = response.data['results'] if isinstance(response.data, dict) and 'results' in response.data else response.data
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['nomeCompleto'], 'Lucas Silveira Teste')

    def test_filtro_por_status_ativo_e_inativo(self):
        self.client.force_authenticate(user=self.secretaria)
        # Cria paciente inativo
        Paciente.objects.create(
            nomeCompleto='Paciente Arquivado Inativo',
            dataNascimento='2015-03-20',
            sexo='M',
            status=False
        )

        # Filtro ativo
        res_ativo = self.client.get(f"{self.list_create_url}?status=true")
        results_ativo = res_ativo.data['results'] if isinstance(res_ativo.data, dict) and 'results' in res_ativo.data else res_ativo.data
        self.assertTrue(all(p['status'] is True for p in results_ativo))

        # Filtro inativo
        res_inativo = self.client.get(f"{self.list_create_url}?status=false")
        results_inativo = res_inativo.data['results'] if isinstance(res_inativo.data, dict) and 'results' in res_inativo.data else res_inativo.data
        self.assertTrue(all(p['status'] is False for p in results_inativo))

    def test_soft_delete_inativa_e_reativa_paciente(self):
        self.client.force_authenticate(user=self.secretaria)
        toggle_url = reverse('paciente-toggle-status', kwargs={'pk': self.paciente_ativo.id})

        # Inativa
        res1 = self.client.patch(toggle_url)
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        self.assertFalse(res1.data['status'])
        self.paciente_ativo.refresh_from_db()
        self.assertFalse(self.paciente_ativo.status)
        # O registro ainda deve existir fisicamente no banco!
        self.assertTrue(Paciente.objects.filter(id=self.paciente_ativo.id).exists())

        # Reativa
        res2 = self.client.patch(toggle_url)
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertTrue(res2.data['status'])
        self.paciente_ativo.refresh_from_db()
        self.assertTrue(self.paciente_ativo.status)

    def test_doutora_tem_apenas_leitura_em_pacientes(self):
        self.client.force_authenticate(user=self.doutora)
        # Leitura permitida
        res_get = self.client.get(self.list_create_url)
        self.assertEqual(res_get.status_code, status.HTTP_200_OK)

        # Criação bloqueada com 403 Forbidden (papel da recepção/secretária ou administração)
        res_post = self.client.post(self.list_create_url, {
            'nomeCompleto': 'Tentativa Médica Criar',
            'dataNascimento': '2019-01-01',
            'sexo': 'M'
        }, format='json')
        self.assertEqual(res_post.status_code, status.HTTP_403_FORBIDDEN)
