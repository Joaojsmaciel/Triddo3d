/**
 * Fluxo de caixa: o dinheiro que de fato entrou e saiu.
 *
 * Entradas vêm de duas fontes: orçamentos aprovados (automáticas) e lançamentos
 * avulsos. Saídas são sempre lançadas à mão. Funções puras, sem estado.
 *
 * Receita é tudo o que entrou. Lucro do caixa é receita menos saídas — diferente
 * do lucro estimado do orçamento, que vem do cálculo de custos da peça.
 */

import { asCents, shareOf } from './money.js';
import { formatMonthLabel, isRealizedRevenue } from './reports.js';

export const CASH_TYPE = {
  IN: 'in',
  OUT: 'out',
};

export const CASH_SOURCE = {
  QUOTE: 'quote',
  MANUAL: 'manual',
};

export const CASH_CATEGORIES = {
  [CASH_TYPE.IN]: ['Venda avulsa', 'Serviço', 'Sinal / adiantamento', 'Outras entradas'],
  [CASH_TYPE.OUT]: [
    'Filamento e insumos',
    'Contas fixas (aluguel, internet, água)',
    'Manutenção e peças',
    'Energia',
    'Equipamentos',
    'Embalagem e frete',
    'Taxas e impostos',
    'Ferramentas e software',
    'Marketing',
    'Retirada / pró-labore',
    'Outras saídas',
  ],
};

export const QUOTE_CATEGORY = 'Orçamento aprovado';

/** Data local no formato AAAA-MM-DD. Aceita "2026-10-08", ISO completo ou Date. */
export function toDateKey(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function todayKey() {
  return toDateKey(new Date());
}

/** Junta orçamentos aprovados e lançamentos avulsos numa única lista, do mais recente ao mais antigo. */
export function buildCashEntries(quotes = [], transactions = []) {
  const fromQuotes = (Array.isArray(quotes) ? quotes : []).filter(isRealizedRevenue).map((quote) => ({
    id: `quote:${quote.id}`,
    source: CASH_SOURCE.QUOTE,
    type: CASH_TYPE.IN,
    date: toDateKey(quote.approvedAt || quote.createdAt),
    description: [quote.code, quote.projectName].filter(Boolean).join(' · '),
    category: QUOTE_CATEGORY,
    amountCents: asCents(quote.totals?.price),
    quoteId: quote.id,
    notes: quote.clientName ? `Cliente: ${quote.clientName}` : '',
  }));

  const manual = (Array.isArray(transactions) ? transactions : []).map((item) => ({
    ...item,
    source: CASH_SOURCE.MANUAL,
    date: toDateKey(item.date) || toDateKey(item.createdAt),
    amountCents: asCents(item.amountCents),
  }));

  return [...fromQuotes, ...manual]
    .filter((entry) => entry.date)
    .sort((a, b) => b.date.localeCompare(a.date) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

/** Mantém só as entradas do mês "AAAA-MM". Mês vazio devolve tudo. */
export function filterByMonth(entries = [], month = '') {
  if (!month) return entries;
  return entries.filter((entry) => entry.date.startsWith(month));
}

/** Meses com movimento, do mais recente ao mais antigo, para o filtro. */
export function availableMonths(entries = []) {
  return [...new Set(entries.map((entry) => entry.date.slice(0, 7)))]
    .sort((a, b) => b.localeCompare(a))
    .map((key) => ({ key, label: formatMonthLabel(key) }));
}

export function summarizeCash(entries = []) {
  let inCents = 0;
  let outCents = 0;
  let quoteInCents = 0;
  const outByCategory = new Map();

  entries.forEach((entry) => {
    const amount = asCents(entry.amountCents);
    if (entry.type === CASH_TYPE.IN) {
      inCents += amount;
      if (entry.source === CASH_SOURCE.QUOTE) quoteInCents += amount;
    } else {
      outCents += amount;
      const category = entry.category || 'Outras saídas';
      outByCategory.set(category, (outByCategory.get(category) || 0) + amount);
    }
  });

  const balanceCents = inCents - outCents;

  return {
    inCents,
    outCents,
    balanceCents,
    quoteInCents,
    manualInCents: inCents - quoteInCents,
    /** Quanto de cada real recebido sobrou depois das saídas. */
    margin: shareOf(balanceCents, inCents),
    outByCategory: [...outByCategory.entries()]
      .map(([category, cents]) => ({ category, cents, share: shareOf(cents, outCents) }))
      .sort((a, b) => b.cents - a.cents),
  };
}

/** Entradas, saídas e lucro do caixa mês a mês (últimos `months` meses com movimento). */
export function monthlyCashSeries(entries = [], months = 6) {
  const buckets = new Map();

  entries.forEach((entry) => {
    const key = entry.date.slice(0, 7);
    const current = buckets.get(key) || { key, inCents: 0, outCents: 0 };
    if (entry.type === CASH_TYPE.IN) current.inCents += asCents(entry.amountCents);
    else current.outCents += asCents(entry.amountCents);
    buckets.set(key, current);
  });

  return [...buckets.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-months)
    .map((item) => ({ ...item, balanceCents: item.inCents - item.outCents, label: formatMonthLabel(item.key) }));
}

export function validateTransaction(transaction) {
  const errors = {};
  if (!transaction?.description?.trim()) errors.description = 'Descreva o lançamento.';
  if (!(asCents(transaction?.amountCents) > 0)) errors.amount = 'Informe um valor maior que zero.';
  if (!toDateKey(transaction?.date)) errors.date = 'Informe a data.';
  return { valid: Object.keys(errors).length === 0, errors };
}
