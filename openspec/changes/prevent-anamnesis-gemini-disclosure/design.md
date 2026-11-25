# Design

## Context

Ver [proposal.md](proposal.md) para a motivação e [spec.md](specs/clinical-ai-assistant/spec.md) para o contrato. Hoje `AiSourcesAndReview.jsx` oferece anamnese como fonte e `prontuarioService.js` envia `incluir_anamnese`. `ContextoIaView` e `GerarResumoIaView` aceitam essa opção; `generate_clinical_summary` monta o texto tratado e o envia ao Gemini. O sanitizador já consegue consultar dados da anamnese quando ela não é incluída, para reconhecer identificadores nas notas.

A mudança ativa `replace-webllm-with-gemini` ainda prevê a anamnese como fonte opcional. A especificação principal ainda descreve WebLLM até essa migração ser sincronizada. Esta proposta deverá ser conciliada com ambas antes de arquivar qualquer mudança sobre o mesmo contrato.

## Goals / Non-Goals

**Goals:**

- Aplicar a exclusão da anamnese no servidor, inclusive diante de chamadas diretas à API.
- Mostrar exatamente o contexto das sessões que poderá seguir ao Gemini e obter uma confirmação breve por tentativa.
- Continuar usando a anamnese somente como referência interna para detectar identificadores nas sessões.

**Non-Goals:**

- Impedir o uso da anamnese no prontuário fora do fluxo de geração externa.
- Alterar o histórico, os roteiros fixos ou o salvamento confirmado dos resumos.
- Tratar uma confirmação humana como substituta da sanitização automática.

## Decisions

1. **Contrato das fontes.** Manter temporariamente o campo `incluir_anamnese` para aceitar clientes atualizados que enviam `false`, mas rejeitar `true` em `/ia/contexto/` e `/ia/gerar/`; exigir pelo menos uma sessão com anotação. Retirar a opção de anamnese do seletor de IA e não mostrá-la como fonte incluída na revisão. Isso evita que a interface prometa uma fonte que o servidor não enviará. Remover o campo imediatamente exigiria uma migração mais ampla do contrato; permitir `true` apenas na revisão criaria uma prévia diferente da entrada do Gemini.

2. **Separar referência interna de conteúdo externo.** Passar a anamnese ao sanitizador somente para descobrir possíveis identificadores presentes nas notas selecionadas. Construir o contexto revisado e o pedido ao Gemini exclusivamente das sessões selecionadas e tratadas. Um teste com marcadores exclusivos da anamnese deverá inspecionar a entrada efetiva de `call_gemini_api`, incluindo instrução e conteúdo, e comprovar sua ausência. Zerar a anamnese antes da sanitização perderia uma fonte útil para detectar nomes e endereços nas notas.

3. **Confirmação curta no ponto de envio.** Colocar um botão de informação ao lado de **Gerar rascunho** e abrir uma confirmação breve ao acionar a geração. O texto informa que não devem constar dados identificáveis nas sessões e que o conteúdo tratado será enviado ao Gemini; oferecer **Cancelar** e **Confirmar e gerar**. O estado de confirmação será local à revisão atual e descartado ao cancelar, alterar fonte/roteiro, mudar o contexto ou concluir a tentativa. Enviar `confirmacao_privacidade: true` somente após essa ação e exigir esse valor no endpoint de geração. Um aceite persistente reduziria cliques, mas não atenderia ao pedido de aviso antes de cada envio.

4. **Bloqueio independente da confirmação.** Reutilizar os avisos e o estado `trecho_retido` do sanitizador para impedir a chamada externa quando houver identificador sem tratamento seguro. A confirmação não libera uma fonte bloqueada. Revalidar seleção, autorização e hash do contexto antes da chamada, como no fluxo atual.

5. **Ordem de integração das mudanças OpenSpec.** Antes de sincronizar e arquivar `replace-webllm-with-gemini`, atualizar seus artefatos para remover a permissão de anamnese e incorporar o novo campo de confirmação, ou concluir sua sincronização e então aplicar esta mudança sobre o contrato resultante. Não sincronizar deltas contraditórios na ordem inversa sem reconciliá-los.

## Risks / Trade-offs

- **Identificadores em texto livre escapam aos padrões automáticos** → exigir revisão humana do texto tratado, manter o bloqueio de trechos incertos e testar exemplos com nomes, contatos, documentos e endereços fictícios. O aviso não é garantia isolada de anonimização.
- **Clientes antigos enviam `incluir_anamnese: true` ou omitem a confirmação** → responder com erro de validação antes do envio externo e publicar frontend e backend juntos.
- **A anamnese aparece indiretamente em uma nota selecionada** → tratar esse trecho como conteúdo da sessão, aplicar sanitização e bloqueio normalmente; não copiar campos da anamnese para o contexto enviado.
- **Dois deltas OpenSpec tratam a mesma geração Gemini** → reconciliar o delta ativo e validar as especificações antes de sincronizar ou arquivar.

## Migration Plan

Publicar backend e frontend juntos. Primeiro aplicar a recusa de anamnese e a exigência de confirmação no servidor; depois disponibilizar a interface que seleciona apenas sessões e apresenta a confirmação. Se for preciso reverter, desabilitar temporariamente a geração Gemini até que uma versão compatível do backend e frontend preserve a proibição de envio da anamnese.
