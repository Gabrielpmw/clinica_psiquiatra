from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.usuarios.models import Usuario


class UsuarioAuthAndRBACTestCase(APITestCase):
    """
    Testes de autenticação JWT, provisionamento e controle de acesso RBAC (Desafio 10 + RF01 + RNF03).
    """

    def setUp(self):
        # Admin pré-criado
        self.admin = Usuario.objects.create_user(
            email='admin_test@clinica.com',
            nome='Admin Teste',
            password='Password123!',
            role=Usuario.Role.ADMINISTRACAO,
            is_staff=True
        )

        # Secretária
        self.secretaria = Usuario.objects.create_user(
            email='secretaria_test@clinica.com',
            nome='Secretária Teste',
            password='Password123!',
            role=Usuario.Role.SECRETARIA
        )

        # Doutora / Psiquiatra
        self.doutora = Usuario.objects.create_user(
            email='doutora_test@clinica.com',
            nome='Dra. Psiquiatra Teste',
            password='Password123!',
            role=Usuario.Role.DOUTORA
        )

        # Usuário Inativo
        self.inativo = Usuario.objects.create_user(
            email='inativo_test@clinica.com',
            nome='Usuário Inativo',
            password='Password123!',
            role=Usuario.Role.SECRETARIA,
            status=False
        )

        self.login_url = reverse('token-obtain-pair')
        self.me_url = reverse('user-me')
        self.usuarios_url = reverse('usuario-list')

    def test_login_sucesso_retorna_tokens_e_role(self):
        response = self.client.post(self.login_url, {
            'email': 'admin_test@clinica.com',
            'password': 'Password123!'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['role'], 'ADMINISTRACAO')
        self.assertEqual(response.data['user']['email'], 'admin_test@clinica.com')

    def test_login_falha_com_senha_incorreta(self):
        response = self.client.post(self.login_url, {
            'email': 'admin_test@clinica.com',
            'password': 'wrongpassword'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_bloqueado_para_usuario_inativo(self):
        response = self.client.post(self.login_url, {
            'email': 'inativo_test@clinica.com',
            'password': 'Password123!'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_me_endpoint_retorna_usuario_autenticado(self):
        self.client.force_authenticate(user=self.doutora)
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'doutora_test@clinica.com')
        self.assertEqual(response.data['role'], 'DOUTORA')

    def test_administrador_pode_criar_psiquiatra(self):
        self.client.force_authenticate(user=self.admin)
        data = {
            'nome': 'Dra. Nova Psiquiatra',
            'email': 'nova_psi@clinica.com',
            'password': 'NewSecurePassword123!',
            'role': 'DOUTORA'
        }
        response = self.client.post(self.usuarios_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['role'], 'DOUTORA')
        self.assertTrue(Usuario.objects.filter(email='nova_psi@clinica.com').exists())

    def test_administrador_pode_criar_secretaria(self):
        self.client.force_authenticate(user=self.admin)
        data = {
            'nome': 'Nova Funcionária',
            'email': 'nova_sec@clinica.com',
            'password': 'NewSecurePassword123!',
            'role': 'SECRETARIA'
        }
        response = self.client.post(self.usuarios_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['role'], 'SECRETARIA')
        self.assertTrue(Usuario.objects.filter(email='nova_sec@clinica.com').exists())

    def test_secretaria_nao_pode_criar_usuario_retorna_403(self):
        self.client.force_authenticate(user=self.secretaria)
        data = {
            'nome': 'Tentativa Secretária',
            'email': 'hack_sec@clinica.com',
            'password': 'Password123!',
            'role': 'SECRETARIA'
        }
        response = self.client.post(self.usuarios_url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Usuario.objects.filter(email='hack_sec@clinica.com').exists())

    def test_doutora_nao_pode_criar_usuario_retorna_403(self):
        self.client.force_authenticate(user=self.doutora)
        data = {
            'nome': 'Tentativa Doutora',
            'email': 'hack_doc@clinica.com',
            'password': 'Password123!',
            'role': 'DOUTORA'
        }
        response = self.client.post(self.usuarios_url, data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Usuario.objects.filter(email='hack_doc@clinica.com').exists())

    def test_usuario_nao_autenticado_retorna_401(self):
        data = {
            'nome': 'Tentativa Anônima',
            'email': 'anon@clinica.com',
            'password': 'Password123!',
            'role': 'SECRETARIA'
        }
        response = self.client.post(self.usuarios_url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_administrador_pode_inativar_e_reativar_usuario(self):
        self.client.force_authenticate(user=self.admin)
        toggle_url = reverse('usuario-toggle-status', kwargs={'pk': self.secretaria.id})
        
        # Inativa
        res1 = self.client.patch(toggle_url)
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        self.assertFalse(res1.data['status'])
        self.secretaria.refresh_from_db()
        self.assertFalse(self.secretaria.status)

        # Reativa
        res2 = self.client.patch(toggle_url)
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertTrue(res2.data['status'])
        self.secretaria.refresh_from_db()
        self.assertTrue(self.secretaria.status)

    def test_administrador_pode_resetar_senha_de_funcionario(self):
        self.client.force_authenticate(user=self.admin)
        reset_url = reverse('usuario-reset-password', kwargs={'pk': self.secretaria.id})
        response = self.client.post(reset_url, {'password': 'BrandNewPassword999!'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verifica login com a nova senha
        self.client.logout()
        login_res = self.client.post(self.login_url, {
            'email': self.secretaria.email,
            'password': 'BrandNewPassword999!'
        })
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)
