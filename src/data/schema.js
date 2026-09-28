/**
 * Formato dos dados, valores iniciais e migrações.
 *
 * Nenhum número financeiro daqui é fixo no cálculo: tudo o que aparece abaixo é
 * apenas o valor inicial de um campo editável em Configurações.
 */

import { asCents, parseDecimal, toCents } from '../core/money.js';
import { DISCOUNT_MODE, WASTE_MODE } from '../core/pricing.js';
import { DEPRECIATION_MODE } from '../core/printers.js';
import { QUOTE_STATUS } from '../core/reports.js';

export const SCHEMA_VERSION = 1;
export const STATE_KEY = 'triddo3d:v1:state';
/** Chave usada pela versão anterior em JavaScript puro, importada na migração. */
export const LEGACY_FILAMENTS_KEY = 'triddo_filaments';

export const COLLECTIONS = {
  MATERIALS: 'materials',
  PRINTERS: 'printers',
  QUOTES: 'quotes',
};

export function createId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultSettings() {
  return {
    // Operação
    energyTariff: 0.857, // R$/kWh
    laborRateCents: 2500, // R$ 25,00 por hora de trabalho
    failureReservePercent: 5,

    // Comercial
    marginPercent: 30,
    cardFeePercent: 0,
    taxPercent: 0,
    fixedFeeCents: 0,
    discountMode: DISCOUNT_MODE.ABSORB,
    minPriceCents: 1500, // R$ 15,00

    // Padrões da precificação
    wasteMode: WASTE_MODE.ADD,
    wastePercent: 0,

    // Identidade usada no PDF do cliente
    company: {
      name: 'TRIDDO 3D',
      tagline: 'Print and Design 3D',
      document: '',
      phone: '',
      email: '',
      website: 'triddo.com.br',
      address: '',
      quoteValidityDays: 7,
      quoteFooter: 'Orçamento sujeito a alteração após o prazo de validade.',
    },
  };
}

export function createMaterial(patch = {}) {
  return {
    id: patch.id || createId('mat'),
    brand: patch.brand ?? '',
    name: patch.name ?? '',
    type: patch.type ?? 'PLA',
    /** Nome da cor ("Branco fosco") e amostra em hexadecimal para a interface. */
    color: patch.color ?? '',
    colorHex: patch.colorHex ?? '#4C7DFF',
    spoolGrams: parseDecimal(patch.spoolGrams, 1000),
    priceCents: asCents(patch.priceCents, 0),
    shippingCents: asCents(patch.shippingCents, 0),
    notes: patch.notes ?? '',
    createdAt: patch.createdAt || new Date().toISOString(),
    updatedAt: patch.updatedAt || new Date().toISOString(),
  };
}

export function createPrinter(patch = {}) {
  return {
    id: patch.id || createId('prn'),
    brand: patch.brand ?? '',
    model: patch.model ?? '',
    purchaseCents: asCents(patch.purchaseCents, 0),
    residualCents: asCents(patch.residualCents, 0),
    powerWatts: parseDecimal(patch.powerWatts, 0),
    lifetimeHours: parseDecimal(patch.lifetimeHours, 0),
    maintenancePerHourCents: asCents(patch.maintenancePerHourCents, 0),
    depreciationMode: patch.depreciationMode === DEPRECIATION_MODE.MANUAL
      ? DEPRECIATION_MODE.MANUAL
      : DEPRECIATION_MODE.AUTO,
    depreciationPerHourCents: asCents(patch.depreciationPerHourCents, 0),
    notes: patch.notes ?? '',
    createdAt: patch.createdAt || new Date().toISOString(),
    updatedAt: patch.updatedAt || new Date().toISOString(),
  };
}

export function createQuote(patch = {}) {
  return {
    id: patch.id || createId('qte'),
    code: patch.code ?? '',
    projectName: patch.projectName ?? '',
    clientName: patch.clientName ?? '',
    status: Object.values(QUOTE_STATUS).includes(patch.status) ? patch.status : QUOTE_STATUS.DRAFT,
    quantity: Math.max(1, Math.trunc(parseDecimal(patch.quantity, 1))),

    materialId: patch.materialId ?? '',
    materialName: patch.materialName ?? '',
    printerId: patch.printerId ?? '',
    printerName: patch.printerName ?? '',

    /** Entradas completas do formulário, para reabrir e editar o orçamento. */
    input: patch.input ?? null,
    /** Resultado por peça, congelado no momento em que o orçamento foi salvo. */
    unit: patch.unit ?? null,
    /** Resultado do lote (peça x quantidade). */
    totals: patch.totals ?? null,
    marginPercent: parseDecimal(patch.marginPercent, 0),
    effectiveMargin: parseDecimal(patch.effectiveMargin, 0),

    notes: patch.notes ?? '',
    createdAt: patch.createdAt || new Date().toISOString(),
    updatedAt: patch.updatedAt || new Date().toISOString(),
  };
}

/** Estado inicial de uma instalação nova, com a Ender 3 V3 SE já cadastrada. */
export function createInitialState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: defaultSettings(),
    [COLLECTIONS.MATERIALS]: [
      createMaterial({
        brand: 'Genérico',
        name: 'PLA Branco',
        type: 'PLA',
        color: 'Branco',
        colorHex: '#F5F5F5',
        spoolGrams: 1000,
        priceCents: toCents(120),
        shippingCents: toCents(20),
      }),
    ],
    [COLLECTIONS.PRINTERS]: [
      createPrinter({
        brand: 'Creality',
        model: 'Ender 3 V3 SE',
        purchaseCents: toCents(1399),
        residualCents: 0,
        powerWatts: 110,
        lifetimeHours: 5000,
        maintenancePerHourCents: toCents(0.3),
        depreciationMode: DEPRECIATION_MODE.AUTO,
        notes: 'Valores iniciais estimados — ajuste conforme sua nota fiscal e uso real.',
      }),
    ],
    [COLLECTIONS.QUOTES]: [],
  };
}

/**
 * Gera o próximo identificador de orçamento no formato ORC-AAAA-0001.
 * Lê os códigos existentes em vez de manter um contador, para que importar um
 * backup não provoque numeração repetida.
 */
export function nextQuoteCode(quotes = [], date = new Date()) {
  const year = date.getFullYear();
  const prefix = `ORC-${year}-`;

  const highest = (Array.isArray(quotes) ? quotes : []).reduce((max, quote) => {
    const code = String(quote?.code || '');
    if (!code.startsWith(prefix)) return max;
    const sequence = Number.parseInt(code.slice(prefix.length), 10);
    return Number.isFinite(sequence) && sequence > max ? sequence : max;
  }, 0);

  return `${prefix}${String(highest + 1).padStart(4, '0')}`;
}

/** Lê filamentos gravados pela versão anterior em JavaScript puro. */
function readLegacyFilaments(driver) {
  try {
    const raw = driver.get(LEGACY_FILAMENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && item.name)
      .map((item) =>
        createMaterial({
          name: item.name,
          type: item.type || 'PLA',
          colorHex: Array.isArray(item.colors) ? item.colors[0] : item.color,
          spoolGrams: parseDecimal(item.weight, 1000),
          priceCents: toCents(item.price),
          shippingCents: 0,
          notes: 'Importado da versão anterior da calculadora.',
        }),
      );
  } catch {
    return [];
  }
}

/**
 * Leva um estado gravado até o formato atual. Recebe o driver para poder puxar
 * dados da versão antiga na primeira execução.
 */
export function migrateState(stored, driver) {
  if (!stored || typeof stored !== 'object') {
    const initial = createInitialState();
    const legacy = driver ? readLegacyFilaments(driver) : [];
    if (legacy.length > 0) {
      initial[COLLECTIONS.MATERIALS] = [...legacy, ...initial[COLLECTIONS.MATERIALS]];
    }
    return initial;
  }

  const base = createInitialState();

  return {
    schemaVersion: SCHEMA_VERSION,
    settings: {
      ...base.settings,
      ...(stored.settings || {}),
      company: { ...base.settings.company, ...(stored.settings?.company || {}) },
    },
    [COLLECTIONS.MATERIALS]: Array.isArray(stored[COLLECTIONS.MATERIALS])
      ? stored[COLLECTIONS.MATERIALS].map(createMaterial)
      : base[COLLECTIONS.MATERIALS],
    [COLLECTIONS.PRINTERS]: Array.isArray(stored[COLLECTIONS.PRINTERS])
      ? stored[COLLECTIONS.PRINTERS].map(createPrinter)
      : base[COLLECTIONS.PRINTERS],
    [COLLECTIONS.QUOTES]: Array.isArray(stored[COLLECTIONS.QUOTES])
      ? stored[COLLECTIONS.QUOTES].map(createQuote)
      : [],
  };
}
