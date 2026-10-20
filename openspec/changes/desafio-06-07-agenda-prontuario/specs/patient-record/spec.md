# Spec Delta

## Purpose

Gerencia o prontuário clínico do paciente: bloco fixo de anamnese com campos estruturados e campo de texto livre adicional, e área de anotações de sessão exibidas em linha do tempo cronológica. Permite à doutora acessar o prontuário de qualquer paciente.

## ADDED Requirements

### Requirement: Bloco de Anamnese com Campo de Texto Livre
O sistema DEVE exibir um bloco fixo de Anamnese no prontuário com cabeçalho contendo a data de nascimento do paciente, campos estruturados para os critérios de avaliação (escolaridade, tipo de parto, intercorrências, seletividade alimentar, dificuldade com rotina, sensibilidade a etiquetas, histórico familiar, adesão a regras) e um campo adicional de texto livre para anotações gerais da doutora (RF07). A anamnese DEVE ser editável a qualquer momento.

#### Scenario: Doutora visualiza bloco de anamnese
- **WHEN** a doutora abre o prontuário de um paciente
- **THEN** o sistema exibe o cabeçalho com a data de nascimento e todos os campos de anamnese preenchidos ou em branco

#### Scenario: Doutora edita anamnese
- **WHEN** a doutora altera qualquer campo da anamnese (incluindo o campo de texto livre) e salva
- **THEN** o sistema persiste as alterações e exibe a data de última atualização

#### Scenario: Campo de texto livre na anamnese
- **WHEN** a doutora insere texto no campo "Observações Gerais" da anamnese e salva
- **THEN** o sistema persiste o texto livre e o exibe no próximo acesso ao prontuário

### Requirement: Área de Anotações de Sessão em Linha do Tempo
O sistema DEVE exibir, no prontuário, uma área de Anotações de Sessão onde a doutora insere texto livre referente à sessão atual ("Sessão Avaliativa/Interventiva"). As anotações DEVEM ser armazenadas e exibidas em ordem cronológica crescente (RF09).

#### Scenario: Doutora registra anotação de sessão
- **WHEN** a doutora insere texto livre na área de anotações da sessão atual e confirma o registro
- **THEN** o sistema persiste a anotação vinculada à sessão com data/hora de registro

#### Scenario: Linha do tempo de anotações exibida em ordem cronológica
- **WHEN** a doutora acessa o prontuário de um paciente que possui múltiplas sessões registradas
- **THEN** o sistema exibe as anotações em ordem cronológica, da mais antiga para a mais recente, com data, tipo de sessão (avaliativa/interventiva) e conteúdo visíveis

### Requirement: Acesso ao Prontuário de Qualquer Paciente
O sistema DEVE permitir que a doutora acesse o prontuário de qualquer paciente ativo a partir da lista de pacientes ou da lista do dia (RF07, RF09).

#### Scenario: Doutora acessa prontuário de outro paciente
- **WHEN** a doutora seleciona um paciente na lista do dia ou na lista geral de pacientes e aciona "Ver Prontuário"
- **THEN** o sistema carrega o prontuário completo daquele paciente (anamnese + linha do tempo de anotações)

### Requirement: Campo de Texto Livre Adicional na Anamnese (Modificação de Entidade)
A entidade Anamnese DEVE ter um atributo adicional `observacoesGerais` (TEXT, nullable) para que a doutora possa registrar qualquer informação não coberta pelos campos estruturados.

#### Scenario: Persistência do campo observacoesGerais
- **WHEN** a doutora salva a anamnese com conteúdo no campo `observacoesGerais`
- **THEN** o sistema armazena o valor no banco e o retorna nas consultas subsequentes do prontuário

### Requirement: Tipo de Sessão no Prontuário
A entidade Sessão DEVE incluir o campo `tipo` com as opções "AVALIATIVA" e "INTERVENTIVA", exibindo-o na linha do tempo de anotações do prontuário.

#### Scenario: Tipo de sessão visível na linha do tempo
- **WHEN** a doutora visualiza as anotações de um paciente
- **THEN** cada item da linha do tempo exibe o tipo da sessão (Avaliativa ou Interventiva) junto à data e ao texto da anotação
