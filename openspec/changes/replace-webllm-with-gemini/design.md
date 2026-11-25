# Design

## Context

Atualmente o backend expõe `GET /ia/fontes/` e `POST /ia/contexto/` com sanitização LGPD completa (`sanitizer.py`), catálogo de 4 prompts (`prompt_catalog.py`), formatação de contexto (`clinical_context.py`) e persistência confirmada (`ResumoIa`). A geração do texto foi movida anteriormente para o navegador usando `@mlc-ai/web-llm`, WebGPU e um Web Worker dedicado (`webllmService.js`, `webllm.worker.js`, `tokenBudgetService.js`, `webllmConfig.js`).

Ver `proposal.md` para a motivação de retornar ao Gemini. O fluxo recente de seleção de fontes (`Fontes do resumo`), revisão pré-geração (`Revisar dados`), coordenação global na aba (`AiGenerationContext`), barra superior (`Rascunhos IA`), notificações e encaminhamento ao Parecer Conclusivo já está estruturado e deve ser preservado.

## Goals / Non-Goals

**Goals:**
- Remover completamente `@mlc-ai/web-llm`, WebGPU, Web Worker e scripts/configurações WebLLM do frontend.
- Restaurar o serviço `gemini_service.py` no backend usando `GEMINI_API_KEY` e `GEMINI_MODELS` via `.env` e `settings.py`, mantendo retry/backoff para erros transitórios (429/503/504), failover de modelos e fallback REST.
- Expor `POST /api/prontuario/pacientes/<paciente_id>/ia/gerar/` integrado ao fluxo de seleção e revisão (`Fontes do resumo` -> `Revisar dados` -> `Gerar rascunho`), garantindo que apenas dados sanitizados e não bloqueados sejam enviados ao Gemini.
- Preservar a geração em segundo plano na aba durante navegação entre telas, cancelamento imediato via `AbortController` e gravação somente com confirmação explícita.

**Non-Goals:**
- Alterar modelos do banco de dados (`Anamnese`, `AnotacaoSessao`, `ResumoIa`, `ParecerConclusivo`, `ConcessaoAcessoPaciente`).
- Alterar o comportamento de sanitização, bloqueio de `trecho_retido` ou detecção de coincidências com a anamnese em `sanitizer.py`.
- Enviar texto livre de prompt ou notas sem mascaramento para a API do Gemini.

## Decisions

1. **Manter `POST /ia/contexto/` para revisão prévia e adicionar `POST /ia/gerar/` para o Gemini.**
   - *Racional:* Com uma API externa, exibir **Revisar dados** antes do envio é ainda mais importante para que a médica confirme exatamente o texto mascarado e os avisos antes de acionar o Gemini.
   - *Contrato de `/ia/gerar/`:* Recebe `{ prompt_id, sessao_ids, incluir_anamnese: false, confirmacao_privacidade: true, contexto_hash }` (exigindo ao menos uma sessão anotada, rejeitando `incluir_anamnese: true` com HTTP `400`, exigindo `confirmacao_privacidade: true` e calculando deterministicamente `contexto_hash` no backend a partir de `instrucao + contexto` retornado em `/ia/contexto/` para detectar edição concorrente antes de enviar ao Gemini; caso o hash não coincida, retorna HTTP `409 Conflict` pedindo nova revisão). A anamnese é usada apenas internamente no sanitizador para cruzar PII nas notas das sessões e nunca compõe o payload externo. Se `sanitized_data['bloqueado']` for verdadeiro, retorna HTTP `400` sem chamar o Gemini.
   - *Alternativa descartada:* Fazer `/ia/contexto/` já retornar o resumo do Gemini em uma única etapa, o que eliminaria a conferência prévia dos dados mascarados pelo usuário antes do envio externo.

2. **Restaurar `gemini_service.py` com resiliência e suporte a seleção explícita.**
   - Reaproveitar a implementação comprovada de `call_gemini_api` (`google-genai` + fallback REST via `requests` + backoff exponencial em `429`/`503`/`504` + failover na lista `GEMINI_MODELS`).
   - Reaproveitar `sanitize_clinical_data` e `format_clinical_context` atuais para que apenas as fontes selecionadas e aprovadas sejam enviadas ao modelo.
   - Configurar `GEMINI_API_KEY` e `GEMINI_MODELS` em `.env.example`, `.env` (com espaço/comentário orientando o usuário a inserir sua chave) e `backend/core/settings.py`.

3. **Adaptar `AiGenerationContext.jsx` e `prontuarioService.js` para geração HTTP cancelável em segundo plano.**
   - Substituir a chamada `webllmService.generateSummary(...)` por `gerarResumoIa(pacienteId, { promptId, sessaoIds, incluirAnamnese: false, confirmacaoPrivacidade: true, contextoHash }, { signal, _sessionId })` em `prontuarioService.js`.
   - Simplificar as fases em `AiGenerationContext` para `preparando` (envio ao backend/Gemini com watchdog adequado, ex. 120s) e conclusão/erro, removendo progresso de download de modelo, shaders WebGPU, `streamingText` de WebLLM e checagem local de janela de tokens (`tokenBudgetService.js`).
   - `cancelarGeracao` aborta a requisição Axios via `AbortController`, impedindo que a resposta tardia crie rascunho pendente mesmo que o servidor já tenha concluído o request em voo.

4. **Limpeza de interface e dependências WebLLM.**
   - Remover `@mlc-ai/web-llm` de `frontend/package.json` (e atualizar `package-lock.json` ou remover a dependência instalada), excluir `webllmService.js`, `webllm.worker.js`, `webllmConfig.js`, `webllmManifest.json`, `tokenBudgetService.js` e `frontend/scripts/provision_webllm.py` (+ `README.md` se exclusivo de WebLLM).
   - Ajustar textos da UI em `AiAssistantSection.jsx`, `AiSourcesAndReview.jsx` e `AiDraftsModal.jsx` para refletir o uso do servidor com Gemini (ex.: sem referências a WebLLM/WebGPU/cache local ou excesso de tokens locais).

## Risks / Trade-offs

- **Envio de texto sanitizado a serviço externo (Google Gemini)** → Mitigado pela permanência obrigatória da etapa **Revisar dados** antes do clique em **Gerar rascunho**, pelo bloqueio automático de `trecho_retido` e pelo sanitizador cruzado no backend.
- **Chave `GEMINI_API_KEY` inválida ou ausente no `.env`** → Mitigado por validação explícita no `gemini_service.py` retornando erro legível em português (HTTP 503/400 apropriado sem expor stack trace nem segredos) e mantendo histórico e Parecer Conclusivo operacionais.
- **Instabilidade ou cota da API Gemini (429/503)** → Mitigado por retentativas com backoff e failover automático entre múltiplos modelos em `GEMINI_MODELS`.

## Migration Plan

1. Atualizar `.env.example`, `.env`, `backend/requirements.txt` e `backend/core/settings.py` com `GEMINI_API_KEY`, `GEMINI_MODELS`, `google-genai` e `requests`.
2. Reconstruir/atualizar dependências no container `clinica_backend` (se necessário instalar `google-genai`/`requests` no Dockerfile/imagem) e no `clinica_frontend` (remover `@mlc-ai/web-llm`).
3. Inserir chave real em `GEMINI_API_KEY` no `.env` e validar em `http://localhost:5173`.
