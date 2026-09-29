/**
 * Motor de precificação do TRIDDO 3D.
 *
 * Função pura: recebe um orçamento normalizado e devolve custos, preço e lucro.
 * Não conhece React, localStorage nem formatação — só as regras de negócio.
 *
 * Convenções que valem para todo o arquivo:
 *   - Valores monetários em centavos inteiros.
 *   - Taxas e percentuais em decimal (30% -> 0.3 internamente).
 *   - Todo custo é calculado POR UNIDADE e arredondado ao centavo; o total do
 *     lote é a multiplicação pela quantidade. Isso garante que
 *     "preço unitário x quantidade = preço total" no orçamento do cliente.
 */

import { asCents, parseDecimal, roundCents, shareOf, sumCents } from './money.js';
import { minutesToHours, percentToRatio } from './units.js';
import { costPerGramCents } from './materials.js';
import {
  depreciationPerHourCents,
  energyCostCents,
  energyKwh,
  maintenancePerHourCents,
} from './printers.js';

/** O peso e o tempo informados valem para uma peça ou para o lote inteiro? */
export const BASIS = {
  UNIT: 'unit',
  BATCH: 'batch',
};

/** O peso informado já inclui suportes/brim ou o desperdício deve ser somado? */
export const WASTE_MODE = {
  /** Soma o percentual de desperdício sobre o peso informado. */
  ADD: 'add',
  /** O peso já vem do fatiador com suportes e purga: não soma nada. */
  INCLUDED: 'included',
};

export const DISCOUNT_MODE = {
  /** O desconto sai da margem: o preço cai e a margem efetiva diminui. */
  ABSORB: 'absorb',
  /** O desconto é embutido no preço de tabela: a margem-alvo é preservada. */
  GROSS_UP: 'grossUp',
};

export const LABOR_STEPS = [
  { key: 'prepMinutes', label: 'Preparação' },
  { key: 'supportMinutes', label: 'Retirada de suportes' },
  { key: 'finishingMinutes', label: 'Acabamento' },
  { key: 'assemblyMinutes', label: 'Montagem' },
  { key: 'packagingMinutes', label: 'Embalagem' },
];

export const COST_COMPONENTS = [
  { key: 'material', label: 'Material', color: '#4C7DFF' },
  { key: 'energy', label: 'Energia', color: '#22C1DC' },
  { key: 'depreciation', label: 'Depreciação', color: '#8B5CF6' },
  { key: 'maintenance', label: 'Manutenção', color: '#A855F7' },
  { key: 'labor', label: 'Mão de obra', color: '#38BDF8' },
  { key: 'extras', label: 'Custos adicionais', color: '#6366F1' },
  { key: 'failureReserve', label: 'Reserva para falhas', color: '#F472B6' },
];

/** Orçamento vazio, usado como base pelo formulário e pelos testes. */
export function createEmptyPricingInput() {
  return {
    projectName: '',
    quantity: 1,
    basis: BASIS.UNIT,

    materialId: '',
    printerId: '',

    grams: 0,
    printHours: 0,
    wasteMode: WASTE_MODE.ADD,
    wastePercent: 0,

    prepMinutes: 0,
    supportMinutes: 0,
    finishingMinutes: 0,
    assemblyMinutes: 0,
    packagingMinutes: 0,
    laborRateCents: 0,

    extras: [],

    energyTariff: 0,
    failureReservePercent: 0,
    marginPercent: 0,
    cardFeePercent: 0,
    taxPercent: 0,
    fixedFeeCents: 0,
    discountPercent: 0,
    discountMode: DISCOUNT_MODE.ABSORB,
    minPriceCents: 0,
    /** 0 = cobra o preço sugerido pela fórmula. Qualquer valor > 0 substitui. */
    priceOverrideCents: 0,

    notes: '',
  };
}

function nonNegative(value) {
  const parsed = parseDecimal(value, 0);
  return parsed > 0 ? parsed : 0;
}

/**
 * Traz todas as entradas para a mesma base (por unidade) e converte percentuais
 * em razões. Depois desta função o cálculo não precisa mais pensar em "lote".
 */
function normalizeInput(raw, material, printer) {
  const quantity = Math.max(1, Math.trunc(parseDecimal(raw.quantity, 1)));
  const basis = raw.basis === BASIS.BATCH ? BASIS.BATCH : BASIS.UNIT;
  const perUnitDivisor = basis === BASIS.BATCH ? quantity : 1;

  const wasteMode = raw.wasteMode === WASTE_MODE.INCLUDED ? WASTE_MODE.INCLUDED : WASTE_MODE.ADD;
  const declaredWaste = percentToRatio(nonNegative(raw.wastePercent));
  // Quando o peso já vem do fatiador com suportes e purga, somar o percentual
  // contaria o desperdício duas vezes.
  const wasteRatio = wasteMode === WASTE_MODE.INCLUDED ? 0 : declaredWaste;

  const laborMinutes = LABOR_STEPS.reduce(
    (total, step) => total + nonNegative(raw[step.key]),
    0,
  );

  return {
    quantity,
    basis,
    wasteMode,
    declaredWaste,
    wasteRatio,

    grams: nonNegative(raw.grams) / perUnitDivisor,
    printHours: nonNegative(raw.printHours) / perUnitDivisor,
    laborHours: minutesToHours(laborMinutes) / perUnitDivisor,

    costPerGram: costPerGramCents(material || {}),
    depreciationPerHour: depreciationPerHourCents(printer || {}),
    maintenancePerHour: maintenancePerHourCents(printer || {}),
    laborRate: Math.max(0, asCents(raw.laborRateCents)),
    energyTariff: nonNegative(raw.energyTariff),

    extras: Array.isArray(raw.extras) ? raw.extras : [],

    failureRatio: percentToRatio(nonNegative(raw.failureReservePercent)),
    marginRatio: percentToRatio(nonNegative(raw.marginPercent)),
    cardFeeRatio: percentToRatio(nonNegative(raw.cardFeePercent)),
    taxRatio: percentToRatio(nonNegative(raw.taxPercent)),
    discountRatio: percentToRatio(nonNegative(raw.discountPercent)),
    discountMode: raw.discountMode === DISCOUNT_MODE.GROSS_UP
      ? DISCOUNT_MODE.GROSS_UP
      : DISCOUNT_MODE.ABSORB,
    fixedFeeCents: Math.max(0, asCents(raw.fixedFeeCents)),
    minPriceCents: Math.max(0, asCents(raw.minPriceCents)),
    priceOverrideCents: Math.max(0, asCents(raw.priceOverrideCents)),
  };
}

/**
 * Custos adicionais. Cada item vale por peça ou pelo lote, independentemente da
 * base global — "embalagem R$2/peça" e "frete R$25 no lote" convivem.
 */
function sumExtrasPerUnit(extras, quantity) {
  return extras.reduce((total, extra) => {
    const value = asCents(extra?.amountCents);
    if (!value) return total;
    return total + (extra?.perUnit === false ? value / quantity : value);
  }, 0);
}

/** Itens de custo adicional com valor, no formato em que o usuário lançou. */
function listExtraItems(extras) {
  return (Array.isArray(extras) ? extras : [])
    .map((extra) => {
      const amountCents = asCents(extra?.amountCents);
      if (amountCents <= 0) return null;
      const label = String(extra?.label || '').trim() || 'Custo adicional';
      return {
        label,
        amountCents,
        perUnit: extra?.perUnit !== false,
      };
    })
    .filter(Boolean);
}

function validate(input, material, printer, raw) {
  const errors = [];

  if (parseDecimal(raw.quantity, 1) < 1) {
    errors.push({ field: 'quantity', message: 'A quantidade deve ser de pelo menos 1 peça.' });
  }
  if (input.grams <= 0) {
    errors.push({ field: 'grams', message: 'Informe o peso de filamento (maior que zero).' });
  }
  if (input.printHours <= 0) {
    errors.push({ field: 'printHours', message: 'Informe o tempo de impressão (maior que zero).' });
  }
  if (!material) {
    errors.push({ field: 'materialId', message: 'Selecione um material cadastrado.' });
  } else if (input.costPerGram <= 0) {
    errors.push({
      field: 'materialId',
      message: 'O material selecionado está sem preço ou sem peso de bobina.',
    });
  }
  if (!printer) {
    errors.push({ field: 'printerId', message: 'Selecione uma impressora cadastrada.' });
  }
  if (input.energyTariff <= 0) {
    errors.push({ field: 'energyTariff', message: 'Informe a tarifa de energia em R$/kWh.' });
  }
  if (input.discountRatio >= 1) {
    errors.push({ field: 'discountPercent', message: 'O desconto deve ser menor que 100%.' });
  }

  // O divisor da fórmula de preço precisa ser positivo, senão o preço tende ao
  // infinito (ou fica negativo) e o resultado deixa de ter sentido.
  const divisor = 1 - input.marginRatio - input.cardFeeRatio - input.taxRatio;
  if (divisor <= 0) {
    errors.push({
      field: 'marginPercent',
      message:
        'Margem + taxas + impostos precisam somar menos de 100%. ' +
        'Com 100% ou mais não existe preço de venda possível.',
    });
  }

  return { errors, divisor };
}

/**
 * Calcula custos, preço de venda e lucro.
 *
 * @param {object} raw          Entradas do formulário de precificação.
 * @param {object} context      { material, printer } já resolvidos pelos ids.
 * @returns {object} Resultado com `ok`, `errors`, `warnings`, `perUnit`, `batch`.
 */
export function calculatePricing(raw = {}, context = {}) {
  const base = { ...createEmptyPricingInput(), ...raw };
  const materialDoc = context.material || null;
  const printerDoc = context.printer || null;

  const input = normalizeInput(base, materialDoc, printerDoc);
  const { errors, divisor } = validate(input, materialDoc, printerDoc, base);

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
      warnings: [],
      input,
      perUnit: null,
      batch: null,
      breakdown: [],
      extraItems: [],
      formulaPrice: 0,
      suggestedPrice: 0,
      priceOverridden: false,
    };
  }

  const warnings = [];
  const { quantity } = input;

  // --- Produção, por unidade -------------------------------------------------
  const billableGrams = input.grams * (1 + input.wasteRatio);
  const material = roundCents(billableGrams * input.costPerGram);
  const energy = energyCostCents(printerDoc, input.printHours, input.energyTariff);
  const depreciation = roundCents(input.printHours * input.depreciationPerHour);
  const maintenance = roundCents(input.printHours * input.maintenancePerHour);
  const labor = roundCents(input.laborHours * input.laborRate);
  const extraItems = listExtraItems(input.extras);
  const extras = roundCents(sumExtrasPerUnit(input.extras, quantity));

  const directCost = sumCents(material, energy, depreciation, maintenance, labor, extras);
  // A reserva cobre o retrabalho de uma peça perdida: material, energia, hora de
  // máquina e a mão de obra já gasta. Por isso incide sobre o custo direto todo.
  const failureReserve = roundCents(directCost * input.failureRatio);
  const totalCost = directCost + failureReserve;

  // --- Precificação comercial ----------------------------------------------
  // A taxa fixa (ex.: tarifa fixa da maquininha) é por pedido: rateamos por peça.
  const fixedFeePerUnit = input.fixedFeeCents / quantity;

  // Margem sobre o PREÇO DE VENDA, não markup sobre o custo:
  //   preço x (1 - margem - taxas - impostos) = custo + taxas fixas
  const targetPrice = (totalCost + fixedFeePerUnit) / divisor;

  let listPrice;
  if (input.discountMode === DISCOUNT_MODE.GROSS_UP) {
    // Embute o desconto no preço de tabela para preservar a margem-alvo.
    listPrice = roundCents(targetPrice / (1 - input.discountRatio));
  } else {
    listPrice = roundCents(targetPrice);
  }

  let discount = roundCents(listPrice * input.discountRatio);
  let price = listPrice - discount;
  const formulaPrice = price;

  // O piso de venda avisa, mas não segura o preço sugerido: se prendesse o valor
  // no mínimo, reduzir a margem não mudaria o que aparece na tela.
  let minPriceApplied = false;
  if (input.minPriceCents > 0 && price < input.minPriceCents) {
    minPriceApplied = true;
  }

  let priceOverridden = false;
  if (input.priceOverrideCents > 0) {
    // O valor digitado é o que o cliente paga. Desconto e tabela da fórmula
    // deixam de se aplicar — quem cobra escolheu o número final.
    price = input.priceOverrideCents;
    listPrice = price;
    discount = 0;
    priceOverridden = true;
    minPriceApplied = input.minPriceCents > 0 && price < input.minPriceCents;
  }

  const suggestedPrice = formulaPrice;

  // --- Resultado real, medido sobre o preço efetivamente cobrado -------------
  // Taxas percentuais e impostos incidem sobre o valor recebido do cliente —
  // logo sobre o preço com desconto, nunca sobre o preço de tabela.
  const cardFee = roundCents(price * input.cardFeeRatio);
  const tax = roundCents(price * input.taxRatio);
  const fixedFee = roundCents(fixedFeePerUnit);
  const commercialCost = cardFee + tax + fixedFee;

  const profit = price - commercialCost - totalCost;
  const effectiveMargin = shareOf(profit, price);

  // Preço de equilíbrio: margem zero, cobrindo custo e taxas.
  const breakEven = roundCents((totalCost + fixedFeePerUnit) / (1 - input.cardFeeRatio - input.taxRatio));
  const minimumPrice = Math.max(breakEven, input.minPriceCents);

  // --- Avisos ---------------------------------------------------------------
  if (input.wasteMode === WASTE_MODE.INCLUDED && input.declaredWaste > 0) {
    warnings.push({
      code: 'waste-ignored',
      message:
        'O peso informado já inclui suportes e perdas, então o percentual de ' +
        'desperdício foi ignorado para não contar duas vezes.',
    });
  }
  if (minPriceApplied) {
    warnings.push({
      code: 'min-price',
      message:
        'O preço ficou abaixo do valor mínimo de venda. Edite o valor cobrado se quiser respeitar o piso.',
    });
  }
  if (input.discountRatio > 0 && input.discountMode === DISCOUNT_MODE.ABSORB) {
    warnings.push({
      code: 'discount-absorbed',
      message: 'O desconto foi absorvido pela margem: compare a margem efetiva com a desejada.',
    });
  }
  if (profit < 0) {
    warnings.push({
      code: 'negative-profit',
      message: 'O preço atual não cobre os custos: o lucro estimado está negativo.',
    });
  }
  if (input.depreciationPerHour <= 0 && printerDoc) {
    warnings.push({
      code: 'no-depreciation',
      message:
        'A impressora está sem depreciação por hora. Informe valor de aquisição e vida útil.',
    });
  }
  if (input.laborHours > 0 && input.laborRate <= 0) {
    warnings.push({
      code: 'no-labor-rate',
      message: 'Há tempo de trabalho lançado, mas o valor da hora está zerado.',
    });
  }

  const perUnit = {
    grams: input.grams,
    billableGrams,
    printHours: input.printHours,
    laborHours: input.laborHours,
    energyKwh: energyKwh(printerDoc, input.printHours),

    material,
    energy,
    depreciation,
    maintenance,
    machine: depreciation + maintenance,
    labor,
    extras,
    directCost,
    failureReserve,
    totalCost,

    listPrice,
    discount,
    price,
    cardFee,
    tax,
    fixedFee,
    commercialCost,
    profit,
    breakEven,
    minimumPrice,
  };

  const batch = Object.fromEntries(
    Object.entries(perUnit).map(([key, value]) => [key, value * quantity]),
  );

  const breakdown = COST_COMPONENTS.map((component) => ({
    ...component,
    cents: perUnit[component.key] || 0,
    share: shareOf(perUnit[component.key] || 0, totalCost),
  })).filter((item) => item.cents > 0);

  return {
    ok: true,
    errors: [],
    warnings,
    input,
    quantity,
    perUnit,
    batch,
    breakdown,
    extraItems,
    formulaPrice,
    suggestedPrice,
    effectiveMargin,
    targetMargin: input.marginRatio,
    minPriceApplied,
    priceOverridden,
  };
}
