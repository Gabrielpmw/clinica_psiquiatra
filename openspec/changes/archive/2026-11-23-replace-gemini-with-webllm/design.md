# Design

## Context

`AiAssistantSection.jsx` chama `gerarResumoIa` em `prontuarioService.js`. A rota `POST /api/prontuario/pacientes/<paciente_id>/ia/gerar/` valida a permissão e o identificador do prompt, reúne anamnese e anotações e chama `gemini_service.py`. O serviço sanitiza o contexto antes de iniciar a inferência remota. O salvamento de resumos já tem uma rota própria.

## Goals / Non-Goals

O objetivo é trocar o motor de geração e conservar a revisão humana, os quatro modos de síntese e o uso da prévia como referência do Parecer Conclusivo. O fluxo continua usando o backend autenticado do prontuário para obter o contexto e salvar resumos confirmados.

## Decisions

1. **Preparação autenticada no Django.** Substituir `ia/gerar/` por `ia/contexto/` na mesma hierarquia de paciente. Manter `IsDoctorOrAdmin`, validar estritamente o identificador e reaproveitar a montagem ordenada e o sanitizador existentes. Retornar identificador, título, instrução e contexto sanitizado com `Cache-Control: no-store`. Dessa forma, a instrução e a sanitização continuam centralizadas. Usar mensagens distintas para a instrução fixa e os dados clínicos tratados como fonte.
2. **Geração em worker dedicado do Vite.** Usar `CreateWebWorkerMLCEngine` e `WebWorkerMLCEngineHandler` de `@mlc-ai/web-llm`. Inicializar sob demanda, detectar contexto seguro, adaptador WebGPU e recursos exigidos pelo binário, incluindo `shader-f16` quando requerido. Adaptar a resposta local ao formato da prévia existente. Serializar as gerações por instância e invalidar resultados pendentes quando houver troca de paciente, saída da tela ou perda de sessão. Limpar dados clínicos do worker e da interface quando o fluxo terminar.
3. **Modelo fixado e hospedado junto à aplicação.** Configurar explicitamente `appConfig` com um único modelo, `Qwen2.5-1.5B-Instruct-q4f16_1-MLC`, de aproximadamente 1,5 bilhão de parâmetros e pesos quantizados em 4 bits. Fixar a versão da biblioteca e as revisões dos pesos, tokenizer, configuração e WASM WebGPU compatível. Confirmar o binário para a combinação escolhida na implementação e provisionar ou compilar esse binário no pipeline de publicação, se necessário. Servir todos os arquivos como assets versionados da própria origem e usar o Cache API para reutilizá-los. Usar HTTPS na implantação. Verificar que a versão fixada não ativa persistência de sessão de inferência e que o worker só acessa a própria origem para obter assets. [Configuração do WebLLM](https://github.com/mlc-ai/web-llm/blob/main/src/config.ts) [Arquivos do modelo MLC](https://huggingface.co/mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC/tree/main)
4. **Saída clínica em português brasileiro e revisão explícita.** Orientar os quatro prompts a responder em português brasileiro, usar os dados fornecidos e indicar informações ausentes. Dimensionar a entrada pelo tokenizer da versão fixada e reservar espaço para a resposta. Se o contexto exceder o orçamento, informar a limitação antes de gerar. Entregar o resultado para revisão no fluxo existente, com salvamento somente por ação explícita.

## Risks / Trade-offs

- **Primeiro carregamento volumoso** → o repositório MLC lista cerca de 880 MB. Exibir progresso, tratar falhas de armazenamento e recuperar o cache quando houver remoção pelo navegador. [Arquivos do modelo MLC](https://huggingface.co/mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC/tree/main)
- **Compatibilidade e memória variam por dispositivo** → validar a inicialização e os tempos em equipamentos representativos e informar erros recuperáveis com mensagens em português.
- **Qualidade de síntese variável** → avaliar os quatro prompts com prontuários fictícios, incluindo fidelidade ao texto, português brasileiro e tratamento de lacunas antes da liberação.
- **Exposição em diagnóstico ou cache** → validar a rede desde o primeiro carregamento e inspecionar logs e armazenamento com marcadores sintéticos. Cachear somente os arquivos do modelo e excluir o conteúdo clínico das mensagens de erro.

## Migration Plan

Publicar os assets e entregar frontend e backend em conjunto. Remover rota legada, SDK, chaves e configurações Gemini após eliminar seus consumidores. Atualizar a descrição de propósito da spec principal junto da implementação, pois o delta atualiza requisitos. Validar o acesso ao histórico existente e o fluxo do Parecer com a nova prévia. Se a geração local precisar ser retirada de produção, desabilitar a ação de geração até corrigir a versão local e preservar o acesso aos resumos salvos.
