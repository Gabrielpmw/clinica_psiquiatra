# Spec Delta

## ADDED Requirements

### Requirement: Registro de Pagamento de Sessão
O sistema SHALL permitir registrar e consultar se o valor de uma sessão de atendimento foi recebido, por meio de um indicador booleano `pago` na entidade Sessão.

- O campo `pago` tem valor padrão `false` (não pago) em toda sessão criada.
- O campo é exposto nas respostas da API de sessões.
- A alteração do campo `pago` DEVE ser permitida via PATCH na API de sessões, sem alterar o status clínico da sessão.
- Secretária e doutora podem alterar o indicador de pagamento; administrador também pode, via admin Django.

#### Scenario: Sessão criada como não paga por padrão
- **WHEN** uma nova sessão for criada (por qualquer meio)
- **THEN** o campo `pago` deve ser `false` automaticamente sem necessidade de preenchimento explícito

#### Scenario: Marcar sessão como paga
- **WHEN** a secretária ou doutora aciona o indicador de pagamento de uma sessão na interface da agenda
- **THEN** o sistema persiste `pago = true` na sessão e atualiza o indicador visual imediatamente

#### Scenario: Desmarcar pagamento de sessão
- **WHEN** a secretária ou doutora aciona novamente o indicador de pagamento de uma sessão já marcada como paga
- **THEN** o sistema persiste `pago = false` e atualiza o indicador visual

#### Scenario: Indicador visual de pagamento nas views de agenda
- **WHEN** qualquer usuário visualiza a agenda (visão dia ou semana) ou a lista de pacientes do dia
- **THEN** cada sessão deve exibir de forma distinta se está paga (ícone/badge verde) ou não paga (ícone/badge neutro ou vermelho), permitindo identificação rápida

#### Scenario: API retorna campo pago
- **WHEN** uma requisição GET é feita ao endpoint de sessões
- **THEN** cada objeto de sessão na resposta deve incluir o campo `pago` com seu valor atual (`true` ou `false`)
