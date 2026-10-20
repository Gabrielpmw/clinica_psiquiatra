# Design

## Context

O projeto é uma aplicação web Django + React em contêineres Docker (ver `proposal.md` — Why). O back-end já possui os apps `pacientes` e `usuarios` com padrão ModelViewSet + DRF. O banco é PostgreSQL com UUIDs como PKs (RNF05). O front-end usa React Router com contexto de autenticação JWT. Os Desafios 6 e 7 introduzem dois novos apps Django (`agenda` e `prontuario`) e novas telas no React, sem alterar os apps existentes além de adicionar colunas às entidades `Sessao` e `Anamnese`.

## Goals / Non-Goals

**Goals:**
- Criar app `agenda` no Django com models `Sessao`, `Disponibilidade` e `Bloqueio`, endpoints REST e serializers.
- Adicionar coluna `tipo` (AVALIATIVA / INTERVENTIVA) à entidade `Sessao`.
- Criar app `prontuario` com models `Anamnese` e `AnotacaoSessao` e endpoints REST.
- Adicionar coluna `observacoesGerais` (texto livre) à entidade `Anamnese`.
- Criar telas de Agenda (dia/semana), Lista de Pacientes do Dia e Prontuário no React.
- Implementar notificações visuais via toast/alert no front-end para alterações na agenda.

**Non-Goals:**
- Implementar RBAC completo (reservado ao Desafio 10); as rotas existirão em dev sem bloqueio por perfil.
- Integração com calendários externos (Google Calendar etc.).
- Notificações por e-mail/SMS.
- Versão mobile (RNF07).

## Decisions

### 1. Dois apps Django separados: `agenda` e `prontuario`
**Motivo:** separa claramente as responsabilidades de agendamento (RF03–RF06) das de registro clínico (RF07, RF09), seguindo o padrão modular já adotado no projeto (`pacientes`, `usuarios`). Cada app terá seus próprios `models.py`, `serializers.py`, `views.py` e `urls.py`.

### 2. Model `Sessao` no app `agenda`
A entidade `Sessao` (descrita nas Entidades do sistema) será implementada neste desafio. Atributos:
- `id` UUID v4 (PK)
- `paciente` FK → `Paciente`
- `usuario` FK → `Usuario` (quem conduziu/agendou)
- `dataHoraInicio` DateTimeField
- `dataHoraFim` DateTimeField
- `status` CharField com choices: `AGENDADA`, `CANCELADA`, `FALTA`, `REALIZADA`
- `tipo` CharField com choices: `AVALIATIVA`, `INTERVENTIVA` ← **novo campo (Desafio 6/7)**

### 3. Model `Anamnese` no app `prontuario`
A entidade `Anamnese` (descrita nas Entidades do sistema) será implementada aqui. Atributos conforme especificado, adicionando:
- `observacoesGerais` TextField (null=True, blank=True) ← **novo campo solicitado pelo usuário**

### 4. Notificação visual via estado React (toast)
Ao invés de WebSockets ou SSE (complexidade desnecessária para o MVP), as notificações serão disparadas no front-end imediatamente após chamadas bem-sucedidas à API (criação, cancelamento, bloqueio). Usar uma biblioteca leve de toast (ex.: `react-hot-toast`) ou um componente próprio de alerta, consistente com o design-layout-verde do projeto.

### 5. Rotas de API
- `GET/POST /api/agenda/sessoes/` — lista e criação de sessões
- `GET/PATCH /api/agenda/sessoes/<uuid>/` — detalhe, atualização e status
- `GET/POST /api/agenda/disponibilidade/` — slots de disponibilidade da doutora
- `GET/POST /api/agenda/bloqueios/` — bloqueios de horário
- `GET/PUT /api/prontuario/anamnese/<paciente_uuid>/` — leitura e edição da anamnese
- `GET/POST /api/prontuario/anotacoes/<paciente_uuid>/` — lista e criação de anotações de sessão

### 6. Telas React
- `AgendaPage` com toggle dia/semana e componentes `DayView` / `WeekView`
- `PatientDayListPage` ou integrada à `AgendaPage` como painel lateral
- `ProntuarioPage` com seções `AnamneseBlock` e `SessionNotesTimeline`
- Novas rotas: `/agenda`, `/prontuario/:pacienteId`

## Risks / Trade-offs

- **Ausência de RBAC temporária:** as rotas do `prontuario` ficam acessíveis pela secretária até o Desafio 10. Risco temporário aceito (documentado no PRD, seção 10).
- **Detecção de conflito de horário:** a validação de sobreposição de sessões será feita no serializer DRF. Sem lock pessimista, existe baixa chance de race condition em ambiente de produção com muitos usuários simultâneos — aceitável para o MVP com uma única doutora.
- **Campo `tipo` na Sessão:** adicionar uma nova coluna com default `AVALIATIVA` garante que sessões existentes (se houver dados de dev) não quebrem.

## Migration Plan

1. Criar migration no app `agenda` adicionando o model `Sessao` com o campo `tipo`.
2. Criar migration no app `prontuario` adicionando os models `Anamnese` e `AnotacaoSessao` com o campo `observacoesGerais`.
3. Registrar os novos apps em `INSTALLED_APPS` no `settings.py`.
4. Conectar as novas URLs em `core/urls.py`.
5. Rodar `makemigrations` + `migrate` no contêiner `backend`.
6. Implementar telas React e conectar via axios ao endpoint da API.
