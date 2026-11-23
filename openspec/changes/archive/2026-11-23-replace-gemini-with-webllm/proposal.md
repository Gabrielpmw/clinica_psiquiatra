# Proposal

## Why

O fluxo atual envia ao Gemini conteúdo clínico que continua sensível mesmo após o mascaramento. A inferência no navegador elimina esse envio e mantém a profissional responsável pela revisão e pela decisão de salvar.

## Infraestrutura atual

O `docker-compose.yml` e o `README.md` descrevem a execução local com Docker Compose: React 18 e Vite em `http://localhost:5173`, Django 5.1 e Django REST Framework em `http://localhost:8000/api/`, e PostgreSQL 16 com dados persistidos no volume `clinica_postgres_data`. A API usa a autenticação existente do Django, com JWT via SimpleJWT para o frontend. O `backend/core/settings.py` também prevê SQLite opcional para desenvolvimento e SQLite em memória para os testes Django.

A aplicação ainda não foi publicada na Cloudflare e o banco ainda não foi migrado para o Supabase. A implementação e a validação desta mudança ocorrerão em `localhost`, com o PostgreSQL existente e uma instância local de testes com dados fictícios. Os resumos e pareceres já gravados permanecem no banco atual.

## What Changes

- **BREAKING** Trocar `POST /api/prontuario/pacientes/<paciente_id>/ia/gerar/` por `POST /api/prontuario/pacientes/<paciente_id>/ia/contexto/`. O Django autentica a profissional, verifica seu acesso ao paciente e responde com o contexto sanitizado e a instrução de um dos quatro prompts fixos. O corpo da requisição aceita apenas o identificador do prompt. Consulta e gravação de históricos e salvamento do Parecer também exigem autorização por paciente.
- Gerar a prévia em português brasileiro com `@mlc-ai/web-llm` e `Qwen2.5-1.5B-Instruct-q4f16_1-MLC`, via WebGPU em um Web Worker do frontend React/Vite. Fixar as versões e servir pesos, tokenizer, configuração e WASM compatível pela origem local da aplicação, com cache restrito aos arquivos do modelo e binários grandes fora do Git. A inferência ocorre integralmente no navegador, sem fallback remoto.
- Tratar o mascaramento como minimização. Manter contexto e rascunhos em memória, aplicar `Cache-Control: no-store` às respostas clínicas do fluxo de IA e excluir conteúdo clínico dos logs e da telemetria. Descartar respostas atrasadas após troca de paciente, de sessão clínica ou autenticada, de usuária ou início de outra geração.
- Apresentar a saída como rascunho sujeito a revisão, fiel às notas, com datas, negações, divergências, lacunas e referências às sessões de origem quando disponíveis. Limitar pontos críticos às ocorrências documentadas e vedar a criação de diagnósticos e recomendações de tratamento.
- Permitir editar, descartar ou salvar a prévia com título. Encaminhar a prévia do prompt 4 ao Parecer apenas preenche um rascunho editável em memória. Enviar o texto ao Django somente após confirmação explícita de salvamento, inclusive pelo formulário do Parecer. Manter o histórico e a redação manual disponíveis se a IA falhar.
- Verificar em Chrome ou Edge atualizado, com cache vazio e completo, o progresso, os tempos de download, inicialização e geração, as falhas de GPU e armazenamento e a inferência com a rede bloqueada após obter o contexto autorizado e os artefatos. Calcular a entrada com o tokenizer do modelo, incluindo a instrução e a reserva da resposta, e avisar quando ultrapassar a janela.

## Capabilities

### New Capabilities

### Modified Capabilities

- `clinical-ai-assistant` passa a gerar a prévia no navegador a partir de contexto autorizado e minimizado. A mudança detalha revisão e salvamento da prévia, encaminhamento ao Parecer, acesso ao histórico e funcionamento quando a IA estiver indisponível.

## Impact

Afeta o frontend do prontuário e do Parecer, as permissões e os serviços clínicos do Django e o provisionamento local do modelo. As rotas e o armazenamento existentes de `ResumoIa` continuam atendendo aos registros já gravados, com a verificação de autorização por paciente.

Validar o fluxo novo localmente antes de retirar a rota antiga (`GerarResumoIaView`, nome `prontuario-ia-gerar`), `backend/apps/prontuario/services/gemini_service.py`, o SDK `google-genai`, a dependência direta `requests` usada pelo fallback REST do Gemini e as configurações `GEMINI_API_KEY` e `GEMINI_MODELS` de `backend/core/settings.py` e `.env.example`. Preservar o sanitizador e o catálogo de prompts. A rota antiga fica fora do fluxo WebLLM, inclusive durante a validação. O delta e as tarefas definem o escopo local e o comportamento do rascunho para implementação.
