# Spec Delta

## ADDED Requirements

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
