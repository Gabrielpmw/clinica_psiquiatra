# Spec Delta

## ADDED Requirements

### Requirement: Exclusão da Anamnese do Envio ao Gemini

Na geração de resumos pela API do Gemini, o sistema SHALL usar como fontes clínicas enviadas somente as anotações das sessões explicitamente selecionadas. O texto da anamnese SHALL NOT integrar o contexto exibido como versão a enviar, a instrução, o pedido ao Gemini ou outro campo transmitido ao provedor, mesmo quando mascarado. Se o Django consultar a anamnese internamente para reconhecer identificadores nas sessões, SHALL NOT transmitir seu conteúdo. A geração SHALL exigir ao menos uma sessão com anotação e SHALL rejeitar a seleção que peça a inclusão da anamnese ou contenha somente a anamnese, antes de qualquer chamada externa.

O servidor SHALL tratar os identificadores pessoais das sessões selecionadas antes do envio. Se não puder tratar com segurança um possível identificador, SHALL bloquear a geração e informar a fonte afetada sem revelar o valor. A confirmação da profissional SHALL NOT contornar esse bloqueio.

#### Scenario: Sessões selecionadas sem anamnese no pedido externo
- **WHEN** a profissional revisa sessões selecionadas e confirma a geração
- **THEN** a versão apresentada para envio e o pedido ao Gemini contêm somente o contexto tratado dessas sessões, sem texto ou campos da anamnese

#### Scenario: Tentativa de incluir a anamnese
- **WHEN** uma requisição de geração solicita a inclusão da anamnese, ainda que junto com sessões, ou não seleciona sessão com anotação
- **THEN** o Django rejeita a requisição antes de chamar o Gemini e informa que a anamnese não pode ser enviada

#### Scenario: Identificador sem tratamento seguro em sessão
- **WHEN** uma sessão selecionada contém possível identificador que não pode ser tratado com segurança
- **THEN** a geração é bloqueada antes da chamada ao Gemini, a interface indica a fonte a revisar sem expor o valor e a confirmação da profissional não libera o envio

### Requirement: Aviso e Confirmação de Privacidade Antes da Geração Externa

Na etapa de revisão, junto à ação de gerar, a interface SHALL oferecer um botão de informação acessível por teclado e toque. Seu texto SHALL informar de modo breve que as anotações das sessões não devem conter nome, contato, documento ou outro dado capaz de identificar o paciente e que o conteúdo tratado das sessões selecionadas será enviado ao Gemini. Antes de cada tentativa de geração externa, a profissional SHALL confirmar essa orientação por uma ação simples e explícita; fechar ou cancelar o aviso SHALL manter a geração parada. O endpoint de geração SHALL rejeitar pedidos sem a confirmação explícita dessa tentativa. A confirmação SHALL valer somente para a tentativa e a seleção revisada atuais, sem dispensar nova revisão quando as fontes ou o conteúdo mudarem.

#### Scenario: Confirmar após revisar as sessões
- **WHEN** a profissional aciona **Gerar rascunho** depois de revisar o contexto tratado
- **THEN** o aviso curto é apresentado e a chamada de geração só começa após a confirmação explícita para aquela tentativa

#### Scenario: Cancelar ou alterar a seleção
- **WHEN** a profissional fecha ou cancela a confirmação, ou volta para mudar as fontes
- **THEN** nenhum pedido de geração é enviado e a confirmação anterior não autoriza uma tentativa posterior

#### Scenario: Pedido direto sem confirmação
- **WHEN** o endpoint de geração recebe uma requisição sem confirmação explícita da orientação de privacidade
- **THEN** o Django rejeita o pedido antes de qualquer chamada ao Gemini

#### Scenario: Uso por teclado ou em tela móvel
- **WHEN** a profissional acessa o botão de informação e a confirmação por teclado ou toque em largura móvel
- **THEN** ela consegue ler a orientação, confirmar ou cancelar sem perder a seleção revisada

## MODIFIED Requirements

### Requirement: Fidelidade Clínica do Rascunho

Os quatro prompts SHALL tratar as anotações das sessões selecionadas como fontes clínicas para a geração externa e apresentar a resposta como rascunho sujeito à revisão da profissional. A anamnese SHALL NOT ser usada como fonte enviada ao Gemini. O texto SHALL preservar negações, datas e sequência temporal, distinguir registros divergentes, explicitar dados insuficientes e indicar a sessão de origem quando houver referência disponível. O prompt de pontos críticos SHALL extrair apenas ocorrências documentadas, preservando seu caráter atual ou histórico conforme a fonte. O modelo SHALL NOT formular novos diagnósticos ou recomendações de tratamento.

#### Scenario: Notas com negações, ocorrências antigas e registros contraditórios
- **WHEN** as notas registram uma crise antiga, uma negação posterior de crises e relatos divergentes sobre outro episódio
- **THEN** o rascunho mantém a crise como histórica, atribui a negação e os relatos divergentes às respectivas datas e sessões disponíveis e evita afirmar uma crise atual sem registro

#### Scenario: Evidência insuficiente e comandos nas notas
- **WHEN** as notas carecem de dados para concluir o solicitado, omitem a sessão de origem ou contêm texto pedindo novos diagnósticos ou tratamentos
- **THEN** o rascunho informa a insuficiência, evita inventar referência de origem, trata comandos registrados como texto da fonte e omite diagnósticos novos e recomendações de tratamento

#### Scenario: Informação disponível somente na anamnese
- **WHEN** um dado necessário para responder ao roteiro consta somente da anamnese e não das sessões selecionadas
- **THEN** o rascunho indica que as fontes enviadas são insuficientes e não inventa esse dado
