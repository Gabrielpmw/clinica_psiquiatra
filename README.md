# Sistema de Apoio à Clínica - Psiquiatria Infantojuvenil

Sistema completo para gestão de pacientes, anamnese estruturada, prontuário clínico e apoio diagnóstico para psiquiatria infantojuvenil com controle de acesso baseado em papéis (RBAC).

---

## 🛠️ Tecnologias Utilizadas

- **Front-end**: React 18, Vite, Tailwind CSS, Lucide Icons, Axios.
- **Back-end**: Python 3.12, Django 5.1, Django REST Framework, SimpleJWT.
- **Banco de Dados**: PostgreSQL 16.
- **Infraestrutura**: Docker & Docker Compose.

---

## 🚀 Como Rodar o Projeto no seu Computador / Notebook

### Pré-requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e rodando.
- [Git](https://git-scm.com/) instalado.

---

### Passo a Passo

1. **Clonar o Repositório:**
   ```bash
   git clone https://github.com/Gabrielpmw/clinica_psiquiatra.git
   cd clinica_psiquiatra
   ```

2. **Configurar as Variáveis de Ambiente:**
   Copie o arquivo de exemplo para criar seu `.env`:
   - No Linux/macOS:
     ```bash
     cp .env.example .env
     ```
   - No Windows (PowerShell):
     ```powershell
     Copy-Item .env.example .env
     ```

3. **Subir os Contêineres com Docker Compose:**
   ```bash
   docker compose up --build -d
   ```

4. **Aplicar as Migrações do Banco de Dados:**
   ```bash
   docker exec clinica_backend python manage.py migrate
   ```

5. **Popular Banco com Dados Simulados (Demonstração Completa):**
   Para limpar registros anteriores e carregar dados realistas (Doutor, Secretária, 12 pacientes, prontuários, anamneses e agenda):
   ```bash
   docker exec clinica_backend python manage.py popular_dados
   ```
   *(Ou localmente com Python: `python manage.py popular_dados`)*

---

## 🌐 Endereços de Acesso

- **Aplicação Web (Front-end):** [http://localhost:5173](http://localhost:5173)
- **API Back-end:** [http://localhost:8000/api/](http://localhost:8000/api/)
- **Painel Administrativo Django:** [http://localhost:8000/admin/](http://localhost:8000/admin/)

---

## 🔑 Credenciais Padrão de Acesso

### Acesso ao Sistema Web:
- **Administrador:**
  - **E-mail:** `admin@clinica.com`
  - **Senha:** `admin123456`
- **Secretária (Milena Almeida Alves Vieira):**
  - **E-mail:** `milena@gmail.com`
  - **Senha:** `Milena@123`
- **Doutor (Gabriel Vieira Ribeiro):**
  - **E-mail:** `gabriel@gmail.com`
  - **Senha:** `Gabriel@123`

### Acesso ao Banco de Dados (pgAdmin / DBeaver / Terminal):
- **Host:** `localhost` (ou `127.0.0.1`)
- **Porta:** `5433`
- **Banco:** `clinica_db`
- **Usuário:** `clinica_user`
- **Senha:** `clinica_pass_dev_change_me`

---

## 🧪 Executar Testes Automatizados

```bash
# Testes unitários e de integração do back-end
docker exec clinica_backend python manage.py test

# Validação do build do front-end
docker exec clinica_frontend npm run build
```
