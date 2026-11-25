# Design

## Context

`background-clinical-summary-drafts` está concluída no OpenSpec e ainda aguarda arquivamento. Seu delta descreve a geração durante a navegação, os rascunhos em memória e a revalidação ao voltar à origem. Esta mudança usa esse fluxo como base. Os requisitos novos complementam o delta anterior de `clinical-ai-assistant` e têm nomes próprios para permitir a validação com a especificação principal atual.

Na árvore de trabalho, `AiGenerationProvider` já mantém a execução acima das rotas, reproduz um aviso sonoro, atualiza o título da aba e checa prazos de inatividade. O `AppLayout` já oferece abertura direta via `draftId`. `AiAssistantSection` revalida o acesso com `getResumosIa` e pode focar e rolar até a prévia. O painel global tem cancelamento e revisão de pendências, mas a execução ativa carece de um link para sua origem. O atalho lateral e os textos pedidos já estão ausentes nos componentes locais inspecionados. A checagem visual deve confirmar essa ausência nas telas afetadas.

## Goals / Non-Goals

**Goals**

- Centralizar conclusão, falha e cancelamento na tentativa vigente do provedor, inclusive durante mudanças de rota.
- Usar o mesmo destino de revisão para o acesso direto e para o acompanhamento de uma geração, com autorização vinculada ao paciente e à sessão atual.

**Non-Goals**

- Troca de modelo, ajuste da qualidade dos roteiros ou redução direta do custo da inferência.
- Mudanças nos endpoints, no modelo de dados ou na duração das pendências em memória.

## Decisions

1. **Aviso associado à conclusão válida.** Reaproveitar `NotificationContext` para o aviso genérico e a Web Audio API para o som curto. Preparar ou retomar o `AudioContext` no gesto que inicia a geração e tocar ao criar uma pendência válida. Aplicar a indicação no `document.title` pelo conjunto de rascunhos ainda não abertos para revisão. Uma prévia criada enquanto a aba está oculta continua pendente de visualização. Registrar a abertura após a prévia autorizada ficar visível. Limpar a indicação quando o conjunto ficar vazio e durante o encerramento da sessão. Tratar falhas de áudio de modo independente para garantir o aviso visual. [Web Audio API](https://www.w3.org/TR/webaudio/#allowed-to-start) · [HTML Standard](https://html.spec.whatwg.org/multipage/dom.html#document.title)

2. **Atalho da origem no painel superior.** Em `AppLayout.jsx`, manter o clique principal em **Rascunhos IA** direcionado ao rascunho pronto conforme a ordem atual, com acesso ao painel para acompanhar a geração ou escolher outra pendência. Em `AiDraftsModal.jsx`, acrescentar **Ir para o resumo** ao cartão da geração ao lado do cancelamento e disponibilizar o mesmo destino em caso de falha por inatividade. Reaproveitar a rota do prontuário e transportar no estado de navegação apenas a intenção e o identificador opaco da solicitação ou do rascunho. Associar o identificador da solicitação ao rascunho e ao estado de falha no provedor. O vínculo permite resolver o destino correto se a operação mudar de estado durante o carregamento. A visita manual ao prontuário segue o fluxo das abas internas.

3. **Autorização, rolagem e finalização no destino.** Em `ProntuarioPage.jsx`, selecionar a seção de IA para o destino solicitado. Em `AiAssistantSection.jsx`, aguardar a seção estar montada e validar a autorização do paciente antes de mostrar qualquer fragmento ou prévia reaberta. Reutilizar a revalidação da revisão e o tratamento de perda de acesso. Focar e rolar para a região de progresso ou para a prévia, conforme o estado do identificador de origem. Quem seguiu a execução continua vendo o mesmo resultado quando ele chega. Uma falha durante o redirecionamento leva à mensagem e aos controles da seção. Encerrar o acompanhamento da solicitação quando a profissional deixar o contexto de destino ou quando a sessão mudar.

4. **Prazos por progresso real.** Consolidar a checagem existente no provedor e reutilizar a interrupção de `webllmService.js`. Manter os valores atuais de 45 s para o Django, 180 s para a inicialização e 120 s para a geração. Contar a partir da entrada na etapa ou do último avanço observado. Na inicialização, considerar aumento do progresso ou marco distinto do carregamento. Na inferência, considerar novos fragmentos e a passagem para a finalização. Usar a mesma janela da geração durante a limpeza final do worker. Reavaliar o prazo restante quando o temporizador executar e quando a página voltar a ficar visível. Eventos repetidos e repinturas ficam fora do cálculo. [Temporizadores em abas ocultas no Chrome](https://developer.chrome.com/blog/timer-throttling-in-chrome-88)

5. **Recuperação de tentativa travada.** Invalidar a solicitação e abortar a preparação ou encerrar o worker correspondente antes de liberar uma nova geração. Limpar temporizadores, ouvintes e texto parcial. Associar ao estado de erro apenas a identificação da tentativa e da origem, o roteiro e a informação genérica sobre a etapa. Exibir a mensagem no painel superior e no prontuário de origem. A ação abre a seção e permite selecionar ou confirmar a tentativa manualmente. As atualizações tardias são filtradas pela identidade da tentativa e da sessão.

## Risks / Trade-offs

- **O navegador pode pausar a execução quando a aba está oculta.** O prazo é reavaliado assim que a página volta a executar. Validar separadamente o comportamento em segundo plano e o retorno de uma aba suspensa.
- **O primeiro download ou a preparação da GPU pode avançar com intervalos longos.** Confirmar os limites com cache vazio e completo, usando avanço real do carregamento para renovar o prazo.
- **O estado pode mudar durante a navegação.** Resolver a origem e a tentativa após montar o destino e testar conclusão, falha e mudança de sessão nesse intervalo.

## Migration Plan

Publicar o frontend com os artefatos OpenSpec associados. A reversão usa a versão anterior do frontend e reinicia o estado em memória da aba. Os resumos gravados continuam disponíveis no histórico.
