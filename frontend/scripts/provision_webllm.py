"""
Script para provisionamento local dos artefatos WebLLM (pesos, tokenizer, configs e WASM).
Conforme especificação da mudança 'replace-gemini-with-webllm'.
"""

import os
import sys
import hashlib
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DIR = BASE_DIR / "public"
MODELS_DIR = PUBLIC_DIR / "models" / "qwen2.5-1.5b-instruct-q4f16_1-mlc-9bd564b"
WASM_DIR = PUBLIC_DIR / "wasm"

MANIFEST_PATH = BASE_DIR / "src" / "config" / "webllmManifest.json"

def calculate_sha256(filepath):
    h = hashlib.sha256()
    with open(filepath, 'rb') as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()

def verify_artifacts():
    print(f"Verificando diretórios de modelos e WASM...")
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    WASM_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Diretório de modelos: {MODELS_DIR}")
    print(f"Diretório de WASM: {WASM_DIR}")

    with open(MANIFEST_PATH, 'r', encoding='utf-8') as f:
        manifest = json.load(f)
    print(f"Manifesto carregado com sucesso: modelo {manifest['model_id']}, revisão {manifest['model_revision']}")
    return True

if __name__ == "__main__":
    verify_artifacts()
