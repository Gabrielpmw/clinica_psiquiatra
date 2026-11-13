# Tasks

## 1. Identidade Visual da Clínica (Frontend)

- [x] 1.1 Em `frontend/src/pages/LoginPage.jsx`, substituir o título "Sistema de Apoio à Clínica" por "Clínica Apoio — Marília Sávia" e o subtítulo "Psiquiatria Infantojuvenil" por "Neuropsicopedagogia clínica e psicopedagogia clínica" (nos dois locais: painel desktop e versão mobile). Verificar visualmente que as duas superfícies exibem o novo texto ao carregar a tela de login.

- [x] 1.2 Em `frontend/src/components/Sidebar.jsx`, substituir o subtítulo "Psiquiatria Infantojuvenil" por "Neuropsicopedagogia clínica e psicopedagogia clínica". Verificar visualmente que o menu lateral de qualquer página autenticada exibe o novo subtítulo.

## 2. Backend — Campo `pago` no Modelo Sessão

- [x] 2.1 Em `backend/apps/agenda/models.py`, adicionar o campo `pago = models.BooleanField(default=False, verbose_name='Sessão Paga')` à classe `Sessao`, após o campo `tipo`. Verificar que o campo aparece na classe com default correto.

- [x] 2.2 Gerar a migration do campo: executar `python manage.py makemigrations agenda` dentro do container/venv do backend. Verificar que o arquivo `0002_sessao_pago.py` (ou similar) é criado em `backend/apps/agenda/migrations/` com a operação `AddField` para `pago`.

- [x] 2.3 Aplicar a migration: executar `python manage.py migrate` e verificar que a migration é aplicada sem erros e que o campo `pago` existe na tabela `agenda_sessao` no banco.

## 3. Backend — Serializer e Endpoint de Pagamento

- [x] 3.1 Em `backend/apps/agenda/serializers.py`, adicionar `'pago'` à lista `fields` do `SessaoSerializer` (garantir que não está em `read_only_fields`). Verificar que uma requisição GET a `/api/agenda/sessoes/` retorna o campo `pago` em cada objeto de sessão.

- [x] 3.2 Em `backend/apps/agenda/views.py`, adicionar o action `atualizar_pagamento` ao `SessaoViewSet` seguindo o padrão de `atualizar_status`: `PATCH /api/agenda/sessoes/{id}/atualizar_pagamento/` recebe `{"pago": true|false}`, valida e salva com `update_fields=['pago']`, retorna o serializer completo. Verificar com `curl` ou cliente REST que o endpoint altera o campo e retorna 200 com o objeto atualizado.

## 4. Frontend — Serviço e Integração de Pagamento

- [x] 4.1 Em `frontend/src/services/agendaService.js`, adicionar a função `atualizarPagamentoSessao(sessaoId, pago)` que faz `PATCH /agenda/sessoes/${sessaoId}/atualizar_pagamento/` com `{ pago }`. Verificar que a função é exportada e acessível nos componentes.

- [x] 4.2 Em `frontend/src/pages/AgendaPage.jsx`, adicionar o handler `handlePagamentoChange(sessaoId, novoPago)` que chama `atualizarPagamentoSessao`, exibe notificação de sucesso/erro com `notifySuccess`/`notifyError` e atualiza o estado local `sessoes` (seguindo o padrão de `handleStatusChange`). Verificar que alterações de pagamento são refletidas sem recarregar toda a agenda.

## 5. Frontend — Indicador Visual nos Componentes de Agenda

- [x] 5.1 Em `frontend/src/components/Agenda/DayView.jsx`, adicionar um badge/ícone de pagamento em cada card de sessão:
  - `pago = true`: badge verde com ícone de check (ex.: `CheckCircle2` do lucide-react) e texto "Pago"
  - `pago = false`: badge cinza/neutro com ícone (ex.: `CircleDollarSign`) e texto "Pendente"
  - Clicar no badge aciona `onPagamentoChange(sessao.id, !sessao.pago)`.
  - Verificar visualmente que o badge muda de estado ao clicar e persiste após atualização.

- [x] 5.2 Em `frontend/src/components/Agenda/PatientDayList.jsx`, adicionar o mesmo indicador de pagamento para cada sessão listada, com comportamento equivalente ao DayView. Verificar visualmente na lista de pacientes do dia.

- [x] 5.3 Em `frontend/src/components/Agenda/WeekView.jsx`, adicionar indicador de pagamento nos cards de sessão da visão semanal (pode ser mais compacto, ex.: apenas o ícone sem texto). Verificar visualmente na visão de semana.

- [x] 5.4 Propagar a prop `onPagamentoChange` de `AgendaPage` para `DayView`, `PatientDayList` e `WeekView`. Verificar que os três componentes recebem e chamam o handler corretamente.
