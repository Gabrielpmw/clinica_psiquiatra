import WEBLLM_CONFIG from '../config/webllmConfig.js';

export async function checkTokenBudget(engine, systemInstruction, userContext) {
  const {
    context_window_size: contextWindow,
    min_response_tokens: minResponseTokens,
    max_response_tokens: maxResponseTokens,
  } = WEBLLM_CONFIG;

  // O template Qwen2.5 fixado não tem prefixo de tokens. O WebLLM tokeniza cada
  // segmento da conversa separadamente, inclusive o início da resposta.
  const userContent = '{user_message}'.replace('{user_message}', userContext);
  const segments = [
    '<|im_start|>system\n{system_message}<|im_end|>\n'.replace('{system_message}', systemInstruction),
    `<|im_start|>user\n${userContent}<|im_end|>\n`,
    '<|im_start|>assistant\n',
  ];
  const encodedSegments = await Promise.all(segments.map((segment) => engine.tokenize(segment)));
  const inputTokens = encodedSegments.reduce((total, tokens) => total + tokens.length, 0);
  const availableResponseTokens = contextWindow - inputTokens;

  if (availableResponseTokens < minResponseTokens) {
    return {
      warning: `A entrada ocupa ${inputTokens} tokens. Com a reserva mínima de ${minResponseTokens} tokens para a resposta, ela passa do limite de ${contextWindow} tokens do modelo. Reduza o contexto para gerar o rascunho.`,
    };
  }

  return {
    responseTokens: Math.min(maxResponseTokens, availableResponseTokens),
  };
}
