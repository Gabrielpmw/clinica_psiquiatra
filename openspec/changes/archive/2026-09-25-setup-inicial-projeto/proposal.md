# Proposal: Configuração Inicial do Projeto e Repositório (Atividade 4)

## Why

Para iniciar o desenvolvimento do Sistema de Apoio à Clínica (MVP de estágio), é necessário estabelecer a infraestrutura base e a espinha dorsal da aplicação sob uma arquitetura estruturada em MVC (Model-View-Controller). O projeto requer uma arquitetura conteinerizada e desacoplada em três serviços (Front-end React como View, Back-end Django/DRF como Controller/Model e Banco PostgreSQL para persistência dos Models), com persistência segura por volumes Docker e modelo base com chaves primárias UUID v4 para mitigar riscos de enumeração (IDOR) e garantir conformidade com a LGPD desde a concepção (Privacy by Design).

Esta etapa atende diretamente à **Atividade 4 do Plano de Atividades de Estágio** e aos requisitos não funcionais **RNF05**, **RNF06**, **RNF07**, **RNF09**, **RNF11** e **RNF12**.

## What Changes

- **Padrão Arquitetural MVC (Model-View-Controller):**
  - Definição formal das responsabilidades em camadas: **Model** (Django ORM / PostgreSQL), **View** (React UI / Tailwind) e **Controller** (Django Views, ViewSets, Serializers e Services na API, com hooks/services de controle no front-end).

- **Infraestrutura Docker:**
  - Criação do `docker-compose.yml` orquestrando os serviços `backend`, `frontend` e `db` (PostgreSQL) com rede compartilhada e volume persistente nomeado para dados do PostgreSQL (`RNF11`, `RNF12`).
  - Criação do `backend/Dockerfile` e `frontend/Dockerfile` otimizados para ambiente de desenvolvimento com hot-reload.
  - Criação de arquivos `.env.example` para back-end e front-end sem credenciais sensíveis versionadas.

- **Back-end (Django + Django REST Framework - Camadas Model e Controller):**
  - Inicialização do projeto Django (`core` ou `clinica_api`) configurado para Django REST Framework (DRF) e CORS (`corsheaders`).
  - Conexão configurada para PostgreSQL via variáveis de ambiente (`RNF09`).
  - Criação do modelo de dados base `Usuario` (Model) utilizando chave primária `UUID` (`RNF05`) com campos: `id`, `nome`, `email`, `senha`, `role` (`ADMINISTRACAO`, `SECRETARIA`, `DOUTORA`), `status` (ativo/inativo) e `dataCriacao`.
  - Migrações iniciais do banco de dados e endpoints/controllers para verificação de saúde da conexão (`healthcheck`).

- **Front-end (React + Vite + Tailwind CSS - Camada View):**
  - Inicialização do projeto React com Vite e TypeScript ou JavaScript moderno.
  - Configuração do Tailwind CSS alinhada às diretrizes visuais do [design.md](../../contextoSistema/design.md) (paleta `teal`, fundos `slate-50`, suporte à fonte `Inter`).
  - Estrutura de roteamento inicial com React Router.
  - Tela de login "casca" inicial (layout limpo, campos de e-mail e senha, botão de login estilizado) servindo de ponto de entrada para navegação nos desafios posteriores.

## Capabilities

### New Capabilities
- `system-foundation`: Configuração inicial da infraestrutura Docker, arquitetura MVC (React View + Django Controller/Model + PostgreSQL), API com chaves UUID e aplicação React com tema base e tela inicial de autenticação.

### Modified Capabilities
*(Nenhuma especificação prévia alterada - projeto inicial greenfield)*

## Impact

- **Código:** Criação dos diretórios `backend/` e `frontend/` na raiz do repositório, organizados em camadas MVC, além dos arquivos de orquestração Docker (`docker-compose.yml`, `.dockerignore`, `.env.example`).
- **APIs:** Endpoint básico de healthcheck (`/api/health/`) e endpoint inicial do usuário/autenticação embrionária.
- **Dependências:**
  - Back-end: `django`, `djangorestframework`, `django-cors-headers`, `psycopg2-binary` (ou `psycopg[binary]`), `python-dotenv`.
  - Front-end: `react`, `react-dom`, `react-router-dom`, `tailwindcss`, `lucide-react`, `axios` (ou fetch client).
  - Infra: Docker Compose com PostgreSQL 16+ e volume persistente.
