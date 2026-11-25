import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compararContextoRevisado,
  montarPayloadContexto,
  podeConfirmarEnvioExterno,
} from './revisaoContextService.js';

const baseRevisao = {
  pacienteId: 'pac-1',
  sessionId: 'sess-auth-1',
  promptId: 1,
  instrucao: 'Inst fixa',
  contexto: '[Notas de sessão]\nNota 1',
  referenciasSessao: [{ id: 's1', data: '10/05/2026', tipo: 'AVALIATIVA', status: 'REALIZADA' }],
  avisos: { bloqueado: false, fontes_bloqueadas: [], fontes: [] },
  bloqueado: false,
};

const baseDados = {
  prompt_id: 1,
  instrucao: 'Inst fixa',
  contexto: '[Notas de sessão]\nNota 1',
  referencias_sessao: [{ id: 's1', data: '10/05/2026', tipo: 'AVALIATIVA', status: 'REALIZADA' }],
  avisos: { bloqueado: false, fontes_bloqueadas: [], fontes: [] },
  bloqueado: false,
};

test('compararContextoRevisado retorna true quando tudo coincide e não há bloqueio', () => {
  assert.equal(
    compararContextoRevisado(baseRevisao, baseDados, {
      pacienteId: 'pac-1',
      sessionId: 'sess-auth-1',
      promptId: 1,
    }),
    true
  );
});

test('compararContextoRevisado detecta mudança de paciente, sessão autenticada, roteiro, contexto, referências, avisos ou bloqueio', () => {
  assert.equal(
    compararContextoRevisado(baseRevisao, baseDados, {
      pacienteId: 'pac-2',
      sessionId: 'sess-auth-1',
      promptId: 1,
    }),
    false
  );
  assert.equal(
    compararContextoRevisado(baseRevisao, baseDados, {
      pacienteId: 'pac-1',
      sessionId: 'sess-auth-2',
      promptId: 1,
    }),
    false
  );
  assert.equal(
    compararContextoRevisado(baseRevisao, baseDados, {
      pacienteId: 'pac-1',
      sessionId: 'sess-auth-1',
      promptId: 2,
    }),
    false
  );
  assert.equal(
    compararContextoRevisado(
      baseRevisao,
      { ...baseDados, contexto: '[Notas de sessão]\nNota 1 editada' },
      { pacienteId: 'pac-1', sessionId: 'sess-auth-1', promptId: 1 }
    ),
    false
  );
  assert.equal(
    compararContextoRevisado(
      baseRevisao,
      { ...baseDados, referencias_sessao: [] },
      { pacienteId: 'pac-1', sessionId: 'sess-auth-1', promptId: 1 }
    ),
    false
  );
  assert.equal(
    compararContextoRevisado(
      baseRevisao,
      { ...baseDados, bloqueado: true, avisos: { bloqueado: true, fontes_bloqueadas: [{ id: 's1' }], fontes: [] } },
      { pacienteId: 'pac-1', sessionId: 'sess-auth-1', promptId: 1 }
    ),
    false
  );
});

test('montarPayloadContexto sempre fixa incluirAnamnese em false', () => {
  const payload = montarPayloadContexto({ promptId: '2', sessaoIds: ['s1', 's2'] });
  assert.deepEqual(payload, {
    promptId: 2,
    sessaoIds: ['s1', 's2'],
    incluirAnamnese: false,
  });
});

test('podeConfirmarEnvioExterno exige aceite explícito, sessão selecionada, ausência de bloqueio e mesma tentativa', () => {
  const revisaoValida = {
    ...baseRevisao,
    sessaoIds: ['s1'],
  };

  assert.equal(
    podeConfirmarEnvioExterno({
      revisao: revisaoValida,
      confirmacaoPrivacidade: true,
      activeGeneration: null,
      pacienteId: 'pac-1',
      sessionId: 'sess-auth-1',
    }),
    true
  );

  assert.equal(
    podeConfirmarEnvioExterno({
      revisao: revisaoValida,
      confirmacaoPrivacidade: false,
      activeGeneration: null,
      pacienteId: 'pac-1',
      sessionId: 'sess-auth-1',
    }),
    false
  );

  assert.equal(
    podeConfirmarEnvioExterno({
      revisao: { ...revisaoValida, bloqueado: true },
      confirmacaoPrivacidade: true,
      activeGeneration: null,
      pacienteId: 'pac-1',
      sessionId: 'sess-auth-1',
    }),
    false
  );

  assert.equal(
    podeConfirmarEnvioExterno({
      revisao: revisaoValida,
      confirmacaoPrivacidade: true,
      activeGeneration: { id: 'gen-1' },
      pacienteId: 'pac-1',
      sessionId: 'sess-auth-1',
    }),
    false
  );

  assert.equal(
    podeConfirmarEnvioExterno({
      revisao: { ...revisaoValida, sessaoIds: [] },
      confirmacaoPrivacidade: true,
      activeGeneration: null,
      pacienteId: 'pac-1',
      sessionId: 'sess-auth-1',
    }),
    false
  );

  assert.equal(
    podeConfirmarEnvioExterno({
      revisao: revisaoValida,
      confirmacaoPrivacidade: true,
      activeGeneration: null,
      pacienteId: 'pac-2',
      sessionId: 'sess-auth-1',
    }),
    false
  );
});
