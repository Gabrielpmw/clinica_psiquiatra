# Design

## Context

O projeto é um sistema clínico full-stack: Django/DRF no backend com PostgreSQL, React + Tailwind no frontend, orquestrado via Docker Compose. Há dois grupos de mudanças nesta change:

1. **Identidade textual da clínica** — textos hard-coded em dois componentes React (`LoginPage.jsx` e `Sidebar.jsx`).
2. **Campo de pagamento de sessão** — adição de um campo booleano `pago` ao modelo `Sessao` no backend, com reflexo no serializer, na API e nos componentes de agenda no frontend.

Veja `proposal.md` para a motivação.

## Goals / Non-Goals

**Goals:**
- Substituir todos os textos de identidade da clínica nos componentes `LoginPage.jsx` e `Sidebar.jsx`.
- Adicionar o campo `pago: BooleanField(default=False)` ao modelo `Sessao`.
- Expor e aceitar `pago` no `SessaoSerializer` e via PATCH dedicado (ou PATCH genérico no ModelViewSet existente).
- Exibir indicador visual de pagamento nos componentes de agenda (`DayView`, `WeekView`, `PatientDayList`) e permitir alterá-lo no `SessionFormModal` ou inline.
- Gerar e aplicar migration Django para o novo campo.

**Non-Goals:**
- Histórico de pagamentos ou relatórios financeiros.
- Integração com sistema de cobrança externo.
- Campo de valor monetário da sessão.
- Controle de pagamento em nível de paciente (apenas por sessão).

## Decisions

### 1. Atualização de pagamento: endpoint dedicado vs. PATCH genérico

**Decisão:** Adicionar um endpoint dedicado `PATCH /api/sessoes/{id}/atualizar_pagamento/` seguindo o padrão já existente de `atualizar_status`. Isso mantém a consistência da API e deixa claro semanticamente que o campo `pago` tem sua própria operação de escrita, separada da atualização completa da sessão.

**Alternativas consideradas:**
- Usar o PATCH genérico do ModelViewSet: mais simples mas inconsistente com o padrão estabelecido; `atualizar_status` já foi feito como action dedicada, e seguir o mesmo padrão facilita entendimento.

### 2. Campo booleano simples vs. entidade de pagamento

**Decisão:** Campo `pago: BooleanField(default=False)` direto no modelo `Sessao`. O requisito é sinalização binária (pago / não pago); não há necessidade de rastrear data de pagamento, forma de pagamento ou valor neste momento.

**Alternativas consideradas:**
- Criar uma entidade `Pagamento` separada: superdimensionado para o requisito atual e geraria complexidade desnecessária de migration e API.

### 3. Indicador visual de pagamento no frontend

**Decisão:** Badge/ícone inline em cada card de sessão (DayView, WeekView, PatientDayList) com um toggle simples (clique no badge) que chama o novo endpoint `atualizar_pagamento`. O `SessionFormModal` não precisa de campo de pagamento no momento da criação, pois o default é `false`.

**Alternativas consideradas:**
- Adicionar campo no modal de criação: desnecessário, pagamento ocorre após a sessão ou no momento do atendimento, não na criação.

### 4. Textos de identidade: constante centralizada vs. edição direta

**Decisão:** Editar diretamente os strings nos dois arquivos afetados (`LoginPage.jsx` e `Sidebar.jsx`). O projeto não possui um arquivo de constantes/i18n centralizado, e criar um só para dois strings seria over-engineering.

## Risks / Trade-offs

- **Migration em banco com dados existentes**: O campo `pago` tem `default=False`, portanto a migration é não-destrutiva e aplica-se a registros existentes sem risco de perda de dados.
- **Atualização do `SessaoSerializer`**: Incluir `pago` nos `fields` e garantir que não esteja em `read_only_fields` — erro fácil de cometer ao seguir o padrão existente.
- **Atualização do estado local no frontend**: Ao fazer toggle de pagamento, o estado local (`sessoes`) deve ser atualizado sem recarregar toda a agenda (seguindo o padrão já usado em `handleStatusChange`).

## Migration Plan

1. Adicionar campo `pago` ao modelo.
2. Gerar migration: `python manage.py makemigrations agenda`.
3. Aplicar migration: `python manage.py migrate` (ou via Docker Compose no ambiente de desenvolvimento).
4. Sem rollback especial necessário — campo booleano com default, reversível com migration simples de remoção de campo.
