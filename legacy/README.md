# Arquivos legados

`script.js` e `styles.css` são a implementação original da calculadora em
JavaScript puro, anterior à migração para React. Nada no projeto atual os
importa — `index.html` carrega apenas `src/main.jsx`.

Eles ficam aqui apenas como referência histórica. Toda a funcionalidade que
tinham (cadastro de filamentos, custo por grama, custo de energia e preço final)
existe hoje em:

- `src/core/` — fórmulas de cálculo.
- `src/pages/MaterialsPage.jsx` — cadastro de filamentos.
- `src/pages/PricingPage.jsx` — precificação.

Podem ser apagados sem nenhum efeito sobre a aplicação.
