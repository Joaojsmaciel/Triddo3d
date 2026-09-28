import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Callout,
  DataRow,
  MoneyInput,
  Modal,
  NumberInput,
  Select,
  TextInput,
  Textarea,
} from '../../components/ui/primitives';
import { MATERIAL_TYPES, costPerGramReais, validateMaterial } from '../../core/materials';
import { formatRate, toCents } from '../../core/money';
import { centsToInput, inputToNumber, numberToInput } from '../../lib/form';

const EMPTY = {
  brand: '',
  name: '',
  type: 'PLA',
  color: '',
  colorHex: '#4C7DFF',
  spoolGrams: '1000',
  price: '',
  shipping: '',
  notes: '',
};

function toFormState(material) {
  if (!material) return { ...EMPTY };
  return {
    brand: material.brand || '',
    name: material.name || '',
    type: material.type || 'PLA',
    color: material.color || '',
    colorHex: material.colorHex || '#4C7DFF',
    spoolGrams: numberToInput(material.spoolGrams),
    price: centsToInput(material.priceCents),
    shipping: centsToInput(material.shippingCents),
    notes: material.notes || '',
  };
}

function toMaterial(form, id) {
  return {
    id,
    brand: form.brand.trim(),
    name: form.name.trim(),
    type: form.type,
    color: form.color.trim(),
    colorHex: form.colorHex,
    spoolGrams: inputToNumber(form.spoolGrams),
    priceCents: toCents(form.price),
    shippingCents: toCents(form.shipping),
    notes: form.notes.trim(),
  };
}

export default function MaterialFormModal({ open, material, onClose, onSave }) {
  const [form, setForm] = useState(() => toFormState(material));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(toFormState(material));
      setErrors({});
    }
  }, [open, material]);

  const set = (field) => (value) => setForm((current) => ({ ...current, [field]: value }));

  // O custo por grama aparece enquanto o usuário digita: é o número que ele
  // realmente precisa conferir antes de salvar.
  const preview = useMemo(() => {
    const draft = toMaterial(form, material?.id);
    return {
      costPerGram: costPerGramReais(draft),
      costPerKilo: costPerGramReais(draft) * 1000,
    };
  }, [form, material?.id]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const draft = toMaterial(form, material?.id);
    const { valid, errors: validationErrors } = validateMaterial(draft);

    if (!valid) {
      setErrors(validationErrors);
      return;
    }
    onSave(draft);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={material ? 'Editar material' : 'Novo material'}
      subtitle="O custo por grama é calculado automaticamente a partir do preço, do frete e do peso da bobina."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" icon="save" onClick={handleSubmit}>
            Salvar material
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
            placeholder="Ex.: Voolt3D, 3D Fila"
          />
          <TextInput
            label="Nome do material"
            value={form.name}
            onChange={(event) => set('name')(event.target.value)}
            placeholder="Ex.: PLA Branco"
            error={errors.name}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
          <Select
            label="Tipo"
            value={form.type}
            onChange={(event) => set('type')(event.target.value)}
            options={MATERIAL_TYPES.map((type) => ({ value: type, label: type }))}
          />
          <TextInput
            label="Cor"
            value={form.color}
            onChange={(event) => set('color')(event.target.value)}
            placeholder="Ex.: Branco fosco"
          />
          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
              Amostra
            </span>
            <input
              type="color"
              value={form.colorHex}
              onChange={(event) => set('colorHex')(event.target.value)}
              className="h-[42px] w-16 cursor-pointer rounded-lg border border-ink-700 bg-ink-850 p-1"
              aria-label="Amostra da cor do material"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <NumberInput
            label="Peso da bobina"
            suffix="g"
            value={form.spoolGrams}
            onChange={set('spoolGrams')}
            error={errors.spoolGrams}
            hint="Peso líquido de filamento"
          />
          <MoneyInput
            label="Preço de aquisição"
            value={form.price}
            onChange={set('price')}
            error={errors.priceCents}
          />
          <MoneyInput
            label="Frete da bobina"
            value={form.shipping}
            onChange={set('shipping')}
            error={errors.shippingCents}
            hint="Parcela do frete atribuída a esta bobina"
          />
        </div>

        <div className="rounded-lg border border-brand-blue/25 bg-brand-gradient-soft p-4">
          <DataRow
            label="Custo por grama"
            hint="(preço + frete) ÷ peso"
            value={formatRate(preview.costPerGram, 4)}
            tone="blue"
            strong
          />
          <DataRow label="Equivalente por quilo" value={formatRate(preview.costPerKilo, 2)} tone="muted" />
        </div>

        <Textarea
          label="Observações"
          value={form.notes}
          onChange={(event) => set('notes')(event.target.value)}
          placeholder="Temperatura de bico, secagem, fornecedor..."
          rows={2}
        />

        {Object.keys(errors).length > 0 ? (
          <Callout tone="negative" title="Revise os campos destacados">
            Preencha nome, preço e peso da bobina para que o custo por grama possa ser calculado.
          </Callout>
        ) : null}
      </form>
    </Modal>
  );
}
