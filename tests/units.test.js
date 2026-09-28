import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { clamp, formatHours, minutesToHours, parseHours, percentToRatio } from '../src/core/units.js';

describe('parseHours', () => {
  it('aceita horas decimais', () => {
    assert.equal(parseHours('2,5'), 2.5);
    assert.equal(parseHours(3), 3);
  });

  it('aceita o formato h:mm exibido pelos fatiadores', () => {
    assert.equal(parseHours('2:30'), 2.5);
    assert.equal(parseHours('10:15'), 10.25);
    assert.equal(parseHours('1h30'), 1.5);
  });

  it('rejeita minutos fora da faixa', () => {
    assert.equal(parseHours('2:75', -1), -1);
  });

  it('devolve o fallback para vazio', () => {
    assert.equal(parseHours('', 0), 0);
  });
});

describe('minutesToHours', () => {
  it('converte minutos em horas decimais', () => {
    assert.equal(minutesToHours(90), 1.5);
    assert.equal(minutesToHours(0), 0);
  });
});

describe('formatHours', () => {
  it('descreve horas e minutos', () => {
    assert.equal(formatHours(2.5), '2h 30min');
    assert.equal(formatHours(3), '3h');
    assert.equal(formatHours(0.5), '30min');
  });

  it('promove 60 minutos para a hora seguinte', () => {
    assert.equal(formatHours(1.999), '2h');
  });

  it('nunca devolve tempo negativo', () => {
    assert.equal(formatHours(-5), '0min');
  });
});

describe('percentToRatio', () => {
  it('converte percentual em razão', () => {
    assert.equal(percentToRatio(30), 0.3);
    assert.equal(percentToRatio('7,5'), 0.075);
  });
});

describe('clamp', () => {
  it('limita o valor à faixa', () => {
    assert.equal(clamp(150, 0, 100), 100);
    assert.equal(clamp(-10, 0, 100), 0);
    assert.equal(clamp(42, 0, 100), 42);
  });
});
