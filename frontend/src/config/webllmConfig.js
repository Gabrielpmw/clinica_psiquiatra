import manifest from './webllmManifest.json' with { type: 'json' };

/**
 * Configuração do modelo WebLLM para inferência clínica no navegador.
 * Suporta provisionamento local e fontes oficiais versionadas do modelo MLC.
 */
export const WEBLLM_CONFIG = {
  model_id: manifest.model_id,
  model_source: manifest.model_source,
  wasm_source: manifest.wasm_source,
  local_model_path: manifest.local_model_path,
  local_wasm_path: manifest.local_wasm_path,
  context_window_size: manifest.context_window_size,
  min_response_tokens: manifest.min_response_tokens,
  max_response_tokens: manifest.max_response_tokens,
  appConfig: {
    model_list: [
      {
        model: manifest.model_source,
        model_id: manifest.model_id,
        model_lib: manifest.wasm_source,
        low_resource_required: true,
        vram_required_MB: 1629.75,
        overrides: {
          context_window_size: manifest.context_window_size,
        },
      },
    ],
  },
};

export default WEBLLM_CONFIG;
