import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  quoteFolderKey,
  quoteFolderName,
  sanitizeName,
  uniqueFileName,
} from '../src/features/quotes/localFiles.js';

describe('arquivos locais do orçamento', () => {
  it('remove caracteres proibidos no Windows', () => {
    assert.equal(sanitizeName('Suporte: celular / mesa?'), 'Suporte celular mesa');
    assert.equal(sanitizeName('peça final. '), 'peça final');
    assert.equal(sanitizeName('   '), 'sem-nome');
  });

  it('nomeia a pasta pelo código e pelo projeto', () => {
    const quote = { id: 'qte_1', code: 'ORC-2026-0007', projectName: 'Vaso "Onda"' };
    assert.equal(quoteFolderKey(quote), 'ORC-2026-0007');
    assert.equal(quoteFolderName(quote), 'ORC-2026-0007 - Vaso Onda');
  });

  it('usa o id quando o orçamento não tem código', () => {
    assert.equal(quoteFolderName({ id: 'qte_abc' }), 'qte_abc');
  });

  it('não sobrescreve arquivos com o mesmo nome', () => {
    assert.equal(uniqueFileName('peca.stl', []), 'peca.stl');
    assert.equal(uniqueFileName('peca.stl', ['PECA.stl']), 'peca (2).stl');
    assert.equal(uniqueFileName('peca.stl', ['peca.stl', 'peca (2).stl']), 'peca (3).stl');
    assert.equal(uniqueFileName('LEIAME', ['LEIAME']), 'LEIAME (2)');
  });
});
