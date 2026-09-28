import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Callout,
  DataRow,
  MoneyInput,
  Modal,
  NumberInput,
  TextInput,
  Textarea,
  ToggleGroup,
} from '../../components/ui/primitives';
import {
  DEPRECIATION_MODE,
  depreciationPerHourCents,
  machineCostPerHourCents,
  validatePrinter,
} from '../../core/printers';
import { formatRate, fromCents, toCents } from '../../core/money';
import { centsToInput, inputToNumber, numberToInput } from '../../lib/form';

const EMPTY = {
  brand: '',
  model: '',
  purchase: '',
  residual: '',
  powerWatts: '',
  lifetimeHours: '',
  maintenance: '',
  depreciationMode: DEPRECIATION_MODE.AUTO,
  depreciationPerHour: '',
  notes: '',
};

function toFormState(printer) {
  if (!printer) return { ...EMPTY };
  return {
    brand: printer.brand || '',
    model: printer.model || '',
    purchase: centsToInput(printer.purchaseCents),
    residual: centsToInput(printer.residualCents),
    powerWatts: numberToInput(printer.powerWatts),
    lifetimeHours: numberToInput(printer.lifetimeHours),
    maintenance: centsToInput(printer.maintenancePerHourCents),
    depreciationMode: printer.depreciationMode || DEPRECIATION_MODE.AUTO,
    depreciationPerHour: centsToInput(printer.depreciationPerHourCents),
    notes: printer.notes || '',
  };
}

function toPrinter(form, id) {
  return {
    id,
    brand: form.brand.trim(),
    model: form.model.trim(),
    purchaseCents: toCents(form.purchase),
    residualCents: toCents(form.residual),
    powerWatts: inputToNumber(form.powerWatts),
    lifetimeHours: inputToNumber(form.lifetimeHours),
    maintenancePerHourCents: toCents(form.maintenance),
    depreciationMode: form.depreciationMode,
    depreciationPerHourCents: toCents(form.depreciationPerHour),
    notes: form.notes.trim(),
  };
}

export default function PrinterFormModal({ open, printer, onClose, onSave }) {
  const [form, setForm] = useState(() => toFormState(printer));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(toFormState(printer));
      setErrors({});
    }
  }, [open, printer]);

  const set = (field) => (value) => setForm((current) => ({ ...current, [field]: value }));

  const preview = useMemo(() => {
    const draft = toPrinter(form, printer?.id);
    return {
      depreciation: fromCents(depreciationPerHourCents(draft)),
      maintenance: fromCents(draft.maintenancePerHourCents),
      machine: fromCents(machineCostPerHourCents(draft)),
    };
  }, [form, printer?.id]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const draft = toPrinter(form, printer?.id);
    const { valid, errors: validationErrors } = validatePrinter(draft);

    if (!valid) {
      setErrors(validationErrors);
      return;
    }
    onSave(draft);
  };

  const isAuto = form.depreciationMode === DEPRECIATION_MODE.AUTO;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={printer ? 'Editar impressora' : 'Nova impressora'}
      subtitle="Depreciação e manutenção são despesas distintas e entram separadamente no custo da peça."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" icon="save" onClick={handleSubmit}>
            Salvar impressora
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput
            label="Fabricante"
            value={form.brand}
            onChange={(event) => set('brand')(event.target.value)}
            placeholder="Ex.: Creality"
          />
          <TextInput
            label="Modelo"
            value={form.model}
            onChange={(event) => set('model')(event.target.value)}
            placeholder="Ex.: Ender 3 V3 SE"
            error={errors.model}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <MoneyInput
            label="Valor de aquisição"
            value={form.purchase}
            onChange={set('purchase')}
            error={errors.purchaseCents}
          />
          <MoneyInput
            label="Valor residual"
            value={form.residual}
            onChange={set('residual')}
            error={errors.residualCents}
            hint="Quanto espera receber ao revender. Deixe zero se não pretende vender."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <NumberInput
            label="Potência média de consumo"
            suffix="W"
            value={form.powerWatts}
            onChange={set('powerWatts')}
            error={errors.powerWatts}
            hint="Consumo médio durante a impressão, não a potência da fonte"
          />
          <NumberInput
            label="Vida útil estimada"
            suffix="h"
            value={form.lifetimeHours}
            onChange={set('lifetimeHours')}
            error={errors.lifetimeHours}
            hint="Horas de impressão até o fim do ciclo de vida"
          />
        </div>

        <ToggleGroup
          label="Depreciação por hora"
          hint={
            isAuto
              ? 'Calculada a partir do valor depreciável dividido pela vida útil.'
              : 'Valor informado manualmente, ignorando aquisição e vida útil.'
          }
          value={form.depreciationMode}
          onChange={set('depreciationMode')}
          options={[
            { value: DEPRECIATION_MODE.AUTO, label: 'Calcular automaticamente' },
            { value: DEPRECIATION_MODE.MANUAL, label: 'Informar manualmente' },
          ]}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <MoneyInput
            label="Depreciação por hora"
            value={isAuto ? String(preview.depreciation.toFixed(4)).replace('.', ',') : form.depreciationPerHour}
            onChange={set('depreciationPerHour')}
            disabled={isAuto}
            hint={isAuto ? '(aquisição − residual) ÷ vida útil' : 'Custo de reposição do capital por hora'}
          />
          <MoneyInput
            label="Manutenção por hora"
            value={form.maintenance}
            onChange={set('maintenance')}
            error={errors.maintenancePerHourCents}
            hint="Bicos, correias, rolamentos, lubrificação"
          />
        </div>

        <div className="rounded-lg border border-brand-purple/25 bg-brand-gradient-soft p-4">
          <DataRow label="Depreciação" value={`${formatRate(preview.depreciation, 4)}/h`} tone="muted" />
          <DataRow label="Manutenção" value={`${formatRate(preview.maintenance, 4)}/h`} tone="muted" />
          <DataRow label="Custo de máquina" value={`${formatRate(preview.machine, 4)}/h`} tone="blue" strong />
        </div>

        <Textarea
          label="Observações"
          value={form.notes}
          onChange={(event) => set('notes')(event.target.value)}
          placeholder="Bico instalado, upgrades, histórico de manutenção..."
          rows={2}
        />

        {Object.keys(errors).length > 0 ? (
          <Callout tone="negative" title="Revise os campos destacados">
            Modelo, potência média e vida útil são necessários para calcular o custo de máquina.
          </Callout>
        ) : null}
      </form>
    </Modal>
  );
}
