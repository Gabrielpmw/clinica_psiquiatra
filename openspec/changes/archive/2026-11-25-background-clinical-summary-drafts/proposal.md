# Proposal

## Why

A geração local de resumos pode levar tempo, e hoje a aba do assistente mantém o progresso e o rascunho. Ao sair dela, a profissional perde o acompanhamento da solicitação e precisa voltar ao prontuário para iniciar a geração novamente.

## What Changes

- Manter uma geração WebLLM ativa enquanto a profissional navega entre telas, abas internas do prontuário e pacientes na mesma aba do navegador.
- Disponibilizar **Rascunhos da IA** na navegação autenticada, com andamento, cancelamento, indicação de falhas e aviso quando um resultado estiver disponível para revisão.
- Manter os resultados concluídos como pendências em memória. A profissional pode abrir o prontuário de origem, revisar, editar e decidir se salva no histórico ou descarta. O prompt 4 mantém o encaminhamento explícito para o Parecer Conclusivo.
- Vincular cada geração e pendência à profissional, à sessão autenticada, ao paciente e à origem clínica. Revalidar o acesso ao retomar a revisão e encerrar o fluxo ao sair da conta, recarregar ou fechar a aba do navegador.

## Capabilities

### New Capabilities

### Modified Capabilities

- `clinical-ai-assistant` recebe acompanhamento global da geração local e revisão de rascunhos pendentes. O isolamento passa a distinguir navegação da troca de sessão autenticada.

## Impact

- O estado de geração passa da aba do assistente para a camada autenticada da aplicação React. A navegação e o prontuário oferecem acesso ao estado compartilhado.
- O Web Worker continua executando WebLLM e WebGPU. A mudança mantém os endpoints de preparação e salvamento e reaproveita a autorização por paciente no Django.
- Somente o salvamento confirmado envia o texto revisado ao Django. As pendências ficam disponíveis na aba que as criou durante a sessão autenticada.
