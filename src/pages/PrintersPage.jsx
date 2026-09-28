import React, { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Callout,
  EmptyState,
  IconButton,
  PageHeader,
  SearchInput,
} from '../components/ui/primitives';
import PrinterFormModal from '../features/printers/PrinterFormModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import {
  DEPRECIATION_MODE,
  depreciationPerHourCents,
  describePrinter,
  machineCostPerHourCents,
} from '../core/printers';
import { formatCents, formatNumber, formatRate, fromCents } from '../core/money';
import { useStore } from '../store/StoreProvider';

export default function PrintersPage() {
  const { printers, settings, actions } = useStore();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return printers;
    return printers.filter((printer) =>
      [printer.brand, printer.model].filter(Boolean).some((field) => field.toLowerCase().includes(term)),
    );
  }, [printers, search]);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleSave = async (printer) => {
    const saved = await actions.savePrinter(printer);
    if (saved) setFormOpen(false);
  };

  const handleDelete = async () => {
    await actions.deletePrinter(pendingDelete.id);
    setPendingDelete(null);
  };

  return (
    <>
      <PageHeader
        title="Impressoras"
        description="Cada impressora tem seu próprio custo de máquina por hora, somando depreciação e manutenção."
        actions={
          <Button variant="primary" icon="plus" onClick={openNew}>
            Nova impressora
          </Button>
        }
      />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Buscar por fabricante ou modelo..."
        className="mb-5"
      />

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon="printer"
            title={printers.length === 0 ? 'Nenhuma impressora cadastrada' : 'Nenhuma impressora encontrada'}
            description={
              printers.length === 0
                ? 'Cadastre sua impressora para que energia, depreciação e manutenção entrem no cálculo.'
                : 'Ajuste o termo da busca.'
            }
            action={
              printers.length === 0 ? (
                <Button variant="primary" icon="plus" onClick={openNew}>
                  Cadastrar impressora
                </Button>
              ) : null
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((printer) => {
            const depreciation = fromCents(depreciationPerHourCents(printer));
            const machine = fromCents(machineCostPerHourCents(printer));
            const energyPerHour = (printer.powerWatts / 1000) * (settings.energyTariff || 0);
            const isManual = printer.depreciationMode === DEPRECIATION_MODE.MANUAL;

            return (
              <Card key={printer.id} className="flex flex-col p-4 transition-colors hover:border-ink-600">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-gray-100">{describePrinter(printer)}</h3>
                    <p className="text-xs text-gray-500">
                      {formatNumber(printer.powerWatts, 0)} W · {formatNumber(printer.lifetimeHours, 0)} h de vida útil
                    </p>
                  </div>
                  <Badge tone={isManual ? 'purple' : 'blue'}>
                    {isManual ? 'Depreciação manual' : 'Depreciação automática'}
                  </Badge>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border border-ink-700 bg-ink-850 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Aquisição</p>
                    <p className="mt-1 text-sm font-bold tabular-nums text-gray-100">
                      {formatCents(printer.purchaseCents)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-ink-700 bg-ink-850 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Depreciação/h</p>
                    <p className="mt-1 text-sm font-bold tabular-nums text-brand-purple-400">
                      {formatRate(depreciation, 4)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-ink-700 bg-ink-850 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Manutenção/h</p>
                    <p className="mt-1 text-sm font-bold tabular-nums text-gray-100">
                      {formatRate(fromCents(printer.maintenancePerHourCents), 4)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-brand-blue/30 bg-brand-blue/10 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Máquina/h</p>
                    <p className="mt-1 text-sm font-bold tabular-nums text-brand-blue-400">
                      {formatRate(machine, 4)}
                    </p>
                  </div>
                </div>

                <p className="mb-3 text-xs text-gray-600">
                  Energia estimada: {formatRate(energyPerHour, 4)}/h com a tarifa atual de{' '}
                  {formatRate(settings.energyTariff, 3)}/kWh.
                </p>

                {printer.notes ? (
                  <p className="mb-3 line-clamp-2 text-xs text-gray-600">{printer.notes}</p>
                ) : null}

                <div className="mt-auto flex items-center justify-end gap-1 border-t border-ink-800 pt-3">
                  <IconButton
                    icon="copy"
                    label="Duplicar"
                    onClick={() => actions.duplicatePrinter(printer.id, `${printer.model} (cópia)`)}
                  />
                  <IconButton
                    icon="edit"
                    label="Editar"
                    onClick={() => {
                      setEditing(printer);
                      setFormOpen(true);
                    }}
                  />
                  <IconButton
                    icon="trash"
                    label="Excluir"
                    variant="danger"
                    onClick={() => setPendingDelete(printer)}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Callout tone="info" className="mt-5">
        <strong className="text-gray-200">Depreciação não é manutenção.</strong> A depreciação devolve o
        dinheiro investido na máquina ao longo da vida útil; a manutenção paga as peças que se gastam com o
        uso. As duas entram no custo, mas em linhas separadas.
      </Callout>

      <PrinterFormModal
        open={formOpen}
        printer={editing}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Excluir impressora"
        message={
          pendingDelete
            ? `A impressora "${describePrinter(pendingDelete)}" será removida. Os orçamentos já salvos mantêm os valores usados no cálculo.`
            : ''
        }
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
