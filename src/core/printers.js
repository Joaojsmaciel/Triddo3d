/**
 * Regras de custo de máquina.
 *
 * Depreciação e manutenção são despesas distintas e somadas separadamente:
 * a depreciação devolve o capital investido no equipamento, a manutenção paga
 * peças de reposição e consumíveis de uso (bicos, correias, rolamentos).
 */

import { asCents, fromCents, parseDecimal, roundCents } from './money.js';

export const DEPRECIATION_MODE = {
  AUTO: 'auto',
  MANUAL: 'manual',
};

/**
 * Depreciação por hora em centavos decimais.
 *
 * Valor depreciável = valor de aquisição - valor residual.
 * Depreciação/hora = valor depreciável / vida útil estimada em horas.
 */
export function depreciationPerHourCents(printer = {}) {
  if (printer.depreciationMode === DEPRECIATION_MODE.MANUAL) {
    return Math.max(0, asCents(printer.depreciationPerHourCents));
  }

  const lifetimeHours = parseDecimal(printer.lifetimeHours, 0);
  if (lifetimeHours <= 0) return 0;

  const depreciable = asCents(printer.purchaseCents) - asCents(printer.residualCents);
  if (depreciable <= 0) return 0;

  return depreciable / lifetimeHours;
}

export function maintenancePerHourCents(printer = {}) {
  return Math.max(0, asCents(printer.maintenancePerHourCents));
}

/** Custo total de máquina por hora (depreciação + manutenção), em centavos decimais. */
export function machineCostPerHourCents(printer = {}) {
  return depreciationPerHourCents(printer) + maintenancePerHourCents(printer);
}

export function machineCostPerHourReais(printer = {}) {
  return fromCents(machineCostPerHourCents(printer));
}

/**
 * Consumo de energia em kWh.
 * Energia = (potência média em watts / 1000) x horas de impressão.
 */
export function energyKwh(printer = {}, hours = 0) {
  const watts = Math.max(0, parseDecimal(printer.powerWatts, 0));
  const printHours = Math.max(0, parseDecimal(hours, 0));
  return (watts / 1000) * printHours;
}

/**
 * Custo de energia em centavos inteiros.
 * Energia = (potência / 1000) x horas x tarifa em R$/kWh.
 */
export function energyCostCents(printer, hours, tariffReaisPerKwh) {
  const tariff = Math.max(0, parseDecimal(tariffReaisPerKwh, 0));
  return roundCents(energyKwh(printer, hours) * tariff * 100);
}

export function validatePrinter(printer = {}) {
  const errors = {};

  if (!String(printer.model || '').trim()) {
    errors.model = 'Informe o modelo da impressora.';
  }
  if (parseDecimal(printer.powerWatts, 0) <= 0) {
    errors.powerWatts = 'A potência média deve ser maior que zero.';
  }
  if (asCents(printer.purchaseCents) < 0) {
    errors.purchaseCents = 'O valor de aquisição não pode ser negativo.';
  }
  if (asCents(printer.residualCents) < 0) {
    errors.residualCents = 'O valor residual não pode ser negativo.';
  }
  if (asCents(printer.residualCents) > asCents(printer.purchaseCents)) {
    errors.residualCents = 'O valor residual não pode ser maior que o de aquisição.';
  }
  if (
    printer.depreciationMode !== DEPRECIATION_MODE.MANUAL &&
    parseDecimal(printer.lifetimeHours, 0) <= 0
  ) {
    errors.lifetimeHours = 'A vida útil estimada deve ser maior que zero.';
  }
  if (asCents(printer.maintenancePerHourCents) < 0) {
    errors.maintenancePerHourCents = 'A manutenção por hora não pode ser negativa.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function describePrinter(printer = {}) {
  const parts = [printer.brand, printer.model].filter(Boolean);
  return parts.join(' ') || 'Impressora sem nome';
}
