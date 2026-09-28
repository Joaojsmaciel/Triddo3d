import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEPRECIATION_MODE,
  depreciationPerHourCents,
  energyCostCents,
  energyKwh,
  machineCostPerHourCents,
  maintenancePerHourCents,
  validatePrinter,
} from '../src/core/printers.js';

const ender = {
  brand: 'Creality',
  model: 'Ender 3 V3 SE',
  purchaseCents: 139900, // R$ 1.399,00
  residualCents: 0,
  lifetimeHours: 5000,
  powerWatts: 110,
  maintenancePerHourCents: 30, // R$ 0,30/h
  depreciationMode: DEPRECIATION_MODE.AUTO,
};

describe('depreciationPerHourCents', () => {
  it('divide o valor depreciável pela vida útil', () => {
    // 139900 / 5000 = 27,98 centavos por hora
    assert.equal(depreciationPerHourCents(ender), 27.98);
  });

  it('desconta o valor residual do valor depreciável', () => {
    // (139900 - 39900) / 5000 = 20 centavos por hora
    assert.equal(depreciationPerHourCents({ ...ender, residualCents: 39900 }), 20);
  });

  it('respeita a depreciação informada manualmente', () => {
    const manual = { ...ender, depreciationMode: DEPRECIATION_MODE.MANUAL, depreciationPerHourCents: 50 };
    assert.equal(depreciationPerHourCents(manual), 50);
  });

  it('devolve zero quando a vida útil é zero, sem dividir por zero', () => {
    assert.equal(depreciationPerHourCents({ ...ender, lifetimeHours: 0 }), 0);
  });

  it('devolve zero quando não há valor depreciável', () => {
    assert.equal(depreciationPerHourCents({ ...ender, purchaseCents: 0 }), 0);
  });
});

describe('machineCostPerHourCents', () => {
  it('soma depreciação e manutenção sem confundir as duas', () => {
    assert.equal(maintenancePerHourCents(ender), 30);
    // Custo por hora é uma taxa decimal, não um valor em centavos inteiros: só
    // vira dinheiro (e é arredondado) ao ser multiplicado pelas horas de impressão.
    assert.ok(Math.abs(machineCostPerHourCents(ender) - 57.98) < 1e-9);
  });

  it('mantém a manutenção mesmo sem depreciação (impressora quitada)', () => {
    const paidOff = { ...ender, purchaseCents: 0 };
    assert.equal(machineCostPerHourCents(paidOff), 30);
  });
});

describe('energia', () => {
  it('converte potência e horas em kWh', () => {
    assert.equal(energyKwh(ender, 10), 1.1);
  });

  it('aplica a tarifa em R$/kWh', () => {
    // 0,110 kW x 10 h x R$ 0,857 = R$ 0,9427 -> 94 centavos
    assert.equal(energyCostCents(ender, 10, 0.857), 94);
  });

  it('não cobra energia para tempo zero', () => {
    assert.equal(energyCostCents(ender, 0, 0.857), 0);
  });

  it('ignora tarifa negativa', () => {
    assert.equal(energyCostCents(ender, 10, -1), 0);
  });
});

describe('validatePrinter', () => {
  it('aceita a Ender 3 V3 SE cadastrada', () => {
    assert.equal(validatePrinter(ender).valid, true);
  });

  it('exige modelo e potência', () => {
    const { valid, errors } = validatePrinter({ model: '', powerWatts: 0 });
    assert.equal(valid, false);
    assert.ok(errors.model);
    assert.ok(errors.powerWatts);
  });

  it('recusa valor residual maior que o de aquisição', () => {
    const { errors } = validatePrinter({ ...ender, residualCents: 200000 });
    assert.ok(errors.residualCents);
  });

  it('não exige vida útil quando a depreciação é manual', () => {
    const manual = {
      ...ender,
      lifetimeHours: 0,
      depreciationMode: DEPRECIATION_MODE.MANUAL,
      depreciationPerHourCents: 40,
    };
    assert.equal(validatePrinter(manual).valid, true);
  });
});
