/**
 * Regras de custo de material (filamento).
 */

import { asCents, fromCents, parseDecimal, roundCents } from './money.js';

export const MATERIAL_TYPES = ['PLA', 'PLA+', 'PETG', 'ABS', 'ASA', 'TPU', 'Nylon', 'Resina', 'Outro'];

/**
 * Custo por grama, em centavos decimais.
 *
 * Custo por grama = (preço da bobina + frete) / peso líquido em gramas.
 *
 * O retorno é decimal de propósito: uma bobina de R$120 com 1000 g custa
 * 12 centavos por grama, mas R$95/1000 g custa 9,5 — truncar aqui distorceria
 * o custo de peças pequenas. O arredondamento acontece só ao gerar o valor final.
 */
export function costPerGramCents(material = {}) {
  const spoolGrams = parseDecimal(material.spoolGrams, 0);
  if (spoolGrams <= 0) return 0;

  const total = asCents(material.priceCents) + asCents(material.shippingCents);
  return total / spoolGrams;
}

/** Custo por grama em reais, para exibição (R$/g). */
export function costPerGramReais(material = {}) {
  return fromCents(costPerGramCents(material));
}

/** Custo, em centavos inteiros, de consumir uma quantidade de gramas. */
export function materialCostCents(material, grams) {
  const weight = Math.max(0, parseDecimal(grams, 0));
  return roundCents(weight * costPerGramCents(material));
}

/** Custo por quilo em centavos, útil para comparar fornecedores. */
export function costPerKiloCents(material = {}) {
  return roundCents(costPerGramCents(material) * 1000);
}

export function validateMaterial(material = {}) {
  const errors = {};

  if (!String(material.name || '').trim()) {
    errors.name = 'Informe o nome do material.';
  }
  if (parseDecimal(material.spoolGrams, 0) <= 0) {
    errors.spoolGrams = 'O peso da bobina deve ser maior que zero.';
  }
  if (asCents(material.priceCents) <= 0) {
    errors.priceCents = 'O preço de aquisição deve ser maior que zero.';
  }
  if (asCents(material.shippingCents) < 0) {
    errors.shippingCents = 'O frete não pode ser negativo.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function describeMaterial(material = {}) {
  const parts = [material.brand, material.name].filter(Boolean);
  const label = parts.join(' ') || 'Material sem nome';
  return material.type ? `${label} · ${material.type}` : label;
}
