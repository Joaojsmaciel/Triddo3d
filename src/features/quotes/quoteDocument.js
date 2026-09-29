/**
 * Geração do PDF do orçamento.
 *
 * Monta um documento HTML com a identidade da TRIDDO 3D e abre a caixa de
 * impressão do navegador, onde o usuário escolhe "Salvar como PDF". Isso evita
 * adicionar uma biblioteca de PDF ao projeto e sempre respeita o idioma,
 * a fonte e o tamanho de papel configurados na máquina.
 *
 * O documento do cliente mostra a descrição do serviço, as especificações
 * técnicas (peso e tempo) e o preço. Quando existirem, lista depreciação e
 * custos adicionais (modelagem, cola, tinta, embalagem).
 *
 * Custo de filamento, mão de obra, custo de máquina, manutenção, reserva para
 * falhas, lucro e margem nunca aparecem — nem se uma configuração antiga pedir.
 */

import { formatCents, formatNumber, toCents } from '../../core/money.js';
import { QUOTE_STATUS_LABELS } from '../../core/reports.js';
import { formatHours } from '../../core/units.js';
import { formatDate } from '../../lib/form.js';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[char];
  });
}

function validUntil(createdAt, days) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime()) || !days) return null;
  date.setDate(date.getDate() + Number(days));
  return formatDate(date.toISOString());
}

function grams(value) {
  return `${formatNumber(value, 1)} g`;
}

/**
 * Nome da empresa com o "3D" final destacado em azul.
 *
 * O sufixo não pode ser fixo no template: o nome padrão já é "TRIDDO 3D", e
 * acrescentar outro "3D" imprimia "TRIDDO 3D 3D" no cabeçalho do cliente.
 */
function brandName(name) {
  const clean = String(name || 'Triddo 3D').trim();
  const match = clean.match(/^(.*?)\s*(3D)$/i);

  if (!match) return escapeHtml(clean);
  const prefix = match[1].trim();
  if (!prefix) return `<span>${escapeHtml(match[2])}</span>`;
  return `${escapeHtml(prefix)} <span>${escapeHtml(match[2])}</span>`;
}

/**
 * Especificações técnicas do serviço: o que o cliente precisa para entender o
 * que está comprando, sem expor a estrutura de custos.
 *
 * Pesos e tempos por peça só aparecem quando há mais de uma peça — para
 * quantidade 1 seriam a repetição literal do total.
 *
 * ATENÇÃO: os valores devolvidos aqui já vão escapados e são inseridos como HTML
 * (uma das linhas carrega marcação própria). Ao acrescentar qualquer texto vindo
 * do usuário, passe por `escapeHtml` nesta função.
 */
function buildSpecs(quote) {
  const unit = quote.unit || {};
  const totals = quote.totals || {};
  const multiple = quote.quantity > 1;

  // Orçamentos salvos antes deste campo existir não têm o peso líquido.
  const netWeight = Number(unit.grams) || 0;
  const billable = Number(unit.billableGrams) || 0;
  const printHours = Number(unit.printHours) || 0;

  const rows = [];

  if (quote.materialName) rows.push(['Material', escapeHtml(quote.materialName)]);
  if (quote.printerName) rows.push(['Impressora', escapeHtml(quote.printerName)]);

  if (billable > 0) {
    // Quando há desperdício somado, o cliente paga pelo filamento consumido:
    // mostramos os dois números para que a diferença não pareça um erro.
    const showBoth = netWeight > 0 && Math.abs(billable - netWeight) >= 0.05;

    if (showBoth) {
      rows.push(['Peso da peça', grams(netWeight)]);
      rows.push(['Filamento consumido', `${grams(billable)} <span class="hint">(inclui suportes e purga)</span>`]);
    } else {
      rows.push(['Peso da peça', grams(billable)]);
    }

    if (multiple) {
      rows.push(['Filamento total', grams(Number(totals.billableGrams) || billable * quote.quantity)]);
    }
  }

  if (printHours > 0) {
    if (multiple) {
      rows.push(['Tempo por peça', formatHours(printHours)]);
      rows.push([
        'Tempo total de impressão',
        formatHours(Number(totals.printHours) || printHours * quote.quantity),
      ]);
    } else {
      rows.push(['Tempo de impressão', formatHours(printHours)]);
    }
  }

  return rows;
}

const FILAMENT_COST_LABEL = /filamento|custo do material/i;

function extraItemsFromQuote(quote) {
  if (Array.isArray(quote.extraItems)) {
    return quote.extraItems;
  }

  const extras = quote.input?.extras;
  if (!Array.isArray(extras)) return [];

  return extras.map((extra) => ({
    label: extra.label || 'Custo adicional',
    amountCents: extra.amountCents ?? toCents(extra.amount),
    perUnit: extra.perUnit !== false,
  }));
}

function extraLoteCents(item, quantity) {
  const amount = Number(item.amountCents) || 0;
  if (amount <= 0) return 0;
  if (item.perUnit === false) return amount;
  return amount * Math.max(1, Number(quantity) || 1);
}

/**
 * Custos que o cliente pode ver: depreciação e adicionais lançados (modelagem,
 * cola, tinta, etc.). Filamento nunca entra, mesmo em orçamentos antigos.
 */
function buildClientCostRows(quote) {
  const rows = [];
  const totals = quote.totals || {};
  const unit = quote.unit || {};

  const depreciation = Number(totals.depreciation) || 0;
  const fallbackDepreciation =
    depreciation > 0 ? depreciation : (Number(unit.depreciation) || 0) * Math.max(1, Number(quote.quantity) || 1);

  if (fallbackDepreciation > 0) {
    rows.push(['Depreciação', formatCents(fallbackDepreciation)]);
  }

  extraItemsFromQuote(quote).forEach((extra) => {
    const label = String(extra.label || '').trim() || 'Custo adicional';
    if (FILAMENT_COST_LABEL.test(label)) return;
    const lote = extraLoteCents(extra, quote.quantity);
    if (lote <= 0) return;
    rows.push([label, formatCents(lote)]);
  });

  return rows;
}

/** Monta o HTML completo do orçamento do cliente. */
export function buildQuoteHtml(quote, company = {}) {
  const totalPrice = quote.totals?.price || 0;

  // A linha do item traz o preço DE TABELA e o desconto é abatido no rodapé.
  // Usar o preço já descontado no item deixaria o subtotal acima do total dos
  // itens, o que parece erro de conta para quem recebe o orçamento.
  const unitPrice = quote.unit?.listPrice || quote.unit?.price || 0;
  const subtotal = unitPrice * quote.quantity;
  // Derivado em vez de lido: garante que a conta impressa sempre feche.
  const discount = Math.max(0, subtotal - totalPrice);

  const expiry = validUntil(quote.createdAt, company.quoteValidityDays);

  const contactLines = [company.document, company.phone, company.email, company.website, company.address]
    .filter(Boolean)
    .map((line) => escapeHtml(line))
    .join(' &nbsp;·&nbsp; ');

  const specs = company.quoteShowSpecs === false ? [] : buildSpecs(quote);
  const costRows = company.quoteShowSpecs === false ? [] : buildClientCostRows(quote);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${escapeHtml(quote.code || 'Orçamento')} · ${escapeHtml(company.name || 'TRIDDO 3D')}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0; font-family: 'Segoe UI', Arial, sans-serif; color: #15151E;
    font-size: 12px; line-height: 1.55; -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .sheet { max-width: 760px; margin: 0 auto; }
  header {
    display: flex; justify-content: space-between; align-items: flex-start; gap: 24px;
    padding-bottom: 16px; border-bottom: 3px solid #4C7DFF;
  }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand-name { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase; }
  .brand-name span { color: #4C7DFF; }
  .brand-tag { font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: #6B7280; margin-top: 2px; }
  .doc-meta { text-align: right; font-size: 11px; color: #4B5563; }
  .doc-code {
    font-size: 15px; font-weight: 700; color: #15151E; background: #EEF2FF;
    border: 1px solid #C7D2FE; border-radius: 6px; padding: 4px 10px; display: inline-block; margin-bottom: 6px;
  }
  h1 { font-size: 16px; margin: 24px 0 4px; }
  .muted { color: #6B7280; }
  .grid { display: flex; gap: 24px; margin-top: 16px; }
  .grid > div { flex: 1; }
  .label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #9CA3AF; margin-bottom: 2px; }
  .hint { color: #9CA3AF; font-size: 10px; }
  .specs { margin-top: 20px; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; }
  .specs-title {
    font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #6B7280;
    background: #F9FAFB; padding: 7px 12px; border-bottom: 1px solid #E5E7EB; font-weight: 700;
  }
  /* Duas colunas de pares rótulo/valor, quebrando para uma só em papel estreito. */
  .specs-body { display: flex; flex-wrap: wrap; padding: 4px 12px 8px; }
  .specs-row {
    flex: 1 1 46%; display: flex; justify-content: space-between; gap: 12px;
    padding: 5px 0; border-bottom: 1px dotted #E5E7EB; min-width: 240px;
  }
  .specs-row:nth-child(odd) { margin-right: 24px; }
  .specs-row span:first-child { color: #6B7280; }
  .specs-row span:last-child { font-weight: 600; text-align: right; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th {
    text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 1px;
    color: #6B7280; border-bottom: 1.5px solid #D1D5DB; padding: 8px 6px;
  }
  td { padding: 10px 6px; border-bottom: 1px solid #E5E7EB; vertical-align: top; }
  .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .totals { margin-top: 16px; margin-left: auto; width: 280px; }
  .totals div { display: flex; justify-content: space-between; padding: 5px 0; }
  .totals .grand {
    border-top: 2px solid #15151E; margin-top: 6px; padding-top: 10px;
    font-size: 16px; font-weight: 800; color: #2F54D7;
  }
  .notes { margin-top: 24px; background: #F9FAFB; border-left: 3px solid #8B5CF6; padding: 12px 14px; border-radius: 0 6px 6px 0; }
  footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #E5E7EB; font-size: 10px; color: #9CA3AF; text-align: center; }
  @media print { .screen-only { display: none; } }
  .screen-only {
    position: fixed; bottom: 16px; right: 16px; background: #4C7DFF; color: #fff; border: 0;
    border-radius: 8px; padding: 10px 18px; font-size: 13px; font-weight: 600; cursor: pointer;
    box-shadow: 0 6px 20px rgba(76,125,255,0.4);
  }
</style>
</head>
<body>
<div class="sheet">
  <header>
    <div class="brand">
      <svg width="40" height="40" viewBox="0 0 100 100" aria-hidden="true">
        <g stroke="#4C7DFF" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M 50 10 L 90 30 L 50 50 L 10 30 Z"/>
          <path d="M 50 50 L 90 70 L 50 90 L 10 70 Z"/>
          <line x1="10" y1="30" x2="10" y2="70"/><line x1="90" y1="30" x2="90" y2="70"/>
          <line x1="50" y1="10" x2="50" y2="50"/>
        </g>
      </svg>
      <div>
        <div class="brand-name">${brandName(company.name)}</div>
        <div class="brand-tag">${escapeHtml(company.tagline || 'Print and Design 3D')}</div>
      </div>
    </div>
    <div class="doc-meta">
      <div class="doc-code">${escapeHtml(quote.code || '—')}</div><br>
      <div>Emitido em ${formatDate(quote.createdAt)}</div>
      ${expiry ? `<div>Válido até ${expiry}</div>` : ''}
      <div>${escapeHtml(QUOTE_STATUS_LABELS[quote.status] || '')}</div>
    </div>
  </header>

  <h1>Orçamento de impressão 3D</h1>
  <p class="muted">Serviço de fabricação aditiva FDM sob demanda.</p>

  <div class="grid">
    <div>
      <div class="label">Cliente</div>
      <div>${escapeHtml(quote.clientName || 'Não informado')}</div>
    </div>
    <div>
      <div class="label">Projeto</div>
      <div>${escapeHtml(quote.projectName || '—')}</div>
    </div>
  </div>

  ${specs.length
    ? `<div class="specs">
    <div class="specs-title">Especificações técnicas</div>
    <div class="specs-body">
      ${specs
        .map(
          ([label, value]) =>
            `<div class="specs-row"><span>${escapeHtml(label)}</span><span>${value}</span></div>`,
        )
        .join('\n      ')}
    </div>
  </div>`
    : ''}

  ${costRows.length
    ? `<div class="specs">
    <div class="specs-title">Custos do serviço</div>
    <div class="specs-body">
      ${costRows
        .map(
          ([label, value]) =>
            `<div class="specs-row"><span>${escapeHtml(label)}</span><span>${value}</span></div>`,
        )
        .join('\n      ')}
    </div>
  </div>`
    : ''}

  <table>
    <thead>
      <tr>
        <th>Descrição do serviço</th>
        <th class="num">Qtd.</th>
        <th class="num">Preço unitário</th>
        <th class="num">Total</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <strong>${escapeHtml(quote.projectName || 'Peça impressa em 3D')}</strong>
          <div class="muted" style="margin-top:4px">Impressão 3D FDM${
            quote.materialName ? ` em ${escapeHtml(quote.materialName)}` : ''
          }</div>
        </td>
        <td class="num">${quote.quantity}</td>
        <td class="num">${formatCents(unitPrice)}</td>
        <td class="num">${formatCents(subtotal)}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    ${discount > 0 ? `<div><span>Subtotal</span><span>${formatCents(subtotal)}</span></div>` : ''}
    ${discount > 0 ? `<div><span>Desconto</span><span>− ${formatCents(discount)}</span></div>` : ''}
    <div class="grand"><span>Total</span><span>${formatCents(totalPrice)}</span></div>
  </div>

  ${quote.notes ? `<div class="notes"><strong>Observações</strong><br>${escapeHtml(quote.notes).replace(/\n/g, '<br>')}</div>` : ''}

  <footer>
    ${contactLines ? `<div>${contactLines}</div>` : ''}
    ${company.quoteFooter ? `<div style="margin-top:4px">${escapeHtml(company.quoteFooter)}</div>` : ''}
  </footer>
</div>
<button class="screen-only" onclick="window.print()">Salvar em PDF</button>
<script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 350); });</script>
</body>
</html>`;
}

/**
 * Abre o orçamento em uma nova janela pronta para imprimir/salvar em PDF.
 * @returns {boolean} false se o navegador bloqueou a janela.
 */
export function openQuoteDocument(quote, company) {
  const win = window.open('', '_blank');
  if (!win) return false;

  win.document.open();
  win.document.write(buildQuoteHtml(quote, company));
  win.document.close();
  return true;
}
