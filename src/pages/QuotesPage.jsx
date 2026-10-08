import React, { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DataRow,
  EmptyState,
  IconButton,
  Modal,
  PageHeader,
  SearchInput,
  Select,
  StatCard,
} from '../components/ui/primitives';
import Icon from '../components/ui/Icon';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { openQuoteDocument } from '../features/quotes/quoteDocument';
import QuoteFilesPanel from '../features/quotes/QuoteFilesPanel';
import { QUOTE_STATUS, QUOTE_STATUS_LABELS, summarizeQuotes } from '../core/reports';
import { formatCents, formatRatioAsPercent } from '../core/money';
import { formatDate, formatDateTime } from '../lib/form';
import { ROUTES } from '../router/routes';
import { useStore } from '../store/StoreProvider';
import { useToast } from '../components/ui/Toast';

const STATUS_TONES = {
  [QUOTE_STATUS.DRAFT]: 'neutral',
  [QUOTE_STATUS.SENT]: 'blue',
  [QUOTE_STATUS.APPROVED]: 'positive',
  [QUOTE_STATUS.REJECTED]: 'negative',
};

const SORT_OPTIONS = [
  { value: 'recent', label: 'Mais recentes' },
  { value: 'oldest', label: 'Mais antigos' },
  { value: 'highest', label: 'Maior valor' },
  { value: 'lowest', label: 'Menor valor' },
];

export default function QuotesPage({ navigate }) {
  const { quotes, settings, actions } = useStore();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState('recent');
  const [detail, setDetail] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const summary = useMemo(() => summarizeQuotes(quotes), [quotes]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    const list = quotes.filter((quote) => {
      if (statusFilter && quote.status !== statusFilter) return false;
      if (!term) return true;
      return [quote.code, quote.projectName, quote.clientName, quote.materialName, quote.notes]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(term));
    });

    const sorters = {
      recent: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      oldest: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      highest: (a, b) => (b.totals?.price || 0) - (a.totals?.price || 0),
      lowest: (a, b) => (a.totals?.price || 0) - (b.totals?.price || 0),
    };

    return [...list].sort(sorters[sort] || sorters.recent);
  }, [quotes, search, statusFilter, sort]);

  const handleExport = (quote) => {
    const opened = openQuoteDocument(quote, settings.company);
    if (!opened) {
      toast.error('O navegador bloqueou a janela do PDF. Permita pop-ups para este site e tente novamente.');
    }
  };

  const handleDelete = async () => {
    await actions.deleteQuote(pendingDelete.id);
    setPendingDelete(null);
    setDetail(null);
  };

  return (
    <>
      <PageHeader
        title="Histórico de orçamentos"
        description="Pesquise, edite, duplique e exporte seus orçamentos em PDF."
        actions={
          <Button variant="primary" icon="plus" onClick={() => navigate(ROUTES.PRICING)}>
            Nova precificação
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total" value={summary.total} icon="receipt" />
        <StatCard label="Aprovados" value={summary.approved} icon="check" tone="positive" />
        <StatCard
          label="Receita registrada"
          value={formatCents(summary.revenueCents)}
          hint="Somente aprovados"
          icon="money"
          tone="blue"
        />
        <StatCard
          label="Em negociação"
          value={formatCents(summary.pipelineCents)}
          hint="Rascunhos e enviados"
          icon="send"
          tone="warning"
        />
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por código, projeto, cliente ou material..."
          className="flex-1"
        />
        <Select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          placeholder="Todos os status"
          options={Object.entries(QUOTE_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          className="sm:w-44"
        />
        <Select
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          options={SORT_OPTIONS}
          className="sm:w-44"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon="receipt"
            title={quotes.length === 0 ? 'Nenhum orçamento salvo' : 'Nenhum orçamento encontrado'}
            description={
              quotes.length === 0
                ? 'Faça uma precificação e salve o resultado para montar seu histórico.'
                : 'Ajuste a busca ou os filtros.'
            }
            action={
              quotes.length === 0 ? (
                <Button variant="primary" icon="calculator" onClick={() => navigate(ROUTES.PRICING)}>
                  Fazer primeira precificação
                </Button>
              ) : null
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((quote) => (
            <Card key={quote.id} className="p-4 transition-colors hover:border-ink-600">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-brand-blue-400">{quote.code}</span>
                    <Badge tone={STATUS_TONES[quote.status]}>{QUOTE_STATUS_LABELS[quote.status]}</Badge>
                    <span className="text-xs text-gray-600">{formatDate(quote.createdAt)}</span>
                  </div>

                  <h3 className="truncate text-sm font-semibold text-gray-100">{quote.projectName}</h3>
                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    {[
                      quote.clientName,
                      quote.materialName,
                      quote.printerName,
                      `${quote.quantity} ${quote.quantity === 1 ? 'peça' : 'peças'}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xl font-bold tabular-nums text-gray-50">
                    {formatCents(quote.totals?.price)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatCents(quote.unit?.price)} / peça · margem{' '}
                    {formatRatioAsPercent(quote.effectiveMargin, 0)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-ink-800 pt-3">
                <div className="flex flex-wrap gap-1">
                  {quote.status !== QUOTE_STATUS.APPROVED ? (
                    <Button
                      variant="positive"
                      size="sm"
                      icon="check"
                      onClick={() => actions.updateQuoteStatus(quote.id, QUOTE_STATUS.APPROVED)}
                    >
                      Aprovar
                    </Button>
                  ) : null}
                  {quote.status === QUOTE_STATUS.DRAFT ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon="send"
                      onClick={() => actions.updateQuoteStatus(quote.id, QUOTE_STATUS.SENT)}
                    >
                      Marcar enviado
                    </Button>
                  ) : null}
                  {quote.status !== QUOTE_STATUS.REJECTED ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon="close"
                      onClick={() => actions.updateQuoteStatus(quote.id, QUOTE_STATUS.REJECTED)}
                    >
                      Recusado
                    </Button>
                  ) : null}
                </div>

                <div className="flex items-center gap-1">
                  <IconButton icon="info" label="Ver detalhes" onClick={() => setDetail(quote)} />
                  <IconButton icon="folder" label="Arquivos do orçamento" onClick={() => setDetail(quote)} />
                  <IconButton icon="file" label="Exportar PDF" onClick={() => handleExport(quote)} />
                  <IconButton
                    icon="edit"
                    label="Editar"
                    onClick={() => navigate(ROUTES.PRICING, { quote: quote.id })}
                  />
                  <IconButton
                    icon="copy"
                    label="Duplicar"
                    onClick={() => actions.duplicateQuote(quote.id)}
                  />
                  <IconButton
                    icon="trash"
                    label="Excluir"
                    variant="danger"
                    onClick={() => setPendingDelete(quote)}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {quotes.length > 0 ? (
        <p className="mt-5 flex items-center gap-2 text-xs text-gray-600">
          <Icon name="info" size={14} />
          {filtered.length} de {quotes.length} {quotes.length === 1 ? 'orçamento' : 'orçamentos'}.
        </p>
      ) : null}

      <QuoteDetailModal
        quote={detail}
        onClose={() => setDetail(null)}
        onExport={handleExport}
        onEdit={(quote) => {
          setDetail(null);
          navigate(ROUTES.PRICING, { quote: quote.id });
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Excluir orçamento"
        message={
          pendingDelete
            ? `O orçamento ${pendingDelete.code} (${pendingDelete.projectName}) será removido definitivamente.`
            : ''
        }
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}

/** Detalhamento interno do orçamento: aqui os custos e a margem aparecem. */
function QuoteDetailModal({ quote, onClose, onExport, onEdit }) {
  if (!quote) return null;

  const unit = quote.unit || {};
  const totals = quote.totals || {};

  return (
    <Modal
      open={Boolean(quote)}
      onClose={onClose}
      title={`${quote.code} · ${quote.projectName}`}
      subtitle={`Criado em ${formatDateTime(quote.createdAt)} · Atualizado em ${formatDateTime(quote.updatedAt)}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
          <Button variant="secondary" icon="edit" onClick={() => onEdit(quote)}>
            Editar
          </Button>
          <Button variant="primary" icon="file" onClick={() => onExport(quote)}>
            Exportar PDF
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Cliente</p>
            <p className="mt-1 text-sm text-gray-200">{quote.clientName || 'Não informado'}</p>
          </Card>
          <Card className="p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Quantidade</p>
            <p className="mt-1 text-sm text-gray-200">
              {quote.quantity} {quote.quantity === 1 ? 'peça' : 'peças'}
            </p>
          </Card>
          <Card className="p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Material</p>
            <p className="mt-1 text-sm text-gray-200">{quote.materialName || '—'}</p>
          </Card>
          <Card className="p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Impressora</p>
            <p className="mt-1 text-sm text-gray-200">{quote.printerName || '—'}</p>
          </Card>
        </div>

        <Card>
          <CardHeader title="Custos detalhados" subtitle="Valores do lote completo" icon="money" />
          <CardBody className="space-y-0.5">
            <DataRow label="Material" value={formatCents(totals.material)} />
            <DataRow label="Energia" value={formatCents(totals.energy)} />
            <DataRow label="Depreciação" value={formatCents(totals.depreciation)} />
            <DataRow label="Manutenção" value={formatCents(totals.maintenance)} />
            <DataRow label="Mão de obra" value={formatCents(totals.labor)} />
            <DataRow label="Custos adicionais" value={formatCents(totals.extras)} />
            <DataRow label="Reserva para falhas" value={formatCents(totals.failureReserve)} />
            <div className="my-2 border-t border-ink-700" />
            <DataRow label="Custo total de produção" value={formatCents(totals.totalCost)} strong />
            <DataRow label="Taxas e impostos" value={formatCents(totals.commercialCost)} tone="muted" />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Precificação" icon="trendingUp" />
          <CardBody className="space-y-0.5">
            <DataRow label="Preço unitário" value={formatCents(unit.price)} />
            {totals.discount > 0 ? (
              <>
                <DataRow label="Preço de tabela" value={formatCents(totals.listPrice)} tone="muted" />
                <DataRow label="Desconto" value={`− ${formatCents(totals.discount)}`} tone="muted" />
              </>
            ) : null}
            <DataRow label="Preço total" value={formatCents(totals.price)} tone="blue" strong />
            <DataRow label="Lucro estimado" value={formatCents(totals.profit)} tone="positive" />
            <DataRow
              label="Margem efetiva"
              value={formatRatioAsPercent(quote.effectiveMargin)}
              tone="positive"
            />
            <DataRow
              label="Margem desejada"
              value={`${String(quote.marginPercent).replace('.', ',')}%`}
              tone="muted"
            />
          </CardBody>
        </Card>

        {quote.notes ? (
          <Card>
            <CardHeader title="Observações" icon="file" />
            <CardBody>
              <p className="whitespace-pre-line text-sm text-gray-300">{quote.notes}</p>
            </CardBody>
          </Card>
        ) : null}

        <QuoteFilesPanel quote={quote} />
      </div>
    </Modal>
  );
}
