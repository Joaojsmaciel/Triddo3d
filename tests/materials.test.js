import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  costPerGramCents,
  costPerKiloCents,
  materialCostCents,
  validateMaterial,
} from '../src/core/materials.js';

const spool = {
  name: 'PLA Branco',
  priceCents: 12000, // R$ 120,00
  shippingCents: 2000, // R$ 20,00
  spoolGrams: 1000,
};

describe('costPerGramCents', () => {
  it('soma o frete ao preço da bobina', () => {
    // (12000 + 2000) / 1000 = 14 centavos por grama
    assert.equal(costPerGramCents(spool), 14);
  });

  it('preserva a precisão decimal de bobinas baratas', () => {
    // R$ 95,00 / 1000 g = 9,5 centavos/g — truncar aqui distorceria peças pequenas
    assert.equal(costPerGramCents({ priceCents: 9500, shippingCents: 0, spoolGrams: 1000 }), 9.5);
  });

  it('trata peso zero ou ausente como custo zero em vez de infinito', () => {
    assert.equal(costPerGramCents({ priceCents: 12000, spoolGrams: 0 }), 0);
    assert.equal(costPerGramCents({}), 0);
  });

  it('funciona com bobinas de 750 g', () => {
    assert.equal(costPerGramCents({ priceCents: 15000, shippingCents: 0, spoolGrams: 750 }), 20);
  });
});

describe('materialCostCents', () => {
  it('calcula o custo das gramas consumidas', () => {
    assert.equal(materialCostCents(spool, 50), 700); // 50 g x R$0,14 = R$ 7,00
  });

  it('arredonda ao centavo mais próximo', () => {
    const cheap = { priceCents: 9500, shippingCents: 0, spoolGrams: 1000 }; // 9,5 centavos/g
    assert.equal(materialCostCents(cheap, 33), 314); // 313,5 -> 314
  });

  it('ignora pesos negativos', () => {
    assert.equal(materialCostCents(spool, -10), 0);
  });
});

describe('costPerKiloCents', () => {
  it('projeta o custo por grama para 1 kg', () => {
    assert.equal(costPerKiloCents(spool), 14000);
  });
});

describe('validateMaterial', () => {
  it('aceita um material completo', () => {
    assert.equal(validateMaterial(spool).valid, true);
  });

  it('exige nome, preço e peso', () => {
    const { valid, errors } = validateMaterial({ name: '  ', priceCents: 0, spoolGrams: 0 });
    assert.equal(valid, false);
    assert.ok(errors.name);
    assert.ok(errors.priceCents);
    assert.ok(errors.spoolGrams);
  });

  it('recusa frete negativo', () => {
    const { errors } = validateMaterial({ ...spool, shippingCents: -100 });
    assert.ok(errors.shippingCents);
  });
});
