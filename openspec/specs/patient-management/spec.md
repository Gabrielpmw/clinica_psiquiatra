# patient-management Specification

## Purpose
Permite o cadastro, edição, consulta, busca e inativação lógica (soft delete) de pacientes, além da gestão estruturada de seus endereços e responsáveis legais (RF02), com permissões de acesso integradas ao controle de papéis (RBAC).

## Requirements

### Requirement: Cadastro Completo de Paciente com Endereço e Responsáveis
The system SHALL allow registering new patients requiring essential personal data (Nome completo, Data de nascimento, Sexo), at least one Address (Título do local, CEP, Logradouro, Número, Bairro, Cidade, Estado), and at least one Legal Guardian / Responsável (Nome completo, CPF, Contato, Parentesco). All identifiers generated MUST be UUID v4.

#### Scenario: Cadastro de paciente com dados válidos por secretária ou administração
- **WHEN** um usuário autenticado com perfil `SECRETARIA` ou `ADMINISTRACAO` enviar a requisição de cadastro com dados válidos do paciente, ao menos um endereço e ao menos um responsável legal
- **THEN** o sistema deve persistir as três entidades de forma atômica no banco de dados, atribuir status ativo por padrão e retornar os dados cadastrados com código HTTP 201 Created.

#### Scenario: Tentativa de cadastro sem preenchimento do responsável legal
- **WHEN** o usuário tentar submeter o cadastro de um paciente sem informar os dados obrigatórios do responsável legal (Nome, CPF, Contato e Parentesco)
- **THEN** o sistema deve rejeitar o cadastro com código HTTP 400 Bad Request e exibir mensagem de erro informativa indicando a obrigatoriedade dos dados do responsável.

### Requirement: Listagem, Busca e Filtro de Pacientes
The system SHALL provide paginated patient listing with support for search by full name and filtering by active/inactive status, accessible to authenticated staff.

#### Scenario: Busca de paciente por termo no nome
- **WHEN** o usuário autenticado buscar por um termo presente no nome de um paciente cadastrado
- **THEN** o sistema deve retornar exclusivamente a lista de pacientes cujos nomes contenham o termo pesquisado (case-insensitive).

#### Scenario: Filtragem por status de paciente
- **WHEN** o usuário selecionar o filtro de pacientes inativos
- **THEN** a listagem deve exibir somente os pacientes com status inativo, permitindo alternar de volta para a visualização de pacientes ativos.

### Requirement: Edição de Paciente e Dados Vinculados
The system SHALL allow updating existing patient details, addresses, and legal guardians, persisting changes without altering historical primary identifiers.

#### Scenario: Atualização bem-sucedida de paciente e responsável
- **WHEN** um usuário com perfil `SECRETARIA` ou `ADMINISTRACAO` enviar alterações cadastrais para um paciente e seus contatos de responsável
- **THEN** o sistema deve validar os novos dados, atualizar os registros correspondentes e retornar a representação atualizada com código HTTP 200 OK.

### Requirement: Inativação Lógica de Pacientes (Soft Delete)
The system SHALL implement soft deletion for patients by setting the active flag to false, ensuring clinical records, history, and relations remain intact in the database.

#### Scenario: Inativação de paciente ativo
- **WHEN** o usuário confirmar a ação de inativação de um paciente com status ativo
- **THEN** o sistema deve alterar o campo status do paciente para inativo (false), remover o paciente da listagem padrão de ativos e manter o registro preservado no banco de dados.

#### Scenario: Reativação de paciente inativo
- **WHEN** o usuário solicitar a reativação de um paciente previamente inativado
- **THEN** o sistema deve atualizar o status para ativo (true), disponibilizando o paciente novamente para agendamentos e rotinas da clínica.
