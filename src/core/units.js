/**
 * Conversões de tempo, peso e percentuais usadas pelo motor de cálculo.
 */

import { parseDecimal } from './money.js';

/**
 * Interpreta tempo de impressão em horas. Aceita decimal ("2,5") e o formato
 * "h:mm" que os fatiadores exibem ("2:30").
 */
export function parseHours(input, fallback = 0) {
  if (typeof input === 'number') return Number.isFinite(input) ? input : fallback;
  if (input === null || input === undefined) return fallback;

  const raw = String(input).trim();
  if (!raw) return fallback;

  const clock = raw.match(/^(\d+)\s*[:hH]\s*(\d{1,2})\s*(?:m(?:in)?)?$/);
  if (clock) {
    const hours = Number(clock[1]);
    const minutes = Number(clock[2]);
    if (minutes >= 60) return fallback;
    return hours + minutes / 60;
  }

  return parseDecimal(raw, fallback);
}

export function minutesToHours(minutes) {
  return (parseDecimal(minutes, 0) || 0) / 60;
}

export function hoursToMinutes(hours) {
  return (parseDecimal(hours, 0) || 0) * 60;
}

/** Formata horas decimais como "2h 30min" para leitura humana. */
export function formatHours(hours) {
  const total = Math.max(0, parseDecimal(hours, 0));
  const whole = Math.floor(total);
  const minutes = Math.round((total - whole) * 60);

  if (minutes === 60) return `${whole + 1}h`;
  if (whole === 0) return `${minutes}min`;
  if (minutes === 0) return `${whole}h`;
  return `${whole}h ${minutes}min`;
}

/** Converte percentual digitado (30) em razão (0.3). */
export function percentToRatio(percent) {
  return (parseDecimal(percent, 0) || 0) / 100;
}

export function ratioToPercent(ratio) {
  return (parseDecimal(ratio, 0) || 0) * 100;
}

export function clamp(value, min, max) {
  const parsed = parseDecimal(value, min);
  if (parsed < min) return min;
  if (parsed > max) return max;
  return parsed;
}

export function isPositive(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

export function isNonNegative(value) {
  return Number.isFinite(Number(value)) && Number(value) >= 0;
}
