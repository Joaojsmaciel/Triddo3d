# TRIDDO 3D

Plataforma de gestão de custos, precificação e orçamentos para impressão 3D FDM.

Calcula o custo real de produção de uma peça — material, energia, depreciação,
manutenção, mão de obra, custos adicionais e reserva para falhas — e define o
preço de venda a partir de margem, taxas comerciais, impostos e descontos.

## Tecnologias

| Camada | Ferramenta |
| --- | --- |
| Build | Vite 5 |
| Interface | React 18 + Tailwind CSS 3 |
| Linguagem | JavaScript (ESM) |
| Testes | Runner nativo do Node (`node --test`) |
| Persistência | localStorage através de uma camada de repositório |

Nenhuma dependência nova foi adicionada. Roteador, gráficos, ícones e a geração
do PDF são implementados no próprio projeto.

## Instalação

Requer Node.js 18 ou superior.

```bash
npm install
```

## Execução

```bash
npm run dev       # servidor de desenvolvimento em http://localhost:5173
npm test          # testes das fórmulas de precificação
npm run build     # build de produção na pasta dist/
npm run preview   # serve o build de produção localmente
```

Para publicar em hospedagem compartilhada (InfinityFree), use
`npm run build:deploy`, que também copia o `.htaccess` para `dist/`. Os scripts
`build-and-deploy.bat` e `build-and-deploy.sh` continuam funcionando.

## Como usar

O sistema já vem com um material (PLA Branco) e a impressora Creality Ender 3
V3 SE cadastrados, com valores estimados e totalmente editáveis.

1. **Configurações** — ajuste a tarifa de energia (consulte sua fatura), o valor
   da sua hora de trabalho, a margem padrão e os dados da empresa que aparecem
   no PDF do cliente.
2. **Materiais** — cadastre cada bobina com preço, frete e peso. O custo por
   grama é calculado como `(preço + frete) ÷ peso líquido em gramas`.
3. **Impressoras** — informe valor de aquisição, potência média em watts, vida
   útil em horas e manutenção por hora.
4. **Nova precificação** — escolha material e impressora, informe peso e tempo,
   lance os tempos de trabalho humano e ajuste a margem. O preço e o lucro se
   atualizam a cada alteração.
5. **Orçamentos** — salve, pesquise, edite, duplique, altere o status e exporte
   o PDF para o cliente.
6. **Dashboard** — acompanha receita, custo, lucro e materiais mais usados.

### Precificação rápida

A página de precificação tem dois modos. O **rápido** pede apenas peso, tempo e
margem, usando os padrões de Configurações para o resto — equivale à calculadora
original, agora com o motor de cálculo completo por trás. O **completo** abre
todas as seções de mão de obra, custos adicionais e precificação comercial.

## Fórmulas

**Custo por grama do material**

```
custo/g = (preço da bobina + frete) ÷ peso líquido em gramas
```

**Energia**

```
energia = (potência em watts ÷ 1000) × horas de impressão × tarifa em R$/kWh
```

**Depreciação por hora** — devolve o capital investido na máquina. É uma despesa
diferente da manutenção, que paga as peças de desgaste (bicos, correias,
rolamentos). As duas entram no custo em linhas separadas.

```
depreciação/h = (valor de aquisição − valor residual) ÷ vida útil em horas
custo de máquina/h = depreciação/h + manutenção/h
```

**Mão de obra** — considera apenas o tempo humano efetivo (preparação, retirada
de suportes, acabamento, montagem, embalagem). O tempo de impressão é tempo de
máquina e é contabilizado separadamente.

```
mão de obra = (soma dos minutos ÷ 60) × valor da hora
```

**Custo total de produção**

```
custo direto  = material + energia + depreciação + manutenção + mão de obra + adicionais
reserva       = custo direto × percentual de reserva para falhas
custo total   = custo direto + reserva
```

**Preço de venda** — a margem é calculada sobre o preço de venda, não como
markup sobre o custo:

```
preço = (custo total + taxa fixa) ÷ (1 − margem − taxas − impostos)
```

Com custo de R$ 25,70 e margem de 30%, o preço é R$ 36,71 — e não R$ 33,41, que
seria o resultado de um markup de 30% sobre o custo (cuja margem real é 23%).

**Desconto** — tem dois comportamentos, escolhidos na precificação:

- *Absorver na margem*: o preço cai e a margem efetiva diminui. O sistema mostra
  a margem efetiva ao lado da desejada para você ver o impacto.
- *Embutir no preço*: o preço de tabela é elevado para que, após o desconto, a
  margem-alvo se mantenha.

**Desperdício** — se o peso informado já vem do fatiador com suportes, brim e
purga, marque "já inclusos no peso". O percentual de desperdício é então
ignorado, para não contar a mesma perda duas vezes.

## Estrutura

```
src/
├── core/                  Regras de negócio puras, sem React
│   ├── money.js           Valores em centavos inteiros, formatação BRL
│   ├── units.js           Tempo (aceita "2:30"), peso, percentuais
│   ├── materials.js       Custo por grama e validação
│   ├── printers.js        Depreciação, manutenção e energia
│   ├── pricing.js         Motor de precificação
│   └── reports.js         Agregações do dashboard
├── data/                  Persistência, isolada da interface
│   ├── driver.js          localStorage com fallback em memória
│   ├── schema.js          Formato dos dados, valores iniciais, migrações
│   ├── db.js              Repositório assíncrono e reativo
│   └── backup.js          Exportação e importação em JSON
├── store/                 Ponte entre a persistência e o React
├── router/                Roteador por hash
├── components/
│   ├── brand/             Marca TRIDDO 3D
│   ├── charts/            Gráficos em SVG (rosca e colunas)
│   ├── layout/            Menu lateral, gaveta e barra inferior
│   └── ui/                Botões, campos, cartões, modais, avisos
├── features/
│   ├── materials/         Formulário de material
│   ├── printers/          Formulário de impressora
│   ├── pricing/           Conversão do formulário e painel de resultados
│   └── quotes/            Geração do PDF do orçamento
├── pages/                 Uma página por rota
├── lib/                   Utilitários de formulário
└── firebase/              Leitura dos dados da versão anterior (carregado sob demanda)

tests/                     Testes das fórmulas e da persistência
legacy/                    Implementação original em JavaScript puro (não usada)
```

### Valores monetários

Todo valor é guardado em **centavos inteiros**, o que elimina erros de ponto
flutuante ao somar dinheiro. Taxas (R$/g, R$/h, R$/kWh) são decimais, e a
conversão de taxa para valor acontece sempre em uma única expressão encerrada
por arredondamento — nunca em etapas acumuladas.

Os custos são calculados **por peça** e arredondados ao centavo; o total do lote
é a multiplicação pela quantidade. Assim `preço unitário × quantidade` é sempre
exatamente igual ao preço total mostrado ao cliente.

## Armazenamento e backup

Os dados ficam no `localStorage` deste navegador, em um único registro JSON, sob
uma camada de repositório com API assíncrona (`src/data/db.js`). Migrar para
Firebase, IndexedDB ou uma API REST exige trocar apenas essa camada — nenhuma
página precisa ser reescrita.

Em **Configurações** é possível exportar tudo em JSON e importar de volta. A
importação valida o arquivo, mostra quantos registros ele contém e pergunta se
você quer substituir tudo ou mesclar com os dados atuais. Nada é sobrescrito sem
confirmação.

> Limpar o histórico do navegador apaga os dados. Exporte um backup
> periodicamente.

### Dados da versão anterior

Filamentos que estavam no Firestore podem ser trazidos pelo botão "Importar
filamentos do Firebase", em Configurações. Filamentos salvos no `localStorage`
pela versão em JavaScript puro (chave `triddo_filaments`) são importados
automaticamente na primeira execução.

## Testes

```bash
npm test
```

128 testes cobrem o motor de cálculo e a persistência:

- **Precificação**: componentes de custo, separação entre tempo de máquina e de
  mão de obra, desperdício (incluindo o caso de dupla contagem), reserva para
  falhas, custos por peça e por lote, margem sobre o preço de venda, taxas,
  impostos, taxa fixa rateada, desconto absorvido e embutido, valor mínimo de
  venda, preço de equilíbrio e todas as validações (divisor ≤ 0, peso zero,
  quantidade inválida, valores negativos).
- **Materiais e impressoras**: custo por grama, depreciação automática e manual,
  energia, validações.
- **Relatórios**: orçamento pendente não conta como receita, ranking de
  materiais, série mensal.
- **Backup**: validação de arquivo inválido, formato estranho, versão futura,
  identificadores repetidos; migração do formato antigo.
- **PDF**: garante que o documento do cliente não revela custos internos nem
  margem de lucro, e que campos digitados são escapados.

## O que mudou em relação à versão anterior

A calculadora antiga somava custo de filamento, energia e uma taxa fixa de
R$ 0,10 por grama, e aplicava markup de 30% sobre o custo. Potência (110 W) e
tarifa (R$ 0,857/kWh) estavam fixas no código.

A nova versão substitui essa lógica por um motor completo, mantendo o modo de
precificação rápida para quem quer um número rápido. Nenhum valor financeiro
está fixo no código: tudo vem de Configurações ou dos cadastros.

Componentes substituídos e removidos, com a funcionalidade preservada em outro
lugar:

| Removido | Substituído por |
| --- | --- |
| `Calculator.jsx`, `Results.jsx` | `pages/PricingPage.jsx` + `core/pricing.js` |
| `FilamentForm.jsx`, `FilamentList.jsx` | `pages/MaterialsPage.jsx` |
| `Header.jsx` | `components/brand/Logo.jsx` (mesmo desenho do logo) |
| `Notification.jsx` | `components/ui/Toast.jsx` |
| `hooks/useFilaments.js` | `store/StoreProvider.jsx` + `data/db.js` |
| Font Awesome via CDN | `components/ui/Icon.jsx` (SVG embutido) |

O SDK do Firebase saiu do carregamento inicial e só é baixado se você usar a
importação dos dados antigos.

## Limitações conhecidas

- Os dados vivem no navegador. Não há login nem sincronização entre
  dispositivos — o backup em JSON é a forma de mover os dados.
- O PDF é gerado pela caixa de impressão do navegador ("Salvar como PDF"). É
  preciso permitir pop-ups para o site.
- O gráfico mensal do dashboard aparece a partir de dois meses com orçamentos
  aprovados.
- O tempo de impressão e o peso valem para uma peça ou para o lote inteiro
  conforme a opção escolhida; não há como misturar as duas bases na mesma
  precificação.
- Um orçamento salvo guarda os valores do momento do cálculo. Alterar depois o
  preço de um material não recalcula orçamentos antigos — reabra e salve de novo
  se quiser atualizar.
- As regras do Firestore em `firestore.rules` liberam leitura pública da coleção
  de filamentos. Restrinja-as depois de concluir a importação.

## Licença

Projeto proprietário da TRIDDO 3D — Print and Design 3D.
