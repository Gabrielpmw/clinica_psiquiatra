# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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
