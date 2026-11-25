# Spec Delta

## ADDED Requirements

### Requirement: Geração de Resumos via API do Google Gemini

O backend Django SHALL gerar rascunhos clínicos em português brasileiro utilizando exclusivamente a API do Google Gemini configurada pelas variáveis de ambiente `GEMINI_API_KEY` e `GEMINI_MODELS` (definidas em `.env` / `.env.example` e carregadas em `settings.py`), sem inferência local em WebGPU/WebLLM ou dependência de modelos no navegador. O sistema SHALL disponibilizar o endpoint `POST /api/prontuario/pacientes/<paciente_id>/ia/gerar/` restrito a usuárias autenticadas com perfil `DOUTORA` e concessão de acesso ativa ao paciente, aplicando `Cache-Control: no-store`.

O endpoint `/ia/gerar/` SHALL validar estritamente a seleção recebida (`prompt_id`, `sessao_ids` com pelo menos uma sessão anotada, `incluir_anamnese: false` — rejeitando `true` —, `confirmacao_privacidade: true`, além de verificação opcional da versão revisada), executar a sanitização LGPD no servidor utilizando a anamnese apenas internamente para cruzamento de identificadores pessoais (sem incluí-la no contexto externo) e recusar o envio ao Gemini caso qualquer fonte selecionada possua ocorrência bloqueada (`trecho_retido`) ou caso a versão revisada no navegador tenha ficado desatualizada em relação aos registros atuais. O serviço SHALL aplicar retentativas com backoff exponencial para erros transitórios (HTTP 429, 503, 504 ou timeout), failover automático entre os modelos configurados em `GEMINI_MODELS` e fallback REST quando o SDK não estiver disponível.

#### Scenario: Geração de rascunho via Gemini com seleção revisada
- **WHEN** uma profissional autorizada revisa as fontes selecionadas em **Revisar dados** e confirma **Gerar rascunho** com `GEMINI_API_KEY` válida configurada no `.env`
- **THEN** o backend valida a autorização, sanitiza as fontes selecionadas, envia apenas a instrução fixa e o texto sanitizado ao Gemini, retorna a prévia em memória com `Cache-Control: no-store` e mantém o rascunho sem gravação automática no histórico

#### Scenario: Falha de configuração da chave Gemini
- **WHEN** `GEMINI_API_KEY` está ausente, vazia ou com valor placeholder no `.env`
- **THEN** o backend recusa a geração com mensagem clara em português orientando a configuração no `.env`, sem vazar dados clínicos e mantendo o histórico e o Parecer Conclusivo acessíveis

#### Scenario: Resiliência a erros transitórios e failover de modelos
- **WHEN** o modelo primário da lista `GEMINI_MODELS` retorna erro transitório (`503` ou `429`) ou falha temporária de conexão
- **THEN** o serviço realiza retentativas com backoff exponencial e alterna automaticamente para o próximo modelo configurado antes de retornar erro recuperável em português

#### Scenario: Bloqueio por trecho retido antes do envio externo
- **WHEN** uma fonte selecionada contém identificador de tratamento incerto (`trecho_retido`)
- **THEN** o sistema impede a chamada à API externa do Gemini, devolve resposta de erro indicando o bloqueio sem expor o valor original e mantém a profissional na revisão/seleção

## MODIFIED Requirements

### Requirement: Sanitização Prévia de Dados Sensíveis (LGPD)

O Django SHALL minimizar os dados clínicos antes de responder à preparação de contexto (`/ia/contexto/`) e antes de qualquer envio à API do Google Gemini (`/ia/gerar/`). O sistema SHALL cruzar campos pessoais do paciente, responsáveis, endereços e identificadores presentes na anamnese (mesmo quando desmarcada) com as fontes selecionadas, substituindo o nome do paciente por `[Paciente]`, nomes dos responsáveis por `[Responsável]` e mascarando CPFs, telefones, e-mails, endereços, CEPs, datas de nascimento e outros identificadores pessoais detectados. A preparação SHALL preservar a estrutura, as negações, a ordem, as datas clínicas e as referências das sessões selecionadas.

O contexto sanitizado, os avisos e as prévias geradas SHALL ser tratados como dados sensíveis, entregues apenas ao navegador da profissional autenticada e autorizada para o paciente, mantidos exclusivamente em memória no frontend e com `Cache-Control: no-store` nas respostas clínicas de fontes, preparação, geração, histórico e gravação de resumos e Pareceres. O sistema SHALL NOT gravar conteúdo clínico em armazenamento persistente do navegador (`localStorage`, `sessionStorage`, `IndexedDB`, `CacheStorage`), URLs, logs ou telemetria, nem enviar à API do Gemini dados brutos não sanitizados ou fontes não selecionadas. Após a geração, o texto da prévia ou do rascunho SHALL ser persistido no Django somente mediante confirmação explícita do salvamento correspondente.

#### Scenario: Envio de notas com nome do paciente e responsável
- **WHEN** uma profissional autorizada solicita a preparação com nomes de paciente e responsáveis, CPF, telefone e e-mail fictícios presentes nas notas ou na anamnese
- **THEN** a resposta traz as marcações e máscaras esperadas, preserva a sequência e a origem das notas e inclui `Cache-Control: no-store`

#### Scenario: Tentativa de envio com dados já sanitizados
- **WHEN** a entrada já está sanitizada
- **THEN** sua estrutura, datas, negações e ordem são preservadas na preparação

#### Scenario: Inspeção do fluxo com marcadores fictícios
- **WHEN** o fluxo é observado nas requisições da página e do servidor, no armazenamento persistente, nos logs e na telemetria
- **THEN** os marcadores clínicos não aparecem em URLs, armazenamento persistente do navegador, logs ou telemetria, apenas conteúdo sanitizado e autorizado segue ao Gemini, e a gravação no banco só ocorre em pedido ao Django após confirmação explícita

#### Scenario: Envio exclusivo de contexto sanitizado ao Gemini
- **WHEN** uma profissional autorizada confirma a geração após revisar as fontes selecionadas contendo dados pessoais fictícios
- **THEN** somente o contexto sanitizado (com marcadores como `[Paciente]` e `[Responsável]`) das fontes aprovadas é transmitido à API do Gemini, com resposta entregue sob `Cache-Control: no-store`

#### Scenario: Inspeção de armazenamento e logs sem WebLLM
- **WHEN** o fluxo completo é inspecionado no navegador e no servidor
- **THEN** não existem caches de pesos/WASM WebLLM, trabalhadores Web Worker locais ou dados clínicos em armazenamento persistente do navegador, e a gravação no banco depende de confirmação explícita

### Requirement: Catálogo Rígido de Prompts Clínicos no Backend

O Django SHALL manter quatro instruções fixas. Os endpoints `POST /api/prontuario/pacientes/<paciente_id>/ia/contexto/` (pré-visualização e revisão) e `POST /api/prontuario/pacientes/<paciente_id>/ia/gerar/` (geração via Gemini) SHALL aceitar exclusivamente `prompt_id` (inteiro entre 1 e 4), `sessao_ids` (lista explícita de UUIDs únicos com ao menos uma sessão anotada) e `incluir_anamnese` (`false`, rejeitando `true`), exigindo também `confirmacao_privacidade: true` em `/ia/gerar/` (além de identificador opcional `contexto_hash` da revisão aprovada). O paciente SHALL ser identificado pela URL e autorizado no servidor, rejeitando seleções vazias, tentativas de incluir anamnese (`incluir_anamnese: true`), sessões sem anotação, UUIDs inválidos/repetidos ou sessões de outro paciente sem expor contexto ou acionar o Gemini.

#### Scenario: Seleção de prompt válido
- **WHEN** uma profissional autorizada seleciona qualquer um dos códigos de 1 a 4 e fontes válidas
- **THEN** o Django fornece a instrução fixa correspondente e o contexto sanitizado na revisão e utiliza essa instrução na geração via Gemini

#### Scenario: Envio de prompt inválido ou manipulado
- **WHEN** uma profissional autorizada envia um identificador ausente, fora da faixa ou de tipo inválido, ou inclui instrução livre ou campo extra no corpo
- **THEN** o Django retorna HTTP 400 sem fornecer contexto nem instrução e sem invocar a API do Gemini

#### Scenario: Validação estrita em /ia/gerar/
- **WHEN** uma profissional envia código de prompt inválido, seleção vazia, UUID repetido ou sessão de outro paciente para `/ia/gerar/`
- **THEN** o Django rejeita a requisição (HTTP 400 ou 404 genérico conforme o caso) sem invocar a API do Gemini

### Requirement: Isolamento da Geração no Navegador

A aplicação SHALL vincular cada preparação e requisição de geração ao paciente, às fontes selecionadas, à sessão autenticada na aba, à usuária e à solicitação vigente. Ao cancelar uma geração, sair da conta, trocar de conta/sessão autenticada, recarregar ou fechar a aba, a aplicação SHALL abortar a requisição HTTP pendente via sinal de aborto e descartar respostas atrasadas. Rascunhos pendentes permanecem apenas em memória da aba enquanto a sessão autenticada estiver ativa, e navegar entre telas ou pacientes conserva a requisição em andamento e disponibiliza o resultado apenas no prontuário autorizado de origem.

#### Scenario: Resposta atrasada após troca de contexto
- **WHEN** chega uma resposta após troca de paciente, troca de sessão clínica, encerramento ou troca da sessão autenticada, ou troca de usuária
- **THEN** na navegação dentro da mesma sessão autenticada, o resultado permanece vinculado ao prontuário de origem e indisponível no novo contexto clínico; e no encerramento ou troca de sessão autenticada ou de usuária, o resultado atrasado é descartado

#### Scenario: Resposta atrasada após uma nova geração
- **WHEN** uma solicitação anterior retorna depois que outra geração foi iniciada ou após cancelamento
- **THEN** o resultado atrasado é descartado e não altera a prévia ativa, o Parecer ou as pendências válidas

#### Scenario: Cancelamento ou troca de sessão durante chamada ao Gemini
- **WHEN** a profissional cancela a geração ou encerra/troca a sessão autenticada enquanto `/ia/gerar/` aguarda resposta do servidor
- **THEN** o frontend aborta a requisição via `AbortController`, descarta qualquer resposta tardia e não cria nem exibe rascunho pendente

## REMOVED Requirements

### Requirement: Inferência Clínica Local no Navegador

**Reason**: Substituída pela geração no servidor Django via Google Gemini (`GEMINI_API_KEY`) para eliminar o download de pesos/WASM no navegador e a dependência de WebGPU no dispositivo da profissional.
**Migration**: Remover `@mlc-ai/web-llm`, Web Worker local, scripts de provisionamento e validação de WebGPU/orçamento local de tokens; utilizar `POST /api/prontuario/pacientes/<paciente_id>/ia/gerar/` após a etapa de seleção e revisão em `POST /ia/contexto/`.
