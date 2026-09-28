import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { BACKUP_FORMAT, backupFileName, buildBackup, validateBackup } from '../src/data/backup.js';
import { COLLECTIONS, createInitialState, nextQuoteCode, migrateState } from '../src/data/schema.js';

describe('buildBackup', () => {
  it('embala o estado com formato e versão', () => {
    const backup = buildBackup(createInitialState());

    assert.equal(backup.format, BACKUP_FORMAT);
    assert.equal(backup.schemaVersion, 1);
    assert.ok(backup.exportedAt);
    assert.equal(backup[COLLECTIONS.PRINTERS].length, 1);
  });
});

describe('backupFileName', () => {
  it('gera nome de arquivo seguro com data', () => {
    const name = backupFileName(new Date('2026-03-10T14:25:36.000Z'));
    assert.equal(name, 'triddo3d-backup-2026-03-10-14-25-36.json');
    assert.ok(!/[:]/.test(name));
  });
});

describe('validateBackup', () => {
  it('aceita um backup gerado pelo próprio sistema', () => {
    const result = validateBackup(JSON.stringify(buildBackup(createInitialState())));

    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
    assert.equal(result.counts[COLLECTIONS.MATERIALS], 1);
    assert.equal(result.counts[COLLECTIONS.PRINTERS], 1);
  });

  it('recusa JSON malformado', () => {
    const result = validateBackup('{ isso não é json }');
    assert.equal(result.valid, false);
    assert.equal(result.data, null);
    assert.match(result.errors[0], /JSON/);
  });

  it('recusa formato de outro programa', () => {
    const result = validateBackup({ format: 'outro-app', materials: [] });
    assert.equal(result.valid, false);
  });

  it('recusa backup de versão futura', () => {
    const result = validateBackup({ format: BACKUP_FORMAT, schemaVersion: 99, materials: [{ id: 'a' }] });
    assert.equal(result.valid, false);
    assert.match(result.errors.join(' '), /versão mais nova/);
  });

  it('recusa coleção que não é lista', () => {
    const result = validateBackup({ format: BACKUP_FORMAT, materials: { id: 'a' } });
    assert.equal(result.valid, false);
  });

  it('recusa arquivo vazio', () => {
    const result = validateBackup({ format: BACKUP_FORMAT });
    assert.equal(result.valid, false);
    assert.match(result.errors.join(' '), /vazio/);
  });

  it('avisa sobre formato ausente sem bloquear', () => {
    const result = validateBackup({ materials: [{ id: 'a', name: 'PLA' }] });
    assert.equal(result.valid, true);
    assert.ok(result.warnings.some((warning) => /não identifica o formato/.test(warning)));
  });

  it('avisa sobre identificadores repetidos', () => {
    const result = validateBackup({
      format: BACKUP_FORMAT,
      materials: [{ id: 'dup', name: 'A' }, { id: 'dup', name: 'B' }],
    });
    assert.ok(result.warnings.some((warning) => /repetidos/.test(warning)));
  });

  it('recusa entradas que não são objeto', () => {
    assert.equal(validateBackup('[]').valid, false);
    assert.equal(validateBackup(42).valid, false);
    assert.equal(validateBackup(null).valid, false);
  });
});

describe('nextQuoteCode', () => {
  const date = new Date('2026-03-10T12:00:00.000Z');

  it('começa em 0001', () => {
    assert.equal(nextQuoteCode([], date), 'ORC-2026-0001');
  });

  it('continua a partir do maior código do ano', () => {
    const quotes = [{ code: 'ORC-2026-0001' }, { code: 'ORC-2026-0007' }, { code: 'ORC-2026-0003' }];
    assert.equal(nextQuoteCode(quotes, date), 'ORC-2026-0008');
  });

  it('ignora códigos de outros anos', () => {
    assert.equal(nextQuoteCode([{ code: 'ORC-2025-0042' }], date), 'ORC-2026-0001');
  });

  it('ignora códigos inválidos', () => {
    assert.equal(nextQuoteCode([{ code: 'ORC-2026-abc' }, { code: '' }, {}], date), 'ORC-2026-0001');
  });
});

describe('migrateState', () => {
  it('cria estado inicial com a Ender 3 V3 SE quando não há nada salvo', () => {
    const state = migrateState(null, { get: () => null });
    const printer = state[COLLECTIONS.PRINTERS][0];

    assert.equal(printer.brand, 'Creality');
    assert.equal(printer.model, 'Ender 3 V3 SE');
    assert.equal(printer.powerWatts, 110);
    assert.ok(printer.lifetimeHours > 0);
  });

  it('importa filamentos gravados pela versão anterior', () => {
    const legacy = JSON.stringify([
      { name: 'PLA Antigo', type: 'PETG', price: 99.9, weight: 1000, colors: ['#123456'] },
    ]);
    const state = migrateState(null, { get: (key) => (key === 'triddo_filaments' ? legacy : null) });

    const imported = state[COLLECTIONS.MATERIALS].find((item) => item.name === 'PLA Antigo');
    assert.ok(imported, 'o filamento antigo deveria ter sido importado');
    assert.equal(imported.priceCents, 9990);
    assert.equal(imported.type, 'PETG');
    assert.equal(imported.spoolGrams, 1000);
    // A versão antiga guardava a cor em hexadecimal; ela vira a amostra visual.
    assert.equal(imported.colorHex, '#123456');
  });

  it('ignora dados legados corrompidos', () => {
    const state = migrateState(null, { get: () => 'não é json' });
    assert.equal(state[COLLECTIONS.MATERIALS].length, 1); // apenas o material inicial
  });

  it('preserva configurações salvas e completa as ausentes', () => {
    const state = migrateState(
      { settings: { energyTariff: 1.25, company: { name: 'Minha Loja' } }, materials: [], printers: [], quotes: [] },
      { get: () => null },
    );

    assert.equal(state.settings.energyTariff, 1.25);
    assert.equal(state.settings.company.name, 'Minha Loja');
    assert.equal(state.settings.company.tagline, 'Print and Design 3D');
    assert.ok(state.settings.marginPercent > 0);
  });

  it('mantém coleções vazias quando o estado salvo as declara vazias', () => {
    const state = migrateState({ materials: [], printers: [], quotes: [] }, { get: () => null });
    assert.deepEqual(state[COLLECTIONS.MATERIALS], []);
    assert.deepEqual(state[COLLECTIONS.PRINTERS], []);
  });
});
