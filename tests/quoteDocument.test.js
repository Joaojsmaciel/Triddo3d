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
  quoteShowSpecs: true,
  quoteShowMaterialCost: true,
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
  unit: {
    price: 3856,
    totalCost: 2699,
    profit: 1157,
    material: 1400,
    labor: 833,
    grams: 100,
    billableGrams: 100,
    printHours: 5,
  },
  totals: {
    price: 11568,
    listPrice: 11568,
    discount: 0,
    totalCost: 8097,
    profit: 3471,
    material: 4200,
    labor: 2499,
    failureReserve: 387,
    grams: 300,
    billableGrams: 300,
    printHours: 15,
  },
};

/** Documento de referência: orçamento completo com todas as opções ligadas. */
const html = buildQuoteHtml(quote, company);

describe('buildQuoteHtml', () => {
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
    const forbidden = [
      '26,99', // custo total unitário
      '80,97', // custo total do lote
      '11,57', // lucro unitário
      '34,71', // lucro do lote
      '24,99', // mão de obra
      '3,87', // reserva para falhas
    ];
    forbidden.forEach((value) => {
      assert.ok(!html.includes(value), `o PDF do cliente não deveria conter ${value}`);
    });

    [/margem/i, /lucro/i, /m[ãa]o de obra/i, /deprecia/i, /manuten/i, /reserva/i, /falha/i].forEach(
      (pattern) => {
        assert.ok(!pattern.test(html), `o PDF do cliente não deveria mencionar ${pattern}`);
      },
    );
  });

  it('não expõe o custo total, mesmo mostrando o do filamento', () => {
    // "Custo" aparece só na linha do filamento; o custo total segue oculto.
    const ocorrencias = html.match(/Custo/gi) || [];
    assert.equal(ocorrencias.length, 1);
    assert.match(html, /Custo do filamento/);
  });
});

describe('buildQuoteHtml · especificações técnicas', () => {
  it('mostra peso, tempo e custo do filamento', () => {
    const html = buildQuoteHtml(quote, company);

    assert.match(html, /Especificações técnicas/);
    assert.match(html, /Material/);
    assert.match(html, /Creality Ender 3 V3 SE/);
    assert.match(html, /Peso da peça/);
    assert.match(html, /100,0 g/);
    assert.match(html, /Custo do filamento/);
    assert.match(html, /42,00/); // custo de material do lote
  });

  it('separa por peça e total quando há mais de uma peça', () => {
    const html = buildQuoteHtml(quote, company);

    assert.match(html, /Tempo por peça/);
    assert.match(html, /Tempo total de impressão/);
    assert.match(html, /Filamento total/);
    assert.match(html, /300,0 g/);
    assert.match(html, /15h/);
  });

  it('não repete por peça e total quando a quantidade é 1', () => {
    const html = buildQuoteHtml(
      { ...quote, quantity: 1, totals: { ...quote.totals, billableGrams: 100, printHours: 5 } },
      company,
    );

    assert.match(html, /Tempo de impressão/);
    assert.ok(!/Tempo por peça/.test(html));
    assert.ok(!/Filamento total/.test(html));
  });

  it('distingue peso da peça de filamento consumido quando há desperdício', () => {
    const html = buildQuoteHtml(
      { ...quote, unit: { ...quote.unit, grams: 100, billableGrams: 110 } },
      company,
    );

    assert.match(html, /Peso da peça/);
    assert.match(html, /Filamento consumido/);
    assert.match(html, /110,0 g/);
    assert.match(html, /inclui suportes e purga/);
  });

  it('mostra um único peso quando não há desperdício somado', () => {
    const html = buildQuoteHtml(quote, company);
    assert.ok(!/Filamento consumido/.test(html));
  });

  it('esconde o custo do filamento quando a opção está desligada', () => {
    const html = buildQuoteHtml(quote, { ...company, quoteShowMaterialCost: false });

    assert.match(html, /Especificações técnicas/);
    assert.match(html, /Peso da peça/);
    assert.ok(!/Custo do filamento/.test(html));
    assert.ok(!html.includes('42,00'));
  });

  it('esconde o bloco inteiro quando a opção está desligada', () => {
    const html = buildQuoteHtml(quote, { ...company, quoteShowSpecs: false });

    assert.ok(!/Especificações técnicas/.test(html));
    assert.ok(!/Peso da peça/.test(html));
    assert.ok(!/Custo do filamento/.test(html));
    // O essencial continua: descrição, quantidade e preço.
    assert.match(html, /Suporte de fone/);
    assert.match(html, /115,68/);
  });

  it('funciona com orçamentos antigos, sem o peso líquido gravado', () => {
    const antigo = {
      ...quote,
      unit: { price: 3856, material: 1400, billableGrams: 100, printHours: 5 },
      totals: { price: 11568, material: 4200, billableGrams: 300, printHours: 15 },
    };
    const html = buildQuoteHtml(antigo, company);

    assert.match(html, /Peso da peça/);
    assert.match(html, /100,0 g/);
    assert.ok(!/Filamento consumido/.test(html));
  });

  it('omite linhas sem dado em vez de mostrar zero', () => {
    const vazio = {
      ...quote,
      materialName: '',
      printerName: '',
      unit: { price: 3856, billableGrams: 0, printHours: 0, material: 0 },
      totals: { price: 11568, billableGrams: 0, printHours: 0, material: 0 },
    };
    const html = buildQuoteHtml(vazio, company);

    assert.ok(!/Peso da peça/.test(html));
    assert.ok(!/Tempo/.test(html.replace(/Válido até[^<]*/g, '')));
    assert.ok(!/Custo do filamento/.test(html));
    assert.ok(!/0,0 g/.test(html));
  });

  it('escapa nomes de material e impressora nas especificações', () => {
    const html = buildQuoteHtml(
      { ...quote, materialName: '<img onerror=x>', printerName: '<b>bold</b>' },
      company,
    );

    assert.ok(!html.includes('<img onerror=x>'));
    assert.ok(!html.includes('<b>bold</b>'));
    assert.match(html, /&lt;img onerror=x&gt;/);
  });

  it('calcula a validade a partir da data de emissão', () => {
    assert.match(html, /Válido até 17\/03\/2026/);
  });

  it('exibe subtotal e desconto somente quando há desconto', () => {
    assert.ok(!html.includes('Desconto'));

    const comDesconto = buildQuoteHtml(
      {
        ...quote,
        unit: { ...quote.unit, price: 3856, listPrice: 4284 },
        totals: { ...quote.totals, price: 11568, listPrice: 12852, discount: 1284 },
      },
      company,
    );
    assert.match(comDesconto, /Desconto/);
    assert.match(comDesconto, /Subtotal/);
  });

  it('fecha a conta: item × quantidade − desconto = total', () => {
    const valores = (markup) => {
      const celulas = [...markup.matchAll(/<td class="num">([^<]*)<\/td>/g)].map((m) => m[1].trim());
      const rodape = Object.fromEntries(
        [...markup.matchAll(/<span>([^<]*)<\/span><span>([^<]*)<\/span>/g)].map((m) => [
          m[1].trim(),
          m[2].trim(),
        ]),
      );
      return { quantidade: celulas[0], unitario: celulas[1], totalItem: celulas[2], rodape };
    };

    // Preço de tabela R$ 42,84 x 3 = R$ 128,52; desconto R$ 12,84; total R$ 115,68.
    const { quantidade, unitario, totalItem, rodape } = valores(
      buildQuoteHtml(
        {
          ...quote,
          unit: { ...quote.unit, price: 3856, listPrice: 4284 },
          totals: { ...quote.totals, price: 11568, listPrice: 12852, discount: 1284 },
        },
        company,
      ),
    );

    const numero = (texto) => Number(texto.replace(/[^\d,]/g, '').replace(',', '.'));

    assert.equal(quantidade, '3');
    assert.equal(numero(unitario), 42.84);
    assert.equal(numero(totalItem), 128.52);
    // O subtotal repete o total dos itens, jamais um valor maior.
    assert.equal(numero(rodape.Subtotal), 128.52);
    assert.equal(numero(rodape.Desconto), 12.84);
    assert.equal(numero(rodape.Total), 115.68);
    assert.equal(numero(rodape.Subtotal) - numero(rodape.Desconto), numero(rodape.Total));
  });

  it('sem desconto, o item já traz o preço final', () => {
    const celulas = [...html.matchAll(/<td class="num">([^<]*)<\/td>/g)].map((m) => m[1].trim());
    assert.match(celulas[1], /38,56/);
    assert.match(celulas[2], /115,68/);
    assert.ok(!html.includes('Subtotal'));
  });

  it('usa o preço final quando o orçamento antigo não gravou preço de tabela', () => {
    const antigo = {
      ...quote,
      unit: { price: 3856, material: 1400, billableGrams: 100, printHours: 5 },
      totals: { price: 11568, material: 4200, billableGrams: 300, printHours: 15 },
    };
    const markup = buildQuoteHtml(antigo, company);

    assert.match(markup, /115,68/);
    assert.ok(!markup.includes('Subtotal'));
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

  it('não duplica o "3D" do nome da empresa no cabeçalho', () => {
    const cabecalho = (markup) => (markup.match(/<div class="brand-name">(.*?)<\/div>/) || [])[1];

    // O nome padrão já termina em 3D: acrescentar outro imprimia "TRIDDO 3D 3D".
    assert.equal(cabecalho(html), 'TRIDDO <span>3D</span>');

    // Sem "3D" no nome, nada é inventado: imprime exatamente o que foi digitado.
    assert.equal(cabecalho(buildQuoteHtml(quote, { ...company, name: 'Triddo' })), 'Triddo');
  });

  it('destaca o 3D final de qualquer nome e preserva nomes sem ele', () => {
    const cabecalho = (markup) => (markup.match(/<div class="brand-name">(.*?)<\/div>/) || [])[1];

    assert.equal(
      cabecalho(buildQuoteHtml(quote, { ...company, name: 'Minha Loja' })),
      'Minha Loja',
    );
    assert.equal(cabecalho(buildQuoteHtml(quote, { ...company, name: '3D' })), '<span>3D</span>');
    assert.equal(cabecalho(buildQuoteHtml(quote, { ...company, name: '' })), 'Triddo <span>3D</span>');
  });

  it('escapa o nome da empresa no cabeçalho', () => {
    const malicioso = buildQuoteHtml(quote, { ...company, name: '<img onerror=x> 3D' });
    assert.ok(!malicioso.includes('<img onerror=x>'));
    assert.match(malicioso, /&lt;img onerror=x&gt; <span>3D<\/span>/);
  });

  it('gera um documento HTML completo', () => {
    assert.match(html, /^<!DOCTYPE html>/);
    assert.match(html, /<html lang="pt-BR">/);
    assert.match(html, /@page \{ size: A4/);
  });
});
