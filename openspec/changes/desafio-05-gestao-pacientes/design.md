# Design

## Context

A proposta unifica o **Desafio 5 (Gestão de Pacientes)** e o **Desafio 10 (Controle de Acesso RBAC, Segurança JWT e Gestão de Contas)**. Em um sistema de apoio a uma clínica psiquiátrica infantojuvenil, a integridade dos dados e o cumprimento estrito da LGPD exigem que o controle de perfis (Administração, Secretária e Doutora) esteja ativo desde a fundação da aplicação. 

Com essa consolidação, eliminamos endpoints abertos e entregamos:
1. Uma conta de administrador pronta para uso através de provisionamento automático.
2. Autenticação completa via JWT com claims de papel (`role`).
3. Gerenciamento seguro de usuários restrito ao perfil de Administração (criação e inativação de secretárias e psiquiatras).
4. Módulo completo de Gestão de Pacientes com suporte a endereços e responsáveis legais, protegido pelas permissões RBAC correspondentes.

Para mais detalhes, consulte `proposal.md` e os arquivos em `specs/`.

## Goals / Non-Goals

**Goals:**
- Configurar autenticação stateless robusta via **SimpleJWT** (`djangorestframework-simplejwt`) no Django REST Framework com renovação de tokens e claims customizadas (`role`, `nome`, `email`, `user_id`).
- Provisionar de forma automatizada e idempotente a conta do usuário administrador padrão (`admin@clinica.com`) via migração de dados Django.
- Implementar permissões granulares de RBAC (`IsAdminUserRole`, `IsSecretariaOrAdmin`) no backend, garantindo que apenas a Administração cadastre ou gerencie profissionais (`DOUTORA` e `SECRETARIA`) (RF01, RNF03).
- Implementar o app `apps.pacientes` (`Paciente`, `Endereco`, `Responsavel`) com UUID v4, soft delete (`status`) e criação atômica via `transaction.atomic` (RF02, RNF05).
- Criar a camada de segurança no frontend React (`AuthContext`), gerenciando tokens JWT, cabeçalho `Authorization: Bearer`, expiração e redirecionamento de rotas.
- Construir a interface desktop de Gestão de Usuários (modal ou visão administrativa), visível e acessível unicamente para o perfil `ADMINISTRACAO`.
- Construir a interface desktop de Gestão de Pacientes (`/pacientes`) com tabela, busca em tempo real, filtros por ativos/inativos, formulário modal completo e inativação/reativação lógica.

**Non-Goals:**
- Módulo de agenda e sessões de atendimento (Desafio 6).
- Prontuário clínico estruturado, anamnese e anotações cronológicas (Desafio 7).
- Integração com Google Gemini 1.5 Flash para geração de resumos (Desafio 9).
- Suporte a múltiplos consultórios ou configurações multi-tenancy.

## Decisions

### 1. Autenticação JWT com Custom Claims e Renovação
- **Decisão**: Utilizar `djangorestframework-simplejwt` configurado com tokens do tipo Bearer. Um custom serializer (`CustomTokenObtainPairSerializer`) incluirá `role`, `nome`, `email` e `user_id` diretamente no payload retornado no login.
- **Racional**: Permite que o front-end React conheça o perfil do usuário imediatamente após o login sem necessitar de requisições adicionais, e garante que o backend valide a assinatura do token criptograficamente em cada requisição (RNF03).
- **Alternativas consideradas**: Django Session Authentication (cookies). Descartada por dificuldades com CORS em contêineres e menor alinhamento com arquitetura REST moderna e stateless.

### 2. Classes de Permissão RBAC Reutilizáveis no DRF
- **Decisão**: Criar o módulo `backend/apps/usuarios/permissions.py` contendo:
  - `IsAdminUserRole`: Permite acesso somente se `request.user.is_authenticated` e `request.user.role == 'ADMINISTRACAO'`.
  - `IsSecretariaOrAdmin`: Permite acesso se o usuário for `ADMINISTRACAO` ou `SECRETARIA`.
  - `IsDoctorOrAdmin`: Permite acesso se o usuário for `ADMINISTRACAO` ou `DOUTORA`.
- **Racional**: Centraliza as regras de autorização no servidor (RNF03), aplicando-as de forma declarativa nos ViewSets (`permission_classes`).
- **Alternativas consideradas**: Validações manuais em `if/else` dentro de cada método de view. Descartado por ser propenso a falhas e difícil de manter.

### 3. Provisionamento do Administrador Inicial via Data Migration
- **Decisão**: Criar a migração `0002_create_default_admin.py` em `apps.usuarios.migrations`. Utiliza `apps.get_model('usuarios', 'Usuario')` e `make_password` para criar `admin@clinica.com` com senha configurável via variável de ambiente `INITIAL_ADMIN_PASSWORD` (com fallback seguro em dev).
- **Racional**: Executa automaticamente com `python manage.py migrate` tanto no Docker quanto em ambientes locais, sem necessidade de comandos de terminal adicionais.
- **Alternativas consideradas**: Script bash no Docker entrypoint. Descartado por não ser idempotente nem auditável pelo controle de versão do banco.

### 4. Gestão Completa de Usuários em `UsuarioViewSet` (RF01)
- **Decisão**: O `UsuarioViewSet` passa a ser protegido por padrão com `IsAdminUserRole` para operações de criação, inativação, atualização e redefinição de senha. Uma rota `/api/auth/me/` pública para qualquer usuário autenticado permite consultar o próprio perfil.
- **Racional**: Atende rigorosamente ao requisito do usuário de que *apenas o administrador logado consiga criar a psiquiatra ou uma nova funcionária*, além de permitir inativar acessos ou resetar senhas caso necessário.
- **Alternativas consideradas**: Permitir auto-cadastro. Descartado categoricamente pelo modelo de negócios da clínica fechada.

### 5. Arquitetura Modular de Pacientes (`apps.pacientes`) com Transação Atômica
- **Decisão**: A aplicação `apps.pacientes` abrigará os modelos `Paciente`, `Endereco` e `Responsavel`. O serializer `PacienteSerializer` sobrescreverá `create()` e `update()` utilizando `with transaction.atomic():`, garantindo que um paciente nunca seja criado sem seu responsável legal ou endereço.
- **Racional**: Respeita o padrão MVC do projeto, evita inconsistências no banco e cumpre o RF02 e RNF05.

### 6. Gerenciamento de Sessão e Guardas de Rota no React
- **Decisão**: Implementar um `AuthContext` global no frontend. O token e as informações do usuário são salvos no `localStorage`. Um interceptador do Axios anexa o cabeçalho `Authorization: Bearer <token>`. Um componente `RoleRoute` valida se o usuário possui os privilégios necessários para renderizar a página (ex: apenas `ADMINISTRACAO` acessa o painel de usuários).
- **Racional**: Fornece uma experiência fluida, sem piscar telas indevidas, redirecionando usuários não autorizados com segurança.

## Risks / Trade-offs

- **[Risco: Tentativa de bypass de interface por chamadas diretas à API]** → *Mitigação*: Todas as rotas críticas de usuários e dados clínicos são estritamente barradas pelas classes de permissão do DRF no backend (HTTP 403 Forbidden).
- **[Risco: Expiração de token JWT durante o preenchimento de cadastro longo]** → *Mitigação*: Configuração de tempo de expiração do access token adequado (ex: 60 minutos) com interceptador Axios configurado para tentar refresh automático antes de deslogar o usuário.
- **[Risco: Inativação acidental de pacientes ou usuários]** → *Mitigação*: Modais de confirmação no front-end antes de alternar o status ativo/inativo, e implementação puramente lógica (*soft delete*) preservando dados no PostgreSQL.

## Migration Plan

1. Adicionar `djangorestframework-simplejwt` ao `requirements.txt` do backend e atualizar `core/settings.py`.
2. Executar migração de dados para criar o usuário administrador em `apps.usuarios`.
3. Criar a nova aplicação `apps.pacientes`, gerar suas migrações e aplicá-las ao banco PostgreSQL.
4. Adicionar endpoints de autenticação JWT e rotas de pacientes em `core/urls.py`.
5. Implementar testes automatizados de backend para validar login JWT, permissões RBAC e CRUD de pacientes/usuários.
6. Atualizar o frontend React com `AuthContext`, nova `LoginPage` integrada, modal de Gestão de Usuários para Administrador e tela de Gestão de Pacientes.
