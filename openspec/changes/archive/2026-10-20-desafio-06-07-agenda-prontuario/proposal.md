# Proposal

## Why

O sistema atual carece de uma agenda robusta e de um prontuário completo. Secretárias e médicas não conseguem agendar, editar ou visualizar consultas de forma eficiente, nem registrar anamnese e notas de sessão de modo organizado. A implementação melhora o fluxo clínico, reduz erros de agendamento e aprimora a documentação do paciente.

## What Changes

- Gestão de agenda com visualizações diárias e semanais, definição de disponibilidade, bloqueio e cancelamento de horários.
- Secretárias e médicas podem criar, editar e cancelar sessões.
- Notificações visuais para alterações na agenda.
- Lista de pacientes do dia e gerenciamento de status da sessão (agendada, cancelada, falta, realizada).
- Extensão da entidade **Anamnese** com campo de texto livre.
- Extensão da entidade **Sessão** com seletor de tipo (interventiva ou avaliativa).
- Tela de prontuário com bloco fixo de anamnese e área de notas de sessão em linha do tempo cronológica.
- Médicas podem visualizar prontuários de qualquer paciente.

## Capabilities

### New Capabilities
- `agenda-management`: criação, visualização, edição e notificação de consultas.
- `patient-record`: gerenciamento de anamnese e notas de sessão, incluindo campo livre e classificação de tipo.

### Modified Capabilities
- *(nenhuma)* – são novas capacidades, sem modificação de existentes.

## Impact

- Novas tabelas/models: `Agenda`, `Disponibilidade`, `Bloqueio`, `Anamnese` (extendida), `Sessão` (extendida).
- UI: telas de agenda (dia/semana), badges de notificação e tela de prontuário.
- Backend: lógica de agendamento, detecção de conflitos e disparo de notificações.
- Scripts de migração para acrescentar colunas nas tabelas existentes.
