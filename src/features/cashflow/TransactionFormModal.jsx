import React, { useEffect, useState } from 'react';
import {
  Button,
  MoneyInput,
  Modal,
  Select,
  TextInput,
  Textarea,
  ToggleGroup,
} from '../../components/ui/primitives';
import { CASH_CATEGORIES, CASH_TYPE, todayKey, validateTransaction } from '../../core/cashflow';
import { toCents } from '../../core/money';
import { centsToInput } from '../../lib/form';

const TYPE_OPTIONS = [
  { value: CASH_TYPE.OUT, label: 'Saída' },
  { value: CASH_TYPE.IN, label: 'Entrada' },
];

function toFormState(transaction, defaultType) {
  const type = transaction?.type || defaultType || CASH_TYPE.OUT;
  return {
    type,
    date: transaction?.date || todayKey(),
    description: transaction?.description || '',
    category: transaction?.category || CASH_CATEGORIES[type][0],
    amount: centsToInput(transaction?.amountCents),
    quoteId: transaction?.quoteId || '',
    notes: transaction?.notes || '',
  };
}

function toTransaction(form, id) {
  return {
    id,
    type: form.type,
    date: form.date,
    description: form.description.trim(),
    category: form.category,
    amountCents: toCents(form.amount),
    quoteId: form.quoteId,
    notes: form.notes.trim(),
  };
}

export default function TransactionFormModal({ open, transaction, defaultType, quotes = [], onClose, onSave }) {
  const [form, setForm] = useState(() => toFormState(transaction, defaultType));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(toFormState(transaction, defaultType));
      setErrors({});
    }
  }, [open, transaction, defaultType]);

  const set = (field) => (value) => setForm((current) => ({ ...current, [field]: value }));

  const setType = (type) =>
    setForm((current) => ({
      ...current,
      type,
      // A categoria de saída não faz sentido numa entrada e vice-versa.
      category: CASH_CATEGORIES[type].includes(current.category) ? current.category : CASH_CATEGORIES[type][0],
    }));

  const handleSubmit = (event) => {
    event.preventDefault();
    const draft = toTransaction(form, transaction?.id);
    const { valid, errors: validationErrors } = validateTransaction(draft);
    if (!valid) {
      setErrors(validationErrors);
      return;
    }
    onSave(draft);
  };

  const isOut = form.type === CASH_TYPE.OUT;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={transaction ? 'Editar lançamento' : isOut ? 'Nova saída' : 'Nova entrada'}
      subtitle={
        isOut
          ? 'Dinheiro que saiu do caixa: compras, contas, retiradas.'
          : 'Dinheiro que entrou fora dos orçamentos aprovados.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" icon="save" onClick={handleSubmit}>
            Salvar lançamento
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <ToggleGroup label="Tipo" value={form.type} onChange={setType} options={TYPE_OPTIONS} />

        <TextInput
          label="Descrição"
          placeholder={isOut ? 'Ex.: 2 rolos de PLA preto' : 'Ex.: Conserto de peça para cliente'}
          value={form.description}
          onChange={(event) => set('description')(event.target.value)}
          error={errors.description}
          autoFocus
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <MoneyInput label="Valor" value={form.amount} onChange={set('amount')} error={errors.amount} />
          <TextInput
            label="Data"
            type="date"
            value={form.date}
            onChange={(event) => set('date')(event.target.value)}
            error={errors.date}
          />
        </div>

        <Select
          label="Categoria"
          value={form.category}
          onChange={(event) => set('category')(event.target.value)}
          options={CASH_CATEGORIES[form.type].map((category) => ({ value: category, label: category }))}
        />

        <Select
          label="Orçamento relacionado"
          hint="Opcional. Ex.: o filamento comprado para este pedido."
          value={form.quoteId}
          onChange={(event) => set('quoteId')(event.target.value)}
          placeholder="Nenhum"
          options={quotes.map((quote) => ({
            value: quote.id,
            label: [quote.code, quote.projectName].filter(Boolean).join(' · '),
          }))}
        />

        <Textarea
          label="Observações"
          rows={2}
          value={form.notes}
          onChange={(event) => set('notes')(event.target.value)}
        />
      </form>
    </Modal>
  );
}
