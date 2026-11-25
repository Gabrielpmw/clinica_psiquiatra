# Tasks

## 1. Conclusão e avisos

- [x] 1.1 Consolidar no `AiGenerationProvider` o aviso genérico, o som curto e o título da aba. Verificar uma emissão por resultado válido, com áudio disponível ou bloqueado, e confirmar que falha, cancelamento e resposta tardia preservam o estado de conclusão das pendências válidas.
- [x] 1.2 Vincular a indicação no título à primeira abertura autorizada e visível de cada prévia. Verificar conclusão na Agenda e em outra aba, abertura de uma entre várias pendências, descarte, encerramento da sessão e restauração do título.

## 2. Detecção de inatividade e recuperação

- [x] 2.1 Ajustar a checagem por etapa em `AiGenerationContext.jsx` com progresso crescente, fragmentos novos, prazo na finalização e reavaliação ao voltar à aba. Usar relógio e eventos controlados para simular contexto travado, inicialização sem avanço, streaming parado, finalização pendente e uma execução longa com progresso real.
- [x] 2.2 Unificar o encerramento por inatividade com o aborto da preparação ou término do worker e preservar um erro genérico com vínculo à tentativa. Simular erro do worker e retorno tardio após timeout, conferir a liberação para nova tentativa e comparar as pendências que já existiam.

## 3. Navegação e interface

- [x] 3.1 Ajustar o botão **Rascunhos IA** e inserir **Ir para o resumo** no painel da barra superior durante a geração e depois de uma falha por inatividade. Verificar abertura direta do rascunho prioritário, escolha das demais pendências e acesso ao processamento e ao cancelamento por teclado, em desktop e em largura móvel.
- [x] 3.2 Integrar o destino da barra superior ao `ProntuarioPage.jsx` e à `AiAssistantSection.jsx`, com autorização, atualização da seção ativa e foco na região de progresso, na prévia ou no erro. Simular navegação entre pacientes, conclusão durante o carregamento, acesso revogado e erro de comunicação. Verificar que a prévia correta só aparece após autorização e que o timeout permite iniciar outra geração a partir da origem.
- [x] 3.3 Conferir a barra lateral, o painel global e a seção de IA. Retirar eventuais ocorrências dos textos e do atalho lateral definidos na proposta e validar a presença dos controles de geração, cancelamento, revisão e histórico.

## 4. Validação integrada

- [x] 4.1 Executar `npm run build` em `frontend` e validar em Chrome ou Edge com WebGPU e dados fictícios. Testar cache vazio e completo, anotar os tempos de preparação, inicialização e geração e percorrer o fluxo da Agenda até a prévia usando o atalho durante o processamento e depois de concluído.
- [x] 4.2 Verificar com duas pendências em prontuários distintos que os avisos, o título da aba e o painel global exibem informações genéricas. Confirmar que editar, salvar ou descartar uma pendência afeta somente o item selecionado e que o texto aparece na origem autorizada.

Medições aproximadas no Edge com WebGPU e API simulada. Com cache vazio, a preparação observada levou 0,9 s, a inicialização 88,6 s e a geração 74,3 s. Com cache completo, os tempos foram 0,6 s, 5,2 s e 13,9 s, com um texto de teste mais curto e sem novo download de pesos.
