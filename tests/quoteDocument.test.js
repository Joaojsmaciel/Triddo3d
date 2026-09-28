import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildQuoteHtml } from '../src/features/quotes/quoteDocument.js';
import { QUOTE_STATUS } from '../src/core/reports.js';

const company = {
  name: 'TRIDDO 3D',
  tagline: 'Print and Design 3D',
  document: '12.345.678/0001-90',
  phone: '(11) 90000-0000',
  email: 'contato@triddo.com.br',
  website: 'triddo.com.br',
  quoteValidityDays: 7,
  quoteFooter: 'Orçamento sujeito a alteração após o prazo.',
};

const quote = {
  id: 'q1',
  code: 'ORC-2026-0001',
  projectName: 'Suporte de fone',
  clientName: 'Maria Silva',
  status: QUOTE_STATUS.SENT,
  quantity: 3,
  materialName: 'Genérico PLA Branco',
  printerName: 'Creality Ender 3 V3 SE',
  createdAt: '2026-03-10T12:00:00.000Z',
  notes: 'Entrega em 5 dias úteis.',
  marginPercent: 30,
  effectiveMargin: 0.3,
  unit: { price: 3856, totalCost: 2699, profit: 1157, material: 1400, labor: 833 },
  totals: {
    price: 11568,
    listPrice: 11568,
    discount: 0,
    totalCost: 8097,
    profit: 3471,
    material: 4200,
    labor: 2499,
    failureReserve: 387,
  },
};

describe('buildQuoteHtml', () => {
  const html = buildQuoteHtml(quote, company);

  it('mostra o que o cliente precisa ver', () => {
    assert.match(html, /ORC-2026-0001/);
    assert.match(html, /Suporte de fone/);
    assert.match(html, /Maria Silva/);
    assert.match(html, /TRIDDO 3D/);
    assert.match(html, /Print and Design 3D/);
    assert.match(html, /contato@triddo\.com\.br/);
  });

  it('mostra quantidade, preço unitário e total', () => {
    assert.match(html, />3</); // quantidade
    assert.match(html, /38,56/); // preço unitário
    assert.match(html, /115,68/); // total
  });

  it('não revela custos internos nem margem de lucro', () => {
    // Nenhum dos valores internos pode aparecer no documento do cliente.
    const forbidden = [
      '26,99', // custo unitário
      '80,97', // custo do lote
      '11,57', // lucro unitário
      '34,71', // lucro do lote
      '42,00', // custo de material
      '24,99', // mão de obra
      '3,87', // reserva para falhas
    ];
    forbidden.forEach((value) => {
      assert.ok(!html.includes(value), `o PDF do cliente não deveria conter ${value}`);
    });

    [/margem/i, /lucro/i, /custo/i, /depreciaç/i, /manutenç/i, /reserva/i].forEach((pattern) => {
      assert.ok(!pattern.test(html), `o PDF do cliente não deveria mencionar ${pattern}`);
    });
  });

  it('calcula a validade a partir da data de emissão', () => {
    assert.match(html, /Válido até 17\/03\/2026/);
  });

  it('exibe subtotal e desconto somente quando há desconto', () => {
    assert.ok(!html.includes('Desconto'));

    const withDiscount = buildQuoteHtml(
      { ...quote, totals: { ...quote.totals, discount: 1000, listPrice: 12568 } },
      company,
    );
    assert.match(withDiscount, /Desconto/);
    assert.match(withDiscount, /Subtotal/);
  });

  it('escapa HTML vindo dos campos do usuário', () => {
    const malicious = buildQuoteHtml(
      { ...quote, projectName: '<script>alert(1)</script>', clientName: '"><img onerror=x>' },
      company,
    );
    assert.ok(!malicious.includes('<script>alert(1)</script>'));
    assert.ok(!malicious.includes('<img onerror=x>'));
    assert.match(malicious, /&lt;script&gt;/);
  });

  it('funciona sem dados opcionais da empresa', () => {
    const minimal = buildQuoteHtml(quote, {});
    assert.match(minimal, /ORC-2026-0001/);
    assert.ok(!minimal.includes('Válido até'));
  });

  it('gera um documento HTML completo', () => {
    assert.match(html, /^<!DOCTYPE html>/);
    assert.match(html, /<html lang="pt-BR">/);
    assert.match(html, /@page \{ size: A4/);
  });
});
