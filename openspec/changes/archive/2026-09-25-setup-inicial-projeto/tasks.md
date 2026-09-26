# Tasks: Setup Inicial do Projeto e Repositório (Atividade 4 - MVC)

## 1. Estrutura Base e Orquestração Docker

- [x] 1.1 Criar a estrutura básica de diretórios seguindo o padrão MVC (`backend/apps/`, `frontend/src/{components,pages,services}`), arquivos de exclusão (`.gitignore`, `.dockerignore`) e `.env.example` na raiz, verificando a criação de todos os arquivos.
- [x] 1.2 Criar o arquivo `docker-compose.yml` orquestrando os serviços `db` (PostgreSQL 16), `backend` (Django Controller/Model) e `frontend` (React View), configurando rede interna e volume persistente nomeado `postgres_data`, verificando a validação sintática via `docker compose config`.

## 2. Configuração do Back-end MVC (Django + DRF + PostgreSQL)

- [x] 2.1 Criar `backend/Dockerfile` e `backend/requirements.txt` incluindo `Django`, `djangorestframework`, `django-cors-headers`, `psycopg2-binary` e `python-dotenv`, verificando que os arquivos foram gerados e estruturados.
- [x] 2.2 Inicializar o projeto Django e estruturar o `settings.py` para carregar variáveis de ambiente, configurar CORS para o front-end e definir a conexão com o PostgreSQL, verificando a integridade das configurações via `python manage.py check`.
- [x] 2.3 Criar o app `usuarios` no padrão MVC: camada Model em `models.py` com o modelo customizado `Usuario` utilizando UUID v4 como chave primária, campos de perfil (`ADMINISTRACAO`, `SECRETARIA`, `DOUTORA`), status booleano e timestamps, configurando `AUTH_USER_MODEL` e gerando os arquivos de migração iniciais.
- [x] 2.4 Implementar a camada Controller para verificação de saúde da API (`views.py` e `urls.py`) respondendo em `/api/health/` validando a conexão ativa com o PostgreSQL, verificando resposta HTTP 200 com payload JSON `{"status": "ok", "database": "connected"}`.

## 3. Configuração do Front-end MVC (React View + Vite + Tailwind CSS)

- [x] 3.1 Inicializar o projeto React com Vite no diretório `frontend/`, configurando `package.json` com `react-router-dom`, `lucide-react`, `tailwindcss`, `postcss` e `autoprefixer`, organizando a estrutura de pastas em camadas (`components/` e `pages/` para Views, `services/` para Controllers de API).
- [x] 3.2 Criar `frontend/Dockerfile` configurado para desenvolvimento com Hot Module Replacement (HMR) e portas expostas.
- [x] 3.3 Configurar o Tailwind CSS (`tailwind.config.js` e `index.css`) com as cores e tokens do design system (`teal-600/700`, `slate-50`, tipografia `Inter` e cores semânticas), verificando a correta compilação do estilo.
- [x] 3.4 Implementar a View da tela de login "casca" (formulário centralizado em cartão branco sobre fundo `slate-50`, campos de e-mail e senha, botão estilizado `teal-600`) e roteador base, verificando que o componente renderiza sem erros no navegador.

## 4. Integração dos Serviços e Validação do Ambiente

- [x] 4.1 Construir e iniciar os contêineres via `docker compose up --build -d`, verificando que os serviços `frontend`, `backend` e `db` sobem e permanecem no estado `Up` / `healthy`.
- [x] 4.2 Executar as migrações no banco de dados via contêiner (`docker compose exec backend python manage.py migrate`), verificando no terminal a aplicação de todas as migrações sem erros.
- [x] 4.3 Testar a persistência do volume Docker reiniciando o serviço de banco (`docker compose restart db`) e conferindo a manutenção do schema.
- [x] 4.4 Acessar a aplicação front-end no navegador em `http://localhost:5173`, confirmando visualização da tela de login (View) e comunicação com a API (Controller) no endpoint `/api/health/`.
