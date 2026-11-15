import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { calculatePricing } from '../src/core/pricing.js';
import {
  PRICING_MODE,
  buildQuote,
  createFilament,
  createFormState,
  formStateFromQuote,
  toDimensions,
  toPricingInput,
} from '../src/features/pricing/pricingForm.js';

const settings = { energyTariff: 0.857, marginPercent: 30 };
const pla = { id: 'mat-1', brand: 'Genérico', name: 'PLA Branco', priceCents: 12000, spoolGrams: 1000 };
const petg = { id: 'mat-2', brand: 'Voolt', name: 'PETG Preto', priceCents: 10000, spoolGrams: 1000 };
const printer = { id: 'prn-1', brand: 'Creality', model: 'K1', powerWatts: 300, purchaseCents: 0 };

function filledForm() {
  return {
    ...createFormState(settings, { material: pla, printer }),
    projectName: 'Vaso',
    printHours: '3',
    filaments: [createFilament(pla.id, '60'), createFilament(petg.id, '40,5')],
    heightMm: '120',
    widthMm: '80,5',
    thicknessMm: '',
  };
}

describe('formulário · filamentos e dimensões', () => {
  it('começa com uma linha de filamento no material padrão', () => {
    const form = createFormState(settings, { material: pla, printer });
    assert.equal(form.filaments.length, 1);
    assert.equal(form.filaments[0].materialId, pla.id);
  });

  it('converte cada filamento para número', () => {
    const input = toPricingInput(filledForm(), settings, PRICING_MODE.FULL);
    assert.deepEqual(input.filaments, [
      { materialId: pla.id, grams: 60 },
      { materialId: petg.id, grams: 40.5 },
    ]);
  });

  it('guarda só as dimensões informadas, em mm', () => {
    assert.deepEqual(toDimensions(filledForm()), { heightMm: 120, widthMm: 80.5 });
  });

  it('grava filamentos, dimensões e nomes somados no orçamento', () => {
    const form = filledForm();
    const result = calculatePricing(toPricingInput(form, settings), { materials: [pla, petg], printer });
    assert.equal(result.ok, true);

    const quote = buildQuote({ form, result, mode: PRICING_MODE.FULL, printer, code: 'ORC-1', status: 'draft' });
    assert.equal(quote.materialName, 'Genérico PLA Branco + Voolt PETG Preto');
    assert.equal(quote.materialId, pla.id);
    assert.deepEqual(
      quote.filaments.map((item) => [item.materialName, item.grams]),
      [
        ['Genérico PLA Branco', 60],
        ['Voolt PETG Preto', 40.5],
      ],
    );
    assert.deepEqual(quote.dimensions, { heightMm: 120, widthMm: 80.5 });
  });

  it('reabre orçamento antigo de um material como uma linha de filamento', () => {
    const { filaments, ...semFilamentos } = createFormState(settings);
    const antigo = {
      materialId: pla.id,
      input: { ...semFilamentos, materialId: pla.id, grams: '75' },
    };
    const form = formStateFromQuote(antigo, settings);
    assert.equal(form.filaments.length, 1);
    assert.equal(form.filaments[0].materialId, pla.id);
    assert.equal(form.filaments[0].grams, '75');
    assert.ok(!('grams' in form));
  });

  it('reabre orçamento com vários filamentos preservando as linhas', () => {
    const reaberto = formStateFromQuote({ input: filledForm() }, settings);
    assert.deepEqual(
      reaberto.filaments.map((item) => [item.materialId, item.grams]),
      [
        [pla.id, '60'],
        [petg.id, '40,5'],
      ],
    );
    assert.equal(reaberto.heightMm, '120');
  });
});
