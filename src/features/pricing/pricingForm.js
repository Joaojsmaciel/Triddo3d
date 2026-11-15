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

let filamentSequence = 0;
/** Uma linha de filamento do formulário: material e peso em gramas (texto). */
export function createFilament(materialId = '', grams = '') {
  filamentSequence += 1;
  return { key: `fil-${Date.now()}-${filamentSequence}`, materialId, grams };
}

/** Medidas da peça, em milímetros. Só informativas: não entram no cálculo. */
export const DIMENSION_FIELDS = [
  { key: 'heightMm', label: 'Altura' },
  { key: 'widthMm', label: 'Largura' },
  { key: 'thicknessMm', label: 'Espessura' },
];

/** Estado inicial do formulário, herdando os padrões de Configurações. */
export function createFormState(settings, { material, printer } = {}) {
  return {
    projectName: '',
    clientName: '',
    quantity: '1',
    basis: BASIS.UNIT,

    printerId: printer?.id || '',

    filaments: [createFilament(material?.id || '')],

    heightMm: '',
    widthMm: '',
    thicknessMm: '',

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
    priceOverride: '',

    notes: '',
  };
}

/** Reabre um orçamento salvo no formulário, preservando o que foi digitado. */
export function formStateFromQuote(quote, settings) {
  const base = createFormState(settings);
  if (!quote?.input) {
    return { ...base, projectName: quote?.projectName || '', clientName: quote?.clientName || '' };
  }

  const { materialId, grams, ...input } = quote.input;
  const restored = { ...base, ...input };

  // Orçamentos salvos antes dos múltiplos filamentos guardavam um único
  // material e um único peso: viram a primeira (e única) linha.
  if (!Array.isArray(input.filaments) || input.filaments.length === 0) {
    restored.filaments = [createFilament(materialId || quote.materialId || '', grams ?? '')];
  } else {
    restored.filaments = input.filaments.map((filament) =>
      filament?.key ? { ...filament } : createFilament(filament?.materialId || '', filament?.grams ?? ''),
    );
  }
  return restored;
}

/** Medidas da peça em milímetros; ausentes ficam de fora. */
export function toDimensions(form) {
  return Object.fromEntries(
    DIMENSION_FIELDS.map(({ key }) => [key, inputToNumber(form[key])]).filter(([, value]) => value > 0),
  );
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

    printerId: form.printerId,

    filaments: (form.filaments || []).map((filament) => ({
      materialId: filament.materialId,
      grams: inputToNumber(filament.grams),
    })),

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
    priceOverrideCents: toCents(form.priceOverride),

    notes: form.notes,
  };
}

/** Monta o orçamento a ser gravado a partir do formulário e do resultado. */
export function buildQuote({ form, result, mode, printer, code, status, existing }) {
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
    // Grandezas técnicas: alimentam as especificações do orçamento do cliente.
    'grams',
    'billableGrams',
    'printHours',
    'laborHours',
  ];

  const filaments = (result.filamentItems || []).map((item) => ({
    materialId: item.materialId,
    materialName: item.materialName,
    grams: Number(item.grams) || 0,
    billableGrams: Number(item.billableGrams) || 0,
  }));

  return {
    id: existing?.id,
    code,
    projectName: form.projectName.trim() || 'Projeto sem nome',
    clientName: form.clientName.trim(),
    status,
    quantity: result.quantity,

    // Primeiro filamento e nomes somados: mantêm listagem, busca e relatórios
    // antigos funcionando. O detalhe por filamento fica em `filaments`.
    materialId: filaments[0]?.materialId || '',
    materialName: [...new Set(filaments.map((item) => item.materialName).filter(Boolean))].join(' + '),
    /** Filamentos por peça: material, peso informado e peso cobrado. */
    filaments,
    /** Medidas da peça em mm, para as especificações do orçamento do cliente. */
    dimensions: toDimensions(form),
    printerId: printer?.id || '',
    printerName: printer ? [printer.brand, printer.model].filter(Boolean).join(' ') : '',

    /** Guarda o formulário inteiro para permitir reabrir e recalcular. */
    input: { ...form, __mode: mode },
    unit: pick(result.perUnit, financialKeys),
    totals: pick(result.batch, financialKeys),
    extraItems: result.extraItems || [],
    marginPercent: inputToNumber(form.marginPercent),
    effectiveMargin: result.effectiveMargin,
    priceOverridden: Boolean(result.priceOverridden),

    notes: form.notes,
    createdAt: existing?.createdAt,
  };
}
