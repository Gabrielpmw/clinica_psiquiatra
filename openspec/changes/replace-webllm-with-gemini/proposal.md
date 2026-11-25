# Proposal

## Why

A inferência local via WebLLM exige download de pesos grandes, suporte a WebGPU no navegador do cliente e apresentou falhas de inicialização e rede em ambiente local. Retornar a geração de resumos clínicos para a API do Google Gemini no backend Django usando `GEMINI_API_KEY` no `.env` garante execução consistente em qualquer navegador mantendo a sanitização prévia, a seleção e revisão de fontes e o controle de privacidade já implementados.

## What Changes

- **BREAKING** Retirar o motor `@mlc-ai/web-llm` do frontend (dependência npm, Web Worker, configurações de modelo/WASM, cálculo local de orçamento de tokens e scripts de provisionamento) e remover a exigência de WebGPU no navegador.
- Restaurar no backend Django a integração com a API do Google Gemini (`backend/apps/prontuario/services/gemini_service.py`, `google-genai`, `requests`, e variáveis `GEMINI_API_KEY` e `GEMINI_MODELS` em `backend/core/settings.py`, `.env.example` e `.env`).
- Restaurar o endpoint autenticado e autorizado `POST /api/prontuario/pacientes/<paciente_id>/ia/gerar/` (`GerarResumoIaView`, `prontuario-ia-gerar`) com `Cache-Control: no-store`, usando a mesma seleção explícita (`prompt_id`, `sessao_ids`, `incluir_anamnese`), sanitização LGPD, bloqueio de trechos retidos e validação de integridade da revisão antes de chamar o Gemini.
- Manter o endpoint `POST /api/prontuario/pacientes/<paciente_id>/ia/contexto/` para a etapa **Revisar dados** antes do envio ao Gemini, garantindo que nenhum texto com ocorrência retida ou alterado após a revisão seja enviado à API externa.
- Adaptar o provedor global `AiGenerationContext` e o serviço do frontend para disparar a geração remota cancelável via `POST /ia/gerar/` durante a navegação entre telas, preservando rascunhos em memória, avisos, barra superior, encaminhamento para Parecer Conclusivo e gravação mediante confirmação explícita.

## Capabilities

### New Capabilities

### Modified Capabilities

- `clinical-ai-assistant`: substitui o requisito de inferência local no navegador via WebLLM/WebGPU pela inferência no servidor Django via API do Google Gemini (`GEMINI_API_KEY`), mantendo sanitização LGPD, seleção e revisão prévia de fontes, controle de acesso, geração em segundo plano na aba e gravação somente após confirmação explícita.

## Impact

- **Configuração e ambiente**: `.env`, `.env.example`, `backend/core/settings.py`, `backend/requirements.txt`.
- **Backend (`apps/prontuario`)**: novo/restaurado `services/gemini_service.py`, `views.py` (`GerarResumoIaView`), `urls.py`, e suítes de testes (`tests_gemini_service.py`, `tests_ia_parecer.py`).
- **Frontend**: remoção de `@mlc-ai/web-llm` (`package.json`/`package-lock.json`), `src/services/webllmService.js`, `src/workers/webllm.worker.js`, `src/config/webllmConfig.js`, `src/config/webllmManifest.json`, `src/services/tokenBudgetService.js` e `scripts/provision_webllm.py`; atualização de `src/services/prontuarioService.js`, `src/context/AiGenerationContext.jsx`, `src/components/Prontuario/AiAssistantSection.jsx` e `src/components/AiDraftsModal.jsx`.
- **Preservado**: `FontesIaView`, `ContextoIaView`, `sanitizer.py`, `prompt_catalog.py`, `AiSourcesAndReview.jsx`, `ResumoIa` e `ParecerConclusivo`.
