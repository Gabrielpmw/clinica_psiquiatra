# Tasks

## 1. Configuração de ambiente e dependências Gemini

- [x] 1.1 Adicionar `GEMINI_API_KEY` e `GEMINI_MODELS` em `.env.example`, `.env` (sem gravar segredos reais no Git) e `backend/core/settings.py`. Verificar com `python -c "from django.conf import settings; print(settings.GEMINI_MODELS)"` que as variáveis são carregadas pelo Django.
- [x] 1.2 Restaurar `google-genai>=2.0.0` e `requests>=2.31.0` em `backend/requirements.txt` e instalar no ambiente do container `clinica_backend`. Verificar o import de `google.genai` e `requests` dentro do container.

## 2. Serviço Gemini e endpoint `/ia/gerar/` no backend

- [x] 2.1 Restaurar `backend/apps/prontuario/services/gemini_service.py` reutilizando `sanitize_clinical_data` e `format_clinical_context` com seleção explícita (`sessao_ids`, `incluir_anamnese`), retentativa exponencial para erros 429/503/504, failover entre `GEMINI_MODELS` e fallback REST. Restaurar e executar `tests_gemini_service.py` validando chave ausente, retry, failover e fallback REST com mocks.
- [x] 2.2 Adicionar `GerarResumoIaView` na rota `POST /api/prontuario/pacientes/<paciente_id>/ia/gerar/` (`prontuario-ia-gerar`) em `apps/prontuario/views.py` e `urls.py` com `NoStoreCacheMixin`, `IsDoctorOrAdmin` e `check_patient_doctor_access`, mantendo `FontesIaView` e `ContextoIaView` (incluindo hash determinístico de revisão opcional para detectar alteração entre revisão e envio).
- [x] 2.3 Atualizar `apps/prontuario/tests_ia_parecer.py` cobrindo autorização (401/403/404), `Cache-Control: no-store`, seleção parcial e anamnese isolada em `/ia/gerar/`, bloqueio de `trecho_retido` sem acionar o Gemini, detecção de revisão desatualizada e execução completa de `python manage.py test`.

## 3. Remoção do WebLLM e integração no frontend

- [x] 3.1 Remover `@mlc-ai/web-llm` de `frontend/package.json` (e atualizar `package-lock.json`), excluir `webllmService.js`, `webllm.worker.js`, `webllmConfig.js`, `webllmManifest.json`, `tokenBudgetService.js`, `frontend/scripts/provision_webllm.py` e `frontend/scripts/README.md`, e verificar com busca no repositório que não restam referências a WebLLM ou WebGPU.
- [x] 3.2 Adicionar `gerarResumoIa` em `frontend/src/services/prontuarioService.js` (e `contextoHash` na comparação/revisão se aplicável) e atualizar `AiGenerationContext.jsx` para executar a chamada cancelável a `POST /ia/gerar/` em segundo plano na aba durante navegação e troca de telas, sem persistência no navegador e descartando respostas de sessões encerradas ou canceladas.
- [x] 3.3 Atualizar `AiAssistantSection.jsx`, `AiSourcesAndReview.jsx` e `AiDraftsModal.jsx` removendo mensagens e bloqueios de WebGPU/WebLLM/cache local, preservando **Fontes do resumo**, **Revisar dados**, edição da prévia, confirmação explícita de salvamento em `ResumoIa` e encaminhamento do prompt 4 para o `ParecerConclusivoSection.jsx`. Verificar com `node --test` e `npm --prefix frontend run build`.

## 4. Validação integrada do fluxo com Gemini

- [ ] 4.1 Com `GEMINI_API_KEY` configurada no `.env` e `docker compose` em execução, executar o fluxo completo no navegador (selecionar fontes parciais e anamnese isolada, conferir **Revisar dados**, gerar via Gemini navegando para outra tela, revisar/editar, salvar mediante confirmação explícita e testar prompt 4 no Parecer).
- [ ] 4.2 Inspecionar rede, armazenamento do navegador (`localStorage`, `sessionStorage`, `CacheStorage`, `IndexedDB`) e logs para confirmar `Cache-Control: no-store`, ausência de WebLLM/workers/cache de modelo, envio ao Gemini somente com dados sanitizados não bloqueados e acesso contínuo ao histórico e ao Parecer em caso de falha na API.
