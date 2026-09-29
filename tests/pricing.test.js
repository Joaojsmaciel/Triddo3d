import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BASIS,
  DISCOUNT_MODE,
  WASTE_MODE,
  calculatePricing,
  createEmptyPricingInput,
} from '../src/core/pricing.js';

const material = {
  id: 'mat-1',
  name: 'PLA Branco',
  priceCents: 12000, // R$ 120,00
  shippingCents: 2000, // R$ 20,00
  spoolGrams: 1000, // -> 14 centavos por grama
};

const printer = {
  id: 'prn-1',
  brand: 'Creality',
  model: 'Ender 3 V3 SE',
  purchaseCents: 139900,
  residualCents: 0,
  lifetimeHours: 5000, // -> 27,98 centavos/h de depreciação
  powerWatts: 110,
  maintenancePerHourCents: 30, // R$ 0,30/h
};

const context = { material, printer };

/**
 * Caso base: 100 g, 5 h de impressão, 20 min de trabalho humano a R$ 25/h.
 * Custos esperados por peça:
 *   material      100 g x R$0,14            = R$ 14,00
 *   energia       0,110 kW x 5 h x R$0,857   = R$  0,47
 *   depreciação   5 h x R$0,2798             = R$  1,40
 *   manutenção    5 h x R$0,30               = R$  1,50
 *   mão de obra   0,3333 h x R$25            = R$  8,33
 *   total                                      R$ 25,70
 */
function baseInput(overrides = {}) {
  return {
    ...createEmptyPricingInput(),
    projectName: 'Suporte de fone',
    quantity: 1,
    basis: BASIS.UNIT,
    materialId: material.id,
    printerId: printer.id,
    grams: 100,
    printHours: 5,
    prepMinutes: 10,
    supportMinutes: 5,
    packagingMinutes: 5,
    laborRateCents: 2500,
    energyTariff: 0.857,
    ...overrides,
  };
}

const BASE_TOTAL_COST = 2570;

function closeTo(actual, expected, tolerance = 0.001) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `esperado ~${expected}, recebido ${actual}`,
  );
}

function warningCodes(result) {
  return result.warnings.map((warning) => warning.code);
}

function errorFields(result) {
  return result.errors.map((error) => error.field);
}

describe('custos de produção', () => {
  it('calcula cada componente de custo por peça', () => {
    const { perUnit } = calculatePricing(baseInput(), context);

    assert.equal(perUnit.material, 1400);
    assert.equal(perUnit.energy, 47);
    assert.equal(perUnit.depreciation, 140);
    assert.equal(perUnit.maintenance, 150);
    assert.equal(perUnit.machine, 290);
    assert.equal(perUnit.labor, 833);
    assert.equal(perUnit.extras, 0);
    assert.equal(perUnit.totalCost, BASE_TOTAL_COST);
  });

  it('separa tempo de máquina de tempo de mão de obra', () => {
    const fast = calculatePricing(baseInput({ printHours: 5 }), context);
    const slow = calculatePricing(baseInput({ printHours: 10 }), context);

    // Dobrar o tempo de impressão não pode aumentar a mão de obra: a impressão
    // é tempo de máquina, não trabalho humano.
    assert.equal(fast.perUnit.labor, slow.perUnit.labor);
    assert.ok(slow.perUnit.machine > fast.perUnit.machine);
    assert.equal(slow.perUnit.laborHours, 20 / 60);
    assert.equal(slow.perUnit.printHours, 10);
  });

  it('soma apenas o tempo humano efetivo', () => {
    const result = calculatePricing(
      baseInput({
        prepMinutes: 15,
        supportMinutes: 10,
        finishingMinutes: 20,
        assemblyMinutes: 10,
        packagingMinutes: 5,
      }),
      context,
    );

    assert.equal(result.perUnit.laborHours, 1); // 60 min
    assert.equal(result.perUnit.labor, 2500);
  });

  it('aplica a fórmula de energia da especificação', () => {
    const result = calculatePricing(baseInput({ printHours: 10 }), context);
    closeTo(result.perUnit.energyKwh, 1.1, 1e-9);
    assert.equal(result.perUnit.energy, 94); // 1,1 kWh x R$0,857
  });
});

describe('desperdício', () => {
  it('soma o percentual de desperdício ao peso informado', () => {
    const result = calculatePricing(baseInput({ wastePercent: 10 }), context);
    closeTo(result.perUnit.billableGrams, 110, 1e-9);
    assert.equal(result.perUnit.material, 1540);
  });

  it('não conta o desperdício duas vezes quando o peso já o inclui', () => {
    const result = calculatePricing(
      baseInput({ wastePercent: 10, wasteMode: WASTE_MODE.INCLUDED }),
      context,
    );

    closeTo(result.perUnit.billableGrams, 100, 1e-9);
    assert.equal(result.perUnit.material, 1400);
    assert.ok(warningCodes(result).includes('waste-ignored'));
  });
});

describe('reserva para falhas', () => {
  it('incide sobre o custo direto de produção', () => {
    const result = calculatePricing(baseInput({ failureReservePercent: 5 }), context);

    assert.equal(result.perUnit.directCost, BASE_TOTAL_COST);
    assert.equal(result.perUnit.failureReserve, 129); // 5% de R$25,70
    assert.equal(result.perUnit.totalCost, 2699);
  });

  it('é zero quando não configurada', () => {
    const result = calculatePricing(baseInput(), context);
    assert.equal(result.perUnit.failureReserve, 0);
  });
});

describe('custos adicionais', () => {
  it('distingue custo por peça de custo do lote', () => {
    const result = calculatePricing(
      baseInput({
        quantity: 4,
        extras: [
          { label: 'Embalagem', amountCents: 200, perUnit: true },
          { label: 'Transporte', amountCents: 2000, perUnit: false },
        ],
      }),
      context,
    );

    // R$2,00 por peça + R$20,00 do lote rateados entre 4 peças = R$7,00
    assert.equal(result.perUnit.extras, 700);
    assert.equal(result.batch.extras, 2800);
  });

  it('ignora itens sem valor', () => {
    const result = calculatePricing(
      baseInput({ extras: [{ label: 'Pintura', amountCents: 0, perUnit: true }] }),
      context,
    );
    assert.equal(result.perUnit.extras, 0);
    assert.deepEqual(result.extraItems, []);
  });

  it('lista cada adicional com rótulo para o orçamento do cliente', () => {
    const result = calculatePricing(
      baseInput({
        extras: [
          { label: 'Modelagem 3D', amountCents: 5000, perUnit: true },
          { label: 'Cola, tinta e consumíveis', amountCents: 300, perUnit: true },
          { label: 'Vazio', amountCents: 0, perUnit: true },
        ],
      }),
      context,
    );

    assert.deepEqual(result.extraItems, [
      { label: 'Modelagem 3D', amountCents: 5000, perUnit: true },
      { label: 'Cola, tinta e consumíveis', amountCents: 300, perUnit: true },
    ]);
  });
});

describe('margem de lucro', () => {
  it('trata a margem sobre o preço de venda, não como markup', () => {
    const result = calculatePricing(baseInput({ marginPercent: 30 }), context);

    // Markup ingênuo (custo x 1,30) daria R$33,41 e uma margem real de só 23%.
    const naiveMarkup = Math.round(BASE_TOTAL_COST * 1.3);
    assert.ok(result.perUnit.price > naiveMarkup);

    assert.equal(result.perUnit.price, 3671); // 2570 / 0,70
    closeTo(result.effectiveMargin, 0.3);
  });

  it('com margem zero o preço empata com o custo', () => {
    const result = calculatePricing(baseInput({ marginPercent: 0 }), context);
    assert.equal(result.perUnit.price, BASE_TOTAL_COST);
    assert.equal(result.perUnit.profit, 0);
    closeTo(result.effectiveMargin, 0);
  });

  it('aumentar a margem aumenta preço e lucro', () => {
    const low = calculatePricing(baseInput({ marginPercent: 20 }), context);
    const high = calculatePricing(baseInput({ marginPercent: 50 }), context);

    assert.ok(high.perUnit.price > low.perUnit.price);
    assert.ok(high.perUnit.profit > low.perUnit.profit);
    assert.equal(low.perUnit.totalCost, high.perUnit.totalCost);
  });
});

describe('taxas e impostos', () => {
  it('embute taxas percentuais no divisor e preserva a margem', () => {
    const result = calculatePricing(
      baseInput({ marginPercent: 30, cardFeePercent: 5, taxPercent: 6 }),
      context,
    );

    assert.equal(result.perUnit.price, 4356); // 2570 / (1 - 0,30 - 0,05 - 0,06)
    assert.equal(result.perUnit.cardFee, 218);
    assert.equal(result.perUnit.tax, 261);
    closeTo(result.effectiveMargin, 0.3, 0.002);
  });

  it('cobra as taxas percentuais sobre o preço com desconto, não sobre o de tabela', () => {
    const result = calculatePricing(
      baseInput({ marginPercent: 30, cardFeePercent: 10, discountPercent: 20 }),
      context,
    );

    assert.equal(result.perUnit.cardFee, Math.round(result.perUnit.price * 0.1));
    assert.ok(result.perUnit.price < result.perUnit.listPrice);
  });

  it('rateia a taxa fixa do pedido entre as peças', () => {
    const result = calculatePricing(
      baseInput({ quantity: 4, fixedFeeCents: 400 }),
      context,
    );

    assert.equal(result.perUnit.fixedFee, 100);
    assert.equal(result.batch.fixedFee, 400);
  });

  it('calcula o preço de equilíbrio considerando as taxas', () => {
    const result = calculatePricing(baseInput({ cardFeePercent: 5 }), context);
    assert.equal(result.perUnit.breakEven, 2705); // 2570 / 0,95
  });
});

describe('desconto', () => {
  it('absorvido na margem reduz o preço e a margem efetiva', () => {
    const result = calculatePricing(
      baseInput({ marginPercent: 30, discountPercent: 10, discountMode: DISCOUNT_MODE.ABSORB }),
      context,
    );

    assert.equal(result.perUnit.listPrice, 3671);
    assert.equal(result.perUnit.discount, 367);
    assert.equal(result.perUnit.price, 3304);
    assert.ok(result.effectiveMargin < 0.3);
    closeTo(result.effectiveMargin, 0.2222, 0.001);
    assert.ok(warningCodes(result).includes('discount-absorbed'));
  });

  it('embutido no preço de tabela preserva a margem desejada', () => {
    const result = calculatePricing(
      baseInput({ marginPercent: 30, discountPercent: 10, discountMode: DISCOUNT_MODE.GROSS_UP }),
      context,
    );

    assert.equal(result.perUnit.listPrice, 4079);
    assert.equal(result.perUnit.price, 3671);
    closeTo(result.effectiveMargin, 0.3);
    assert.ok(!warningCodes(result).includes('discount-absorbed'));
  });

  it('avisa quando o desconto derruba o lucro para o negativo', () => {
    const result = calculatePricing(
      baseInput({ marginPercent: 0, discountPercent: 50 }),
      context,
    );

    assert.ok(result.perUnit.profit < 0);
    assert.ok(warningCodes(result).includes('negative-profit'));
  });
});

describe('valor mínimo de venda', () => {
  it('avisa quando o preço fica abaixo do mínimo, sem alterar o valor sugerido', () => {
    const result = calculatePricing(
      baseInput({ marginPercent: 0, minPriceCents: 5000 }),
      context,
    );

    assert.equal(result.perUnit.price, BASE_TOTAL_COST);
    assert.equal(result.minPriceApplied, true);
    assert.ok(warningCodes(result).includes('min-price'));
  });

  it('não interfere quando o preço calculado já é maior', () => {
    const result = calculatePricing(
      baseInput({ marginPercent: 30, minPriceCents: 1000 }),
      context,
    );

    assert.equal(result.perUnit.price, 3671);
    assert.equal(result.minPriceApplied, false);
  });

  it('reduzir a margem muda o preço mesmo com valor mínimo configurado', () => {
    const high = calculatePricing(baseInput({ marginPercent: 30, minPriceCents: 1500 }), context);
    const low = calculatePricing(baseInput({ marginPercent: 10, minPriceCents: 1500 }), context);

    assert.ok(low.perUnit.price < high.perUnit.price);
  });
});

describe('preço cobrado manualmente', () => {
  it('substitui o preço sugerido pelo valor digitado', () => {
    const suggested = calculatePricing(baseInput({ marginPercent: 30 }), context);
    const result = calculatePricing(
      baseInput({ marginPercent: 30, priceOverrideCents: 2000 }),
      context,
    );

    assert.equal(result.perUnit.price, 2000);
    assert.equal(result.priceOverridden, true);
    assert.equal(result.suggestedPrice, suggested.perUnit.price);
    assert.equal(result.perUnit.listPrice, 2000);
    assert.equal(result.perUnit.discount, 0);
  });

  it('recalcula o lucro sobre o valor cobrado', () => {
    const result = calculatePricing(
      baseInput({ marginPercent: 30, priceOverrideCents: 4000 }),
      context,
    );

    assert.equal(result.perUnit.profit, 4000 - BASE_TOTAL_COST);
  });
});

describe('quantidade e base de cálculo', () => {
  it('multiplica o custo por peça quando a base é por unidade', () => {
    const result = calculatePricing(baseInput({ quantity: 4, marginPercent: 30 }), context);

    assert.equal(result.perUnit.totalCost, BASE_TOTAL_COST);
    assert.equal(result.batch.totalCost, BASE_TOTAL_COST * 4);
  });

  it('divide os valores do lote quando a base é o lote completo', () => {
    const result = calculatePricing(
      baseInput({
        quantity: 4,
        basis: BASIS.BATCH,
        grams: 400,
        printHours: 20,
        prepMinutes: 10,
        supportMinutes: 5,
        packagingMinutes: 5,
      }),
      context,
    );

    // 400 g e 20 h no lote equivalem a 100 g e 5 h por peça.
    assert.equal(result.perUnit.material, 1400);
    assert.equal(result.perUnit.energy, 47);
    // Os 20 min de trabalho são do lote: 5 min por peça.
    assert.equal(result.perUnit.labor, 208);
    assert.equal(result.batch.printHours, 20);
  });

  it('garante que preço unitário x quantidade é igual ao total do lote', () => {
    const result = calculatePricing(
      baseInput({ quantity: 7, marginPercent: 33, cardFeePercent: 4 }),
      context,
    );

    assert.equal(result.batch.price, result.perUnit.price * 7);
    assert.equal(result.batch.profit, result.perUnit.profit * 7);
  });
});

describe('validações', () => {
  it('recusa peso, tempo e tarifa zerados', () => {
    const result = calculatePricing(
      baseInput({ grams: 0, printHours: 0, energyTariff: 0 }),
      context,
    );

    assert.equal(result.ok, false);
    const fields = errorFields(result);
    assert.ok(fields.includes('grams'));
    assert.ok(fields.includes('printHours'));
    assert.ok(fields.includes('energyTariff'));
    assert.equal(result.perUnit, null);
  });

  it('recusa quantidade menor que uma peça', () => {
    const result = calculatePricing(baseInput({ quantity: 0 }), context);
    assert.ok(errorFields(result).includes('quantity'));
  });

  it('exige material e impressora selecionados', () => {
    const result = calculatePricing(baseInput(), {});
    const fields = errorFields(result);
    assert.ok(fields.includes('materialId'));
    assert.ok(fields.includes('printerId'));
  });

  it('recusa material sem preço ou sem peso de bobina', () => {
    const result = calculatePricing(baseInput(), {
      material: { id: 'x', name: 'Vazio', priceCents: 0, spoolGrams: 0 },
      printer,
    });
    assert.ok(errorFields(result).includes('materialId'));
  });

  it('impede divisor menor ou igual a zero na fórmula de preço', () => {
    const exactly100 = calculatePricing(baseInput({ marginPercent: 100 }), context);
    assert.equal(exactly100.ok, false);
    assert.ok(errorFields(exactly100).includes('marginPercent'));

    const above100 = calculatePricing(
      baseInput({ marginPercent: 60, cardFeePercent: 30, taxPercent: 20 }),
      context,
    );
    assert.equal(above100.ok, false);
  });

  it('recusa desconto de 100% ou mais', () => {
    const result = calculatePricing(baseInput({ discountPercent: 100 }), context);
    assert.ok(errorFields(result).includes('discountPercent'));
  });

  it('trata valores negativos como zero em vez de gerar crédito', () => {
    const result = calculatePricing(
      baseInput({ wastePercent: -50, failureReservePercent: -10, marginPercent: -20 }),
      context,
    );

    assert.equal(result.ok, true);
    assert.equal(result.perUnit.failureReserve, 0);
    assert.equal(result.perUnit.price, BASE_TOTAL_COST);
    closeTo(result.perUnit.billableGrams, 100, 1e-9);
  });

  it('avisa quando a impressora não tem depreciação configurada', () => {
    const result = calculatePricing(baseInput(), {
      material,
      printer: { ...printer, purchaseCents: 0, lifetimeHours: 0 },
    });

    assert.equal(result.ok, true);
    assert.equal(result.perUnit.depreciation, 0);
    assert.ok(warningCodes(result).includes('no-depreciation'));
  });

  it('avisa quando há tempo de trabalho sem valor de hora', () => {
    const result = calculatePricing(baseInput({ laborRateCents: 0 }), context);
    assert.ok(warningCodes(result).includes('no-labor-rate'));
  });
});

describe('composição de custos', () => {
  it('as participações somam 100% do custo total', () => {
    const result = calculatePricing(
      baseInput({ failureReservePercent: 5, extras: [{ label: 'Cola', amountCents: 150, perUnit: true }] }),
      context,
    );

    const totalShare = result.breakdown.reduce((sum, item) => sum + item.share, 0);
    closeTo(totalShare, 1, 0.0001);

    const totalCents = result.breakdown.reduce((sum, item) => sum + item.cents, 0);
    assert.equal(totalCents, result.perUnit.totalCost);
  });

  it('omite componentes zerados do gráfico', () => {
    const result = calculatePricing(baseInput(), context);
    const keys = result.breakdown.map((item) => item.key);
    assert.ok(!keys.includes('failureReserve'));
    assert.ok(!keys.includes('extras'));
    assert.ok(keys.includes('material'));
  });
});
