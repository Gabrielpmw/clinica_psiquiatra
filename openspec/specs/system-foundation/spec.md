# system-foundation Specification

## Purpose
Fornece a infraestrutura base conteinerizada (Docker Compose), a espinha dorsal da API em Django com persistência no PostgreSQL e a casca desktop da interface em React com tema Tailwind.

## Requirements

### Requirement: Isolamento de Serviços e Persistência em Contêineres
The system SHALL orchestrate the Front-end (React), Back-end (Django/DRF) and Database (PostgreSQL) services in independent containers via Docker Compose, guaranteeing network isolation and data persistence via named Docker volumes.

#### Scenario: Subida dos serviços integrados via Docker Compose
- **WHEN** o comando de inicialização do Docker Compose for executado
- **THEN** os contêineres do front-end, back-end e banco de dados devem iniciar com sucesso e comunicar-se na mesma rede interna sem falhas de conexão.

#### Scenario: Persistência de dados após reinício de contêiner
- **WHEN** o contêiner do PostgreSQL for reiniciado ou recriado
- **THEN** todos os esquemas e dados gravados no banco devem permanecer intactos graças ao volume persistente montado.

### Requirement: Entidade Base de Usuário com Chave Primária UUID
The system SHALL implement the base database entity `Usuario` with an Universally Unique Identifier (UUID v4) as the primary key, preventing enumeration attacks and establishing the foundation for future role-based access control (RBAC).

#### Scenario: Criação de registro de usuário com UUID v4
- **WHEN** um novo registro de usuário for gravado no banco de dados
- **THEN** o identificador gerado deve ser um UUID v4 válido e único, com os campos nome, e-mail, senha criptografada, perfil (ADMINISTRACAO, SECRETARIA ou DOUTORA) e status booleano.

### Requirement: Verificação de Saúde da API e Conectividade
The API SHALL provide a health check endpoint (`/api/health/`) verifying the Django application operational status and active PostgreSQL database connectivity.

#### Scenario: Requisição de status da API com banco operacional
- **WHEN** uma requisição GET for enviada para `/api/health/`
- **THEN** a API deve responder com código HTTP 200, status operacional em JSON e tempo de resposta inferior a 2 segundos em condições normais.

### Requirement: Casca Inicial da Interface Web e Tela de Acesso
The front-end application SHALL render a desktop-first shell styled according to the clinic's design system using React and Tailwind CSS, presenting an initial login interface for navigation.

#### Scenario: Visualização da tela de login inicial
- **WHEN** o usuário acessar a rota raiz da aplicação no navegador desktop
- **THEN** o sistema deve renderizar a tela de login com paleta de cores teal/slate, campos para e-mail e senha, e botão de ação primária sem travar ou acusar erros de console.
