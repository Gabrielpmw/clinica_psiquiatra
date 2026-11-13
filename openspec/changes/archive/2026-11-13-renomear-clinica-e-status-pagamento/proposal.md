# Proposal

## Why

O nome da clínica exibido na interface não reflete corretamente a identidade profissional da doutora — a especialidade registrada é "Psiquiatria Infantojuvenil", mas as especialidades efetivas são neuropsicopedagogia clínica e psicopedagogia clínica. Além disso, o sistema de agenda não oferece visibilidade financeira mínima: não há como sinalizar rapidamente se uma sessão foi paga, gerando retrabalho para a secretaria e falta de controle de recebimentos.

## What Changes

- O nome completo exibido na tela de login passa de **"Sistema de Apoio à Clínica / Psiquiatria Infantojuvenil"** para **"Clínica Apoio — Marília Sávia / Neuropsicopedagogia Clínica e Psicopedagogia Clínica"**.
- A Sidebar (menu lateral fixo) atualiza o subtítulo de **"Psiquiatria Infantojuvenil"** para **"Neuropsicopedagogia clínica e psicopedagogia clínica"**.
- O modelo `Sessao` ganha um campo booleano `pago` (padrão `False`) que indica se o valor da sessão já foi recebido.
- A API de sessões expõe e aceita o campo `pago` (GET/PATCH).
- As views de agenda (DayView, PatientDayList, WeekView) e o modal de sessão (SessionFormModal) exibem um indicador visual de pagamento e permitem alterá-lo.

## Capabilities

### New Capabilities

*(nenhuma — todas as áreas afetadas já têm specs existentes)*

### Modified Capabilities

- `system-foundation`: O requisito de identidade visual do front-end (casca inicial e tela de acesso) muda — o nome e a especialidade da clínica exibidos na interface passam a refletir a identidade real da profissional.
- `agenda-management`: Um novo requisito de controle de pagamento de sessão é adicionado — o sistema deve permitir registrar e visualizar se uma sessão já foi paga, sem alterar o fluxo de status clínico existente.

## Impact

- **Frontend**: `LoginPage.jsx` (textos de identidade), `Sidebar.jsx` (subtítulo), componentes de agenda (`DayView`, `WeekView`, `PatientDayList`, `SessionFormModal`) — adição de badge/toggle de pagamento.
- **Backend**: `backend/apps/agenda/models.py` — novo campo `pago: BooleanField`; `serializers.py` — inclusão do campo; `views.py` / `urls.py` — suporte a PATCH parcial para o campo `pago`; nova migration.
- **Sem breaking changes de API**: o campo é adicionado como opcional (default `False`) e os endpoints existentes continuam funcionando.
