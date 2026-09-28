/**
 * Conversões entre o estado dos formulários (texto) e os tipos do domínio.
 *
 * Os campos guardam texto enquanto o usuário digita: "12," é um estado válido no
 * caminho para "12,50". Converter a cada tecla apagaria a vírgula e travaria a
 * digitação. A conversão acontece só ao salvar ou ao calcular.
 */

import { fromCents, parseDecimal } from '../core/money.js';

/** Centavos -> texto editável ("12000" -> "120"). Zero vira vazio para o placeholder aparecer. */
export function centsToInput(cents) {
  const value = Number(cents) || 0;
  if (value === 0) return '';
  return String(fromCents(value)).replace('.', ',');
}

/** Número -> texto editável. Zero vira vazio. */
export function numberToInput(value) {
  const parsed = Number(value) || 0;
  if (parsed === 0) return '';
  return String(parsed).replace('.', ',');
}

/** Texto -> número, sempre finito e nunca negativo. */
export function inputToNumber(value, fallback = 0) {
  const parsed = parseDecimal(value, fallback);
  return parsed < 0 ? 0 : parsed;
}

/** Devolve um atualizador de estado para um campo simples do formulário. */
export function fieldSetter(setState, field) {
  return (value) => setState((current) => ({ ...current, [field]: value }));
}

export function formatDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
