/**
 * Camada monetária do TRIDDO 3D.
 *
 * Estratégia decimal: todo VALOR é guardado em centavos inteiros. Toda TAXA
 * (R$/g, R$/h, R$/kWh, percentuais) é um decimal comum, e a conversão de taxa
 * para valor acontece sempre numa única expressão encerrada por arredondamento.
 * Assim o erro de ponto flutuante nunca se acumula de uma operação para outra.
 */

export const CENTS_PER_UNIT = 100;

/** Arredonda para o centavo mais próximo sem enviesar números negativos. */
export function roundCents(value) {
  if (!Number.isFinite(value)) return 0;
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

/**
 * Converte entrada do usuário em número. Aceita vírgula decimal, separador de
 * milhar, símbolo de moeda e espaços — formatos comuns no teclado brasileiro.
 */
export function parseDecimal(input, fallback = 0) {
  if (typeof input === 'number') return Number.isFinite(input) ? input : fallback;
  if (input === null || input === undefined) return fallback;

  const raw = String(input).trim();
  if (!raw) return fallback;

  let cleaned = raw.replace(/[R$\s\u00a0]/gi, '');
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  if (lastComma > -1 && lastDot > -1) {
    // O separador decimal é o que aparece por último: "1.234,56" ou "1,234.56".
    const decimalSep = lastComma > lastDot ? ',' : '.';
    const thousandSep = decimalSep === ',' ? '.' : ',';
    cleaned = cleaned.split(thousandSep).join('').replace(decimalSep, '.');
  } else if (lastComma > -1) {
    cleaned = cleaned.replace(',', '.');
  }

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Converte reais (número ou texto digitado) em centavos inteiros. */
export function toCents(input, fallback = 0) {
  return roundCents(parseDecimal(input, fallback / CENTS_PER_UNIT) * CENTS_PER_UNIT);
}

/** Converte centavos inteiros em reais (para exibição ou gráficos). */
export function fromCents(cents) {
  return (Number(cents) || 0) / CENTS_PER_UNIT;
}

/** Garante que um valor persistido seja centavos inteiros. */
export function asCents(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.trunc(parsed);
}

export function sumCents(...values) {
  return values.flat().reduce((total, value) => total + asCents(value), 0);
}

/** Multiplica um valor em centavos por um fator decimal, arredondando uma vez. */
export function mulCents(cents, factor) {
  return roundCents(asCents(cents) * (Number(factor) || 0));
}

/** Participação de uma parcela no total, entre 0 e 1. Total zero devolve 0. */
export function shareOf(part, total) {
  const totalValue = Number(total) || 0;
  if (totalValue === 0) return 0;
  return (Number(part) || 0) / totalValue;
}

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formata centavos como moeda brasileira: 1250 -> "R$ 12,50". */
export function formatCents(cents) {
  return brl.format(fromCents(cents));
}

/**
 * Formata valores por unidade (R$/g, R$/h) que exigem mais casas decimais para
 * não desaparecerem no arredondamento — o custo por grama costuma ser < R$0,10.
 */
export function formatRate(reais, decimals = 3) {
  return `R$ ${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(reais) || 0)}`;
}

/** Formata uma razão (0.32) como percentual ("32,0%"). */
export function formatRatioAsPercent(ratio, decimals = 1) {
  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format((Number(ratio) || 0) * 100)}%`;
}

export function formatNumber(value, decimals = 2) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number(value) || 0);
}
