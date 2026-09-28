/**
 * Conversão dos filamentos do Firestore (versão anterior) para materiais.
 *
 * A versão antiga guardava `price`, `weight` e uma lista `colors`, e não tinha
 * campo de frete. Fica fora do componente para poder ser testada sem rede.
 */

import { toCents } from '../../core/money.js';
import { inputToNumber } from '../../lib/form.js';

export const IMPORT_NOTE = 'Importado do Firebase. Confira o frete, que não existia na versão anterior.';

export function filamentToMaterial(filament = {}) {
  return {
    name: String(filament.name || '').trim(),
    type: filament.type || 'PLA',
    colorHex: Array.isArray(filament.colors) ? filament.colors[0] : filament.color,
    spoolGrams: inputToNumber(filament.weight, 1000) || 1000,
    priceCents: toCents(filament.price),
    // A versão anterior não tinha frete: entra como zero para o usuário revisar.
    shippingCents: 0,
    notes: IMPORT_NOTE,
  };
}

/**
 * Separa o que deve ser importado do que já existe, comparando pelo nome.
 * Clicar duas vezes no botão de importar é natural e não pode duplicar nada.
 */
export function planFilamentImport(filaments, existingMaterials) {
  // Valor padrão de parâmetro não cobre `null` explícito, só `undefined`.
  const incoming = Array.isArray(filaments) ? filaments : [];
  const existing = Array.isArray(existingMaterials) ? existingMaterials : [];

  const existingNames = new Set(
    existing.map((item) => String(item?.name || '').trim().toLowerCase()),
  );

  const pending = [];
  let skipped = 0;

  incoming.forEach((filament) => {
    const name = String(filament?.name || '').trim();
    if (!name) {
      skipped += 1;
      return;
    }
    if (existingNames.has(name.toLowerCase())) {
      skipped += 1;
      return;
    }
    // Protege contra nomes repetidos dentro do próprio lote do Firebase.
    existingNames.add(name.toLowerCase());
    pending.push(filamentToMaterial(filament));
  });

  return { pending, skipped, total: incoming.length };
}
