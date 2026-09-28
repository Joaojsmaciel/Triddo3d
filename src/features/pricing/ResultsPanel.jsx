import React from 'react';
import {
  Badge,
  Callout,
  Card,
  CardBody,
  CardHeader,
  DataRow,
  EmptyState,
  Slider,
} from '../../components/ui/primitives';
import DonutChart from '../../components/charts/DonutChart';
import { formatCents, formatRatioAsPercent, fromCents } from '../../core/money';
import { formatHours } from '../../core/units';

/**
 * Resultados da precificação: composição de custos, preço destacado e o controle
 * de margem que atualiza preço e lucro imediatamente.
 */
export default function ResultsPanel({ result, quantity, marginPercent, onMarginChange }) {
  if (!result?.ok) {
    return (
      <Card>
        <CardHeader title="Resultado" icon="chart" />
        <EmptyState
          icon="calculator"
          title="Faltam dados para calcular"
          description={
            result?.errors?.length
              ? result.errors[0].message
              : 'Preencha material, impressora, peso e tempo de impressão.'
          }
        />
      </Card>
    );
  }

  const { perUnit, batch, breakdown, effectiveMargin, targetMargin } = result;
  const isBatch = quantity > 1;
  const marginGap = targetMargin - effectiveMargin;

  const chartData = breakdown.map((item) => ({
    key: item.key,
    label: item.label,
    value: fromCents(item.cents),
    color: item.color,
    display: formatCents(item.cents),
    percent: formatRatioAsPercent(item.share, 0),
  }));

  return (
    <div className="space-y-4">
      {/* Preço de venda em destaque */}
      <Card className="overflow-hidden">
        <div className="bg-brand-gradient p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/75">
            Preço de venda sugerido {isBatch ? '· por peça' : ''}
          </p>
          <p className="mt-1 text-4xl font-extrabold tabular-nums leading-none">
            {formatCents(perUnit.price)}
          </p>

          {perUnit.discount > 0 ? (
            <p className="mt-2 text-sm text-white/80">
              <span className="line-through">{formatCents(perUnit.listPrice)}</span>
              <span className="ml-2 font-semibold">− {formatCents(perUnit.discount)} de desconto</span>
            </p>
          ) : null}

          {isBatch ? (
            <div className="mt-4 flex items-baseline justify-between border-t border-white/20 pt-3">
              <span className="text-sm text-white/80">Total de {quantity} peças</span>
              <span className="text-2xl font-bold tabular-nums">{formatCents(batch.price)}</span>
            </div>
          ) : null}
        </div>

        <CardBody className="space-y-1">
          <DataRow
            label="Lucro estimado"
            hint={isBatch ? 'por peça' : undefined}
            value={formatCents(perUnit.profit)}
            tone={perUnit.profit >= 0 ? 'positive' : 'negative'}
            strong
          />
          {isBatch ? (
            <DataRow label="Lucro do lote" value={formatCents(batch.profit)} tone="positive" />
          ) : null}
          <DataRow
            label="Margem efetiva"
            value={formatRatioAsPercent(effectiveMargin)}
            tone={marginGap > 0.005 ? 'negative' : 'positive'}
          />
          <DataRow label="Margem desejada" value={formatRatioAsPercent(targetMargin)} tone="muted" />
          <DataRow label="Preço mínimo" value={formatCents(perUnit.minimumPrice)} tone="muted" />
          <DataRow
            label="Preço de equilíbrio"
            hint="margem zero"
            value={formatCents(perUnit.breakEven)}
            tone="muted"
          />
        </CardBody>
      </Card>

      {/* Simulação de margem */}
      <Card>
        <CardBody>
          <Slider
            label="Simular margem de lucro"
            value={marginPercent}
            onChange={onMarginChange}
            min={0}
            max={90}
            step={1}
            hint="Arraste para ver o efeito imediato no preço e no lucro."
          />
        </CardBody>
      </Card>

      {/* Composição dos custos */}
      <Card>
        <CardHeader
          title="Composição do custo"
          subtitle={`Custo total de produção: ${formatCents(perUnit.totalCost)}${isBatch ? ' por peça' : ''}`}
          icon="chart"
        />
        <CardBody>
          <DonutChart
            data={chartData}
            centerLabel="Custo"
            centerValue={formatCents(perUnit.totalCost)}
          />
        </CardBody>
      </Card>

      {/* Detalhamento */}
      <Card>
        <CardHeader title="Detalhamento" icon="receipt" />
        <CardBody>
          <div className="space-y-0.5">
            <DataRow label="Custo do material" value={formatCents(perUnit.material)} />
            <DataRow label="Energia elétrica" value={formatCents(perUnit.energy)} />
            <DataRow label="Depreciação da impressora" value={formatCents(perUnit.depreciation)} />
            <DataRow label="Manutenção" value={formatCents(perUnit.maintenance)} />
            <DataRow label="Custo de máquina" value={formatCents(perUnit.machine)} tone="muted" />
            <DataRow label="Mão de obra" value={formatCents(perUnit.labor)} />
            <DataRow label="Custos adicionais" value={formatCents(perUnit.extras)} />
            <DataRow label="Reserva para falhas" value={formatCents(perUnit.failureReserve)} />
          </div>

          <div className="my-3 border-t border-ink-700" />

          <DataRow label="Custo total de produção" value={formatCents(perUnit.totalCost)} strong />

          <div className="my-3 border-t border-ink-700" />

          <div className="space-y-0.5">
            <DataRow label="Taxas de cartão/plataforma" value={formatCents(perUnit.cardFee)} tone="muted" />
            <DataRow label="Impostos" value={formatCents(perUnit.tax)} tone="muted" />
            {perUnit.fixedFee > 0 ? (
              <DataRow label="Taxa fixa rateada" value={formatCents(perUnit.fixedFee)} tone="muted" />
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2 border-t border-ink-700 pt-4">
            <Badge tone="blue" icon="clock">
              Máquina: {formatHours(perUnit.printHours)}
            </Badge>
            <Badge tone="purple" icon="users">
              Trabalho: {formatHours(perUnit.laborHours)}
            </Badge>
            <Badge tone="neutral" icon="weight">
              {perUnit.billableGrams.toFixed(1).replace('.', ',')} g cobradas
            </Badge>
            <Badge tone="neutral" icon="zap">
              {perUnit.energyKwh.toFixed(3).replace('.', ',')} kWh
            </Badge>
          </div>
        </CardBody>
      </Card>

      {result.warnings.length > 0 ? (
        <div className="space-y-2">
          {result.warnings.map((warning) => (
            <Callout
              key={warning.code}
              tone={warning.code === 'negative-profit' ? 'negative' : 'warning'}
            >
              {warning.message}
            </Callout>
          ))}
        </div>
      ) : null}
    </div>
  );
}
