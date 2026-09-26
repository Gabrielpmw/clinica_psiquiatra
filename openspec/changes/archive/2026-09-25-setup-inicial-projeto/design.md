# Design: Setup Inicial do Projeto e Repositório

## Context

O projeto parte de um repositório vazio e precisa estruturar três camadas principais (Front-end, Back-end e Banco de Dados) orquestradas via contêineres Docker, sob o padrão arquitetural **MVC (Model-View-Controller)**, conforme detalhado no [PRD.md](../../contextoSistema/PRD.md) e [Plano de atividade.md](../../contextoSistema/Plano%20de%20atividade.md) (Atividade 4).

Restrições técnicas determinantes:
- Padrão arquitetural MVC aplicado à integração web cliente-servidor.
- Ambiente de desenvolvimento em Windows com Docker Desktop.
- Separação total de processos entre cliente web e API REST (`RNF09`, `RNF11`).
- Persistência obrigatória do PostgreSQL através de volumes nomeados (`RNF12`).
- Adoção de UUID v4 como chave primária desde a primeira migração do banco (`RNF05`).

## Goals / Non-Goals

**Goals:**
- Configurar arquitetura MVC clara:
  - **Model:** Django Models no PostgreSQL para representação e regras de integridade das entidades.
  - **View:** React SPA (Pages, Components, Tailwind) para apresentação e captura de eventos do usuário.
  - **Controller:** Django REST Framework (URLs, Views/ViewSets, Serializers e Services) para validação, orquestração e regras de negócio da API.
- Configurar `docker-compose.yml` unificado com três serviços: `frontend` (porta 5173), `backend` (porta 8000) e `db` (PostgreSQL 16, porta 5432).
- Estabelecer volume Docker nomeado para persistência do PostgreSQL (`postgres_data`).
- Criar projeto Django (`core`) configurado com Django REST Framework, `django-cors-headers` e conexão via variáveis de ambiente com o PostgreSQL.
- Implementar modelo base `Usuario` (Model) herdando de `AbstractBaseUser` com UUID v4 como chave primária, campos de perfil (`ADMINISTRACAO`, `SECRETARIA`, `DOUTORA`) e status, configurado como `AUTH_USER_MODEL`.
- Disponibilizar endpoint controller `/api/health/` para atestar conectividade da API com o banco de dados.
- Criar aplicação React (via Vite) com Tailwind CSS configurado segundo [design.md](../../contextoSistema/design.md) (paleta `teal-600`, `slate-50`, tipografia `Inter`).
- Estruturar roteamento (React Router) e tela de login inicial "casca" (View).

**Non-Goals:**
- Implementação de regras de autorização RBAC nas rotas ou bloqueio 403 (reservado estritamente para a Atividade 10).
- Emissão e renovação de tokens JWT (reservado para a Atividade 10).
- Modelagem de entidades clínicas ou de agendamento (`Paciente`, `Endereco`, `Sessao`, `Anamnese`, etc. - Atividades 5 a 7).
- Integração com a API do Google Gemini (Atividades 8 e 9).
- Configuração de proxy reverso Nginx com certificados SSL de produção (etapa de homologação/entrega).

## Decisions

### 1. Padrão Arquitetural MVC (Model-View-Controller)
- **Decisão:** Estruturar a aplicação distribuída no padrão MVC:
  - **Model (M):** Reside no Back-end (`backend/apps/*/models.py`). Modela os dados em classes Python refletidas no PostgreSQL via ORM do Django. Toda integridade referencial, campos de data e regras de persistência (como soft-delete e UUID v4) pertencem a essa camada.
  - **View (V):** Reside no Front-end (`frontend/src/pages/` e `frontend/src/components/`). É responsável pela renderização da interface gráfica, formulários, feedbacks visuais (loading states conforme RNF08) e aplicação do Design System com Tailwind CSS. A View não acessa o banco diretamente; ela emite eventos HTTP/REST para o Controller.
  - **Controller (C):** Reside no Back-end (`backend/apps/*/views.py` ou `viewsets.py`, `serializers.py` e `services.py`), com endpoints roteados em `urls.py`. Recebe os payloads da View, valida permissões e formatos, executa as regras de negócio da clínica (sanitização, cálculos de agenda) e invoca os Models. No Front-end complementar, hooks customizados (`frontend/src/hooks/`) e clientes HTTP (`frontend/src/services/api.js`) atuam como controladores de estado local.

```
+---------------------------------------------------------------------------------+
|                                FLUXO MVC                                        |
|                                                                                 |
|   1. Usuário interage com a interface (View)                                    |
|      [React UI Component]                                                       |
|            |                                                                    |
|            | 2. Dispara requisição HTTP (ex: POST /api/...)                     |
|            v                                                                    |
|   [Django Controller: URLs -> ViewSet / Serializer]                             |
|      - Valida payload de entrada                                                |
|      - Executa regra de negócio                                                 |
|            |                                                                    |
|            | 3. Consulta / Grava                                                |
|            v                                                                    |
|   [Django Model: Usuario ORM -> PostgreSQL]                                     |
|            |                                                                    |
|            | 4. Retorna dados persistidos                                       |
|            v                                                                    |
|   [Django Controller: Serializa para JSON]                                      |
|            |                                                                    |
|            | 5. Responde HTTP 200/201 com JSON                                  |
|            v                                                                    |
|   6. View atualiza o estado e renderiza para o usuário                          |
+---------------------------------------------------------------------------------+
```

### 2. Estrutura de Diretórios do Repositório (Refletindo MVC)
- **Decisão:** Organizar os diretórios em pastas modulares explícitas:
  ```text
  clinica/
  ├── backend/
  │   ├── Dockerfile
  │   ├── requirements.txt
  │   ├── manage.py
  │   ├── core/                  # Configurações gerais (settings, urls, wsgi)
  │   └── apps/
  │       └── usuarios/          # App de Usuários (Model: models.py | Controller: views.py, serializers.py)
  ├── frontend/
  │   ├── Dockerfile
  │   ├── package.json
  │   ├── vite.config.js
  │   ├── tailwind.config.js
  │   └── src/
  │       ├── components/        # Views reutilizáveis (botões, cards, inputs)
  │       ├── pages/             # Views completas (Login, Dashboard)
  │       ├── services/          # Controladores de comunicação com a API
  │       └── routes/            # Roteamento de telas
  ├── docker-compose.yml
  ├── .env.example
  └── .gitignore
  ```

### 3. Modelo de Usuário Customizado (`AUTH_USER_MODEL`) com UUID no Desafio 4
- **Decisão:** Definir o modelo `Usuario` (Model) customizado com UUID v4 como `id` logo na primeira migração do Django.
- **Justificativa:** O Django desaconselha alterar o modelo de usuário após a execução das primeiras migrações. Criar a classe `Usuario` agora com UUID v4 (`RNF05`) garante que todo o relacionamento futuro aponte diretamente para o modelo correto sem retrabalho de schema.

### 4. Build do Front-end com Vite
- **Decisão:** Utilizar Vite para scaffolding do projeto React.
- **Justificativa:** Leveza, HMR veloz e excelente integração com contêineres Docker e Tailwind CSS.

### 5. Configuração de Tema do Tailwind CSS
- **Decisão:** Centralizar os tokens de design do [design.md](../../contextoSistema/design.md) no `tailwind.config.js` do React:
  - Cores de marca: `teal.600` e `teal.700`.
  - Fundos e superfícies: `slate.50` como background padrão.
  - Cores semânticas de status: `emerald.500` (realizada), `blue.500`/`amber.500` (agendada), `rose.500` (cancelada/falta).

### 6. Gestão de Credenciais e Arquivos `.env`
- **Decisão:** Fornecer `.env.example` na raiz, em `backend/` e `frontend/`, mantendo os arquivos `.env` ignorados no `.gitignore`.

## Risks / Trade-offs

- **[Risco] Quebra de linha em scripts de inicialização (Windows CRLF vs Linux LF no Docker):**
  - *Mitigação:* Usar comandos diretos no `docker-compose.yml` (`command: ...`) ou garantir arquivos com encoding LF caso utilize scripts `.sh`.
- **[Risco] Problemas de CORS entre container front-end (View) e back-end (Controller):**
  - *Mitigação:* Configurar `django-cors-headers` permitindo explicitamente `http://localhost:5173` e `http://127.0.0.1:5173` em ambiente de desenvolvimento.
- **[Risco] Ordem de inicialização do PostgreSQL vs Django:**
  - *Mitigação:* Utilizar `depends_on` no Docker Compose com healthcheck no PostgreSQL para que o backend só inicie quando o banco estiver pronto para receber conexões.

## Migration Plan

1. Inicializar estrutura de diretórios (`backend/`, `frontend/`) no padrão MVC.
2. Configurar arquivos de ambiente (`.env.example`).
3. Construir `docker-compose.yml` com serviços `db`, `backend` e `frontend`.
4. Criar projeto Django e aplicar migração inicial com modelo `Usuario` (Model com UUID).
5. Configurar views/controllers no Django para `/api/health/`.
6. Criar projeto React com Vite, Tailwind CSS e rota para tela de login "casca" (View).
7. Validar subida dos serviços e resposta do `/api/health/`.
