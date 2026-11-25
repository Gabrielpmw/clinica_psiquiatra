# Proposal

## Why

A geração de resumos pode continuar enquanto a profissional usa outras telas. Ela precisa perceber quando o texto está pronto, voltar ao ponto certo do prontuário e saber quando a espera indica que o processamento parou.

## What Changes

- Avisar uma vez por conclusão com um som curto, um aviso no site e a indicação **Rascunho IA pronto** no título da aba do navegador.
- Concentrar o acesso global a **Rascunhos IA** na barra superior. O botão abre diretamente o texto quando há rascunho pronto. O painel do processamento oferece **Ir para o resumo** durante a geração, além de manter o cancelamento e o acesso às demais pendências.
- Garantir a ausência do atalho na barra lateral, do bloco **Privacidade e memória**, do texto **Assistente de IA Local (WebLLM)** e do parágrafo que começa com **Inferência 100% no navegador via WebGPU** nas superfícies do resumo.
- Detectar falta de progresso na preparação, no carregamento do modelo e na geração. Encerrar a tentativa travada, indicar a etapa afetada e permitir nova tentativa no prontuário de origem.

## Capabilities

### New Capabilities

### Modified Capabilities

- `clinical-ai-assistant` — avisos de conclusão, navegação para o resumo, simplificação da interface e recuperação de gerações interrompidas.

## Impact

A mudança abrange o cabeçalho, a navegação lateral, o painel global, a seção de IA do prontuário e a coordenação da geração entre o React e o worker WebLLM. Usa as rotas e os contratos existentes de autorização, consulta e gravação.
