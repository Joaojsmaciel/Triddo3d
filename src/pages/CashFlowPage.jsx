import React, { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  IconButton,
  PageHeader,
  SearchInput,
  Select,
  StatCard,
} from '../components/ui/primitives';
import Icon from '../components/ui/Icon';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import TransactionFormModal from '../features/cashflow/TransactionFormModal';
import {
  CASH_SOURCE,
  CASH_TYPE,
  availableMonths,
  buildCashEntries,
  filterByMonth,
  summarizeCash,
} from '../core/cashflow';
import { formatCents, formatRatioAsPercent } from '../core/money';
import { formatDate } from '../lib/form';
import { ROUTES } from '../router/routes';
import { useStore } from '../store/StoreProvider';

const TYPE_FILTERS = [
  { value: CASH_TYPE.IN, label: 'Só entradas' },
  { value: CASH_TYPE.OUT, label: 'Só saídas' },
];

export default function CashFlowPage({ navigate }) {
  const { quotes, transactions, actions } = useStore();

  const [month, setMonth] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const entries = useMemo(() => buildCashEntries(quotes, transactions), [quotes, transactions]);
  const months = useMemo(() => availableMonths(entries), [entries]);
  const inPeriod = useMemo(() => filterByMonth(entries, month), [entries, month]);
  const summary = useMemo(() => summarizeCash(inPeriod), [inPeriod]);

  const quoteById = useMemo(() => new Map(quotes.map((quote) => [quote.id, quote])), [quotes]);
  const sortedQuotes = useMemo(
    () => [...quotes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [quotes],
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return inPeriod.filter((entry) => {
      if (typeFilter && entry.type !== typeFilter) return false;
      if (!term) return true;
      return [entry.description, entry.category, entry.notes]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(term));
    });
  }, [inPeriod, typeFilter, search]);

  const handleSave = async (transaction) => {
    const saved = await actions.saveTransaction(transaction);
    if (saved) setEditing(null);
  };

  const handleDelete = async () => {
    await actions.deleteTransaction(pendingDelete.id);
    setPendingDelete(null);
  };

  const periodLabel = month ? months.find((item) => item.key === month)?.label : 'todo o período';

  return (
    <>
      <PageHeader
        title="Fluxo de caixa"
        description="Entradas e saídas reais. Orçamentos aprovados entram sozinhos; registre aqui o que saiu do caixa."
        actions={
          <>
            <Button variant="secondary" icon="plus" onClick={() => setEditing({ defaultType: CASH_TYPE.IN })}>
              Entrada
            </Button>
            <Button variant="primary" icon="plus" onClick={() => setEditing({ defaultType: CASH_TYPE.OUT })}>
              Saída
            </Button>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Receita"
          value={formatCents(summary.inCents)}
          hint={`Entradas em ${periodLabel}`}
          icon="money"
          tone="blue"
        />
        <StatCard
          label="Saídas"
          value={formatCents(summary.outCents)}
          hint="Tudo o que saiu do caixa"
          icon="trendingDown"
          tone="warning"
        />
        <StatCard
          label="Lucro (caixa)"
          value={formatCents(summary.balanceCents)}
          hint="Receita − saídas"
          icon="wallet"
          tone={summary.balanceCents >= 0 ? 'positive' : 'negative'}
        />
        <StatCard
          label="Margem real"
          value={formatRatioAsPercent(summary.margin, 0)}
          hint="Quanto sobra de cada R$ 1 recebido"
          icon="trendingUp"
          tone={summary.margin >= 0 ? 'positive' : 'negative'}
        />
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por descrição, categoria..."
          className="flex-1"
        />
        <Select
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          placeholder="Todos os meses"
          options={months.map((item) => ({ value: item.key, label: item.label }))}
          className="sm:w-44"
        />
        <Select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          placeholder="Entradas e saídas"
          options={TYPE_FILTERS}
          className="sm:w-44"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {visible.length === 0 ? (
            <Card>
              <EmptyState
                icon="wallet"
                title={entries.length === 0 ? 'Nenhum movimento ainda' : 'Nenhum lançamento encontrado'}
                description={
                  entries.length === 0
                    ? 'Aprove um orçamento ou registre uma saída, como a compra de filamento.'
                    : 'Ajuste a busca ou os filtros.'
                }
                action={
                  entries.length === 0 ? (
                    <Button variant="primary" icon="plus" onClick={() => setEditing({ defaultType: CASH_TYPE.OUT })}>
                      Registrar saída
                    </Button>
                  ) : null
                }
              />
            </Card>
          ) : (
            <Card>
              <ul className="divide-y divide-ink-800">
                {visible.map((entry) => {
                  const isIn = entry.type === CASH_TYPE.IN;
                  const fromQuote = entry.source === CASH_SOURCE.QUOTE;
                  const related = !fromQuote && entry.quoteId ? quoteById.get(entry.quoteId) : null;

                  return (
                    <li key={entry.id} className="flex items-center gap-3 p-3 sm:p-4">
                      <span
                        className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1 ring-inset ${
                          isIn
                            ? 'bg-positive/10 text-positive ring-positive/25'
                            : 'bg-negative/10 text-negative ring-negative/25'
                        }`}
                      >
                        <Icon name={isIn ? 'trendingUp' : 'trendingDown'} size={16} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-100">{entry.description}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                          <span>{formatDate(`${entry.date}T12:00:00`)}</span>
                          <span>·</span>
                          <span>{entry.category || (isIn ? 'Entrada' : 'Saída')}</span>
                          {fromQuote ? <Badge tone="blue">Automático</Badge> : null}
                          {related ? (
                            <span className="truncate text-gray-600">Ref. {related.code}</span>
                          ) : null}
                        </div>
                      </div>

                      <span
                        className={`shrink-0 text-sm font-bold tabular-nums ${isIn ? 'text-positive' : 'text-negative'}`}
                      >
                        {isIn ? '+' : '−'} {formatCents(entry.amountCents)}
                      </span>

                      <div className="flex shrink-0 items-center">
                        {fromQuote ? (
                          <IconButton
                            icon="receipt"
                            label="Ver orçamento"
                            onClick={() => navigate(ROUTES.QUOTES)}
                          />
                        ) : (
                          <>
                            <IconButton icon="edit" label="Editar" onClick={() => setEditing({ transaction: entry })} />
                            <IconButton
                              icon="trash"
                              label="Excluir"
                              variant="danger"
                              onClick={() => setPendingDelete(entry)}
                            />
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader title="Para onde foi o dinheiro" subtitle={`Saídas por categoria · ${periodLabel}`} icon="chart" />
          <CardBody>
            {summary.outByCategory.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">Nenhuma saída registrada no período.</p>
            ) : (
              <ul className="space-y-3">
                {summary.outByCategory.map((item) => (
                  <li key={item.category}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-sm text-gray-200">{item.category}</span>
                      <span className="shrink-0 text-xs tabular-nums text-gray-500">
                        {formatCents(item.cents)} · {formatRatioAsPercent(item.share, 0)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-ink-800">
                      <div
                        className="h-full rounded-full bg-negative/70"
                        style={{ width: `${Math.max(4, item.share * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <p className="mt-5 flex items-start gap-2 text-xs text-gray-600">
        <Icon name="info" size={14} className="mt-0.5" />
        Orçamentos aprovados entram como receita na data da aprovação. Para tirar um deles do caixa, mude o
        status do orçamento.
      </p>

      <TransactionFormModal
        open={Boolean(editing)}
        transaction={editing?.transaction || null}
        defaultType={editing?.defaultType}
        quotes={sortedQuotes}
        onClose={() => setEditing(null)}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Excluir lançamento"
        message={
          pendingDelete
            ? `"${pendingDelete.description}" (${formatCents(pendingDelete.amountCents)}) será removido do caixa.`
            : ''
        }
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
