# Proposal

## Why

Para assegurar desde o início a conformidade com a LGPD e os princípios de *Privacy by Design*, é necessário unificar o **Desafio 5 (Gestão de Pacientes)** com o **Desafio 10 (Controle de Acesso RBAC, Segurança JWT e Gestão de Contas)**. A clínica infantojuvenil manipula dados sensíveis de pacientes, responsáveis e prontuários; portanto, a segregação de funções por papéis (Administração, Secretária e Doutora), a emissão de tokens seguros JWT e o gerenciamento completo de usuários (RF01, RF02, RNF02, RNF03, RNF05) devem estar operacionais desde a primeira entrega, evitando endpoints abertos e garantindo que apenas o perfil de Administração consiga gerenciar e cadastrar profissionais (psiquiatra ou secretária), enquanto secretárias gerenciam a recepção e pacientes.

## What Changes

- **Gestão Completa de Acesso, Autenticação JWT e RBAC (Desafio 10 + Demanda de Usuário)**:
  - Provisionamento automático de um usuário administrador padrão (`admin@clinica.com`) via migração de dados idempotente.
  - Implementação de autenticação stateless via **JWT** (`djangorestframework-simplejwt`) com endpoints `/api/auth/token/`, `/api/auth/token/refresh/` e `/api/auth/me/`, incorporando as claims de identificador (UUID v4) e perfil de acesso (`role`).
  - Módulo completo de Gestão de Usuários (RF01) em `apps.usuarios`: listagem, criação, edição de perfil, inativação lógica e redefinição/reset de senha de funcionários.
  - Validação rigorosa de RBAC no backend (RNF03):
    - Apenas o perfil `ADMINISTRACAO` pode criar, inativar, editar e resetar senhas de novos usuários (`DOUTORA` e `SECRETARIA`).
    - Perfis `SECRETARIA` e `DOUTORA` têm bloqueio total (`403 Forbidden`) em rotas administrativas de usuários.
    - Estrutura base de proteção para que rotas de dados clínicos futuros bloqueiem expressamente o perfil `SECRETARIA`.
  - Controle de sessão e rotas protegidas no frontend: `AuthContext` com renovação de token, redirecionamento para login e componentes de guarda de rotas por perfil (`ProtectedRoute`).
  - Painel/Modal de Gestão de Profissionais na interface desktop, disponível exclusivamente para o usuário administrador.

- **Gestão de Pacientes, Endereços e Responsáveis (Desafio 5)**:
  - Criação da aplicação `apps.pacientes` com os modelos `Paciente`, `Endereco` e `Responsavel` (UUID v4 e soft delete).
  - Serializers DRF com persistência atômica (`transaction.atomic`) para salvar paciente, endereço e responsável legal em uma única operação segura.
  - ViewSets com paginação, busca por nome, filtragem por ativos/inativos e inativação/reativação lógica (`toggle-status`).
  - Interface desktop React no frontend (`/pacientes`) com tabela, busca em tempo real, filtros, modal de cadastro/edição com abas estruturadas e máscaras de validação (CPF, CEP, telefone).
  - Integração da tela ao Dashboard e Header com exibição de menus ajustada ao perfil do usuário logado.

## Capabilities

### New Capabilities
- `patient-management`: Cadastro, edição, listagem, busca, filtro e inativação lógica (*soft delete*) de pacientes, incluindo endereço e responsáveis legais obrigatórios (RF02, RNF05).
- `user-access-control`: Provisionamento do administrador padrão, autenticação stateless JWT, controle de acesso baseado em papéis (RBAC) no backend e no frontend, e gerenciamento completo de contas de funcionários (criar, editar, inativar e resetar senha) restrito à administração (RF01, RNF02, RNF03).

### Modified Capabilities
<!-- Nenhuma especificação anterior teve seus requisitos modificados. -->

## Impact
- **Backend**:
  - Inclusão do pacote `djangorestframework-simplejwt` nas dependências do backend.
  - Atualização de `core/settings.py` para autenticação JWT padrão e expiração de tokens.
  - Criação da migração de dados em `apps.usuarios` para seed do administrador.
  - Implementação das permissões RBAC (`IsAdminUserRole`, `IsSecretariaOrAdmin`, etc.) no DRF.
  - Criação do app `apps.pacientes` e tabelas relacionadas no PostgreSQL.
- **Frontend**:
  - `AuthContext` com persistência de token JWT e estado do usuário logado.
  - Telas e componentes: `LoginPage` integrada com API JWT, painel administrativo de usuários (`UserManagementModal`), listagem e formulário de pacientes (`PatientsPage`, `PatientFormModal`).
  - Proteção e ocultação condicional de menus por perfil (`ADMINISTRACAO`, `SECRETARIA`, `DOUTORA`).
