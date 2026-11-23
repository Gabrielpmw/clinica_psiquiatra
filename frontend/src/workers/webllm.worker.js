import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

// Handler do Web Worker para o motor MLC WebLLM
const handler = new WebWorkerMLCEngineHandler();

self.onmessage = (msg) => {
  handler.onmessage(msg);
};
