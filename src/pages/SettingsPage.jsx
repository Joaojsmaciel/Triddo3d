import React, { useEffect, useRef, useState } from 'react';
import {
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  DataRow,
  MoneyInput,
  NumberInput,
  PageHeader,
  SectionTitle,
  TextInput,
  Textarea,
  ToggleGroup,
} from '../components/ui/primitives';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import PermissionAlert from '../components/PermissionAlert';
import { planFilamentImport } from '../features/materials/firebaseImport';
import { buildBackup, downloadBackup, readFileAsText, validateBackup } from '../data/backup';
import { DISCOUNT_MODE, WASTE_MODE } from '../core/pricing';
import { formatCents, toCents } from '../core/money';
import { centsToInput, inputToNumber, numberToInput } from '../lib/form';
import { useStore } from '../store/StoreProvider';
import { useToast } from '../components/ui/Toast';

function toFormState(settings) {
  return {
    energyTariff: numberToInput(settings.energyTariff),
    laborRate: centsToInput(settings.laborRateCents),
    failureReservePercent: numberToInput(settings.failureReservePercent),
    marginPercent: numberToInput(settings.marginPercent),
    cardFeePercent: numberToInput(settings.cardFeePercent),
    taxPercent: numberToInput(settings.taxPercent),
    fixedFee: centsToInput(settings.fixedFeeCents),
    minPrice: centsToInput(settings.minPriceCents),
    discountMode: settings.discountMode || DISCOUNT_MODE.ABSORB,
    wasteMode: settings.wasteMode || WASTE_MODE.ADD,
    wastePercent: numberToInput(settings.wastePercent),
    company: { ...settings.company },
  };
}

export default function SettingsPage() {
  const { settings, state, actions } = useStore();
  const toast = useToast();

  const [form, setForm] = useState(() => toFormState(settings));
  const [dirty, setDirty] = useState(false);
  const [pendingImport, setPendingImport] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [showFirebaseAlert, setShowFirebaseAlert] = useState(false);
  const fileInputRef = useRef(null);

  // Ressincroniza quando as configurações mudam por fora (importação de backup).
  useEffect(() => {
    if (!dirty) setForm(toFormState(settings));
  }, [settings, dirty]);

  const set = (field) => (value) => {
    setDirty(true);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const setCompany = (field) => (event) => {
    setDirty(true);
    setForm((current) => ({ ...current, company: { ...current.company, [field]: event.target.value } }));
  };

  /** Campos booleanos da empresa recebem o valor direto, não um evento. */
  const setCompanyFlag = (field) => (value) => {
    setDirty(true);
    setForm((current) => ({ ...current, company: { ...current.company, [field]: value } }));
  };

  const handleSave = async () => {
    const saved = await actions.updateSettings({
      energyTariff: inputToNumber(form.energyTariff),
      laborRateCents: toCents(form.laborRate),
      failureReservePercent: inputToNumber(form.failureReservePercent),
      marginPercent: inputToNumber(form.marginPercent),
      cardFeePercent: inputToNumber(form.cardFeePercent),
      taxPercent: inputToNumber(form.taxPercent),
      fixedFeeCents: toCents(form.fixedFee),
      minPriceCents: toCents(form.minPrice),
      discountMode: form.discountMode,
      wasteMode: form.wasteMode,
      wastePercent: inputToNumber(form.wastePercent),
      company: {
        ...form.company,
        quoteValidityDays: inputToNumber(form.company.quoteValidityDays),
      },
    });
    if (saved) setDirty(false);
  };

  const handleExport = () => {
    try {
      downloadBackup(state);
      toast.success('Backup exportado.');
    } catch (error) {
      toast.error(error?.message || 'Não foi possível gerar o backup.');
    }
  };

  const handleFilePicked = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const text = await readFileAsText(file);
      const validation = validateBackup(text);

      if (!validation.valid) {
        toast.error(validation.errors[0], { title: 'Backup inválido' });
        return;
      }
      // Guarda o conteúdo validado e espera a confirmação explícita do usuário.
      setPendingImport({ ...validation, fileName: file.name });
    } catch (error) {
      toast.error(error?.message || 'Não foi possível ler o arquivo.');
    }
  };

  const applyImport = async (mode) => {
    const payload = pendingImport.data;
    setPendingImport(null);
    setDirty(false);
    if (mode === 'replace') {
      await actions.replaceState(payload);
    } else {
      await actions.mergeState(payload);
    }
  };

  /** Traz os filamentos que já estavam no Firestore da versão anterior. */
  const handleFirebaseImport = async () => {
    try {
      // Carregado sob demanda: o SDK do Firebase é grande e só faz sentido
      // baixá-lo se o usuário realmente for importar dados antigos.
      const { loadFilaments } = await import('../firebase/filaments');
      const filaments = await loadFilaments();
      if (filaments.length === 0) {
        toast.info('Nenhum filamento encontrado no Firebase.');
        return;
      }

      const { pending, skipped } = planFilamentImport(filaments, state.materials);

      if (pending.length === 0) {
        toast.info('Todos os filamentos do Firebase já estão cadastrados como materiais.');
        return;
      }

      let imported = 0;
      for (const material of pending) {
        // `silent` evita um aviso por registro: o resumo vem no fim.
        const saved = await actions.saveMaterial(material, { silent: true });
        if (saved) imported += 1;
      }

      toast.success(
        `${imported} ${imported === 1 ? 'material' : 'materiais'} importados do Firebase.` +
          (skipped > 0 ? ` ${skipped} já existiam e foram ignorados.` : ''),
        { title: 'Importação concluída' },
      );
    } catch (error) {
      if (error?.code === 'permission-denied' || /permission/i.test(error?.message || '')) {
        setShowFirebaseAlert(true);
        return;
      }
      toast.error('Não foi possível conectar ao Firebase. Verifique sua internet.');
    }
  };

  const backupPreview = buildBackup(state);

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Todos os valores financeiros do sistema ficam aqui. Nada está fixo no código."
        actions={
          <Button variant="primary" icon="save" onClick={handleSave} disabled={!dirty}>
            {dirty ? 'Salvar alterações' : 'Tudo salvo'}
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Operação */}
        <Card>
          <CardBody>
            <SectionTitle title="Custos operacionais" icon="zap" />
            <div className="grid gap-4 sm:grid-cols-2">
              <MoneyInput
                label="Tarifa de energia"
                value={form.energyTariff}
                onChange={set('energyTariff')}
                suffix="/kWh"
                hint="Consulte a fatura: valor por kWh com impostos"
              />
              <MoneyInput
                label="Valor da hora de trabalho"
                value={form.laborRate}
                onChange={set('laborRate')}
                suffix="/h"
                hint="Quanto vale uma hora do seu trabalho"
              />
              <NumberInput
                label="Reserva padrão para falhas"
                suffix="%"
                value={form.failureReservePercent}
                onChange={set('failureReservePercent')}
                hint="Percentual do custo direto"
              />
              <NumberInput
                label="Desperdício padrão"
                suffix="%"
                value={form.wastePercent}
                onChange={set('wastePercent')}
                hint="Suportes, brim e purga"
              />
            </div>

            <ToggleGroup
              label="Tratamento padrão do desperdício"
              hint="Se o peso que você informa já vem do fatiador com suportes, escolha a segunda opção."
              value={form.wasteMode}
              onChange={set('wasteMode')}
              options={[
                { value: WASTE_MODE.ADD, label: 'Somar percentual' },
                { value: WASTE_MODE.INCLUDED, label: 'Já incluso no peso' },
              ]}
              className="mt-4"
            />
          </CardBody>
        </Card>

        {/* Comercial */}
        <Card>
          <CardBody>
            <SectionTitle title="Precificação comercial" icon="money" />
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberInput
                label="Margem de lucro padrão"
                suffix="%"
                value={form.marginPercent}
                onChange={set('marginPercent')}
                hint="Sobre o preço de venda"
              />
              <MoneyInput
                label="Valor mínimo de venda"
                value={form.minPrice}
                onChange={set('minPrice')}
                hint="Piso por peça"
              />
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
                hint="Ex.: tarifa fixa da maquininha"
              />
            </div>

            <ToggleGroup
              label="Comportamento padrão do desconto"
              value={form.discountMode}
              onChange={set('discountMode')}
              options={[
                { value: DISCOUNT_MODE.ABSORB, label: 'Absorver na margem' },
                { value: DISCOUNT_MODE.GROSS_UP, label: 'Embutir no preço' },
              ]}
              className="mt-4"
            />

            <Callout tone="info" className="mt-4">
              Margem + taxas + impostos precisam somar menos de 100%, senão não existe preço de venda
              possível. Atualmente:{' '}
              <strong className="text-gray-100">
                {(
                  inputToNumber(form.marginPercent) +
                  inputToNumber(form.cardFeePercent) +
                  inputToNumber(form.taxPercent)
                )
                  .toFixed(1)
                  .replace('.', ',')}
                %
              </strong>
              .
            </Callout>
          </CardBody>
        </Card>

        {/* Dados da empresa */}
        <Card className="lg:col-span-2">
          <CardBody>
            <SectionTitle title="Dados da TRIDDO 3D" icon="users" hint="Aparecem no PDF enviado ao cliente" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <TextInput label="Nome" value={form.company.name} onChange={setCompany('name')} />
              <TextInput label="Slogan" value={form.company.tagline} onChange={setCompany('tagline')} />
              <TextInput
                label="CNPJ / CPF"
                value={form.company.document}
                onChange={setCompany('document')}
                placeholder="00.000.000/0000-00"
              />
              <TextInput
                label="Telefone"
                value={form.company.phone}
                onChange={setCompany('phone')}
                placeholder="(00) 00000-0000"
              />
              <TextInput
                label="E-mail"
                type="email"
                value={form.company.email}
                onChange={setCompany('email')}
                placeholder="contato@triddo.com.br"
              />
              <TextInput label="Site" value={form.company.website} onChange={setCompany('website')} />
              <TextInput
                label="Endereço"
                value={form.company.address}
                onChange={setCompany('address')}
                className="sm:col-span-2"
              />
              <NumberInput
                label="Validade do orçamento"
                suffix="dias"
                value={form.company.quoteValidityDays}
                onChange={(value) => {
                  setDirty(true);
                  setForm((current) => ({
                    ...current,
                    company: { ...current.company, quoteValidityDays: value },
                  }));
                }}
              />
            </div>

            <Textarea
              label="Rodapé do orçamento"
              value={form.company.quoteFooter}
              onChange={setCompany('quoteFooter')}
              rows={2}
              className="mt-4"
              hint="Texto impresso no pé do PDF"
            />

            <div className="mt-5 space-y-3 border-t border-ink-800 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                O que o PDF do cliente mostra
              </p>

              <Checkbox
                label="Especificações técnicas"
                hint="Material, impressora, peso da peça, tempo de impressão, depreciação e custos adicionais"
                checked={form.company.quoteShowSpecs !== false}
                onChange={setCompanyFlag('quoteShowSpecs')}
              />

              <Callout tone="info">
                Depreciação e custos adicionais (modelagem, cola, tinta) só entram no PDF se tiverem
                valor. Custo de filamento, mão de obra, manutenção, reserva para falhas, lucro e
                margem <strong className="text-gray-100">nunca</strong> aparecem no documento do cliente.
              </Callout>
            </div>
          </CardBody>
        </Card>

        {/* Backup */}
        <Card>
          <CardHeader
            title="Backup dos dados"
            subtitle="Exporte e importe tudo em JSON"
            icon="download"
          />
          <CardBody>
            <div className="mb-4 space-y-0.5">
              <DataRow label="Materiais" value={backupPreview.materials.length} tone="muted" />
              <DataRow label="Impressoras" value={backupPreview.printers.length} tone="muted" />
              <DataRow label="Orçamentos" value={backupPreview.quotes.length} tone="muted" />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon="download" onClick={handleExport}>
                Exportar JSON
              </Button>
              <Button variant="secondary" icon="upload" onClick={() => fileInputRef.current?.click()}>
                Importar JSON
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleFilePicked}
                className="hidden"
              />
            </div>

            <Callout tone="warning" className="mt-4">
              Os dados ficam neste navegador. Limpar o histórico do navegador apaga tudo — exporte um
              backup periodicamente.
            </Callout>
          </CardBody>
        </Card>

        {/* Dados antigos e zona de risco */}
        <Card>
          <CardHeader title="Dados anteriores" subtitle="Migração e reinicialização" icon="refresh" />
          <CardBody className="space-y-4">
            <div>
              <p className="mb-2 text-sm text-gray-400">
                Filamentos cadastrados na versão anterior (Firebase) podem ser trazidos para o novo cadastro
                de materiais.
              </p>
              <Button variant="outline" icon="upload" onClick={handleFirebaseImport}>
                Importar filamentos do Firebase
              </Button>
            </div>

            <div className="border-t border-ink-800 pt-4">
              <p className="mb-2 text-sm text-gray-400">
                Restaurar as configurações mantém materiais, impressoras e orçamentos.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" icon="refresh" onClick={() => setConfirmReset(true)}>
                  Restaurar configurações
                </Button>
                <Button variant="danger" icon="trash" onClick={() => setConfirmClear(true)}>
                  Apagar todos os dados
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Confirmação da importação */}
      <ConfirmDialog
        open={Boolean(pendingImport)}
        title="Importar backup"
        tone="warning"
        message={
          pendingImport
            ? `O arquivo "${pendingImport.fileName}" contém ${pendingImport.counts.materials} materiais, ${pendingImport.counts.printers} impressoras e ${pendingImport.counts.quotes} orçamentos.`
            : ''
        }
        confirmLabel="Substituir tudo"
        cancelLabel="Cancelar"
        onConfirm={() => applyImport('replace')}
        onCancel={() => setPendingImport(null)}
      >
        {pendingImport ? (
          <div className="mt-4 space-y-3">
            {pendingImport.warnings.length > 0 ? (
              <Callout tone="warning" title="Avisos">
                <ul className="mt-1 list-inside list-disc space-y-0.5">
                  {pendingImport.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </Callout>
            ) : null}

            <Callout tone="negative" title="Substituir apaga os registros atuais">
              Você tem hoje {state.materials.length} materiais, {state.printers.length} impressoras e{' '}
              {state.quotes.length} orçamentos. Prefere somar os registros do arquivo aos atuais?
            </Callout>

            <Button variant="primary" icon="plus" onClick={() => applyImport('merge')} className="w-full">
              Mesclar sem apagar nada
            </Button>
          </div>
        ) : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmReset}
        title="Restaurar configurações"
        tone="warning"
        message="Tarifa, hora de trabalho, margem, taxas e dados da empresa voltam aos valores iniciais. Materiais, impressoras e orçamentos são mantidos."
        confirmLabel="Restaurar"
        onConfirm={async () => {
          setConfirmReset(false);
          setDirty(false);
          await actions.resetSettings();
        }}
        onCancel={() => setConfirmReset(false)}
      />

      <ConfirmDialog
        open={confirmClear}
        title="Apagar todos os dados"
        message={`Materiais, impressoras, orçamentos e configurações serão apagados deste navegador. Você tem ${state.quotes.length} orçamentos salvos e ${formatCents(
          state.quotes.reduce((sum, quote) => sum + (quote.totals?.price || 0), 0),
        )} em valor registrado. Exporte um backup antes de continuar.`}
        confirmLabel="Apagar tudo"
        onConfirm={async () => {
          setConfirmClear(false);
          setDirty(false);
          await actions.clearAll();
        }}
        onCancel={() => setConfirmClear(false)}
      />

      {showFirebaseAlert ? <PermissionAlert onDismiss={() => setShowFirebaseAlert(false)} /> : null}
    </>
  );
}
