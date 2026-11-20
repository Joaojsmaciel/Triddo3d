import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { authErrorMessage } from '../src/auth/authErrors.js';

describe('authErrorMessage (login com Google)', () => {
  it('não mostra erro quando o próprio usuário fecha a janela do Google', () => {
    assert.equal(authErrorMessage({ code: 'auth/popup-closed-by-user' }), null);
    assert.equal(authErrorMessage({ code: 'auth/cancelled-popup-request' }), null);
  });

  it('orienta quando o pop-up é bloqueado ou o domínio não está autorizado', () => {
    assert.match(authErrorMessage({ code: 'auth/popup-blocked' }), /pop-ups/);
    assert.match(authErrorMessage({ code: 'auth/unauthorized-domain' }), /Authorized domains/);
  });

  it('avisa quando o provedor Google está desativado no projeto', () => {
    assert.match(authErrorMessage({ code: 'auth/operation-not-allowed' }), /Sign-in method → Google/);
    assert.match(authErrorMessage({ code: 'auth/configuration-not-found' }), /Sign-in method → Google/);
  });

  it('tem mensagem genérica para códigos desconhecidos', () => {
    assert.match(authErrorMessage({ code: 'auth/qualquer' }), /Tente novamente/);
    assert.match(authErrorMessage(null), /Tente novamente/);
  });
});
