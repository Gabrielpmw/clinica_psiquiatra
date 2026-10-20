# Tasks

## 1. Back-end — App `agenda` (model Sessao, Disponibilidade e Bloqueio)

- [x] 1.1 Criar o app Django `agenda` (`python manage.py startapp agenda`) dentro de `backend/apps/` e registrá-lo em `INSTALLED_APPS` no `settings.py`. Verificar que `python manage.py check` não retorna erros.
- [x] 1.2 Implementar o model `Sessao` em `backend/apps/agenda/models.py` com os campos: `id` (UUID v4), `paciente` (FK → Paciente), `usuario` (FK → Usuario), `dataHoraInicio`, `dataHoraFim`, `status` (choices: AGENDADA, CANCELADA, FALTA, REALIZADA), `tipo` (choices: AVALIATIVA, INTERVENTIVA, default=AVALIATIVA). Verificar com `python manage.py makemigrations agenda` que a migration é gerada sem erros.
- [x] 1.3 Implementar o model `Disponibilidade` em `backend/apps/agenda/models.py` com os campos: `id` (UUID v4), `usuario` (FK → Usuario), `diaSemana` (IntegerField 0–6), `horaInicio` (TimeField), `horaFim` (TimeField). Verificar que a migration inclui a tabela.
- [x] 1.4 Implementar o model `Bloqueio` em `backend/apps/agenda/models.py` com os campos: `id` (UUID v4), `usuario` (FK → Usuario), `dataHoraInicio` (DateTimeField), `dataHoraFim` (DateTimeField), `motivo` (CharField, max_length=255). Verificar que a migration inclui a tabela.
- [x] 1.5 Rodar `python manage.py migrate` dentro do contêiner e verificar que as três tabelas (`agenda_sessao`, `agenda_disponibilidade`, `agenda_bloqueio`) existem no banco PostgreSQL.
- [x] 1.6 Criar `SessaoSerializer`, `DisponibilidadeSerializer` e `BloqueioSerializer` em `backend/apps/agenda/serializers.py`, validando que `dataHoraFim > dataHoraInicio` e detectando sobreposição de sessões no `validate()` do `SessaoSerializer`. Verificar com teste unitário que a validação de sobreposição rejeita sessões conflitantes.
- [x] 1.7 Criar `SessaoViewSet` (ModelViewSet) e `DisponibilidadeViewSet` e `BloqueioViewSet` em `backend/apps/agenda/views.py`. Adicionar action `@action` `atualizar_status` no `SessaoViewSet` (PATCH) para alteração de status sem sobrescrever outros campos. Verificar com teste de integração que `PATCH /api/agenda/sessoes/<uuid>/atualizar_status/` retorna 200 com o status atualizado.
- [x] 1.8 Criar `backend/apps/agenda/urls.py` com os roteadores DRF e conectar em `backend/core/urls.py` com o prefixo `/api/agenda/`. Verificar que `GET /api/agenda/sessoes/` retorna 200 (lista vazia) com usuário autenticado.
- [x] 1.9 Registrar os models no `backend/apps/agenda/admin.py` para facilitar inspeção via admin Django. Verificar que as tabelas aparecem no painel `/admin/`.

## 2. Back-end — App `prontuario` (models Anamnese e AnotacaoSessao)

- [x] 2.1 Criar o app Django `prontuario` (`python manage.py startapp prontuario`) dentro de `backend/apps/` e registrá-lo em `INSTALLED_APPS`. Verificar com `python manage.py check` sem erros.
- [x] 2.2 Implementar o model `Anamnese` em `backend/apps/prontuario/models.py` com os campos definidos nas Entidades do sistema: `id` (UUID v4), `paciente` (OneToOneField → Paciente), `escolaridade`, `tipoParto`, `intercorrencias`, `seletividadeAlimentar`, `dificuldadeRotina`, `sensibilidadeEtiquetas`, `historicoFamiliar`, `adesaoRegras` (todos TextField, blank=True), `observacoesGerais` (TextField, null=True, blank=True — campo adicional de texto livre), `dataRegistro` (auto_now_add), `dataUltimaAtualizacao` (auto_now). Verificar com `makemigrations` que o campo `observacoesGerais` aparece.
- [x] 2.3 Implementar o model `AnotacaoSessao` em `backend/apps/prontuario/models.py` com os campos: `id` (UUID v4), `sessao` (OneToOneField → Sessao de `agenda`), `textoLivre` (TextField), `dataRegistro` (auto_now_add). Verificar que a migration inclui a tabela e a FK para `agenda_sessao`.
- [x] 2.4 Rodar `python manage.py migrate` e verificar que as tabelas `prontuario_anamnese` e `prontuario_anotacaosessao` existem no banco.
- [x] 2.5 Criar `AnamneseSerializer` e `AnotacaoSessaoSerializer` em `backend/apps/prontuario/serializers.py`. O `AnamneseSerializer` DEVE incluir `paciente_data` (data de nascimento via `source='paciente.dataNascimento'` em read-only) para o cabeçalho do prontuário. Verificar com teste unitário que o campo é retornado corretamente.
- [x] 2.6 Criar views em `backend/apps/prontuario/views.py`: `AnamneseView` (RetrieveUpdateAPIView, filtrado por `paciente_id`) e `AnotacaoSessaoViewSet` (ListCreateAPIView filtrado por `sessao__paciente`). Verificar com teste de integração que `GET /api/prontuario/anamnese/<paciente_uuid>/` retorna 200 com os campos corretos.
- [x] 2.7 Criar `backend/apps/prontuario/urls.py` e conectar em `backend/core/urls.py` com o prefixo `/api/prontuario/`. Verificar que `GET /api/prontuario/anotacoes/<paciente_uuid>/` retorna 200 com lista vazia.
- [x] 2.8 Registrar os models no `backend/apps/prontuario/admin.py`. Verificar que as tabelas aparecem no painel `/admin/`.

## 3. Front-end — Tela de Agenda

- [x] 3.1 Criar o serviço `frontend/src/services/agendaService.js` com funções axios para `getSessoesDia(data)`, `getSessoesSemanais(dataInicio)`, `criarSessao(dados)`, `atualizarStatusSessao(uuid, status)`, `getDisponibilidades()`, `criarBloqueio(dados)` e `cancelarSessao(uuid)`. Verificar que as funções retornam dados da API em ambiente local.
- [x] 3.2 Criar o componente `frontend/src/components/Notification/Toast.jsx` (ou integrar biblioteca `react-hot-toast`) para notificações visuais de alteração na agenda. Verificar que o toast aparece ao chamar a função de disparo manualmente.
- [x] 3.3 Criar `frontend/src/pages/AgendaPage.jsx` com toggle de visão (Dia / Semana) e sub-componentes `DayView.jsx` e `WeekView.jsx` em `frontend/src/components/Agenda/`. O `DayView` exibe sessões de uma data em lista ordenada por horário. O `WeekView` exibe uma grade de 7 colunas (seg–dom) com sessões posicionadas por horário. Verificar que as sessões retornadas pela API aparecem corretamente nos dois modos de visualização.
- [x] 3.4 Implementar modal de criação de sessão (`SessionFormModal.jsx`) acessível a partir da agenda, com campos: paciente (seleção), data, hora de início, duração (em minutos, converte para `dataHoraFim`), tipo (AVALIATIVA / INTERVENTIVA). Ao confirmar, chamar `criarSessao()` e disparar toast de confirmação. Verificar que a sessão aparece na agenda sem recarregar a página.
- [x] 3.5 Implementar modal de bloqueio de horário (`BloqueioModal.jsx`) acessível pela doutora na agenda, com campos: data/hora início, data/hora fim, motivo. Ao confirmar, chamar `criarBloqueio()` e disparar toast. Verificar que o slot bloqueado aparece com indicação visual na agenda.
- [x] 3.6 Adicionar dropdown de alteração de status (AGENDADA / CANCELADA / FALTA / REALIZADA) em cada item da agenda. Ao alterar, chamar `atualizarStatusSessao()` e disparar toast. Verificar que o status atualizado é refletido imediatamente na UI.
- [x] 3.7 Adicionar rota `/agenda` em `frontend/src/routes/AppRoutes.jsx` protegida por `ProtectedRoute`. Verificar que a página carrega sem erro de rota.

## 4. Front-end — Lista de Pacientes do Dia

- [x] 4.1 Criar o componente `frontend/src/components/Agenda/PatientDayList.jsx` que exibe a lista de sessões do dia com nome do paciente, horário, tipo de sessão e status. Integrar com `getSessoesDia(hoje)`. Verificar que a lista reflete os dados da API.
- [x] 4.2 Integrar `PatientDayList` como painel lateral ou seção inferior na `AgendaPage` quando a visão "Dia" estiver ativa. Verificar que a lista e a agenda exibem os mesmos dados consistentemente.
- [x] 4.3 Adicionar link/botão "Ver Prontuário" em cada item da lista do dia que navega para `/prontuario/:pacienteId`. Verificar que a navegação carrega o prontuário correto.

## 5. Front-end — Tela de Prontuário

- [x] 5.1 Criar o serviço `frontend/src/services/prontuarioService.js` com funções axios para `getAnamnese(pacienteId)`, `atualizarAnamnese(pacienteId, dados)`, `getAnotacoes(pacienteId)` e `criarAnotacao(dados)`. Verificar que as funções retornam dados corretos.
- [x] 5.2 Criar `frontend/src/pages/ProntuarioPage.jsx` com duas seções: `AnamneseBlock` (bloco superior) e `SessionNotesTimeline` (seção inferior). A página DEVE exibir no cabeçalho o nome do paciente e sua data de nascimento (retornados pela API). Verificar que a página carrega dados reais do paciente selecionado.
- [x] 5.3 Criar `frontend/src/components/Prontuario/AnamneseBlock.jsx` com todos os campos de anamnese (escolaridade, tipo de parto, intercorrências, seletividade alimentar, dificuldade com rotina, sensibilidade a etiquetas, histórico familiar, adesão a regras) como áreas de texto editáveis, mais o campo "Observações Gerais" (texto livre adicional). Ao salvar, chamar `atualizarAnamnese()` e exibir confirmação. Verificar que as alterações persistem após recarregar a página.
- [x] 5.4 Criar `frontend/src/components/Prontuario/SessionNotesTimeline.jsx` que exibe as anotações de sessão em ordem cronológica crescente, mostrando para cada item: data/hora do registro, tipo de sessão (AVALIATIVA / INTERVENTIVA) e texto da anotação. Verificar que as anotações aparecem na ordem correta.
- [x] 5.5 Adicionar formulário inline (ou modal) para a doutora inserir nova anotação de sessão na `SessionNotesTimeline` (campo de texto livre + seleção de sessão ou vínculo automático com sessão do dia). Ao salvar, chamar `criarAnotacao()` e inserir a nova anotação no topo da timeline sem recarregar. Verificar que a anotação aparece imediatamente.
- [x] 5.6 Adicionar rota `/prontuario/:pacienteId` em `AppRoutes.jsx` protegida por `ProtectedRoute`. Verificar que a rota funciona com diferentes UUIDs de paciente.

## 6. Testes e Verificação

- [x] 6.1 Escrever testes unitários em `backend/apps/agenda/tests.py` para: criação de sessão com tipo, validação de sobreposição de horários e alteração de status. Verificar com `python manage.py test apps.agenda`.
- [x] 6.2 Escrever testes unitários em `backend/apps/prontuario/tests.py` para: criação e atualização de anamnese (incluindo o campo `observacoesGerais`) e criação de anotação de sessão. Verificar com `python manage.py test apps.prontuario`.
- [x] 6.3 Testar manualmente o fluxo completo: secretária agenda sessão (com tipo) → doutora visualiza na agenda → doutora abre o prontuário → edita anamnese com campo livre → registra anotação → altera status da sessão. Verificar que todos os dados persistem corretamente e as notificações visuais aparecem nos momentos certos.
