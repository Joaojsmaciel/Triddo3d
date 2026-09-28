/**
 * Agregações do dashboard. Funções puras sobre a lista de orçamentos.
 */

import { asCents, shareOf } from './money.js';

export const QUOTE_STATUS = {
  DRAFT: 'draft',
  SENT: 'sent',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const QUOTE_STATUS_LABELS = {
  [QUOTE_STATUS.DRAFT]: 'Rascunho',
  [QUOTE_STATUS.SENT]: 'Enviado',
  [QUOTE_STATUS.APPROVED]: 'Aprovado',
  [QUOTE_STATUS.REJECTED]: 'Recusado',
};

/** Só orçamento aprovado é receita realizada. Pendente não entra no faturamento. */
export function isRealizedRevenue(quote) {
  return quote?.status === QUOTE_STATUS.APPROVED;
}

function monthKey(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonthLabel(key) {
  if (!key) return '';
  const [year, month] = key.split('-');
  const names = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${names[Number(month) - 1] || ''}/${String(year).slice(2)}`;
}

/**
 * Indicadores do painel. Receita, custo e lucro consideram apenas os aprovados;
 * o pipeline soma rascunhos e enviados separadamente.
 */
export function summarizeQuotes(quotes = []) {
  const list = Array.isArray(quotes) ? quotes : [];

  const byStatus = {
    [QUOTE_STATUS.DRAFT]: 0,
    [QUOTE_STATUS.SENT]: 0,
    [QUOTE_STATUS.APPROVED]: 0,
    [QUOTE_STATUS.REJECTED]: 0,
  };

  let revenueCents = 0;
  let costCents = 0;
  let profitCents = 0;
  let pipelineCents = 0;
  let unitsSold = 0;
  let gramsUsed = 0;
  let printHours = 0;

  list.forEach((quote) => {
    const status = quote?.status in byStatus ? quote.status : QUOTE_STATUS.DRAFT;
    byStatus[status] += 1;

    const total = asCents(quote?.totals?.price);

    if (isRealizedRevenue(quote)) {
      revenueCents += total;
      costCents += asCents(quote?.totals?.totalCost);
      profitCents += asCents(quote?.totals?.profit);
      unitsSold += Number(quote?.quantity) || 0;
      gramsUsed += Number(quote?.totals?.billableGrams) || 0;
      printHours += Number(quote?.totals?.printHours) || 0;
    } else if (status === QUOTE_STATUS.DRAFT || status === QUOTE_STATUS.SENT) {
      pipelineCents += total;
    }
  });

  const approved = byStatus[QUOTE_STATUS.APPROVED];
  const decided = approved + byStatus[QUOTE_STATUS.REJECTED];

  return {
    total: list.length,
    byStatus,
    approved,
    revenueCents,
    costCents,
    profitCents,
    pipelineCents,
    unitsSold,
    gramsUsed,
    printHours,
    averageMargin: shareOf(profitCents, revenueCents),
    averageTicketCents: approved > 0 ? Math.round(revenueCents / approved) : 0,
    conversionRate: shareOf(approved, decided),
  };
}

/** Ranking dos materiais mais usados, por gramas consumidas em orçamentos aprovados. */
export function topMaterials(quotes = [], limit = 5) {
  const totals = new Map();

  (Array.isArray(quotes) ? quotes : []).forEach((quote) => {
    if (!isRealizedRevenue(quote)) return;
    const name = quote?.materialName || 'Não informado';
    const current = totals.get(name) || { name, grams: 0, quotes: 0, revenueCents: 0 };
    current.grams += Number(quote?.totals?.billableGrams) || 0;
    current.quotes += 1;
    current.revenueCents += asCents(quote?.totals?.price);
    totals.set(name, current);
  });

  const list = [...totals.values()].sort((a, b) => b.grams - a.grams);
  const maxGrams = list[0]?.grams || 0;

  return list.slice(0, limit).map((item) => ({ ...item, share: shareOf(item.grams, maxGrams) }));
}

/**
 * Série mensal dos últimos meses com receita, custo e lucro dos aprovados.
 * Retorna vazio quando não há dados suficientes para um gráfico honesto.
 */
export function monthlySeries(quotes = [], months = 6) {
  const buckets = new Map();

  (Array.isArray(quotes) ? quotes : []).forEach((quote) => {
    if (!isRealizedRevenue(quote)) return;
    const key = monthKey(quote?.createdAt);
    if (!key) return;

    const current = buckets.get(key) || { key, revenueCents: 0, costCents: 0, profitCents: 0, count: 0 };
    current.revenueCents += asCents(quote?.totals?.price);
    current.costCents += asCents(quote?.totals?.totalCost);
    current.profitCents += asCents(quote?.totals?.profit);
    current.count += 1;
    buckets.set(key, current);
  });

  return [...buckets.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .slice(-months)
    .map((item) => ({ ...item, label: formatMonthLabel(item.key) }));
}
