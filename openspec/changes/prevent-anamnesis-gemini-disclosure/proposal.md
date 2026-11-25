# Proposal

## Why

A geração via Gemini atualmente permite incluir a anamnese, que pode conter informações capazes de identificar o paciente. A profissional também precisa de um aviso claro e breve antes de enviar anotações de sessões a um serviço externo.

## What Changes

- **BREAKING** Impedir o envio da anamnese ao Gemini em qualquer forma, inclusive sanitizada; a geração passa a exigir ao menos uma sessão com anotação selecionada.
- Manter a anamnese apenas como referência interna no Django para identificar dados pessoais presentes nas sessões, sem incluí-la no contexto de revisão para envio nem no pedido à API externa.
- Mostrar uma ação de informação junto à confirmação de geração, explicando que as anotações das sessões não devem conter dados que identifiquem pacientes.
- Exigir uma confirmação simples por tentativa de geração, após a revisão do conteúdo tratado, antes de chamar o endpoint de geração. O aviso não substitui a sanitização e o bloqueio de fontes inseguras no servidor.
- Conciliar este contrato com a mudança ativa `replace-webllm-with-gemini`, que ainda especifica o envio opcional da anamnese.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `clinical-ai-assistant`: restrição das fontes enviadas ao Gemini e confirmação informada antes da geração.

## Impact

Afeta o seletor e a revisão de fontes no React, o contrato dos endpoints de contexto e geração de IA no Django, a montagem do contexto enviado ao Gemini e os testes de privacidade e fluxo. Não altera o conteúdo original do prontuário nem o histórico de resumos já salvos.
