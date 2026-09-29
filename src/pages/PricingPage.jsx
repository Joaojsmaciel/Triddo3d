import React, { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  DataRow,
  EmptyState,
  IconButton,
  MoneyInput,
  NumberInput,
  PageHeader,
  SectionTitle,
  Select,
  TextInput,
  Textarea,
  ToggleGroup,
} from '../components/ui/primitives';
import Icon from '../components/ui/Icon';
import ResultsPanel from '../features/pricing/ResultsPanel';
import {
  EXTRA_PRESETS,
  PRICING_MODE,
  buildQuote,
  createExtra,
  createFormState,
  formStateFromQuote,
  toPricingInput,
} from '../features/pricing/pricingForm';
import { BASIS, DISCOUNT_MODE, LABOR_STEPS, WASTE_MODE, calculatePricing } from '../core/pricing';
import { costPerGramReais } from '../core/materials';
import { describePrinter, machineCostPerHourCents } from '../core/printers';
import { formatCents, formatRate, fromCents } from '../core/money';
import { QUOTE_STATUS } from '../core/reports';
import { ROUTES } from '../router/routes';
import { useStore } from '../store/StoreProvider';
import { useToast } from '../components/ui/Toast';

const LABOR_HINTS = {
  prepMinutes: 'Fatiar, preparar a mesa, iniciar',
  supportMinutes: 'Remover suportes e brim',
  finishingMinutes: 'Lixar, colar, pintar',
  assemblyMinutes: 'Montar partes e encaixes',
  packagingMinutes: 'Embalar e etiquetar',
};

export default function PricingPage({ params, navigate }) {
  const { materials, printers, quotes, settings, actions } = useStore();
  const toast = useToast();

  const [mode, setMode] = useState(PRICING_MODE.FULL);
  const [form, setForm] = useState(() =>
    createFormState(settings, { material: materials[0], printer: printers[0] }),
  );
  const [loadedQuoteId, setLoadedQuoteId] = useState(null);

  // Reabre um orçamento salvo quando a URL trouxer #/precificacao?quote=<id>.
  useEffect(() => {
    if (!params.quote || params.quote === loadedQuoteId) return;
    const quote = quotes.find((item) => item.id === params.quote);
    if (!quote) return;

    const restored = formStateFromQuote(quote, settings);
    setForm(restored);
    setMode(quote.input?.__mode === PRICING_MODE.QUICK ? PRICING_MODE.QUICK : PRICING_MODE.FULL);
    setLoadedQuoteId(params.quote);
    toast.info(`Orçamento ${quote.code} carregado para edição.`);
  }, [params.quote, quotes, settings, loadedQuoteId, toast]);

  const set = (field) => (value) => setForm((current) => ({ ...current, [field]: value }));
  const setEvent = (field) => (event) => set(field)(event.target.value);
  const setMargin = (value) =>
    setForm((current) => ({ ...current, marginPercent: value, priceOverride: '' }));

  const material = materials.find((item) => item.id === form.materialId) || null;
  const printer = printers.find((item) => item.id === form.printerId) || null;

  const pricingInput = useMemo(() => toPricingInput(form, settings, mode), [form, settings, mode]);
  const result = useMemo(
    () => calculatePricing(pricingInput, { material, printer }),
    [pricingInput, material, printer],
  );

  const errorFor = (field) => result.errors.find((error) => error.field === field)?.message;
  const quantity = Math.max(1, Math.trunc(Number(pricingInput.quantity) || 1));
  const isQuick = mode === PRICING_MODE.QUICK;

  const addExtra = (label = '') =>
    setForm((current) => ({ ...current, extras: [...current.extras, createExtra(label)] }));

  const updateExtra = (key, patch) =>
    setForm((current) => ({
      ...current,
      extras: current.extras.map((extra) => (extra.key === key ? { ...extra, ...patch } : extra)),
    }));

  const removeExtra = (key) =>
    setForm((current) => ({ ...current, extras: current.extras.filter((extra) => extra.key !== key) }));

  const handleSave = async (status) => {
    if (!result.ok) {
      toast.error(result.errors[0]?.message || 'Revise os dados antes de salvar.');
      return;
    }

    const existing = loadedQuoteId ? quotes.find((item) => item.id === loadedQuoteId) : null;
    const code = existing?.code || (await actions.reserveQuoteCode());

    const quote = buildQuote({
      form,
      result,
      mode,
      material,
      printer,
      code,
      status,
      existing,
    });

    const saved = await actions.saveQuote(
      quote,
      existing ? `Orçamento ${code} atualizado.` : `Orçamento ${code} salvo.`,
    );
    if (saved) navigate(ROUTES.QUOTES);
  };

  const handleReset = () => {
    setForm(createFormState(settings, { material: materials[0], printer: printers[0] }));
    setLoadedQuoteId(null);
    navigate(ROUTES.PRICING);
  };

  if (materials.length === 0 || printers.length === 0) {
    return (
      <>
        <PageHeader title="Nova precificação" />
        <Card>
          <EmptyState
            icon="alert"
            title="Cadastre material e impressora primeiro"
            description="A precificação precisa do custo por grama do filamento e do custo de máquina por hora para calcular o custo real de produção."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {materials.length === 0 ? (
                  <Button variant="primary" icon="spool" onClick={() => navigate(ROUTES.MATERIALS)}>
                    Cadastrar material
                  </Button>
                ) : null}
                {printers.length === 0 ? (
                  <Button variant="primary" icon="printer" onClick={() => navigate(ROUTES.PRINTERS)}>
                    Cadastrar impressora
                  </Button>
                ) : null}
              </div>
            }
          />
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={loadedQuoteId ? 'Editar precificação' : 'Nova precificação'}
        description="Custo real de produção, mão de obra, despesas comerciais e margem sobre o preço de venda."
        actions={
          <>
            <Button variant="ghost" icon="refresh" onClick={handleReset}>
              Limpar
            </Button>
            <Button variant="secondary" icon="save" onClick={() => handleSave(QUOTE_STATUS.DRAFT)}>
              Salvar rascunho
            </Button>
            <Button variant="primary" icon="check" onClick={() => handleSave(QUOTE_STATUS.SENT)}>
              Salvar e marcar enviado
            </Button>
          </>
        }
      />

      <div className="mb-5">
        <ToggleGroup
          label="Modo de precificação"
          hint={
            isQuick
              ? 'Rápido: peso, tempo e margem. Mão de obra, extras e taxas usam os padrões de Configurações.'
              : 'Completo: todas as seções de custo e precificação comercial.'
          }
          value={mode}
          onChange={setMode}
          options={[
            { value: PRICING_MODE.FULL, label: 'Precificação completa' },
            { value: PRICING_MODE.QUICK, label: 'Precificação rápida' },
          ]}
          className="max-w-md"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* ----------------------------------------------------- Formulário */}
        <div className="space-y-5">
          {/* A. Dados da impressão */}
          <Card>
            <CardBody>
              <SectionTitle index="A" title="Dados da impressão" />

              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextInput
                    label="Nome do projeto"
                    value={form.projectName}
                    onChange={setEvent('projectName')}
                    placeholder="Ex.: Suporte de fone personalizado"
                  />
                  <TextInput
                    label="Cliente (opcional)"
                    value={form.clientName}
                    onChange={setEvent('clientName')}
                    placeholder="Nome do cliente"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Select
                    label="Material utilizado"
                    value={form.materialId}
                    onChange={setEvent('materialId')}
                    placeholder="Selecione um material"
                    error={errorFor('materialId')}
                    hint={
                      material
                        ? `Custo: ${formatRate(costPerGramReais(material), 4)} por grama`
                        : undefined
                    }
                    options={materials.map((item) => ({
                      value: item.id,
                      label: `${[item.brand, item.name].filter(Boolean).join(' ')} · ${item.type}`,
                    }))}
                  />
                  <Select
                    label="Impressora"
                    value={form.printerId}
                    onChange={setEvent('printerId')}
                    placeholder="Selecione uma impressora"
                    error={errorFor('printerId')}
                    hint={
                      printer
                        ? `Máquina: ${formatRate(fromCents(machineCostPerHourCents(printer)), 4)}/h · ${printer.powerWatts} W`
                        : undefined
                    }
                    options={printers.map((item) => ({
                      value: item.id,
                      label: describePrinter(item),
                    }))}
                  />
                </div>

                <ToggleGroup
                  label="Peso, tempo e mão de obra informados referem-se a"
                  hint="Use “lote completo” quando várias peças saem na mesma plataforma em uma única impressão."
                  value={form.basis}
                  onChange={set('basis')}
                  options={[
                    { value: BASIS.UNIT, label: 'Uma peça' },
                    { value: BASIS.BATCH, label: 'Lote completo' },
                  ]}
                />

                <div className="grid gap-4 sm:grid-cols-3">
                  <NumberInput
                    label="Peso de filamento"
                    suffix="g"
                    value={form.grams}
                    onChange={set('grams')}
                    error={errorFor('grams')}
                  />
                  <TextInput
                    label="Tempo de impressão"
                    value={form.printHours}
                    onChange={setEvent('printHours')}
                    placeholder="2:30 ou 2,5"
                    suffix="h"
                    error={errorFor('printHours')}
                    hint="Aceita h:mm"
                  />
                  <NumberInput
                    label="Quantidade de peças"
                    suffix="un"
                    value={form.quantity}
                    onChange={set('quantity')}
                    error={errorFor('quantity')}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <ToggleGroup
                    label="Suportes, brim e purga"
                    value={form.wasteMode}
                    onChange={set('wasteMode')}
                    options={[
                      { value: WASTE_MODE.ADD, label: 'Somar desperdício' },
                      { value: WASTE_MODE.INCLUDED, label: 'Já inclusos no peso' },
                    ]}
                  />
                  <NumberInput
                    label="Desperdício adicional"
                    suffix="%"
                    value={form.wastePercent}
                    onChange={set('wastePercent')}
                    disabled={form.wasteMode === WASTE_MODE.INCLUDED}
                    hint={
                      form.wasteMode === WASTE_MODE.INCLUDED
                        ? 'Ignorado: o peso já inclui as perdas'
                        : 'Percentual sobre o peso informado'
                    }
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* B. Custos de produção (calculados) */}
          <Card>
            <CardBody>
              <SectionTitle
                index="B"
                title="Custos de produção"
                hint="Calculados automaticamente a partir dos dados acima"
              />

              {result.ok ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <CostTile
                    icon="spool"
                    label="Filamento"
                    value={formatCents(result.perUnit.material)}
                    detail={`${result.perUnit.billableGrams.toFixed(1).replace('.', ',')} g cobradas`}
                  />
                  <CostTile
                    icon="zap"
                    label="Energia elétrica"
                    value={formatCents(result.perUnit.energy)}
                    detail={`${result.perUnit.energyKwh.toFixed(3).replace('.', ',')} kWh × ${formatRate(
                      pricingInput.energyTariff,
                      3,
                    )}`}
                  />
                  <CostTile
                    icon="trendingUp"
                    label="Depreciação"
                    value={formatCents(result.perUnit.depreciation)}
                    detail="Capital da máquina por hora"
                  />
                  <CostTile
                    icon="wrench"
                    label="Manutenção"
                    value={formatCents(result.perUnit.maintenance)}
                    detail="Peças de desgaste por hora"
                  />
                  <CostTile
                    icon="alert"
                    label="Reserva para falhas"
                    value={formatCents(result.perUnit.failureReserve)}
                    detail={`${pricingInput.failureReservePercent}% do custo direto`}
                  />
                  <CostTile
                    icon="money"
                    label="Custo total de produção"
                    value={formatCents(result.perUnit.totalCost)}
                    detail={quantity > 1 ? `${formatCents(result.batch.totalCost)} no lote` : 'por peça'}
                    highlight
                  />
                </div>
              ) : (
                <Callout tone="warning">
                  {result.errors[0]?.message || 'Preencha os dados da impressão para ver os custos.'}
                </Callout>
              )}

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <MoneyInput
                  label="Tarifa de energia"
                  value={form.energyTariff}
                  onChange={set('energyTariff')}
                  suffix="/kWh"
                  error={errorFor('energyTariff')}
                  hint="Padrão definido em Configurações"
                />
                <NumberInput
                  label="Reserva para falhas"
                  suffix="%"
                  value={form.failureReservePercent}
                  onChange={set('failureReservePercent')}
                  hint="Cobre material e tempo perdidos em impressões falhas"
                />
              </div>
            </CardBody>
          </Card>

          {/* C. Mão de obra */}
          {isQuick ? null : (
            <Card>
              <CardBody>
                <SectionTitle
                  index="C"
                  title="Mão de obra"
                  hint="Somente tempo de trabalho humano — a impressão é tempo de máquina"
                />

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {LABOR_STEPS.map((step) => (
                    <NumberInput
                      key={step.key}
                      label={step.label}
                      suffix="min"
                      value={form[step.key]}
                      onChange={set(step.key)}
                      hint={LABOR_HINTS[step.key]}
                    />
                  ))}
                  <MoneyInput
                    label="Valor da hora de trabalho"
                    value={form.laborRate}
                    onChange={set('laborRate')}
                    suffix="/h"
                  />
                </div>

                {result.ok ? (
                  <div className="mt-4 rounded-lg border border-ink-700 bg-ink-850 p-4">
                    <DataRow
                      label="Tempo humano efetivo"
                      value={`${(result.perUnit.laborHours * 60).toFixed(0)} min`}
                      tone="muted"
                    />
                    <DataRow label="Custo de mão de obra" value={formatCents(result.perUnit.labor)} strong />
                    <DataRow
                      label="Tempo de máquina (não é mão de obra)"
                      value={`${result.perUnit.printHours.toFixed(2).replace('.', ',')} h`}
                      tone="muted"
                    />
                  </div>
                ) : null}
              </CardBody>
            </Card>
          )}

          {/* D. Custos adicionais */}
          {isQuick ? null : (
            <Card>
              <CardBody>
                <SectionTitle index="D" title="Custos adicionais" hint="Opcionais, por peça ou pelo lote" />

                {form.extras.length === 0 ? (
                  <p className="mb-3 text-sm text-gray-500">
                    Nenhum custo adicional. Use os atalhos abaixo ou adicione um item personalizado.
                  </p>
                ) : (
                  <div className="mb-4 space-y-3">
                    {form.extras.map((extra) => (
                      <div key={extra.key} className="grid gap-2 sm:grid-cols-[1fr_140px_auto_auto] sm:items-end">
                        <TextInput
                          label="Descrição"
                          value={extra.label}
                          onChange={(event) => updateExtra(extra.key, { label: event.target.value })}
                          placeholder="Ex.: Caixa de papelão"
                        />
                        <MoneyInput
                          label="Valor"
                          value={extra.amount}
                          onChange={(value) => updateExtra(extra.key, { amount: value })}
                        />
                        <button
                          type="button"
                          onClick={() => updateExtra(extra.key, { perUnit: !extra.perUnit })}
                          className="h-[42px] whitespace-nowrap rounded-lg border border-ink-700 bg-ink-850 px-3 text-xs font-semibold text-gray-300 transition-colors hover:border-brand-blue hover:text-brand-blue"
                          title="Alternar entre custo por peça e custo do lote"
                        >
                          {extra.perUnit ? 'por peça' : 'pelo lote'}
                        </button>
                        <IconButton
                          icon="trash"
                          label="Remover custo"
                          variant="danger"
                          className="h-[42px]"
                          onClick={() => removeExtra(extra.key)}
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {EXTRA_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => addExtra(preset)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-ink-700 bg-ink-850 px-3 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:border-brand-blue/50 hover:text-brand-blue"
                    >
                      <Icon name="plus" size={12} />
                      {preset}
                    </button>
                  ))}
                  <Button variant="outline" size="sm" icon="plus" onClick={() => addExtra()}>
                    Personalizado
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          {/* E. Precificação comercial */}
          <Card>
            <CardBody>
              <SectionTitle
                index="E"
                title="Precificação comercial"
                hint="A margem é calculada sobre o preço de venda, não como markup sobre o custo"
              />

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <NumberInput
                  label="Margem de lucro desejada"
                  suffix="%"
                  value={form.marginPercent}
                  onChange={setMargin}
                  error={errorFor('marginPercent')}
                />
                {isQuick ? null : (
                  <>
                    <NumberInput
                      label="Taxa de cartão/plataforma"
                      suffix="%"
                      value={form.cardFeePercent}
                      onChange={set('cardFeePercent')}
                    />
                    <NumberInput
                      label="Impostos"
                      suffix="%"
                      value={form.taxPercent}
                      onChange={set('taxPercent')}
                    />
                    <MoneyInput
                      label="Taxa fixa por pedido"
                      value={form.fixedFee}
                      onChange={set('fixedFee')}
                      hint="Rateada entre as peças"
                    />
                    <NumberInput
                      label="Desconto"
                      suffix="%"
                      value={form.discountPercent}
                      onChange={set('discountPercent')}
                      error={errorFor('discountPercent')}
                    />
                  </>
                )}
                <MoneyInput
                  label="Valor mínimo de venda"
                  value={form.minPrice}
                  onChange={set('minPrice')}
                  hint="Piso por peça"
                />
              </div>

              {isQuick ? null : (
                <ToggleGroup
                  label="Como aplicar o desconto"
                  hint={
                    form.discountMode === DISCOUNT_MODE.ABSORB
                      ? 'O desconto sai da sua margem: o preço cai e a margem efetiva diminui.'
                      : 'O desconto é embutido no preço de tabela: a margem desejada é preservada.'
                  }
                  value={form.discountMode}
                  onChange={set('discountMode')}
                  options={[
                    { value: DISCOUNT_MODE.ABSORB, label: 'Absorver na margem' },
                    { value: DISCOUNT_MODE.GROSS_UP, label: 'Embutir no preço' },
                  ]}
                  className="mt-4 max-w-md"
                />
              )}

              {result.errors.length > 0 ? (
                <Callout tone="negative" title="Corrija para calcular o preço" className="mt-4">
                  <ul className="mt-1 list-inside list-disc space-y-0.5">
                    {result.errors.map((error) => (
                      <li key={`${error.field}-${error.message}`}>{error.message}</li>
                    ))}
                  </ul>
                </Callout>
              ) : null}
            </CardBody>
          </Card>

          {/* Observações */}
          <Card>
            <CardBody>
              <Textarea
                label="Observações do orçamento"
                value={form.notes}
                onChange={setEvent('notes')}
                placeholder="Prazo de entrega, acabamento combinado, condições de pagamento..."
                rows={3}
              />
            </CardBody>
          </Card>
        </div>

        {/* ----------------------------------------------------- Resultados */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <ResultsPanel
            result={result}
            quantity={quantity}
            marginPercent={Number(form.marginPercent) || 0}
            onMarginChange={setMargin}
            priceOverride={form.priceOverride}
            onPriceOverrideChange={set('priceOverride')}
          />

          {result.ok ? (
            <div className="mt-4 flex flex-col gap-2">
              <Button variant="primary" icon="save" onClick={() => handleSave(QUOTE_STATUS.DRAFT)}>
                Salvar como orçamento
              </Button>
              {loadedQuoteId ? (
                <Badge tone="purple" icon="edit" className="self-center">
                  Editando orçamento existente
                </Badge>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

function CostTile({ icon, label, value, detail, highlight = false }) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        highlight ? 'border-brand-blue/40 bg-brand-gradient-soft' : 'border-ink-700 bg-ink-850'
      }`}
    >
      <div className="mb-1 flex items-center gap-2">
        <Icon name={icon} size={14} className={highlight ? 'text-brand-blue' : 'text-ink-500'} />
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      </div>
      <p className={`text-lg font-bold tabular-nums ${highlight ? 'text-brand-blue-400' : 'text-gray-100'}`}>
        {value}
      </p>
      {detail ? <p className="mt-0.5 text-[11px] text-gray-600">{detail}</p> : null}
    </div>
  );
}
