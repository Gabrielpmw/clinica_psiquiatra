# Spec Delta

## Purpose

Gerencia a agenda clínica da doutora, permitindo que secretária e doutora visualizem, criem, editem e cancelem sessões de atendimento, com visões por dia e por semana, notificações visuais de alteração e controle de status da sessão.

## ADDED Requirements

### Requirement: Visualização da Agenda por Dia e Semana
O sistema DEVE exibir a agenda com visão por dia e por semana (RF03), listando as sessões com nome do paciente, horário de início, horário de fim e status.

#### Scenario: Secretária visualiza a agenda do dia
- **WHEN** a secretária acessa a tela de Agenda e seleciona a visão "Dia" com uma data
- **THEN** o sistema exibe todas as sessões daquela data com nome do paciente, horário e status

#### Scenario: Doutora visualiza a agenda da semana
- **WHEN** a doutora acessa a tela de Agenda e seleciona a visão "Semana"
- **THEN** o sistema exibe um grid semanal com todas as sessões distribuídas por dia e horário

### Requirement: Agendamento de Sessão pela Secretária
O sistema DEVE permitir que a secretária agende uma nova sessão para um paciente, definindo data, horário de início e duração (RF03).

#### Scenario: Secretária agenda nova sessão
- **WHEN** a secretária seleciona um horário disponível na agenda e preenche os dados da sessão (paciente, data, hora início, duração)
- **THEN** o sistema cria a sessão com status "agendada" e exibe uma notificação visual de confirmação

### Requirement: Agendamento por Continuidade Clínica pela Doutora
O sistema DEVE permitir que a doutora marque novas sessões diretamente na agenda para casos de continuidade clínica (RF04).

#### Scenario: Doutora agenda sessão de continuidade
- **WHEN** a doutora seleciona um horário na agenda e confirma o agendamento de sessão de continuidade
- **THEN** o sistema cria a sessão vinculada ao paciente com status "agendada" e exibe notificação visual

### Requirement: Definição de Disponibilidade e Bloqueio de Horários
O sistema DEVE permitir que a doutora defina seus dias e horários de disponibilidade e bloqueie dias/horários com um motivo (RF05).

#### Scenario: Doutora define disponibilidade
- **WHEN** a doutora configura os dias e faixas horárias em que está disponível
- **THEN** esses slots ficam marcados como disponíveis para agendamento na agenda

#### Scenario: Doutora bloqueia um horário com motivo
- **WHEN** a doutora seleciona um horário/dia e registra um bloqueio com motivo (ex.: "Reunião")
- **THEN** o slot é marcado como bloqueado, exibe o motivo e fica indisponível para novos agendamentos

### Requirement: Cancelamento de Sessão
O sistema DEVE permitir que a doutora cancele uma sessão agendada (RF05).

#### Scenario: Doutora cancela sessão
- **WHEN** a doutora aciona o cancelamento de uma sessão existente
- **THEN** o sistema atualiza o status da sessão para "cancelada" e exibe uma notificação visual na interface

### Requirement: Notificação Visual de Alterações na Agenda
O sistema DEVE exibir um aviso/notificação visual sempre que ocorrer uma alteração na agenda (novo agendamento, cancelamento, bloqueio) (RF05).

#### Scenario: Notificação ao agendar
- **WHEN** qualquer usuário cria, cancela ou altera uma sessão
- **THEN** o sistema exibe uma notificação visual imediata na interface informando a alteração

### Requirement: Lista de Pacientes do Dia e Alteração de Status
O sistema DEVE permitir que secretária e doutora visualizem a lista de pacientes agendados no dia e alterem o status de cada sessão (agendada, cancelada, falta, realizada) (RF06).

#### Scenario: Secretária atualiza status de sessão
- **WHEN** a secretária seleciona uma sessão na lista do dia e altera seu status para "realizada"
- **THEN** o sistema persiste o novo status e atualiza a exibição na lista

#### Scenario: Doutora marca sessão como falta
- **WHEN** a doutora seleciona uma sessão e altera o status para "falta"
- **THEN** o sistema atualiza o status e exibe a alteração na agenda e na lista do dia

### Requirement: Tipo de Sessão (Avaliativa ou Interventiva)
O sistema DEVE permitir que seja definido, no momento do agendamento, se a sessão é do tipo "avaliativa" ou "interventiva", armazenando essa informação na entidade Sessão.

#### Scenario: Agendamento com tipo definido
- **WHEN** a secretária ou doutora cria uma nova sessão e seleciona o tipo "avaliativa" ou "interventiva"
- **THEN** o sistema persiste o tipo selecionado na sessão e o exibe nas visões de agenda e prontuário
