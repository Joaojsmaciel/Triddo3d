import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  asCents,
  formatCents,
  fromCents,
  mulCents,
  parseDecimal,
  roundCents,
  shareOf,
  sumCents,
  toCents,
} from '../src/core/money.js';

describe('parseDecimal', () => {
  it('aceita ponto e vírgula como separador decimal', () => {
    assert.equal(parseDecimal('12.5'), 12.5);
    assert.equal(parseDecimal('12,5'), 12.5);
  });

  it('entende separador de milhar no formato brasileiro', () => {
    assert.equal(parseDecimal('1.234,56'), 1234.56);
  });

  it('entende separador de milhar no formato americano', () => {
    assert.equal(parseDecimal('1,234.56'), 1234.56);
  });

  it('ignora símbolo de moeda e espaços', () => {
    assert.equal(parseDecimal('R$ 89,90'), 89.9);
  });

  it('devolve o fallback para entradas inválidas', () => {
    assert.equal(parseDecimal('', 7), 7);
    assert.equal(parseDecimal('abc', 7), 7);
    assert.equal(parseDecimal(null, 7), 7);
    assert.equal(parseDecimal(Number.NaN, 7), 7);
  });
});

describe('toCents', () => {
  it('converte reais em centavos inteiros', () => {
    assert.equal(toCents('89,90'), 8990);
    assert.equal(toCents(120), 12000);
  });

  it('arredonda a terceira casa decimal', () => {
    assert.equal(toCents('0,125'), 13);
    assert.equal(toCents('0,124'), 12);
  });

  it('não sofre o erro clássico de ponto flutuante', () => {
    // 0.1 + 0.2 === 0.30000000000000004 em ponto flutuante
    assert.equal(sumCents(toCents(0.1), toCents(0.2)), toCents(0.3));
  });
});

describe('roundCents', () => {
  it('arredonda simetricamente em torno do zero', () => {
    assert.equal(roundCents(10.5), 11);
    assert.equal(roundCents(-10.5), -11);
    assert.equal(roundCents(10.4), 10);
  });

  it('trata valores não finitos como zero', () => {
    assert.equal(roundCents(Number.NaN), 0);
    assert.equal(roundCents(Infinity), 0);
  });
});

describe('utilitários de centavos', () => {
  it('asCents trunca para inteiro', () => {
    assert.equal(asCents(12.9), 12);
    assert.equal(asCents('abc', 5), 5);
  });

  it('mulCents arredonda uma única vez', () => {
    assert.equal(mulCents(1000, 0.075), 75);
  });

  it('shareOf protege contra divisão por zero', () => {
    assert.equal(shareOf(50, 0), 0);
    assert.equal(shareOf(50, 200), 0.25);
  });

  it('fromCents devolve reais', () => {
    assert.equal(fromCents(8990), 89.9);
  });
});

describe('formatCents', () => {
  it('formata no padrão brasileiro', () => {
    // Intl usa espaço não separável entre símbolo e número.
    assert.equal(formatCents(8990).replace(/\u00a0/g, ' '), 'R$ 89,90');
    assert.equal(formatCents(0).replace(/\u00a0/g, ' '), 'R$ 0,00');
  });
});
