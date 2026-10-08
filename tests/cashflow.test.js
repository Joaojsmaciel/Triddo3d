import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CASH_SOURCE,
  CASH_TYPE,
  availableMonths,
  buildCashEntries,
  filterByMonth,
  monthlyCashSeries,
  summarizeCash,
  toDateKey,
  validateTransaction,
} from '../src/core/cashflow.js';
import { QUOTE_STATUS } from '../src/core/reports.js';
import { createTransaction, migrateState, COLLECTIONS } from '../src/data/schema.js';

const quote = (overrides = {}) => ({
  id: 'qte_1',
  code: 'ORC-2026-0001',
  projectName: 'Vaso',
  status: QUOTE_STATUS.APPROVED,
  createdAt: '2026-09-01T10:00:00',
  approvedAt: '2026-09-03T10:00:00',
  totals: { price: 10000 },
  ...overrides,
});

const tx = (overrides = {}) =>
  createTransaction({ type: CASH_TYPE.OUT, date: '2026-09-10', description: 'PLA', amountCents: 3000, ...overrides });

describe('fluxo de caixa', () => {
  it('converte datas para AAAA-MM-DD', () => {
    assert.equal(toDateKey('2026-10-08'), '2026-10-08');
    assert.equal(toDateKey('2026-10-08T15:00:00'), '2026-10-08');
    assert.equal(toDateKey('lixo'), null);
  });

  it('só orçamentos aprovados entram, na data da aprovação', () => {
    const entries = buildCashEntries(
      [quote(), quote({ id: 'qte_2', status: QUOTE_STATUS.SENT })],
      [],
    );
    assert.equal(entries.length, 1);
    assert.equal(entries[0].source, CASH_SOURCE.QUOTE);
    assert.equal(entries[0].type, CASH_TYPE.IN);
    assert.equal(entries[0].date, '2026-09-03');
    assert.equal(entries[0].amountCents, 10000);
  });

  it('usa a data de criação quando o orçamento não tem data de aprovação', () => {
    const [entry] = buildCashEntries([quote({ approvedAt: null })], []);
    assert.equal(entry.date, '2026-09-01');
  });

  it('separa receita de lucro do caixa', () => {
    const entries = buildCashEntries(
      [quote()],
      [tx(), tx({ id: 'cx_2', type: CASH_TYPE.IN, description: 'Avulso', amountCents: 2000, category: 'Serviço' })],
    );
    const summary = summarizeCash(entries);
    assert.equal(summary.inCents, 12000);
    assert.equal(summary.quoteInCents, 10000);
    assert.equal(summary.manualInCents, 2000);
    assert.equal(summary.outCents, 3000);
    assert.equal(summary.balanceCents, 9000);
    assert.equal(summary.margin, 0.75);
  });

  it('agrupa saídas por categoria, da maior para a menor', () => {
    const summary = summarizeCash(
      buildCashEntries([], [
        tx({ category: 'Energia', amountCents: 1000 }),
        tx({ id: 'cx_2', category: 'Filamento e insumos', amountCents: 3000 }),
      ]),
    );
    assert.deepEqual(
      summary.outByCategory.map((item) => [item.category, item.cents, item.share]),
      [
        ['Filamento e insumos', 3000, 0.75],
        ['Energia', 1000, 0.25],
      ],
    );
  });

  it('filtra por mês e lista os meses com movimento', () => {
    const entries = buildCashEntries([quote()], [tx({ date: '2026-10-02' })]);
    assert.deepEqual(availableMonths(entries).map((item) => item.key), ['2026-10', '2026-09']);
    assert.equal(filterByMonth(entries, '2026-10').length, 1);
    assert.equal(filterByMonth(entries, '').length, 2);
  });

  it('monta a série mensal com lucro negativo quando as saídas superam a receita', () => {
    const series = monthlyCashSeries(
      buildCashEntries([quote()], [tx({ date: '2026-10-02', amountCents: 5000 })]),
    );
    assert.deepEqual(
      series.map((item) => [item.key, item.inCents, item.outCents, item.balanceCents]),
      [
        ['2026-09', 10000, 0, 10000],
        ['2026-10', 0, 5000, -5000],
      ],
    );
  });

  it('valida descrição, valor e data', () => {
    const { valid, errors } = validateTransaction({ description: ' ', amountCents: 0, date: '' });
    assert.equal(valid, false);
    assert.deepEqual(Object.keys(errors).sort(), ['amount', 'date', 'description']);
    assert.equal(validateTransaction(tx()).valid, true);
  });

  it('lançamento nunca guarda valor negativo e tipo inválido vira saída', () => {
    const item = createTransaction({ type: 'xyz', amountCents: -500 });
    assert.equal(item.type, CASH_TYPE.OUT);
    assert.equal(item.amountCents, 500);
  });

  it('migra estado antigo sem lançamentos para lista vazia', () => {
    const state = migrateState({ quotes: [] });
    assert.deepEqual(state[COLLECTIONS.TRANSACTIONS], []);
  });
});
