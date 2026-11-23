# Provisionamento de Artefatos WebLLM

Este documento detalha o provisionamento local dos pesos, tokenizer, metadados e binário WASM WebGPU para inferência no navegador com `@mlc-ai/web-llm@0.2.89`.

## Artefatos e Revisões Fixadas

- **Biblioteca WebLLM**: `@mlc-ai/web-llm@0.2.89`
- **Modelo**: `Qwen2.5-1.5B-Instruct-q4f16_1-MLC`
- **Revisão do Modelo**: `9bd564b064631febf14deadcac492efb761d60c3` (Hugging Face)
- **Binário WASM**: `v0_2_87/base/Qwen2-1.5B-Instruct-q4f16_1_cs1k-webgpu.wasm`
- **Revisão dos Binários MLC**: `146ed9cd4b4062e967b017fd2291f7106b50599f` (binary-mlc-llm-libs)

## Diretórios Locais no Vite

Os artefatos são servidos na mesma origem da aplicação (`http://localhost:5173`):
- Modelo: `frontend/public/models/qwen2.5-1.5b-instruct-q4f16_1-mlc-9bd564b/` (mapeado para `/models/qwen2.5-1.5b-instruct-q4f16_1-mlc-9bd564b`)
- WASM: `frontend/public/wasm/Qwen2-1.5B-Instruct-q4f16_1_cs1k-webgpu.wasm` (mapeado para `/wasm/Qwen2-1.5B-Instruct-q4f16_1_cs1k-webgpu.wasm`)

Ambos os diretórios são ignorados pelo Git (`.gitignore`) para não poluir o repositório com binários de grande porte.
