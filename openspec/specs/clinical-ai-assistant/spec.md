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

### Requirement: Acompanhamento da Geração Durante a Navegação

O sistema SHALL manter a preparação, a inicialização do modelo e a geração local quando a profissional autorizada navega entre telas, abas internas do prontuário ou pacientes na mesma aba do navegador e na mesma sessão autenticada. O indicador **Rascunhos da IA** SHALL ficar acessível nas telas autenticadas da profissional e informar o andamento, o cancelamento, o término e falhas. Fora do prontuário de origem, a interface e os avisos SHALL exibir somente o roteiro fixo, o horário e o estado da solicitação, sem nome de paciente, título editado ou conteúdo clínico.

O sistema SHALL executar uma geração por vez na aba. Se houver geração ativa, SHALL informar seu andamento e rejeitar uma nova solicitação sem substituir a ativa. A profissional SHALL poder cancelar a geração, e o cancelamento SHALL liberar uma nova tentativa após encerrar a execução anterior. Falhas SHALL apresentar uma mensagem em português e permitir nova tentativa quando recuperáveis, sem transformar fragmentos em rascunhos prontos.

#### Scenario: Navegação durante a preparação ou geração
- **WHEN** a profissional inicia a geração no prontuário e navega para outra aba do prontuário ou para a Agenda ou a lista de pacientes antes da resposta da API ou durante a inicialização ou geração
- **THEN** a mesma solicitação continua, a tela de destino permanece utilizável e o andamento fica acessível em Rascunhos da IA

#### Scenario: Conclusão em outra tela
- **WHEN** o resultado final chega enquanto a profissional usa outra tela autenticada
- **THEN** a tela permanece aberta, o sistema avisa que há um rascunho pronto e oferece acesso à revisão sem apresentar o texto clínico no aviso

#### Scenario: Nova solicitação enquanto há geração ativa
- **WHEN** a profissional tenta iniciar outra geração na mesma aba enquanto uma solicitação está ativa
- **THEN** o sistema informa que já existe geração ativa e mantém a solicitação original e os rascunhos pendentes

#### Scenario: Cancelamento ou falha com outra tela aberta
- **WHEN** a profissional cancela uma geração pelo indicador global ou a execução falha em outra tela
- **THEN** o sistema informa o resultado da operação, não disponibiliza o texto parcial para revisão e oferece nova geração quando a execução anterior tiver sido encerrada e o erro for recuperável

### Requirement: Rascunhos Clínicos Pendentes de Revisão

Cada resultado concluído SHALL ficar acessível em **Rascunhos da IA** como pendente de revisão, vinculado à origem. A profissional SHALL poder abrir, revisar e editar o texto e o título no prontuário de origem. A navegação subsequente SHALL preservar as edições em memória na mesma aba e sessão autenticada. A interface SHALL distinguir pendências do histórico e informar que sair da conta, recarregar ou fechar a aba encerra as pendências.

Um rascunho SHALL sair da lista quando for descartado explicitamente ou quando o Django confirmar seu salvamento como resumo. Uma falha recuperável de salvamento SHALL preservar o rascunho com as edições. O encaminhamento do prompt 4 SHALL manter a pendência disponível até decisão explícita sobre o resumo, com salvamento do Parecer e do resumo tratados em confirmações independentes. Uma geração posterior SHALL NOT substituir pendências existentes.

#### Scenario: Retomar uma pendência e editar
- **WHEN** a profissional abre uma pendência no prontuário de origem com acesso validado, edita título ou texto, navega para outra tela e retorna na mesma aba e sessão
- **THEN** a interface mostra as últimas edições do rascunho correto, identifica a pendência para revisão e o histórico segue sem a pendência

#### Scenario: Confirmar ou descartar uma pendência
- **WHEN** a profissional confirma o salvamento como resumo ou descarta explicitamente uma pendência
- **THEN** após a confirmação de gravação pelo Django, o resumo revisado aparece no histórico do paciente de origem e deixa de ser pendente, ou, no descarte, a pendência desaparece sem gravação

#### Scenario: Falha ou cancelamento da confirmação de salvamento
- **WHEN** a profissional cancela a caixa de confirmação ou a gravação falha de forma recuperável
- **THEN** o rascunho continua pendente com as últimas edições, a interface indica a falha quando aplicável e qualquer nova tentativa exige confirmação da profissional

#### Scenario: Pendências de gerações sucessivas
- **WHEN** a profissional conclui uma geração e inicia outra antes de salvar ou descartar a primeira
- **THEN** cada resultado fica acessível separadamente e a decisão sobre um deles não altera o outro

#### Scenario: Encaminhar pendência do prompt 4
- **WHEN** a profissional encaminha uma pendência do prompt 4 ao Parecer ou confirma o salvamento do próprio Parecer
- **THEN** a referência fica vinculada ao paciente de origem, o formulário preserva o texto manual em edição e o resumo permanece pendente até seu salvamento confirmado como resumo ou descarte explícito

### Requirement: Isolamento da Geração no Navegador

A aplicação SHALL vincular preparação, geração, prévia e pendência à solicitação, à profissional, à sessão autenticada na aba do navegador, ao paciente e à sessão clínica de origem quando selecionada. A navegação dentro da mesma sessão autenticada SHALL desacoplar a visualização da execução, mantendo o vínculo de origem. O texto e suas ações clínicas SHALL ficar disponíveis apenas no prontuário e no contexto de origem autorizado.

Ao retomar uma pendência, a aplicação SHALL revalidar o acesso ao paciente no servidor antes de exibir o texto. Uma falha de comunicação SHALL manter o rascunho em memória sem exibi-lo até uma verificação bem-sucedida. Ao detectar perda de acesso ao paciente, SHALL interromper suas operações e remover seus rascunhos. O Django SHALL revalidar o acesso no salvamento confirmado.

Ao cancelar uma geração, sair da conta, trocar de sessão autenticada ou usuária, perder a autenticação, recarregar ou fechar a aba, a aplicação SHALL encerrar a execução correspondente, limpar o contexto de inferência e desconsiderar respostas atrasadas. A perda ou troca da sessão autenticada e o encerramento da aba SHALL remover as pendências daquela aba e sessão. Conteúdo clínico pendente SHALL permanecer apenas em memória.

#### Scenario: Resposta atrasada após troca de contexto
- **WHEN** chega uma resposta ou fragmento após a profissional trocar de paciente ou sessão clínica na mesma sessão autenticada, ou após encerrar ou trocar a sessão autenticada ou a usuária
- **THEN** na navegação, o resultado permanece vinculado à origem e indisponível para leitura no novo contexto clínico, e, no encerramento ou na troca de sessão autenticada ou de usuária, o resultado atrasado é descartado

#### Scenario: Resposta atrasada após uma nova geração
- **WHEN** chega um evento atrasado de uma solicitação cancelada ou já encerrada depois que outra geração foi iniciada no mesmo prontuário
- **THEN** o evento não cria, altera ou encaminha uma prévia, e a nova solicitação e as pendências válidas mantêm seus conteúdos e estados

#### Scenario: Revalidação de pendência com acesso revogado ou rede indisponível
- **WHEN** a profissional abre uma pendência e recebe negativa de acesso ou a verificação não pode ser concluída
- **THEN** a interface mantém o texto oculto, remove as pendências do paciente se a negativa for de autorização ou oferece tentar a verificação de novo se a falha for de comunicação

#### Scenario: Encerramento ou recarga com rascunho pendente
- **WHEN** a aba é fechada ou recarregada, a sessão autenticada é encerrada ou outra conta entra enquanto existe geração ou pendência
- **THEN** a nova página ou sessão não recupera a geração ou o rascunho em memória e não aparece no histórico qualquer registro sem salvamento confirmado

### Requirement: Aviso de Conclusão do Resumo em Segundo Plano

Ao concluir uma geração válida na sessão autenticada atual, o sistema SHALL avisar uma vez no site, tocar um som curto se o navegador permitir a reprodução e indicar **Rascunho IA pronto** no título da aba do navegador. O aviso SHALL usar uma mensagem genérica e manter a tela atual aberta. O título SHALL manter a indicação enquanto houver um rascunho pronto cuja prévia ainda não tenha sido aberta após autorização, e SHALL restaurar o título normal quando a última pendência desse tipo for aberta, removida ou limpa pelo encerramento da sessão. O som de conclusão SHALL ocorrer exclusivamente para uma geração que resulte em rascunho pronto.

#### Scenario: Resumo concluído enquanto a profissional usa outra tela ou outra aba
- **WHEN** uma geração termina enquanto a profissional está na Agenda ou em outra aba do navegador
- **THEN** o sistema emite um aviso genérico no site, toca o som uma vez se a reprodução estiver disponível, sinaliza a conclusão no título da aba da clínica e mantém a tela e a aba em uso

#### Scenario: Áudio indisponível
- **WHEN** o navegador bloqueia ou interrompe a reprodução do aviso
- **THEN** o título da aba e o aviso no site informam a conclusão e o rascunho fica disponível para revisão

#### Scenario: Revisão de vários rascunhos prontos
- **WHEN** a profissional abre para revisão um de vários rascunhos que ainda aguardam a primeira abertura
- **THEN** a indicação permanece no título da aba até a revisão, remoção ou limpeza da última pendência ainda não aberta

### Requirement: Acesso ao Resumo pela Barra Superior

A aplicação SHALL manter o atalho global **Rascunhos IA** no cabeçalho das telas autenticadas da profissional autorizada. A barra lateral SHALL conter somente os itens de navegação das demais funcionalidades. Com rascunho pronto, o botão principal SHALL abrir diretamente a prévia no contexto de origem autorizado, rolar até o texto e posicionar o foco pela navegação por teclado. Havendo mais de um rascunho, SHALL priorizar o mais recente ainda não aberto para revisão e, na ausência desse estado, o mais recente entre os pendentes. A interface SHALL oferecer acesso às demais pendências e ao painel de geração quando coexistirem com um rascunho pronto.

O painel de andamento SHALL oferecer **Ir para o resumo** e **Cancelar geração** como ações distintas. **Ir para o resumo** SHALL abrir a seção de IA no prontuário de origem, posicionar a profissional na área de progresso e permitir acompanhar o resultado da mesma solicitação. Se a solicitação terminar antes de o destino estar pronto, a interface SHALL apresentar a prévia dessa solicitação após validar o acesso. O texto clínico SHALL ser exibido exclusivamente no contexto de origem autorizado. O painel global SHALL apresentar informações genéricas sobre o processamento e as pendências.

#### Scenario: Abertura direta de rascunho pronto
- **WHEN** a profissional aciona **Rascunhos IA** com uma pendência concluída
- **THEN** a aplicação abre a seção de IA do prontuário de origem, revalida o acesso e leva o foco e a rolagem ao texto do rascunho selecionado

#### Scenario: Retorno ao local durante o processamento
- **WHEN** a profissional usa **Ir para o resumo** no painel superior a partir de outra tela ou de outro paciente
- **THEN** a mesma execução continua e a seção de IA do prontuário de origem mostra o andamento e, quando disponível, o texto correspondente

#### Scenario: Conclusão durante o redirecionamento
- **WHEN** a geração termina entre o clique em **Ir para o resumo** e a abertura do destino
- **THEN** a aplicação abre o texto produzido por aquela solicitação após a autorização, preservando as demais pendências

#### Scenario: Acesso revogado antes de abrir
- **WHEN** a profissional segue um atalho para o prontuário e a autorização do paciente é negada
- **THEN** a interface informa a indisponibilidade, protege o texto de origem e aplica a limpeza de operações e pendências definida para perda de acesso

#### Scenario: Textos da interface do resumo
- **WHEN** a profissional abre a seção de IA do prontuário ou o painel de rascunhos no cabeçalho
- **THEN** a interface omite **Privacidade e memória**, **Assistente de IA Local (WebLLM)** e o parágrafo iniciado por **Inferência 100% no navegador via WebGPU**, mantendo os controles e avisos operacionais do resumo

### Requirement: Detecção de Geração Sem Progresso

O sistema SHALL verificar a inatividade por etapa, com limites iniciais de 45 segundos na preparação do contexto, 3 minutos na inicialização do modelo e 2 minutos na geração. O prazo de cada etapa SHALL contar a partir de seu início ou do último avanço real. Progresso crescente do modelo, transição de etapa e novos fragmentos de texto SHALL renovar o prazo aplicável. Uma geração que avança dentro desses limites SHALL continuar mesmo quando o tempo total ultrapassar a duração de uma etapa. A checagem SHALL funcionar enquanto a aba estiver executando e reavaliar o prazo quando a aba voltar a ficar visível.

Ao detectar que a execução parou de avançar, o sistema SHALL encerrar a tentativa vigente, descartar seus fragmentos e informar qual etapa parou no painel superior e na seção de IA do prontuário de origem. O painel SHALL oferecer acesso a essa seção para uma nova tentativa explícita, disponível após encerrar a execução anterior. O sistema SHALL aceitar resultados apenas da solicitação vigente e preservar as outras pendências.

#### Scenario: Preparação, inicialização ou geração travada
- **WHEN** a etapa atual ultrapassa seu limite sem progresso, inclusive com eventos de progresso repetidos
- **THEN** a tentativa é encerrada, o painel superior e o prontuário indicam a etapa afetada e a profissional pode iniciar outra tentativa a partir da seção de IA

#### Scenario: Geração lenta com progresso ou aba temporariamente em segundo plano
- **WHEN** uma geração longa continua a emitir avanços dentro dos intervalos previstos ou a aba volta a executar após o navegador adiar o temporizador
- **THEN** o sistema considera o progresso real e o prazo da etapa atual, mantém a execução que está avançando e encerra a operação que permaneceu sem progresso além do limite

#### Scenario: Resultado atrasado após interrupção
- **WHEN** uma resposta da preparação ou do worker chega depois de a tentativa ter sido encerrada por inatividade
- **THEN** o resultado atrasado é descartado e as pendências válidas mantêm seus estados
