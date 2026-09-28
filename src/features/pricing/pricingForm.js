/**
 * Ponte entre o formulário de precificação e o motor de cálculo.
 *
 * Fica fora dos componentes para poder ser reaproveitada ao reabrir um
 * orçamento salvo e para ser testada sem montar React.
 */

import { toCents } from '../../core/money.js';
import { BASIS, DISCOUNT_MODE, WASTE_MODE } from '../../core/pricing.js';
import { parseHours } from '../../core/units.js';
import { centsToInput, inputToNumber, numberToInput } from '../../lib/form.js';

/** Modo rápido reproduz a calculadora original: peso, tempo e margem. */
export const PRICING_MODE = {
  QUICK: 'quick',
  FULL: 'full',
};

/** Categorias sugeridas de custo adicional, conforme a especificação. */
export const EXTRA_PRESETS = [
  'Embalagem',
  'Cola, tinta e consumíveis',
  'Transporte',
  'Personalização',
  'Modelagem 3D',
  'Outros custos',
];

let extraSequence = 0;
export function createExtra(label = '', amount = '', perUnit = true) {
  extraSequence += 1;
  return { key: `extra-${Date.now()}-${extraSequence}`, label, amount, perUnit };
}

/** Estado inicial do formulário, herdando os padrões de Configurações. */
export function createFormState(settings, { material, printer } = {}) {
  return {
    projectName: '',
    clientName: '',
    quantity: '1',
    basis: BASIS.UNIT,

    materialId: material?.id || '',
    printerId: printer?.id || '',

    grams: '',
    printHours: '',
    wasteMode: settings.wasteMode || WASTE_MODE.ADD,
    wastePercent: numberToInput(settings.wastePercent),

    prepMinutes: '',
    supportMinutes: '',
    finishingMinutes: '',
    assemblyMinutes: '',
    packagingMinutes: '',
    laborRate: centsToInput(settings.laborRateCents),

    extras: [],

    energyTariff: numberToInput(settings.energyTariff),
    failureReservePercent: numberToInput(settings.failureReservePercent),

    marginPercent: numberToInput(settings.marginPercent),
    cardFeePercent: numberToInput(settings.cardFeePercent),
    taxPercent: numberToInput(settings.taxPercent),
    fixedFee: centsToInput(settings.fixedFeeCents),
    discountPercent: '',
    discountMode: settings.discountMode || DISCOUNT_MODE.ABSORB,
    minPrice: centsToInput(settings.minPriceCents),

    notes: '',
  };
}

/** Reabre um orçamento salvo no formulário, preservando o que foi digitado. */
export function formStateFromQuote(quote, settings) {
  const base = createFormState(settings);
  if (!quote?.input) {
    return { ...base, projectName: quote?.projectName || '', clientName: quote?.clientName || '' };
  }
  return { ...base, ...quote.input };
}

/**
 * Converte o formulário (texto) nas entradas do motor (números e centavos).
 * No modo rápido, as seções ocultas caem para os padrões das configurações.
 */
export function toPricingInput(form, settings, mode = PRICING_MODE.FULL) {
  const quick = mode === PRICING_MODE.QUICK;

  return {
    projectName: form.projectName.trim(),
    quantity: inputToNumber(form.quantity, 1) || 1,
    basis: form.basis,

    materialId: form.materialId,
    printerId: form.printerId,

    grams: inputToNumber(form.grams),
    printHours: parseHours(form.printHours, 0),
    wasteMode: form.wasteMode,
    wastePercent: inputToNumber(form.wastePercent),

    prepMinutes: quick ? 0 : inputToNumber(form.prepMinutes),
    supportMinutes: quick ? 0 : inputToNumber(form.supportMinutes),
    finishingMinutes: quick ? 0 : inputToNumber(form.finishingMinutes),
    assemblyMinutes: quick ? 0 : inputToNumber(form.assemblyMinutes),
    packagingMinutes: quick ? 0 : inputToNumber(form.packagingMinutes),
    laborRateCents: toCents(form.laborRate),

    extras: quick
      ? []
      : form.extras
          .filter((extra) => extra.label.trim() || extra.amount)
          .map((extra) => ({
            label: extra.label.trim() || 'Custo adicional',
            amountCents: toCents(extra.amount),
            perUnit: extra.perUnit,
          })),

    energyTariff: inputToNumber(form.energyTariff),
    failureReservePercent: inputToNumber(form.failureReservePercent),

    marginPercent: inputToNumber(form.marginPercent),
    cardFeePercent: quick ? inputToNumber(settings.cardFeePercent) : inputToNumber(form.cardFeePercent),
    taxPercent: quick ? inputToNumber(settings.taxPercent) : inputToNumber(form.taxPercent),
    fixedFeeCents: quick ? Number(settings.fixedFeeCents) || 0 : toCents(form.fixedFee),
    discountPercent: quick ? 0 : inputToNumber(form.discountPercent),
    discountMode: form.discountMode,
    minPriceCents: toCents(form.minPrice),

    notes: form.notes,
  };
}

/** Monta o orçamento a ser gravado a partir do formulário e do resultado. */
export function buildQuote({ form, result, mode, material, printer, code, status, existing }) {
  const pick = (source, keys) =>
    Object.fromEntries(keys.map((key) => [key, Number(source[key]) || 0]));

  const financialKeys = [
    'material',
    'energy',
    'depreciation',
    'maintenance',
    'machine',
    'labor',
    'extras',
    'directCost',
    'failureReserve',
    'totalCost',
    'listPrice',
    'discount',
    'price',
    'cardFee',
    'tax',
    'fixedFee',
    'commercialCost',
    'profit',
    'breakEven',
    'minimumPrice',
    'billableGrams',
    'printHours',
    'laborHours',
  ];

  return {
    id: existing?.id,
    code,
    projectName: form.projectName.trim() || 'Projeto sem nome',
    clientName: form.clientName.trim(),
    status,
    quantity: result.quantity,

    materialId: material?.id || '',
    materialName: material ? [material.brand, material.name].filter(Boolean).join(' ') : '',
    printerId: printer?.id || '',
    printerName: printer ? [printer.brand, printer.model].filter(Boolean).join(' ') : '',

    /** Guarda o formulário inteiro para permitir reabrir e recalcular. */
    input: { ...form, __mode: mode },
    unit: pick(result.perUnit, financialKeys),
    totals: pick(result.batch, financialKeys),
    marginPercent: inputToNumber(form.marginPercent),
    effectiveMargin: result.effectiveMargin,

    notes: form.notes,
    createdAt: existing?.createdAt,
  };
}
