import React, { useMemo } from 'react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  PageHeader,
  StatCard,
} from '../components/ui/primitives';
import Icon from '../components/ui/Icon';
import BarChart from '../components/charts/BarChart';
import { QUOTE_STATUS, QUOTE_STATUS_LABELS, monthlySeries, summarizeQuotes, topMaterials } from '../core/reports';
import { formatCents, formatNumber, formatRatioAsPercent, fromCents } from '../core/money';
import { formatHours } from '../core/units';
import { formatDate } from '../lib/form';
import { ROUTES, buildHash } from '../router/routes';
import { useStore } from '../store/StoreProvider';

export default function DashboardPage({ navigate }) {
  const { quotes, materials, printers, settings } = useStore();

  const summary = useMemo(() => summarizeQuotes(quotes), [quotes]);
  const ranking = useMemo(() => topMaterials(quotes, 5), [quotes]);
  const series = useMemo(() => monthlySeries(quotes, 6), [quotes]);
  const recent = useMemo(
    () => [...quotes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5),
    [quotes],
  );

  const hasQuotes = quotes.length > 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`${settings.company.name} · visão geral dos orçamentos e da operação.`}
        actions={
          <Button variant="primary" icon="plus" onClick={() => navigate(ROUTES.PRICING)}>
            Nova precificação
          </Button>
        }
      />

      {!hasQuotes ? (
        <Card className="mb-5">
          <EmptyState
            icon="sparkles"
            title="Comece pela primeira precificação"
            description="Os indicadores aparecem aqui conforme você salva orçamentos. Materiais e impressoras já estão prontos para usar."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="primary" icon="calculator" onClick={() => navigate(ROUTES.PRICING)}>
                  Precificar uma peça
                </Button>
                <Button variant="secondary" icon="spool" onClick={() => navigate(ROUTES.MATERIALS)}>
                  Ver materiais
                </Button>
              </div>
            }
          />
        </Card>
      ) : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Orçamentos" value={summary.total} icon="receipt" />
        <StatCard label="Aprovados" value={summary.approved} icon="check" tone="positive" />
        <StatCard
          label="Receita registrada"
          value={formatCents(summary.revenueCents)}
          hint="Somente aprovados"
          icon="money"
          tone="blue"
        />
        <StatCard
          label="Custos estimados"
          value={formatCents(summary.costCents)}
          hint="Produção dos aprovados"
          icon="chart"
          tone="warning"
        />
        <StatCard
          label="Lucro estimado"
          value={formatCents(summary.profitCents)}
          hint={`Margem média ${formatRatioAsPercent(summary.averageMargin, 0)}`}
          icon="trendingUp"
          tone={summary.profitCents >= 0 ? 'positive' : 'negative'}
        />
        <StatCard
          label="Em negociação"
          value={formatCents(summary.pipelineCents)}
          hint="Rascunhos e enviados"
          icon="send"
          tone="purple"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Evolução mensal */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Evolução mensal"
            subtitle="Receita, custo e lucro dos orçamentos aprovados"
            icon="chart"
          />
          <CardBody>
            {series.length >= 2 ? (
              <BarChart
                data={series.map((point) => ({
                  key: point.key,
                  label: point.label,
                  revenue: fromCents(point.revenueCents),
                  cost: fromCents(point.costCents),
                  profit: fromCents(point.profitCents),
                }))}
                series={[
                  { key: 'revenue', label: 'Receita', color: '#4C7DFF' },
                  { key: 'cost', label: 'Custo', color: '#8B5CF6' },
                  { key: 'profit', label: 'Lucro', color: '#34D399' },
                ]}
                formatValue={(value) => formatCents(Math.round(value * 100))}
              />
            ) : (
              <p className="py-6 text-center text-sm text-gray-500">
                O gráfico aparece quando houver orçamentos aprovados em pelo menos dois meses diferentes.
              </p>
            )}
          </CardBody>
        </Card>

        {/* Materiais mais usados */}
        <Card>
          <CardHeader
            title="Materiais mais utilizados"
            subtitle="Consumo em orçamentos aprovados"
            icon="spool"
          />
          <CardBody>
            {ranking.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">
                Nenhum consumo registrado ainda. Aprove um orçamento para alimentar este ranking.
              </p>
            ) : (
              <ul className="space-y-3">
                {ranking.map((item) => (
                  <li key={item.name}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-sm text-gray-200">{item.name}</span>
                      <span className="shrink-0 text-xs tabular-nums text-gray-500">
                        {formatNumber(item.grams, 0)} g · {item.quotes}{' '}
                        {item.quotes === 1 ? 'orçamento' : 'orçamentos'}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-ink-800">
                      <div
                        className="h-full rounded-full bg-brand-gradient"
                        style={{ width: `${Math.max(4, item.share * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Operação */}
        <Card>
          <CardHeader title="Operação" subtitle="Cadastros e produção acumulada" icon="printer" />
          <CardBody>
            <ul className="space-y-3 text-sm">
              <OperationRow icon="spool" label="Materiais cadastrados" value={materials.length} />
              <OperationRow icon="printer" label="Impressoras cadastradas" value={printers.length} />
              <OperationRow icon="box" label="Peças vendidas" value={summary.unitsSold} />
              <OperationRow
                icon="weight"
                label="Filamento consumido"
                value={`${formatNumber(summary.gramsUsed / 1000, 2)} kg`}
              />
              <OperationRow
                icon="clock"
                label="Horas de impressão"
                value={formatHours(summary.printHours)}
              />
              <OperationRow
                icon="check"
                label="Taxa de aprovação"
                value={formatRatioAsPercent(summary.conversionRate, 0)}
              />
              <OperationRow
                icon="money"
                label="Ticket médio"
                value={formatCents(summary.averageTicketCents)}
              />
            </ul>
          </CardBody>
        </Card>

        {/* Últimos orçamentos */}
        {hasQuotes ? (
          <Card className="lg:col-span-2">
            <CardHeader
              title="Últimos orçamentos"
              icon="receipt"
              actions={
                <a href={buildHash(ROUTES.QUOTES)}>
                  <Button variant="ghost" size="sm" iconRight="chevronRight">
                    Ver todos
                  </Button>
                </a>
              }
            />
            <CardBody className="space-y-2">
              {recent.map((quote) => (
                <a
                  key={quote.id}
                  href={buildHash(ROUTES.QUOTES)}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-ink-800 bg-ink-850/60 p-3 transition-colors hover:border-ink-600"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-brand-blue-400">{quote.code}</span>
                      <Badge
                        tone={
                          quote.status === QUOTE_STATUS.APPROVED
                            ? 'positive'
                            : quote.status === QUOTE_STATUS.REJECTED
                              ? 'negative'
                              : quote.status === QUOTE_STATUS.SENT
                                ? 'blue'
                                : 'neutral'
                        }
                      >
                        {QUOTE_STATUS_LABELS[quote.status]}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-gray-200">{quote.projectName}</p>
                    <p className="text-xs text-gray-600">{formatDate(quote.createdAt)}</p>
                  </div>
                  <span className="text-base font-bold tabular-nums text-gray-100">
                    {formatCents(quote.totals?.price)}
                  </span>
                </a>
              ))}
            </CardBody>
          </Card>
        ) : null}
      </div>

      <p className="mt-5 flex items-start gap-2 text-xs text-gray-600">
        <Icon name="info" size={14} className="mt-0.5" />
        Receita, custo e lucro consideram apenas orçamentos aprovados. Rascunhos e enviados aparecem
        separadamente como negociação em andamento.
      </p>
    </>
  );
}

function OperationRow({ icon, label, value }) {
  return (
    <li className="flex items-center justify-between gap-3 border-b border-ink-800 pb-2.5 last:border-0 last:pb-0">
      <span className="flex items-center gap-2.5 text-gray-400">
        <Icon name={icon} size={15} className="text-ink-500" />
        {label}
      </span>
      <span className="font-semibold tabular-nums text-gray-100">{value}</span>
    </li>
  );
}
