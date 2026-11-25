# Tasks

## 1. Conciliar o contrato da geração Gemini

- [x] 1.1 Atualizar os artefatos ainda ativos de `replace-webllm-with-gemini` que permitem anamnese no envio externo, ou sincronizá-los primeiro e reconciliar o contrato principal antes desta mudança. Verificar que os deltas e a especificação resultante não permitem o envio de anamnese ao Gemini.
- [x] 1.2 Ajustar o contrato documentado dos endpoints de IA para exigir ao menos uma sessão, `incluir_anamnese: false` e confirmação explícita na geração. Verificar que os exemplos de payload e as mensagens de erro correspondem à especificação.

## 2. Bloqueio no backend e cobertura de privacidade

- [x] 2.1 Alterar a validação de `/ia/contexto/` e `/ia/gerar/` para rejeitar `incluir_anamnese: true` e seleção sem sessão com anotação antes da geração. Testar anamnese isolada, anamnese com sessões e chamadas diretas ao endpoint, confirmando que `call_gemini_api` não é chamado.
- [x] 2.2 Separar a consulta interna da anamnese da montagem do contexto enviado, mantendo sua utilidade para identificar dados pessoais nas sessões. Testar com marcadores fictícios exclusivos da anamnese e inspecionar a instrução e o conteúdo passados a `call_gemini_api` para confirmar que esses marcadores não aparecem.
- [x] 2.3 Exigir `confirmacao_privacidade: true` em `/ia/gerar/` e manter o bloqueio de fontes com `trecho_retido` mesmo com confirmação. Testar pedido sem confirmação, confirmação falsa e fonte bloqueada, garantindo ausência de chamada externa.

## 3. Seleção, aviso e confirmação na interface

- [x] 3.1 Remover a opção de incluir anamnese do seletor de IA e das fontes mostradas como enviadas; manter a anamnese acessível normalmente no prontuário. Testar que o frontend envia somente sessões e `incluir_anamnese: false`, inclusive após voltar à seleção.
- [x] 3.2 Adicionar o botão de informação junto a **Gerar rascunho** e a confirmação curta com **Cancelar** e **Confirmar e gerar**. Testar teclado, toque e largura móvel, além da ausência de pedido de geração quando o aviso é fechado ou cancelado.
- [x] 3.3 Vincular a confirmação à revisão e à tentativa atuais, enviando `confirmacao_privacidade: true` apenas após aceite explícito. Testar alteração de fonte, roteiro ou contexto, nova tentativa, resposta atrasada e duplo clique para confirmar que um aceite anterior não dispara outro envio.

## 4. Verificação integrada do fluxo externo

- [x] 4.1 Executar os testes de IA do Django, os testes relevantes do frontend e o build. Com fontes fictícias, comparar a versão revisada com o payload efetivo enviado ao Gemini e verificar que não há texto da anamnese nem identificadores sem tratamento seguro.
- [ ] 4.2 Exercitar no navegador a seleção de sessões, o aviso, confirmação, cancelamento, bloqueio por fonte insegura e revisão do rascunho. Verificar que histórico e Parecer continuam disponíveis quando a geração é recusada ou falha.
