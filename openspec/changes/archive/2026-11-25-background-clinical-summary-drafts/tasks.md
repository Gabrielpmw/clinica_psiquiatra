# Tasks

## 1. Sessão autenticada e ciclo de vida do motor

- [x] 1.1 Expor no `AuthContext` a identidade da sessão em memória e ligar a expiração detectada, o logout e a substituição da sessão à limpeza do fluxo de IA. Testar renovação do token dentro da sessão, logout seguido de login na mesma conta e troca de conta, inclusive quando a sessão é substituída em outra aba.
- [x] 1.2 Vincular a preparação, a revalidação e o salvamento confirmado à sessão de origem nas chamadas Axios, incluindo a tentativa de renovação ou reenvio. Testar que uma resposta ou repetição atrasada da sessão anterior é descartada e que um resumo antigo não é enviado com a nova autenticação.
- [x] 1.3 Ligar o cancelamento e a limpeza ao ciclo de vida real do worker. Testar cancelamento durante inicialização e streaming, limpeza após sucesso e falha, rejeição de eventos atrasados e disponibilidade de uma nova tentativa após liberação da execução anterior.

## 2. Geração durante a navegação

- [x] 2.1 Montar a coordenação em `App.jsx` acima das rotas e ligar o início no assistente ao fluxo compartilhado. Testar com preparação e worker controlados que mudar para a Agenda, outra aba do prontuário ou outro paciente conserva a operação e que dois cliques ou solicitações próximas iniciam apenas uma execução.
- [x] 2.2 Adicionar **Rascunhos da IA** à navegação autenticada e aos avisos de conclusão ou falha. Verificar por teclado e em largura móvel que é possível acompanhar e cancelar de outra tela, que a conclusão mantém a tela ativa e que o controle aparece apenas para doutoras, exibindo roteiro, horário e estado da solicitação.
- [x] 2.3 Integrar os resultados de geração ao estado pendente, incluindo aviso quando a saída atinge o limite de tokens. Testar que o texto concluído fica disponível na origem, que uma falha ou um cancelamento não cria pendência e que duas gerações sucessivas produzem itens distintos mesmo sem salvar a primeira.

## 3. Revisão e destino dos rascunhos

- [x] 3.1 Ligar a ação de abrir ao prontuário de origem, reusar a consulta autorizada de histórico para revalidar o acesso e guardar as edições no estado compartilhado. Testar o retorno após editar, a ausência de texto ao trocar de paciente antes da resposta e o tratamento de rede indisponível e acesso revogado.
- [x] 3.2 Reutilizar a prévia, a confirmação e a gravação atual de resumos. Testar cancelamento da confirmação, descarte sem gravação, salvamento bem-sucedido, proteção contra cliques repetidos e preservação do texto editado após falha recuperável. Conferir que as ações afetam somente a pendência selecionada e o histórico do paciente correto.
- [x] 3.3 Vincular o painel do Parecer à pendência do prompt 4. Testar que encaminhar mantém a pendência, preserva a edição manual e não grava dados. Verificar que salvar o Parecer mantém a pendência, salvar como resumo pelo painel a remove e trocar de paciente limpa a referência exibida.

## 4. Validação integrada

- [x] 4.1 Em Chrome ou Edge com WebGPU e prontuário fictício, iniciar a geração com cache vazio e repetir com cache completo. Navegar durante a preparação e o streaming, abrir o rascunho final e confirmar o salvamento. Com os artefatos em cache, bloquear a rede após a preparação e verificar a geração local, a retenção da pendência e a reabertura autorizada após restaurar a conexão.
- [x] 4.2 Inspecionar requisições, armazenamento, URLs e logs com marcadores fictícios. Confirmar que o texto só vai ao Django após confirmação, que sair da conta ou recarregar elimina as pendências e que registros salvos continuam acessíveis. Executar `npm run build` no frontend e `python manage.py test` no backend.
