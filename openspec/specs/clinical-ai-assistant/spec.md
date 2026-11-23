# clinical-ai-assistant Specification

## Purpose

Apoia a profissional na elaboração e revisão de rascunhos clínicos gerados no navegador com WebLLM. O fluxo prepara o contexto clínico no servidor, oferece quatro roteiros fixos e mantém por paciente o histórico de resumos salvos mediante confirmação.

## Requirements

### Requirement: Sanitização Prévia de Dados Sensíveis (LGPD)

O Django SHALL minimizar os dados clínicos antes de responder à preparação de contexto. O sistema SHALL substituir o nome do paciente por `[Paciente]`, nomes dos responsáveis por `[Responsável]` e mascarar CPFs, telefones e e-mails em anamnese e notas de texto livre. O contexto sanitizado SHALL ser tratado como dado sensível e entregue apenas ao navegador da profissional autenticada e autorizada para o paciente. A preparação SHALL preservar a estrutura e a ordem das notas, incluindo as datas e referências de sessão disponíveis.

O fluxo de IA SHALL manter contexto, instrução e rascunhos em memória e SHALL aplicar `Cache-Control: no-store` às respostas clínicas de preparação, histórico e gravação de resumos e às respostas clínicas do Parecer usadas no fluxo de IA. O cache da IA SHALL armazenar exclusivamente arquivos do modelo. O sistema SHALL NOT colocar conteúdo clínico em armazenamento persistente do navegador, URLs, logs ou telemetria, nem encaminhá-lo a terceiros. Após a geração, o texto da prévia ou do rascunho SHALL ser enviado ao Django somente com a confirmação explícita do salvamento correspondente.

#### Scenario: Envio de notas com nome do paciente e responsável
- **WHEN** uma profissional autorizada solicita a preparação com nomes de paciente e responsáveis, CPF, telefone e e-mail fictícios presentes nas notas ou na anamnese
- **THEN** a resposta traz as marcações e máscaras esperadas, preserva a sequência e a origem das notas e inclui `Cache-Control: no-store`

#### Scenario: Tentativa de envio com dados já sanitizados
- **WHEN** a entrada já está sanitizada
- **THEN** sua estrutura, datas, negações e ordem são preservadas na preparação

#### Scenario: Inspeção do fluxo com marcadores fictícios
- **WHEN** o fluxo é observado nas requisições da página e do worker, no armazenamento persistente, nos logs e na telemetria
- **THEN** apenas os arquivos do modelo entram no cache da IA, os marcadores clínicos não aparecem em requisições a terceiros, URLs, armazenamento persistente do navegador, logs ou telemetria, e o texto só aparece em pedido de gravação ao Django após confirmação explícita

### Requirement: Catálogo Rígido de Prompts Clínicos no Backend

O Django SHALL manter quatro instruções fixas. O corpo de `POST /api/prontuario/pacientes/<paciente_id>/ia/contexto/` SHALL aceitar exclusivamente `prompt_id`, um inteiro JSON entre 1 e 4. O paciente SHALL ser identificado pela URL e autorizado no servidor. Para requisição válida, o Django SHALL fornecer a instrução correspondente e o contexto minimizado. A interface SHALL NOT aceitar instruções livres.

1. **Síntese Evolutiva** — linha do tempo, progressos, estagnações e regressões documentados.
2. **Mapeamento de Gatilhos e Padrões** — cruzamento da anamnese com as sessões para descrever gatilhos e padrões sensoriais ou de rotina sustentados pelas notas.
3. **Alerta de Pontos Críticos** — extração de ocorrências críticas documentadas, como agressividade, crises, conflitos e intercorrências, com as datas e fontes disponíveis.
4. **Estruturação para Parecer Conclusivo** — organização dos registros para apoiar a redação do Parecer pela profissional.

#### Scenario: Seleção de prompt válido
- **WHEN** uma profissional autorizada seleciona qualquer um dos códigos de 1 a 4
- **THEN** o Django fornece a instrução fixa correspondente e o contexto sanitizado para a geração no navegador

#### Scenario: Envio de prompt inválido ou manipulado
- **WHEN** uma profissional autorizada envia um identificador ausente, fora da faixa ou de tipo inválido, ou inclui instrução livre ou campo extra no corpo
- **THEN** o Django retorna HTTP 400 sem fornecer contexto nem instrução

### Requirement: Prévia do Resumo com Ações de Decisão

O sistema SHALL exibir o carregamento e a prévia em um painel ou modal, identificar a saída como rascunho sujeito à revisão e oferecer edição, descarte e salvamento com título após confirmação explícita. Para o prompt 4, o encaminhamento SHALL preencher somente um rascunho editável em memória no formulário do Parecer e manter o painel de referência disponível. O encaminhamento SHALL NOT gravar automaticamente, sobrescrever um parecer salvo ou substituir silenciosamente texto manual em edição. A profissional SHALL poder revisar ou descartar o rascunho e confirmar separadamente o salvamento do Parecer no formulário e o salvamento de um resumo com título no histórico.

#### Scenario: Doutora edita a prévia
- **WHEN** a profissional altera a prévia ou abre e cancela a confirmação de salvamento
- **THEN** a revisão fica somente em memória, sem enviar o texto ao Django ou alterar os registros salvos

#### Scenario: Doutora descarta prévia gerada
- **WHEN** a profissional descarta a prévia ou fecha e descarta o rascunho encaminhado ao Parecer
- **THEN** o rascunho é removido da interface e nenhum resumo ou parecer é criado ou alterado

#### Scenario: Doutora prossegue para o Parecer a partir do prompt 4
- **WHEN** a profissional encaminha a prévia do prompt 4 ao Parecer Conclusivo
- **THEN** o formulário disponibiliza o texto como rascunho editável em memória e o painel o mantém como referência, preservando o texto manual em edição e sem enviar pedido de gravação

#### Scenario: Doutora revisa e confirma o salvamento no formulário do Parecer
- **WHEN** a profissional edita o rascunho encaminhado e confirma explicitamente a ação de salvar no formulário do Parecer
- **THEN** o Django revalida o acesso e grava somente o texto revisado do Parecer, sem criar um registro no histórico de resumos

#### Scenario: Redação manual com IA indisponível
- **WHEN** a IA está indisponível e o Django está acessível
- **THEN** a profissional autorizada pode consultar o histórico e redigir, editar e salvar manualmente o Parecer mediante confirmação explícita

### Requirement: Persistência de Múltiplos Resumos com Título Customizado

O sistema SHALL permitir múltiplos resumos nomeados por paciente. Somente após a confirmação explícita da profissional, na prévia ou no painel de referência do Parecer, o Django SHALL revalidar o acesso e gravar no armazenamento existente o título, o conteúdo revisado, o prompt de origem e a data e hora do registro (`dataGeracao`) associados ao paciente. O mesmo histórico SHALL listar e permitir consultar os resumos já salvos, inclusive os gerados pelo Gemini, independentemente do estado da IA.

#### Scenario: Doutora salva resumo com título personalizado
- **WHEN** a profissional revisa o texto, informa um título e confirma o salvamento como resumo na prévia ou no painel do Parecer
- **THEN** o sistema persiste o resumo revisado com título, paciente, prompt e data e disponibiliza o registro no histórico, sem salvar o Parecer nessa ação

#### Scenario: Consulta ao histórico de resumos de IA
- **WHEN** a profissional autorizada abre a lista ou os detalhes do histórico, inclusive com a IA indisponível
- **THEN** os resumos anteriores à troca de motor e os novos ficam acessíveis com título, data e conteúdo completo

### Requirement: Bloqueio de Acesso por Perfil (RBAC)

O Django SHALL exigir autenticação e o perfil clínico ativo `DOUTORA`, conforme a permissão efetiva do repositório. Além do perfil, SHALL verificar o acesso ao paciente antes de preparar contexto, listar ou consultar resumos, excluir um resumo ou gravar um resumo ou Parecer. Nas rotas de detalhe, o acesso SHALL ser verificado pelo paciente associado ao objeto. O vínculo ou concessão de acesso SHALL ser reconhecido no servidor, com acesso negado na sua ausência.

#### Scenario: Secretária tenta acessar endpoint de IA
- **WHEN** uma usuária autenticada como `SECRETARIA` ou `ADMINISTRACAO` tenta acessar qualquer endpoint de IA
- **THEN** o Django responde HTTP 403 e não fornece dados clínicos

#### Scenario: Requisição clínica sem autenticação
- **WHEN** uma requisição sem autenticação válida tenta acessar uma rota clínica do fluxo de IA
- **THEN** o Django responde HTTP 401 e não fornece dados clínicos

#### Scenario: Profissional autenticada sem acesso ao paciente solicitado
- **WHEN** uma usuária com perfil `DOUTORA` tenta preparar contexto, acessar ou alterar o histórico ou salvar um resumo ou Parecer de um paciente fora de seu acesso, inclusive por UUID de detalhe ou após perder o acesso desde a preparação
- **THEN** o Django responde HTTP 404, como para paciente ou objeto inexistente, sem expor conteúdo clínico ou gravar alterações

### Requirement: Inferência Clínica Local no Navegador

O sistema SHALL gerar rascunhos em português brasileiro integralmente no navegador, com `@mlc-ai/web-llm` e `Qwen2.5-1.5B-Instruct-q4f16_1-MLC`, via WebGPU em um Web Worker dedicado. O frontend React/Vite SHALL configurar `model` e `model_lib` para a própria origem local e usar versões fixadas do runtime, dos pesos, do tokenizer, da configuração e do WASM WebGPU compatível. O sistema SHALL reutilizar os artefatos em cache e SHALL NOT usar API externa, servidor de inferência ou fallback remoto. A validação SHALL usar Chrome ou Edge atualizado em `localhost`, medir download, inicialização e geração separadamente e verificar o comportamento com cache vazio e completo.

Antes de gerar, o sistema SHALL contar os tokens da entrada efetivamente formatada com o tokenizer fixado. A contagem SHALL incluir o contexto, a instrução, o template da conversa, os separadores e os tokens especiais. A soma da entrada com a reserva aplicada à resposta SHALL caber na janela efetiva do modelo e da configuração em uso. A interface SHALL explicar quando a entrada exceder o orçamento e SHALL NOT truncar notas ou instruções silenciosamente.

#### Scenario: Primeiro carregamento do modelo
- **WHEN** a profissional inicia a geração em `localhost` com cache vazio
- **THEN** o navegador obtém pesos, tokenizer, configuração e WASM da origem da aplicação, exibe progresso, mantém a interface responsiva e gera a prévia localmente

#### Scenario: Geração com cache completo e rede bloqueada
- **WHEN** a página já obteve o contexto autorizado e todos os artefatos estão em cache, e então a rede é bloqueada
- **THEN** um novo worker consegue inicializar e gerar a prévia com o contexto em memória e os artefatos em cache, sem tráfego de rede

#### Scenario: Indisponibilidade de GPU, artefato ou armazenamento
- **WHEN** WebGPU ou um recurso exigido pela GPU está indisponível, o dispositivo é perdido, um artefato falha ao carregar ou o armazenamento falha
- **THEN** a aplicação informa a falha em português brasileiro, oferece nova tentativa quando recuperável e mantém o histórico e a redação manual do Parecer acessíveis com o Django disponível

#### Scenario: Entrada no limite ou acima da janela
- **WHEN** a entrada é tokenizada com o template real e se compara a soma dos tokens da entrada e da reserva de saída com a janela efetiva
- **THEN** a geração aceita a entrada que cabe e, se a soma exceder a janela, informa o excesso antes da inferência e mantém as notas intactas

### Requirement: Fidelidade Clínica do Rascunho

Os quatro prompts SHALL tratar anamnese e notas como fontes clínicas e apresentar a resposta como rascunho sujeito à revisão da profissional. O texto SHALL preservar negações, datas e sequência temporal, distinguir registros divergentes, explicitar dados insuficientes e indicar a sessão de origem quando houver referência disponível. O prompt de pontos críticos SHALL extrair apenas ocorrências documentadas, preservando seu caráter atual ou histórico conforme a fonte. O modelo SHALL NOT formular novos diagnósticos ou recomendações de tratamento.

#### Scenario: Notas com negações, ocorrências antigas e registros contraditórios
- **WHEN** as notas registram uma crise antiga, uma negação posterior de crises e relatos divergentes sobre outro episódio
- **THEN** o rascunho mantém a crise como histórica, atribui a negação e os relatos divergentes às respectivas datas e sessões disponíveis e evita afirmar uma crise atual sem registro

#### Scenario: Evidência insuficiente e comandos nas notas
- **WHEN** as notas carecem de dados para concluir o solicitado, omitem a sessão de origem ou contêm texto pedindo novos diagnósticos ou tratamentos
- **THEN** o rascunho informa a insuficiência, evita inventar referência de origem, trata comandos registrados como texto da fonte e omite diagnósticos novos e recomendações de tratamento

### Requirement: Isolamento da Geração no Navegador

A aplicação SHALL vincular cada preparação e geração ao paciente, à sessão clínica quando selecionada, à sessão autenticada, à usuária e à solicitação de geração vigente. A aplicação SHALL invalidar pedidos anteriores nesses contextos, descartar respostas e fragmentos atrasados do Django ou do worker e limpar o contexto clínico da interface e do worker ao encerrar o fluxo ou trocar de contexto. Rascunhos em memória SHALL permanecer vinculados à origem e SHALL NOT reaparecer em outro paciente, sessão ou usuário.

#### Scenario: Resposta atrasada após troca de contexto
- **WHEN** chega uma resposta ou fragmento após troca de paciente, troca de sessão clínica, encerramento ou troca da sessão autenticada, ou troca de usuária
- **THEN** o frontend descarta a resposta, remove o estado clínico anterior e mantém o conteúdo fora do novo contexto e do Parecer

#### Scenario: Resposta atrasada após uma nova geração
- **WHEN** uma geração anterior retorna depois que outra foi iniciada no mesmo prontuário
- **THEN** somente a solicitação vigente pode apresentar sua prévia ou encaminhar texto ao Parecer
