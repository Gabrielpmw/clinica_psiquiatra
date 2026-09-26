# Tasks

## 1. Segurança, Autenticação JWT, Admin Seed e RBAC no Backend (Desafio 10)

- [x] 1.1 Configurar SimpleJWT no backend (`requirements.txt`, `settings.py`) com expiração de token e serializer customizado que inclui `role`, `nome`, `email` e `user_id`, verificando a emissão de tokens válidos via endpoint `/api/auth/token/`.
- [x] 1.2 Criar a migração de dados idempotente em `backend/apps/usuarios/migrations/` para provisionar o usuário administrador padrão (`admin@clinica.com`), verificando com `python manage.py migrate` e consulta no banco de dados.
- [x] 1.3 Implementar as classes de permissão RBAC (`IsAdminUserRole`, `IsSecretariaOrAdmin`) em `apps/usuarios/permissions.py`, aplicando-as no `UsuarioViewSet` para que apenas Administrador possa listar, criar (psiquiatra ou secretária), editar, inativar e resetar senhas (RF01, RNF03).
- [x] 1.4 Escrever testes automatizados de autenticação e RBAC no backend, verificando o login com token JWT, a criação de usuários autorizada para administrador (201) e o bloqueio com 403 Forbidden para secretária, médica ou anônimo.

## 2. Modelagem e API de Pacientes, Endereços e Responsáveis (Desafio 5)

- [x] 2.1 Criar a aplicação Django `apps.pacientes` com os modelos `Paciente`, `Endereco` e `Responsavel` (UUID v4, chaves estrangeiras, campos da LGPD e status de soft delete), aplicando as migrações com sucesso no PostgreSQL.
- [x] 2.2 Implementar `PacienteSerializer` com serialização aninhada e transação atômica (`transaction.atomic`) para salvar paciente, endereço e responsável legal em uma única requisição, rejeitando com HTTP 400 requisições sem os dados obrigatórios do responsável legal.
- [x] 2.3 Implementar `PacienteViewSet` com paginação, filtros de busca por nome, filtro de status (ativos/inativos), alternância de status de soft delete (`toggle-status`) e proteção RBAC (`IsSecretariaOrAdmin`), verificando com testes de integração de API.

## 3. Autenticação JWT, Guardas de Rotas e Gestão de Usuários no Frontend (Desafio 10)

- [x] 3.1 Implementar `AuthContext` e serviço de autenticação com interceptador Axios no frontend, persistindo tokens JWT no `localStorage`, anexando o cabeçalho Bearer nas requisições e tratando renovação e logout automático em caso de 401.
- [x] 3.2 Atualizar o formulário da `LoginPage` para autenticar contra a API JWT real, tratando erros de credenciais e redirecionando para o Dashboard após login bem-sucedido com o admin pré-criado.
- [x] 3.3 Desenvolver o componente de Gestão de Usuários (modal ou visão administrativa) para cadastro de novas psiquiatras (`DOUTORA`) e secretárias (`SECRETARIA`), listagem e inativação de contas, visível e acessível exclusivamente quando o usuário logado for `ADMINISTRACAO`.
- [x] 3.4 Implementar componentes de proteção de rotas (`ProtectedRoute` / `RoleRoute`), verificando que usuários não autenticados ou sem privilégios administrativos sejam redirecionados.

## 4. Interface Desktop de Gestão de Pacientes no Frontend (Desafio 5)

- [x] 4.1 Criar a página de listagem de pacientes (`PatientsPage`) com tabela desktop, busca dinâmica por nome, filtro de ativos/inativos e badges visuais de status, verificando a renderização correta com dados vindos da API.
- [x] 4.2 Criar o modal de cadastro e edição de paciente estruturado em abas/seções (Dados Pessoais, Endereço e Responsável Legal) com validação de campos obrigatórios e máscaras de entrada (CPF, CEP, telefone), verificando o cadastro atômico na API.
- [x] 4.3 Implementar as ações de edição e inativação/reativação lógica com modal de confirmação visual na listagem de pacientes, verificando a atualização reativa na tabela sem recarregar a página.
- [x] 4.4 Integrar o módulo de pacientes na navegação global do sistema (Header e Dashboard), ajustando a visibilidade dos cards e menus de acordo com o perfil do usuário logado.
