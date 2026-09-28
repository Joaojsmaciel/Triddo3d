import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { filamentToMaterial, planFilamentImport } from '../src/features/materials/firebaseImport.js';
import { costPerGramReais } from '../src/core/materials.js';

/**
 * Filamentos reais gravados no Firestore pela versão anterior, com os valores
 * de custo por grama que a calculadora antiga exibia.
 */
const FIRESTORE_FILAMENTS = [
  { name: 'petg masterprit', type: 'PETG', price: 99, weight: 1000, colors: ['#ffffff'], expected: 0.099 },
  { name: 'PLA preto', type: 'PLA', price: 115, weight: 1000, colors: ['#000000'], expected: 0.115 },
  { name: 'pla branco volt3d', type: 'PLA', price: 95, weight: 1000, colors: ['#ffffff'], expected: 0.095 },
  { name: 'PETG masterprint', type: 'PETG', price: 83.49, weight: 1000, colors: ['#ffffff'], expected: 0.08349 },
  { name: 'branco solenyn', type: 'PLA', price: 100, weight: 1000, colors: ['#ffffff'], expected: 0.1 },
  { name: 'verde e preto', type: 'PLA', price: 107, weight: 1000, colors: ['#116f20', '#000000'], expected: 0.107 },
  { name: 'PLA roxo', type: 'PLA', price: 109, weight: 1000, colors: ['#7747e6'], expected: 0.109 },
  { name: 'PLA', type: 'PLA', price: 107.98, weight: 1000, colors: ['#000000'], expected: 0.10798 },
];

describe('filamentToMaterial', () => {
  it('preserva o custo por grama de cada filamento existente', () => {
    FIRESTORE_FILAMENTS.forEach((filament) => {
      const material = filamentToMaterial(filament);
      assert.ok(
        Math.abs(costPerGramReais(material) - filament.expected) < 1e-9,
        `${filament.name}: esperado ${filament.expected}, recebido ${costPerGramReais(material)}`,
      );
    });
  });

  it('converte preço em centavos inteiros', () => {
    assert.equal(filamentToMaterial({ name: 'x', price: 83.49, weight: 1000 }).priceCents, 8349);
    assert.equal(filamentToMaterial({ name: 'x', price: 107.98, weight: 1000 }).priceCents, 10798);
  });

  it('usa a primeira cor da lista como amostra', () => {
    const material = filamentToMaterial({ name: 'x', colors: ['#116f20', '#000000'] });
    assert.equal(material.colorHex, '#116f20');
  });

  it('zera o frete, que não existia na versão anterior', () => {
    assert.equal(filamentToMaterial(FIRESTORE_FILAMENTS[0]).shippingCents, 0);
    assert.match(filamentToMaterial(FIRESTORE_FILAMENTS[0]).notes, /frete/i);
  });

  it('assume bobina de 1 kg quando o peso está ausente ou zerado', () => {
    assert.equal(filamentToMaterial({ name: 'x', price: 100 }).spoolGrams, 1000);
    assert.equal(filamentToMaterial({ name: 'x', price: 100, weight: 0 }).spoolGrams, 1000);
  });

  it('mantém o tipo e cai em PLA quando ausente', () => {
    assert.equal(filamentToMaterial({ name: 'x', type: 'PETG' }).type, 'PETG');
    assert.equal(filamentToMaterial({ name: 'x' }).type, 'PLA');
  });
});

describe('planFilamentImport', () => {
  it('importa todos quando o cadastro está vazio', () => {
    const { pending, skipped, total } = planFilamentImport(FIRESTORE_FILAMENTS, []);
    assert.equal(pending.length, 8);
    assert.equal(skipped, 0);
    assert.equal(total, 8);
  });

  it('não duplica materiais já cadastrados', () => {
    const existing = [{ name: 'PLA preto' }, { name: 'PLA roxo' }];
    const { pending, skipped } = planFilamentImport(FIRESTORE_FILAMENTS, existing);

    assert.equal(pending.length, 6);
    assert.equal(skipped, 2);
    assert.ok(!pending.some((item) => item.name === 'PLA preto'));
  });

  it('compara nomes ignorando caixa e espaços', () => {
    const existing = [{ name: '  pla PRETO  ' }];
    const { pending, skipped } = planFilamentImport([{ name: 'PLA preto', price: 115, weight: 1000 }], existing);

    assert.equal(pending.length, 0);
    assert.equal(skipped, 1);
  });

  it('é idempotente: rodar duas vezes não cria duplicatas', () => {
    const primeira = planFilamentImport(FIRESTORE_FILAMENTS, []);
    const segunda = planFilamentImport(FIRESTORE_FILAMENTS, primeira.pending);

    assert.equal(segunda.pending.length, 0);
    assert.equal(segunda.skipped, 8);
  });

  it('não duplica nomes repetidos dentro do próprio lote', () => {
    const { pending, skipped } = planFilamentImport(
      [{ name: 'PLA', price: 100, weight: 1000 }, { name: 'PLA', price: 120, weight: 1000 }],
      [],
    );
    assert.equal(pending.length, 1);
    assert.equal(skipped, 1);
  });

  it('descarta filamentos sem nome', () => {
    const { pending, skipped } = planFilamentImport([{ price: 100, weight: 1000 }, { name: '  ' }], []);
    assert.equal(pending.length, 0);
    assert.equal(skipped, 2);
  });

  it('tolera entradas inválidas', () => {
    assert.deepEqual(planFilamentImport(null, null).pending, []);
    assert.equal(planFilamentImport(undefined, []).total, 0);
  });
});
