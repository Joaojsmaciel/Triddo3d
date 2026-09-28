import React, { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  PageHeader,
  SearchInput,
  Select,
} from '../components/ui/primitives';
import Icon from '../components/ui/Icon';
import MaterialFormModal from '../features/materials/MaterialFormModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { MATERIAL_TYPES, costPerGramReais, costPerKiloCents } from '../core/materials';
import { formatCents, formatNumber, formatRate } from '../core/money';
import { useStore } from '../store/StoreProvider';

export default function MaterialsPage() {
  const { materials, actions } = useStore();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return materials.filter((material) => {
      if (typeFilter && material.type !== typeFilter) return false;
      if (!term) return true;
      return [material.name, material.brand, material.type, material.color]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(term));
    });
  }, [materials, search, typeFilter]);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (material) => {
    setEditing(material);
    setFormOpen(true);
  };

  const handleSave = async (material) => {
    const saved = await actions.saveMaterial(material);
    if (saved) setFormOpen(false);
  };

  const handleDelete = async () => {
    await actions.deleteMaterial(pendingDelete.id);
    setPendingDelete(null);
  };

  return (
    <>
      <PageHeader
        title="Materiais"
        description="Cadastre seus filamentos. O custo por grama sai de (preço + frete) ÷ peso da bobina."
        actions={
          <Button variant="primary" icon="plus" onClick={openNew}>
            Novo material
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nome, fabricante ou cor..."
          className="flex-1"
        />
        <Select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          placeholder="Todos os tipos"
          options={MATERIAL_TYPES.map((type) => ({ value: type, label: type }))}
          className="sm:w-48"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon="spool"
            title={materials.length === 0 ? 'Nenhum material cadastrado' : 'Nenhum material encontrado'}
            description={
              materials.length === 0
                ? 'Cadastre a primeira bobina para que a precificação possa calcular o custo do filamento.'
                : 'Ajuste a busca ou o filtro de tipo.'
            }
            action={
              materials.length === 0 ? (
                <Button variant="primary" icon="plus" onClick={openNew}>
                  Cadastrar material
                </Button>
              ) : null
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((material) => (
            <Card key={material.id} className="flex flex-col p-4 transition-colors hover:border-ink-600">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className="mt-0.5 h-9 w-9 shrink-0 rounded-lg border border-ink-600 shadow-inner"
                    style={{ backgroundColor: material.colorHex || '#4C7DFF' }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-gray-100">{material.name}</h3>
                    <p className="truncate text-xs text-gray-500">
                      {[material.brand, material.color].filter(Boolean).join(' · ') || 'Sem fabricante'}
                    </p>
                  </div>
                </div>
                <Badge tone="blue">{material.type}</Badge>
              </div>

              <dl className="mb-4 space-y-1.5 border-t border-ink-800 pt-3 text-sm">
                <div className="flex items-baseline justify-between">
                  <dt className="text-gray-500">Custo por grama</dt>
                  <dd className="font-bold tabular-nums text-brand-blue-400">
                    {formatRate(costPerGramReais(material), 4)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between">
                  <dt className="text-gray-500">Bobina</dt>
                  <dd className="tabular-nums text-gray-300">
                    {formatNumber(material.spoolGrams, 0)} g · {formatCents(material.priceCents)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between">
                  <dt className="text-gray-500">Frete atribuído</dt>
                  <dd className="tabular-nums text-gray-300">{formatCents(material.shippingCents)}</dd>
                </div>
                <div className="flex items-baseline justify-between">
                  <dt className="text-gray-500">Equivalente por quilo</dt>
                  <dd className="tabular-nums text-gray-400">{formatCents(costPerKiloCents(material))}</dd>
                </div>
              </dl>

              {material.notes ? (
                <p className="mb-3 line-clamp-2 text-xs text-gray-600">{material.notes}</p>
              ) : null}

              <div className="mt-auto flex items-center justify-end gap-1 border-t border-ink-800 pt-3">
                <IconButton
                  icon="copy"
                  label="Duplicar"
                  onClick={() => actions.duplicateMaterial(material.id, `${material.name} (cópia)`)}
                />
                <IconButton icon="edit" label="Editar" onClick={() => openEdit(material)} />
                <IconButton
                  icon="trash"
                  label="Excluir"
                  variant="danger"
                  onClick={() => setPendingDelete(material)}
                />
              </div>
            </Card>
          ))}
        </div>
      )}

      {materials.length > 0 ? (
        <p className="mt-5 flex items-center gap-2 text-xs text-gray-600">
          <Icon name="info" size={14} />
          {filtered.length} de {materials.length} {materials.length === 1 ? 'material' : 'materiais'}.
        </p>
      ) : null}

      <MaterialFormModal
        open={formOpen}
        material={editing}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Excluir material"
        message={
          pendingDelete
            ? `O material "${pendingDelete.name}" será removido. Os orçamentos já salvos mantêm os valores usados no cálculo.`
            : ''
        }
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
