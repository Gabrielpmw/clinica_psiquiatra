# Design

## Context

`AiAssistantSection.jsx` administra a preparação do contexto, o progresso, os fragmentos e a prévia. O efeito associado ao paciente invalida a solicitação na desmontagem da seção de IA. Em `ProntuarioPage.jsx`, a seção é montada condicionalmente pela aba ativa. Cada rota também monta seu próprio `AppLayout`. Já `App.jsx` mantém `AuthProvider` e `NotificationProvider` acima de `AppRoutes`.

A especificação vigente de isolamento invalida respostas ao trocar de paciente ou sessão clínica. O delta distingue a origem da execução da tela em uso. Uma troca de tela encerra a visualização anterior, e o trabalho mantém seu vínculo de origem. O término da sessão autenticada encerra o trabalho e elimina as pendências.

## Goals / Non-Goals

**Goals**

- Dar à geração e aos rascunhos o ciclo de vida da sessão autenticada na aba do navegador.
- Reaproveitar a interface de revisão e os contratos de autorização e gravação por paciente.

**Non-Goals**

- Continuidade após recarga, fechamento da aba, saída da conta ou troca de dispositivo.
- Arquivos para download, persistência de pendências, processamento em servidor e mudança de modelo para acelerar a inferência.

## Decisions

1. **Coordenação acima das rotas.** Montar um provedor de geração em `App.jsx`, dentro dos provedores de autenticação e notificações e acima de `AppRoutes`. Substituir no assistente o estado de geração atrelado à montagem por operações nesse provedor. Um estado hospedado em cada `AppLayout` acompanharia a desmontagem da rota. Manter o carregamento do modelo sob demanda e limitar as atualizações globais às mudanças de fase, progresso com frequência controlada e quantidade de pendências. A prévia incremental pode receber os fragmentos quando o prontuário autorizado de origem está aberto.

2. **Uma solicitação ativa e pendências independentes.** Reservar a vaga antes da preparação no Django. Cada execução identifica a geração, a sessão autenticada, a profissional, o paciente, a sessão clínica quando houver e o roteiro. Usar as fases de preparação, inicialização, geração e cancelamento. Após conclusão válida, criar uma pendência editável com identificador próprio e liberar a vaga. Falha ou cancelamento liberam a vaga após o encerramento do trabalho e removem o texto parcial. Várias gerações simultâneas disputariam o mesmo motor e aumentariam o uso de GPU. Os rascunhos concluídos podem coexistir e permanecem disponíveis durante as gerações seguintes.

3. **Ciclo de vida da autenticação e do worker.** Expor no `AuthContext` um identificador em memória para a sessão autenticada e renová-lo a cada login, mesmo para a mesma conta. Encerrar a sessão de geração no logout, na perda de autenticação detectada pelo interceptador ou na substituição da sessão de login detectada na aba. A renovação do token de acesso pode continuar dentro da mesma sessão. Em `api.js`, vincular a preparação, a revalidação e a tentativa de gravação à sessão original, inclusive antes de repetir uma requisição após renovar as credenciais. Conferir sessão e identificador da operação em eventos e respostas, inclusive durante inicialização do motor e mudança de paciente. Fazer o cancelamento interromper a preparação via sinal de aborto quando aplicável e encerrar o trabalho do worker. Após o fluxo terminal, descartar o contexto de inferência com `resetChat` ou terminar o worker se a limpeza ou o cancelamento falharem. No encerramento da sessão, terminar o worker, limpar o provedor e invalidar callbacks ainda pendentes. A limpeza do componente local fica restrita à sua visualização.

4. **Acesso global com revisão no prontuário.** Montar o controle **Rascunhos da IA** na navegação autenticada de doutoras, reutilizando `AppLayout` ou `Sidebar`. Exibir andamento e itens pendentes com roteiro, horário e estado. Usar os avisos existentes para conclusão ou falha, com mensagens genéricas e sem navegação automática. A ação de abrir seleciona a pendência em memória e usa a rota existente do prontuário de origem. Antes de renderizar uma pendência reaberta, obter uma resposta autorizada atual de `getResumosIa(pacienteId)`, cuja rota aplica a concessão por paciente e `no-store`. A preparação autorizada habilita a primeira prévia quando a profissional permaneceu no contexto de origem, inclusive se a rede ficar indisponível depois da preparação. Guardar a resposta de revalidação apenas para a tentativa e a origem correspondentes. Uma negativa por paciente remove suas pendências. Uma falha transitória preserva a pendência oculta para nova verificação.

5. **Decisões explícitas e vínculo com o Parecer.** Em `AiAssistantSection.jsx`, ler e editar a pendência pelo identificador, com o texto e o título no provedor. O salvamento confirmado usa `salvarResumoIa` com o paciente original e bloqueia reenvios simultâneos. Remover a pendência e atualizar o histórico após resposta bem-sucedida. Em caso de falha recuperável, preservar as edições e exigir confirmação para repetir. O descarte remove apenas a pendência selecionada. Para o prompt 4, `ProntuarioPage.jsx` e `ParecerConclusivoSection.jsx` recebem o vínculo da pendência, limitado ao paciente, e o salvamento de um resumo no painel usa a mesma operação de conclusão. A gravação do Parecer tem confirmação própria e deixa o resumo pendente. Ao trocar de paciente, limpar as referências exibidas e rejeitar respostas atrasadas da tela anterior.

## Risks / Trade-offs

- **A aba pode ser suspensa pelo navegador.** O andamento é retomado conforme a aba volta a executar. Informar no painel que recarregar ou fechar a aba encerra as pendências.
- **Navegação e respostas tardias podem cruzar contextos.** Validar sessão, paciente e operação antes de aplicar cada resultado, e testar cenários com retorno atrasado do Django e do worker.
- **Uma concessão pode ser revogada entre geração e revisão.** Revalidar ao abrir novamente e no salvamento, retirar os itens do paciente após uma negativa e manter o texto oculto durante falhas transitórias de comunicação.
- **Rascunhos podem conter dados sensíveis mesmo após a sanitização.** Manter texto e títulos editados em memória e usar informações genéricas em avisos e erros. O cache continua reservado aos artefatos do modelo.

## Migration Plan

Publicar o frontend em conjunto com a especificação atualizada. A mudança usa o armazenamento existente de resumos e Pareceres, com gravação pelos endpoints atuais. Se for necessário reverter o frontend, a sessão é reiniciada e os resumos já confirmados permanecem no histórico.
