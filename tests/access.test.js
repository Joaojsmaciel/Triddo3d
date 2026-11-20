import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { ALLOWED_EMAILS, isAllowedUser } from '../src/auth/access.js';

describe('isAllowedUser', () => {
  it('libera só o e-mail autorizado, sem diferenciar maiúsculas', () => {
    assert.equal(isAllowedUser({ email: 'joaogsmaciel@gmail.com', emailVerified: true }), true);
    assert.equal(isAllowedUser({ email: 'JoaoGSMaciel@Gmail.com', emailVerified: true }), true);
    assert.equal(isAllowedUser({ email: 'outra.pessoa@gmail.com', emailVerified: true }), false);
  });

  it('recusa e-mail não verificado e usuário sem e-mail', () => {
    assert.equal(isAllowedUser({ email: 'joaogsmaciel@gmail.com', emailVerified: false }), false);
    assert.equal(isAllowedUser({}), false);
    assert.equal(isAllowedUser(null), false);
  });

  it('a lista da interface é a mesma das regras do Firestore', () => {
    const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
    ALLOWED_EMAILS.forEach((email) => assert.ok(rules.includes(`'${email}'`), `${email} ausente nas regras`));
  });
});
