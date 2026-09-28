/**
 * Geração do PDF do orçamento.
 *
 * Monta um documento HTML com a identidade da TRIDDO 3D e abre a caixa de
 * impressão do navegador, onde o usuário escolhe "Salvar como PDF". Isso evita
 * adicionar uma biblioteca de PDF ao projeto e sempre respeita o idioma,
 * a fonte e o tamanho de papel configurados na máquina.
 *
 * O documento do cliente mostra descrição, quantidade e preço — nunca os custos
 * internos nem a margem de lucro.
 */

import { formatCents } from '../../core/money.js';
import { QUOTE_STATUS_LABELS } from '../../core/reports.js';
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

/** Monta o HTML completo do orçamento do cliente. */
export function buildQuoteHtml(quote, company = {}) {
  const unitPrice = quote.unit?.price || 0;
  const totalPrice = quote.totals?.price || 0;
  const discount = quote.totals?.discount || 0;
  const listTotal = quote.totals?.listPrice || totalPrice;
  const expiry = validUntil(quote.createdAt, company.quoteValidityDays);

  const contactLines = [company.document, company.phone, company.email, company.website, company.address]
    .filter(Boolean)
    .map((line) => escapeHtml(line))
    .join(' &nbsp;·&nbsp; ');

  const specs = [
    quote.materialName ? ['Material', quote.materialName] : null,
    quote.printerName ? ['Produção', quote.printerName] : null,
  ].filter(Boolean);

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
        <div class="brand-name">${escapeHtml(company.name || 'Triddo')} <span>3D</span></div>
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
          ${specs.length ? `<div class="muted" style="margin-top:4px">${specs
            .map(([key, value]) => `${escapeHtml(key)}: ${escapeHtml(value)}`)
            .join(' &nbsp;·&nbsp; ')}</div>` : ''}
        </td>
        <td class="num">${quote.quantity}</td>
        <td class="num">${formatCents(unitPrice)}</td>
        <td class="num">${formatCents(unitPrice * quote.quantity)}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    ${discount > 0 ? `<div><span>Subtotal</span><span>${formatCents(listTotal)}</span></div>` : ''}
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
