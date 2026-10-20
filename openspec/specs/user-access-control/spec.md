# user-access-control Specification

## Purpose
Garante o provisionamento inicial de conta administrativa, autenticação segura via JWT, gerenciamento completo de contas de funcionários (RF01) e controle de acesso baseado em papéis (RBAC - RNF03) para a criação e manutenção restrita de profissionais pela administração.

## Requirements

### Requirement: Provisionamento Automático de Conta Administradora
The system SHALL automatically provision an initial administrator user account with the `ADMINISTRACAO` role on system setup or migration, ensuring administrative access is ready without manual database tampering.

#### Scenario: Criação automática do administrador durante a inicialização ou migração
- **WHEN** as migrações do banco de dados forem executadas
- **THEN** o sistema deve verificar a existência do usuário administrador padrão (`admin@clinica.com`) e criá-lo com senha criptografada e perfil `ADMINISTRACAO` caso não exista.

#### Scenario: Idempotência do provisionamento do administrador
- **WHEN** o processo de migração for executado repetidas vezes
- **THEN** o sistema não deve duplicar nem corromper o usuário administrador já existente.

### Requirement: Autenticação Stateless via JWT
The system SHALL validate user credentials (email and password) via a JWT endpoint (`/api/auth/token/`), returning signed access and refresh tokens containing the user's UUID and assigned role (`ADMINISTRACAO`, `SECRETARIA`, or `DOUTORA`).

#### Scenario: Autenticação bem-sucedida com credenciais válidas
- **WHEN** o usuário enviar e-mail e senha cadastrados para o endpoint de autenticação
- **THEN** o sistema deve validar o hash da senha, emitir os tokens JWT (access e refresh) contendo o perfil de acesso (`role`) e código HTTP 200 OK.

#### Scenario: Renovação de token de acesso com refresh token
- **WHEN** o cliente enviar um refresh token válido para `/api/auth/token/refresh/`
- **THEN** o sistema deve emitir um novo access token assinado sem exigir novo envio de credenciais.

#### Scenario: Falha de autenticação com credenciais inválidas
- **WHEN** o usuário submeter um e-mail inexistente ou senha incorreta
- **THEN** o sistema deve recusar a autenticação com código HTTP 401 Unauthorized e mensagem de credenciais inválidas.

### Requirement: Gerenciamento Completo de Contas de Acesso (RF01)
The system SHALL allow managing user accounts (create, list, edit details, toggle active/inactive status, and reset passwords) for clinic staff, obligating the definition of the user role (`SECRETARIA`, `DOUTORA`, or `ADMINISTRACAO`) at registration.

#### Scenario: Criação de nova psiquiatra pelo administrador
- **WHEN** o usuário autenticado com perfil `ADMINISTRACAO` submeter a criação de uma conta com nome, e-mail, senha e perfil `DOUTORA`
- **THEN** o sistema deve salvar o novo usuário com UUID v4, senha com hash seguro e retornar código HTTP 201 Created.

#### Scenario: Criação de nova funcionária secretária pelo administrador
- **WHEN** o usuário autenticado com perfil `ADMINISTRACAO` submeter a criação de uma conta com perfil `SECRETARIA`
- **THEN** o sistema deve persistir a nova usuária e retornar código HTTP 201 Created.

#### Scenario: Inativação e reativação de conta de usuário
- **WHEN** o administrador solicitar a inativação de uma conta de funcionário ativo
- **THEN** o sistema deve atualizar o status do usuário para inativo (`status=False`), impedindo logins futuros com aquela conta.

#### Scenario: Redefinição de senha de funcionário pelo administrador
- **WHEN** o administrador solicitar o reset de senha de um funcionário informando uma nova senha válida
- **THEN** o sistema deve atualizar o hash da senha do usuário alvo e retornar confirmação de sucesso com HTTP 200 OK.

### Requirement: Validação de RBAC no Servidor (RNF03)
The API backend SHALL enforce role-based access control, rejecting user management operations from non-admin accounts with HTTP 403 Forbidden and unauthenticated requests with HTTP 401 Unauthorized.

#### Scenario: Bloqueio de criação ou alteração de usuários por secretária ou médica
- **WHEN** um usuário com perfil `SECRETARIA` ou `DOUTORA` tentar enviar requisições de criação, edição ou reset de senha para `/api/usuarios/`
- **THEN** o servidor Django deve rejeitar a requisição com código HTTP 403 Forbidden.

#### Scenario: Bloqueio de requisições de usuários não autenticados
- **WHEN** uma requisição anônima tentar acessar endpoints protegidos de usuários
- **THEN** o sistema deve recusar o acesso com código HTTP 401 Unauthorized.

### Requirement: Interface de Controle de Acesso e Gestão de Usuários
The web front-end SHALL render user creation and management controls strictly when the logged-in user possesses the `ADMINISTRACAO` profile, hiding or disabling these controls for `SECRETARIA` and `DOUTORA`, and providing feedback for session expiration.

#### Scenario: Visualização do módulo de cadastro de profissionais por administrador
- **WHEN** o usuário autenticado com perfil `ADMINISTRACAO` acessar o painel da aplicação
- **THEN** o sistema deve exibir os botões, tabelas e formulários para criar, inativar e gerenciar a psiquiatra ou novas secretárias.

#### Scenario: Ocultação do módulo de profissionais para secretária e doutora
- **WHEN** um usuário autenticado com perfil `SECRETARIA` ou `DOUTORA` acessar a aplicação
- **THEN** a interface não deve renderizar botões ou rotas de gerenciamento/criação de usuários do sistema.
