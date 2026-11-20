import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MATERIAL_FIELDS,
  buildMaterialCopy,
  buildMaterialDoc,
  chunk,
  describeCloudError,
  planMaterialMerge,
  planMaterialMigration,
  settleWrite,
  toMaterialDoc,
  WRITE_STATUS,
} from '../src/data/cloudSync.js';

const NOW = new Date('2026-11-20T12:00:00.000Z');

describe('toMaterialDoc', () => {
  it('grava apenas os campos aceitos pelas regras do Firestore, sem undefined', () => {
    const material = toMaterialDoc({ id: 'mat_1', name: 'PLA', extra: 'ignorar', priceCents: 12000 });
    assert.deepEqual(Object.keys(material).sort(), [...MATERIAL_FIELDS].sort());
    assert.equal(material.extra, undefined);
    assert.ok(Object.values(material).every((value) => value !== undefined));
    assert.equal(material.id, 'mat_1');
    assert.equal(material.spoolGrams, 1000);
  });

  it('saneia o que as regras do Firestore recusariam', () => {
    const material = toMaterialDoc({
      id: 'mat_1',
      name: 'x'.repeat(300),
      brand: 42,
      priceCents: -100,
      shippingCents: Number.NaN,
      createdAt: 1700000000000,
      updatedAt: 'data inválida',
    });
    assert.equal(material.name.length, 200);
    assert.equal(material.brand, '42');
    assert.equal(material.priceCents, 0);
    assert.equal(material.shippingCents, 0);
    assert.equal(material.createdAt, new Date(1700000000000).toISOString());
    assert.match(material.updatedAt, /^\d{4}-\d{2}-\d{2}T/);
  });

  it('gera id quando o material é novo', () => {
    assert.match(toMaterialDoc({ name: 'Novo' }).id, /^mat_/);
  });
});

describe('buildMaterialDoc', () => {
  it('preserva a data de criação do registro existente e atualiza updatedAt', () => {
    const existing = toMaterialDoc({ id: 'mat_1', name: 'PLA', createdAt: '2025-01-01T00:00:00.000Z' });
    const saved = buildMaterialDoc({ id: 'mat_1', name: 'PLA Preto' }, existing, NOW);
    assert.equal(saved.createdAt, '2025-01-01T00:00:00.000Z');
    assert.equal(saved.updatedAt, NOW.toISOString());
    assert.equal(saved.name, 'PLA Preto');
  });
});

describe('buildMaterialCopy', () => {
  it('cria um novo id e novas datas', () => {
    const original = toMaterialDoc({ id: 'mat_1', name: 'PLA', createdAt: '2025-01-01T00:00:00.000Z' });
    const copy = buildMaterialCopy(original, { name: 'PLA (cópia)' }, NOW);
    assert.notEqual(copy.id, 'mat_1');
    assert.equal(copy.name, 'PLA (cópia)');
    assert.equal(copy.createdAt, NOW.toISOString());
  });
});

describe('planMaterialMigration', () => {
  const local = [toMaterialDoc({ id: 'mat_a', name: 'A' }), toMaterialDoc({ id: 'mat_b', name: 'B' })];

  it('envia os materiais locais, com os mesmos ids, quando a conta está vazia', () => {
    const plan = planMaterialMigration(local, []);
    assert.deepEqual(plan.map((item) => item.id), ['mat_a', 'mat_b']);
  });

  it('com a conta em uso, envia só o que não existe nela por id nem por nome', () => {
    const plan = planMaterialMigration(local, [{ id: 'mat_a', name: 'Outro' }, { id: 'mat_x', name: ' b ' }]);
    assert.deepEqual(plan, []);
    const onlyNew = planMaterialMigration(local, [{ id: 'mat_x', name: 'PLA Branco' }]);
    assert.deepEqual(onlyNew.map((item) => item.id), ['mat_a', 'mat_b']);
  });

  it('tolera entradas ausentes e ids repetidos', () => {
    assert.deepEqual(planMaterialMigration(null, null), []);
    assert.equal(planMaterialMigration([...local, local[0]], []).length, 2);
  });
});

describe('planMaterialMerge', () => {
  it('acrescenta só materiais cujo id ainda não existe na conta', () => {
    const plan = planMaterialMerge(
      [{ id: 'mat_a', name: 'A' }, { id: 'mat_c', name: 'C' }, { id: 'mat_c', name: 'C' }],
      [{ id: 'mat_a' }],
    );
    assert.deepEqual(plan.map((item) => item.id), ['mat_c']);
  });

  it('aceita backup sem materiais', () => {
    assert.deepEqual(planMaterialMerge(undefined, []), []);
  });
});

describe('chunk', () => {
  it('divide em lotes do tamanho pedido', () => {
    assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
    assert.deepEqual(chunk([], 2), []);
  });
});

describe('settleWrite', () => {
  it('devolve SYNCED quando o servidor confirma a tempo', async () => {
    assert.equal(await settleWrite(Promise.resolve()), WRITE_STATUS.SYNCED);
  });

  it('devolve PENDING sem travar quando não há confirmação, e repassa erro tardio', async () => {
    let reject;
    const never = new Promise((_, rej) => {
      reject = rej;
    });
    const late = [];
    const status = await settleWrite(never, { timeoutMs: 10, onLateError: (error) => late.push(error.code) });
    assert.equal(status, WRITE_STATUS.PENDING);
    reject({ code: 'permission-denied' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.deepEqual(late, ['permission-denied']);
  });

  it('propaga erro que chega antes do prazo', async () => {
    await assert.rejects(settleWrite(Promise.reject(new Error('falhou'))), /falhou/);
  });
});

describe('describeCloudError', () => {
  it('explica permissão negada e falta de conexão', () => {
    assert.match(describeCloudError({ code: 'permission-denied' }), /regras/);
    assert.match(describeCloudError({ code: 'unavailable' }), /conexão/);
    assert.equal(describeCloudError({ message: 'x' }), 'x');
  });
});

describe('migração completa do navegador para a conta', () => {
  it('conta vazia: sobe todas as coleções e as configurações locais, mantendo os ids', async () => {
    const { planStateMigration } = await import('../src/data/cloudSync.js');
    const local = {
      settings: { marginPercent: 45, company: { name: 'Minha loja' } },
      materials: [{ id: 'mat_a', name: 'PLA' }],
      printers: [{ id: 'prn_a', brand: 'Creality', model: 'Ender 3 V3 SE' }],
      quotes: [{ id: 'qte_a', code: 'ORC-2026-0001', materialId: 'mat_a', printerId: 'prn_a' }],
      transactions: [{ id: 'cx_a', description: 'Filamento', amountCents: 9900 }],
    };
    const plan = planStateMigration(local, { settings: null });
    assert.equal(plan.total, 4);
    assert.equal(plan.collections.quotes[0].materialId, 'mat_a');
    assert.equal(plan.collections.quotes[0].printerId, 'prn_a');
    assert.equal(plan.settings.marginPercent, 45);
    assert.equal(plan.settings.company.name, 'Minha loja');
    // Campos padrão da empresa continuam presentes.
    assert.equal(typeof plan.settings.company.quoteValidityDays, 'number');
  });

  it('conta em uso: não duplica a impressora de exemplo nem sobrescreve as configurações', async () => {
    const { planStateMigration } = await import('../src/data/cloudSync.js');
    const plan = planStateMigration(
      {
        settings: { marginPercent: 10 },
        printers: [{ id: 'prn_novo', brand: 'Creality', model: 'Ender 3 V3 SE' }],
        quotes: [{ id: 'qte_b', code: 'ORC-2026-0002' }],
      },
      {
        settings: { marginPercent: 30 },
        printers: [{ id: 'prn_x', brand: 'creality', model: 'ender 3 v3 se' }],
        quotes: [{ id: 'qte_a' }],
      },
    );
    assert.deepEqual(plan.collections.printers, []);
    assert.deepEqual(plan.collections.quotes.map((item) => item.id), ['qte_b']);
    assert.equal(plan.settings, null);
  });

  it('documentos gerais não levam undefined nem NaN para o Firestore', async () => {
    const { toCloudDoc } = await import('../src/data/cloudSync.js');
    const quote = toCloudDoc('quotes', { id: 'qte_1', totals: { price: Number.NaN, extra: undefined } });
    assert.equal(quote.totals.price, null);
    assert.equal('extra' in quote.totals, false);
    assert.throws(() => toCloudDoc('desconhecida', {}), /Coleção desconhecida/);
  });

  it('countLocalRecords soma os registros de todas as coleções', async () => {
    const { countLocalRecords } = await import('../src/data/cloudSync.js');
    assert.equal(countLocalRecords({ materials: [{}], quotes: [{}, {}] }), 3);
    assert.equal(countLocalRecords({}), 0);
  });
});
