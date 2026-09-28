import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  QUOTE_STATUS,
  isRealizedRevenue,
  monthlySeries,
  summarizeQuotes,
  topMaterials,
} from '../src/core/reports.js';

function quote(overrides = {}) {
  return {
    id: 'q-1',
    projectName: 'Peça',
    status: QUOTE_STATUS.APPROVED,
    quantity: 1,
    materialName: 'PLA Branco',
    createdAt: '2026-03-10T12:00:00.000Z',
    totals: { price: 10000, totalCost: 6000, profit: 4000, billableGrams: 100, printHours: 5 },
    ...overrides,
  };
}

describe('summarizeQuotes', () => {
  it('conta orçamentos por status', () => {
    const summary = summarizeQuotes([
      quote({ id: 'a', status: QUOTE_STATUS.DRAFT }),
      quote({ id: 'b', status: QUOTE_STATUS.SENT }),
      quote({ id: 'c', status: QUOTE_STATUS.APPROVED }),
      quote({ id: 'd', status: QUOTE_STATUS.REJECTED }),
    ]);

    assert.equal(summary.total, 4);
    assert.equal(summary.approved, 1);
    assert.equal(summary.byStatus[QUOTE_STATUS.DRAFT], 1);
    assert.equal(summary.byStatus[QUOTE_STATUS.REJECTED], 1);
  });

  it('não conta orçamento pendente como receita realizada', () => {
    const summary = summarizeQuotes([
      quote({ id: 'a', status: QUOTE_STATUS.APPROVED }),
      quote({ id: 'b', status: QUOTE_STATUS.SENT }),
      quote({ id: 'c', status: QUOTE_STATUS.DRAFT }),
      quote({ id: 'd', status: QUOTE_STATUS.REJECTED }),
    ]);

    assert.equal(summary.revenueCents, 10000); // só o aprovado
    assert.equal(summary.costCents, 6000);
    assert.equal(summary.profitCents, 4000);
    assert.equal(summary.pipelineCents, 20000); // rascunho + enviado
  });

  it('não soma orçamento recusado ao pipeline', () => {
    const summary = summarizeQuotes([quote({ status: QUOTE_STATUS.REJECTED })]);
    assert.equal(summary.revenueCents, 0);
    assert.equal(summary.pipelineCents, 0);
  });

  it('calcula margem média, ticket médio e conversão', () => {
    const summary = summarizeQuotes([
      quote({ id: 'a', status: QUOTE_STATUS.APPROVED }),
      quote({ id: 'b', status: QUOTE_STATUS.APPROVED }),
      quote({ id: 'c', status: QUOTE_STATUS.REJECTED }),
    ]);

    assert.equal(summary.averageMargin, 0.4);
    assert.equal(summary.averageTicketCents, 10000);
    assert.ok(Math.abs(summary.conversionRate - 2 / 3) < 1e-9);
  });

  it('não divide por zero com lista vazia', () => {
    const summary = summarizeQuotes([]);
    assert.equal(summary.total, 0);
    assert.equal(summary.averageMargin, 0);
    assert.equal(summary.averageTicketCents, 0);
    assert.equal(summary.conversionRate, 0);
  });

  it('soma quantidade, gramas e horas dos aprovados', () => {
    const summary = summarizeQuotes([
      quote({ id: 'a', quantity: 3 }),
      quote({ id: 'b', quantity: 2, status: QUOTE_STATUS.SENT }),
    ]);

    assert.equal(summary.unitsSold, 3);
    assert.equal(summary.gramsUsed, 100);
    assert.equal(summary.printHours, 5);
  });
});

describe('isRealizedRevenue', () => {
  it('só aceita aprovados', () => {
    assert.equal(isRealizedRevenue({ status: QUOTE_STATUS.APPROVED }), true);
    assert.equal(isRealizedRevenue({ status: QUOTE_STATUS.SENT }), false);
    assert.equal(isRealizedRevenue(undefined), false);
  });
});

describe('topMaterials', () => {
  it('ordena por gramas consumidas nos aprovados', () => {
    const ranking = topMaterials([
      quote({ id: 'a', materialName: 'PLA Branco' }),
      quote({ id: 'b', materialName: 'PETG Preto', totals: { ...quote().totals, billableGrams: 300 } }),
      quote({ id: 'c', materialName: 'PLA Branco' }),
      quote({ id: 'd', materialName: 'TPU', status: QUOTE_STATUS.DRAFT }),
    ]);

    assert.equal(ranking[0].name, 'PETG Preto');
    assert.equal(ranking[0].grams, 300);
    assert.equal(ranking[0].share, 1);
    assert.equal(ranking[1].name, 'PLA Branco');
    assert.equal(ranking[1].quotes, 2);
    // O TPU está em rascunho e não deve aparecer no consumo realizado.
    assert.equal(ranking.length, 2);
  });

  it('respeita o limite pedido', () => {
    const many = Array.from({ length: 8 }, (_, index) =>
      quote({ id: `q-${index}`, materialName: `Material ${index}` }),
    );
    assert.equal(topMaterials(many, 3).length, 3);
  });

  it('devolve lista vazia sem aprovados', () => {
    assert.deepEqual(topMaterials([quote({ status: QUOTE_STATUS.SENT })]), []);
  });
});

describe('monthlySeries', () => {
  it('agrupa aprovados por mês em ordem cronológica', () => {
    const series = monthlySeries([
      quote({ id: 'a', createdAt: '2026-01-15T10:00:00.000Z' }),
      quote({ id: 'b', createdAt: '2026-02-20T10:00:00.000Z' }),
      quote({ id: 'c', createdAt: '2026-02-25T10:00:00.000Z' }),
    ]);

    assert.equal(series.length, 2);
    assert.equal(series[0].key, '2026-01');
    assert.equal(series[1].count, 2);
    assert.equal(series[1].revenueCents, 20000);
    assert.ok(series[1].label.startsWith('fev'));
  });

  it('mantém apenas os últimos meses pedidos', () => {
    const series = monthlySeries(
      Array.from({ length: 10 }, (_, index) =>
        quote({ id: `q-${index}`, createdAt: `2026-${String(index + 1).padStart(2, '0')}-01T10:00:00.000Z` }),
      ),
      3,
    );
    assert.equal(series.length, 3);
  });

  it('ignora datas inválidas e não aprovados', () => {
    const series = monthlySeries([
      quote({ id: 'a', createdAt: 'data-invalida' }),
      quote({ id: 'b', status: QUOTE_STATUS.DRAFT }),
    ]);
    assert.deepEqual(series, []);
  });
});
