import { CreateWebWorkerMLCEngine } from '@mlc-ai/web-llm';
import WEBLLM_CONFIG from '../config/webllmConfig.js';
import { checkTokenBudget } from './tokenBudgetService.js';

/**
 * Cache Storage específico para artefatos do modelo e WASM WebLLM.
 * Não armazena nenhum dado clínico ou de API.
 */
const WASM_CACHE_NAME = 'webllm-wasm-cache-v1';

class WebLLMService {
  constructor() {
    this.engine = null;
    this.worker = null;
    this.initializing = false;
    this.initPromise = null;
    this.currentRequestId = null;
    this.currentPacienteId = null;
    this.activeAbortController = null;
  }

  /**
   * Detecta se o navegador e o hardware suportam WebGPU e ambiente seguro.
   */
  async checkWebGpuSupport() {
    if (typeof window === 'undefined') {
      return { supported: false, message: 'Execução fora do navegador.' };
    }

    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return {
        supported: false,
        message: 'WebGPU requer um contexto seguro (HTTPS ou localhost).',
      };
    }

    if (!navigator.gpu) {
      return {
        supported: false,
        message: 'Seu navegador ou dispositivo não possui suporte a WebGPU. Aceleração por GPU é necessária para a inferência local.',
      };
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        return {
          supported: false,
          message: 'Nenhum adaptador de GPU compatível foi encontrado neste dispositivo.',
        };
      }
      return { supported: true, adapter };
    } catch (err) {
      return {
        supported: false,
        message: `Falha ao inicializar WebGPU: ${err.message || 'Erro desconhecido'}`,
      };
    }
  }

  /**
   * Determina as URLs de modelo e WASM (local se provisionado; caso contrário, repositório fixado).
   */
  async resolveModelUrls() {
    try {
      const res = await fetch(`${WEBLLM_CONFIG.local_model_path}/mlc-chat-config.json`, { method: 'HEAD' });
      const ct = res.headers.get('content-type') || '';
      // Se não for HTML (pois o fallback SPA do Vite retorna text/html status 200 quando não existe)
      if (res.ok && !ct.includes('text/html')) {
        return {
          model: WEBLLM_CONFIG.local_model_path,
          model_lib: WEBLLM_CONFIG.local_wasm_path,
        };
      }
    } catch (_) {}

    return {
      model: WEBLLM_CONFIG.model_source,
      model_lib: WEBLLM_CONFIG.wasm_source,
    };
  }

  /**
   * Garante o cache do arquivo WASM no Cache Storage para permitir carregamento com rede bloqueada.
   */
  async ensureWasmCached(wasmUrl) {
    if (!('caches' in window) || !wasmUrl) return;
    try {
      const cache = await caches.open(WASM_CACHE_NAME);
      const match = await cache.match(wasmUrl);
      if (match) {
        const ct = match.headers.get('content-type') || '';
        // Remove entradas corrompidas por fallback HTML anterior
        if (ct.includes('text/html')) {
          await cache.delete(wasmUrl);
        } else {
          return;
        }
      }
      const resp = await fetch(wasmUrl);
      const ct = resp.headers.get('content-type') || '';
      if (resp.ok && !ct.includes('text/html')) {
        await cache.put(wasmUrl, resp.clone());
      }
    } catch (err) {
      console.warn('Aviso ao registrar WASM no Cache Storage:', err);
    }
  }

  /**
   * Inicializa o Web Worker e o motor WebLLM sob demanda.
   */
  async initEngine(onProgress = () => {}) {
    if (this.engine) return this.engine;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const gpuCheck = await this.checkWebGpuSupport();
      if (!gpuCheck.supported) {
        throw new Error(gpuCheck.message);
      }

      onProgress({
        text: 'Resolvendo configuração e acelerador WebGPU...',
        progress: 0.05,
      });

      const { model, model_lib } = await this.resolveModelUrls();

      // Cacheia WASM no Cache Storage
      await this.ensureWasmCached(model_lib);

      // Criação do Web Worker dedicado do Vite
      this.worker = new Worker(
        new URL('../workers/webllm.worker.js', import.meta.url),
        { type: 'module' }
      );

      const progressCallback = (report) => {
        let msg = report.text || 'Carregando artefatos do modelo...';
        if (msg.includes('Loading model from cache') || msg.includes('cache')) {
          msg = 'Carregando artefatos a partir do cache local...';
        } else if (msg.includes('Fetching') || msg.includes('download')) {
          msg = 'Baixando pesos quantizados e configurações do modelo...';
        } else if (msg.includes('Compiling') || msg.includes('pipeline')) {
          msg = 'Compilando shaders WebGPU e alocando memória de vídeo...';
        } else if (msg.includes('Finish loading')) {
          msg = 'Motor WebLLM carregado com sucesso.';
        }

        onProgress({
          text: msg,
          progress: report.progress || 0,
          raw: report,
        });
      };

      const appConfig = {
        model_list: [
          {
            model: model,
            model_id: WEBLLM_CONFIG.model_id,
            model_lib: model_lib,
            low_resource_required: true,
            vram_required_MB: 1629.75,
            overrides: {
              context_window_size: WEBLLM_CONFIG.context_window_size,
            },
          },
        ],
      };

      try {
        this.engine = await CreateWebWorkerMLCEngine(
          this.worker,
          WEBLLM_CONFIG.model_id,
          {
            appConfig,
            initProgressCallback: progressCallback,
          }
        );

        onProgress({
          text: 'Motor WebLLM pronto para geração.',
          progress: 1.0,
        });

        return this.engine;
      } catch (err) {
        this.terminate();
        console.error('Erro detalhado na inicialização do WebLLM:', err);
        const rawMsg = typeof err === 'string' ? err : (err?.message || (err ? JSON.stringify(err) : 'Falha na inicialização'));
        const msg = rawMsg.toLowerCase();
        if (msg.includes('device lost') || msg.includes('gpu device was lost')) {
          throw new Error('O dispositivo de GPU foi perdido ou reiniciado. Você pode tentar novamente.');
        } else if (msg.includes('quota') || msg.includes('storage')) {
          throw new Error('Espaço de armazenamento insuficiente no navegador para carregar os pesos do modelo.');
        } else if (msg.includes('network') || msg.includes('failed to fetch')) {
          throw new Error(`Falha ao baixar artefatos do modelo (${rawMsg}). Verifique a conexão com a internet.`);
        }
        throw new Error(`Erro ao inicializar modelo WebLLM: ${rawMsg}`);
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  /**
   * Gera o rascunho clínico no navegador via WebGPU com streaming de tokens.
   */
  async generateSummary({
    systemInstruction,
    userContext,
    pacienteId,
    requestId,
    onChunk = () => {},
    onProgress = () => {},
  }) {
    this.currentRequestId = requestId;
    this.currentPacienteId = pacienteId;
    this.activeAbortController = new AbortController();

    const engine = await this.initEngine(onProgress);

    const messages = [
      { role: 'system', content: systemInstruction },
      { role: 'user', content: userContext },
    ];
    const isCurrentRequest = () => this.currentRequestId === requestId && this.currentPacienteId === pacienteId;
    let fullText = '';
    let reachedTokenLimit = false;

    try {
      if (!isCurrentRequest()) return null;

      onProgress({ text: 'Verificando espaço para o rascunho...', progress: 0.9 });
      const { responseTokens, warning } = await checkTokenBudget(engine, systemInstruction, userContext);
      if (!isCurrentRequest()) return null;
      if (warning) return { warning };

      onProgress({ text: 'Gerando rascunho clínico no navegador...', progress: 0.95 });
      const completion = await engine.chat.completions.create({
        messages,
        max_tokens: responseTokens,
        temperature: 0.2,
        stream: true,
      });

      for await (const chunk of completion) {
        // Verifica se a solicitação ainda é a vigente
        if (!isCurrentRequest()) return null;

        const choice = chunk.choices[0];
        const delta = choice?.delta?.content;
        if (choice?.finish_reason === 'length') {
          reachedTokenLimit = true;
        }
        if (delta) {
          fullText += delta;
          onChunk(fullText);
        }
      }

      if (!fullText.trim()) {
        throw new Error('O modelo local não gerou texto. Tente gerar o rascunho novamente.');
      }
      return { text: fullText, reachedTokenLimit };
    } catch (err) {
      if (!isCurrentRequest()) return null;
      throw err;
    }
  }

  /**
   * Invalida qualquer solicitação ativa e limpa o contexto clínico em memória.
   */
  invalidateContext() {
    this.currentRequestId = null;
    this.currentPacienteId = null;
    if (this.activeAbortController) {
      try {
        this.activeAbortController.abort();
      } catch (_) {}
      this.activeAbortController = null;
    }
  }

  /**
   * Encerra o worker e libera recursos de GPU/memória.
   */
  terminate() {
    this.invalidateContext();
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch (_) {}
      this.worker = null;
    }
    this.engine = null;
    this.initPromise = null;
  }
}

export const webllmService = new WebLLMService();
export default webllmService;
