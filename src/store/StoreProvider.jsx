import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as localDb from '../data/db';
import * as cloud from '../firebase/userData';
import { COLLECTIONS, SCHEMA_VERSION, defaultSettings, nextQuoteCode } from '../data/schema';
import {
  CLOUD_COLLECTIONS,
  WRITE_STATUS,
  buildCloudCopy,
  buildCloudDoc,
  countLocalRecords,
  describeCloudError,
  planCollectionMerge,
  settleWrite,
  toCloudDoc,
  toCloudSettings,
} from '../data/cloudSync';
import { useToast } from '../components/ui/Toast';
import LoadingScreen from '../components/ui/LoadingScreen';

/**
 * Ponte entre o Firestore e o React.
 *
 * Todos os dados (materiais, impressoras, orçamentos, lançamentos e
 * configurações) ficam na conta do usuário logado. As páginas nunca acessam o
 * Firestore diretamente: usam os hooks daqui.
 */

const StoreContext = createContext(null);

const EMPTY_COLLECTIONS = Object.fromEntries(CLOUD_COLLECTIONS.map((name) => [name, []]));
const SOURCES = [...CLOUD_COLLECTIONS, 'settings'];

export function StoreProvider({ uid, children }) {
  const toast = useToast();
  const [collections, setCollections] = useState(EMPTY_COLLECTIONS);
  const [cloudSettings, setCloudSettings] = useState(null);
  const [loaded, setLoaded] = useState(() => new Set());
  // Sem registros locais não há o que migrar.
  const [migrationDone, setMigrationDone] = useState(() => countLocalRecords(localDb.getState()) === 0);

  const settings = useMemo(() => toCloudSettings(cloudSettings || {}), [cloudSettings]);

  // Leitura sempre atual para as ações, sem recriá-las a cada mudança.
  const latest = useRef({ collections, settings });
  latest.current = { collections, settings };

  // Dados em tempo real a partir do Firestore.
  useEffect(() => {
    let active = true;
    const markLoaded = (source) =>
      setLoaded((current) => (current.has(source) ? current : new Set(current).add(source)));
    const onError = (source) => (error) => {
      if (!active) return;
      console.error(`Falha ao carregar "${source}" do Firebase.`, error);
      markLoaded(source);
      if (source === COLLECTIONS.MATERIALS) {
        // Um aviso basta: os erros de permissão chegam de todas as coleções juntos.
        toast.error(describeCloudError(error), { title: 'Dados indisponíveis' });
      }
    };

    const unsubscribers = CLOUD_COLLECTIONS.map((name) =>
      cloud.subscribeCollection(
        uid,
        name,
        (items) => {
          if (!active) return;
          setCollections((current) => ({ ...current, [name]: items }));
          markLoaded(name);
        },
        onError(name),
      ),
    );
    unsubscribers.push(
      cloud.subscribeSettings(
        uid,
        (data) => {
          if (!active) return;
          setCloudSettings(data);
          markLoaded('settings');
        },
        onError('settings'),
      ),
    );

    return () => {
      active = false;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [uid, toast]);

  // Primeiro acesso: leva para a conta tudo o que estava só neste navegador.
  useEffect(() => {
    const localState = localDb.getState();
    if (countLocalRecords(localState) === 0) return undefined;

    let active = true;
    cloud
      .migrateLocalState(uid, localState)
      .then(async ({ plan, write }) => {
        const status = await settleWrite(write, {
          onLateError: (error) => console.error('Falha ao enviar os dados locais.', error),
        });
        // Ainda sem confirmação do servidor: mantém os dados locais e confere de
        // novo no próximo acesso (aí eles já existirão na conta e não duplicam).
        if (status !== WRITE_STATUS.SYNCED) return;
        // Enviados (ou já existentes na conta): saem deste navegador para não
        // irem parar em outra conta nem voltarem depois de excluídos.
        await localDb.clearLocalData();
        if (active && plan.total > 0) {
          toast.success(
            `${plan.total} ${plan.total === 1 ? 'registro deste navegador foi enviado' : 'registros deste navegador foram enviados'} para sua conta.`,
            { title: 'Dados sincronizados' },
          );
        }
      })
      .catch((error) => {
        // Sem internet ou gravação recusada: os dados locais ficam e a migração
        // tenta de novo no próximo acesso.
        console.warn('Migração dos dados locais adiada.', error);
        if (active && error?.code === 'permission-denied') {
          toast.error(describeCloudError(error), { title: 'Não foi possível enviar seus dados' });
        }
      })
      .finally(() => {
        if (active) setMigrationDone(true);
      });

    return () => {
      active = false;
    };
  }, [uid, toast]);

  /**
   * Executa uma operação de escrita relatando o resultado ao usuário.
   * Erros de gravação chegam como aviso visível em vez de falharem em silêncio.
   */
  const run = useCallback(
    async (operation, successMessage) => {
      try {
        const result = await operation();
        if (successMessage) toast.success(successMessage);
        return result;
      } catch (error) {
        console.error(error);
        const message = error?.code ? describeCloudError(error) : error?.message;
        toast.error(message || 'Não foi possível concluir a operação.');
        return null;
      }
    },
    [toast],
  );

  /**
   * Aguarda a gravação na nuvem sem travar a tela quando não há internet:
   * nesse caso avisa que a alteração foi guardada e será sincronizada.
   */
  const cloudWrite = useCallback(
    async (promise) => {
      const status = await settleWrite(promise, {
        onLateError: (error) => toast.error(describeCloudError(error), { title: 'Sincronização falhou' }),
      });
      if (status === WRITE_STATUS.PENDING) {
        toast.warning('Sem conexão com o Firebase: a alteração foi guardada e será enviada quando a internet voltar.');
      }
      return status;
    },
    [toast],
  );

  const actions = useMemo(() => {
    const find = (name, id) => latest.current.collections[name].find((item) => item.id === id) || null;

    const put = async (name, patch) => {
      const item = buildCloudDoc(name, patch, find(name, patch?.id));
      await cloudWrite(cloud.writeDoc(uid, name, item));
      return item;
    };

    const remove = async (name, id) => {
      await cloudWrite(cloud.removeDoc(uid, name, id));
      return true;
    };

    const duplicate = async (name, id, overrides) => {
      const original = find(name, id);
      if (!original) throw new Error('Registro não encontrado.');
      const copy = buildCloudCopy(name, original, overrides);
      await cloudWrite(cloud.writeDoc(uid, name, copy));
      return copy;
    };

    const saveSettings = async (next) => {
      const normalized = toCloudSettings(next);
      await cloudWrite(cloud.writeSettings(uid, normalized));
      return normalized;
    };

    const reserveQuoteCode = async () => nextQuoteCode(latest.current.collections[COLLECTIONS.QUOTES]);

    return {
      /**
       * `silent` suprime o aviso individual: operações em lote (importação)
       * relatam um resumo só no fim, em vez de um aviso por registro.
       */
      saveMaterial: (material, { silent = false } = {}) =>
        run(() => put(COLLECTIONS.MATERIALS, material), silent ? null : 'Material salvo.'),
      deleteMaterial: (id) => run(() => remove(COLLECTIONS.MATERIALS, id), 'Material excluído.'),
      duplicateMaterial: (id, name) =>
        run(() => duplicate(COLLECTIONS.MATERIALS, id, { name }), 'Material duplicado.'),

      savePrinter: (printer) => run(() => put(COLLECTIONS.PRINTERS, printer), 'Impressora salva.'),
      deletePrinter: (id) => run(() => remove(COLLECTIONS.PRINTERS, id), 'Impressora excluída.'),
      duplicatePrinter: (id, model) =>
        run(() => duplicate(COLLECTIONS.PRINTERS, id, { model }), 'Impressora duplicada.'),

      saveQuote: (quote, message = 'Orçamento salvo.') => run(() => put(COLLECTIONS.QUOTES, quote), message),
      deleteQuote: (id) => run(() => remove(COLLECTIONS.QUOTES, id), 'Orçamento excluído.'),
      duplicateQuote: async (id) => {
        const code = await reserveQuoteCode();
        return run(
          () => duplicate(COLLECTIONS.QUOTES, id, { code, status: 'draft', approvedAt: null }),
          'Orçamento duplicado como rascunho.',
        );
      },
      updateQuoteStatus: async (id, status) => {
        const quote = find(COLLECTIONS.QUOTES, id);
        if (!quote) return null;
        const approvedAt = status === 'approved' ? quote.approvedAt || new Date().toISOString() : null;
        return run(() => put(COLLECTIONS.QUOTES, { ...quote, status, approvedAt }), 'Status atualizado.');
      },
      reserveQuoteCode,

      saveTransaction: (transaction) => run(() => put(COLLECTIONS.TRANSACTIONS, transaction), 'Lançamento salvo.'),
      deleteTransaction: (id) => run(() => remove(COLLECTIONS.TRANSACTIONS, id), 'Lançamento excluído.'),

      updateSettings: (patch = {}, message = 'Configurações salvas.') =>
        run(() => {
          const current = latest.current.settings;
          return saveSettings({
            ...current,
            ...patch,
            company: { ...current.company, ...(patch.company || {}) },
          });
        }, message),
      resetSettings: () => run(() => saveSettings(defaultSettings()), 'Configurações restauradas.'),

      /** Backup: substitui as coleções presentes no arquivo e as configurações. */
      replaceState: (incoming) =>
        run(async () => {
          const replacements = {};
          CLOUD_COLLECTIONS.forEach((name) => {
            if (Array.isArray(incoming?.[name])) {
              replacements[name] = incoming[name].map((item) => toCloudDoc(name, item));
            }
          });
          const { write } = await cloud.replaceCollections(uid, replacements);
          await cloudWrite(write);
          if (incoming?.settings && typeof incoming.settings === 'object') {
            await saveSettings(incoming.settings);
          }
          return true;
        }, 'Backup importado.'),
      /** Backup: acrescenta só os registros cujo id ainda não existe na conta. */
      mergeState: (incoming) =>
        run(async () => {
          const writes = CLOUD_COLLECTIONS.map((name) => {
            const additions = planCollectionMerge(name, incoming?.[name], latest.current.collections[name]);
            return additions.length > 0 ? cloud.writeDocs(uid, name, additions) : null;
          }).filter(Boolean);
          if (writes.length > 0) await cloudWrite(Promise.all(writes));
          return true;
        }, 'Backup mesclado aos dados atuais.'),
      clearAll: () =>
        run(async () => {
          const { write } = await cloud.replaceCollections(uid, EMPTY_COLLECTIONS);
          await cloudWrite(write);
          await saveSettings(defaultSettings());
          return true;
        }, 'Dados apagados.'),
    };
  }, [run, cloudWrite, uid]);

  const state = useMemo(
    () => ({ schemaVersion: SCHEMA_VERSION, settings, ...collections }),
    [settings, collections],
  );

  const value = useMemo(
    () => ({
      settings,
      materials: collections[COLLECTIONS.MATERIALS],
      printers: collections[COLLECTIONS.PRINTERS],
      quotes: collections[COLLECTIONS.QUOTES],
      transactions: collections[COLLECTIONS.TRANSACTIONS],
      state,
      actions,
    }),
    [settings, collections, state, actions],
  );

  // As páginas inicializam formulários com o primeiro material/impressora: só
  // renderiza depois da primeira leitura de tudo e da migração dos dados locais.
  const ready = migrationDone && SOURCES.every((source) => loaded.has(source));
  if (!ready) return <LoadingScreen label="Carregando seus dados..." />;

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore precisa estar dentro de <StoreProvider>.');
  }
  return context;
}

export function useSettings() {
  return useStore().settings;
}

export function useMaterials() {
  return useStore().materials;
}

export function usePrinters() {
  return useStore().printers;
}

export function useQuotes() {
  return useStore().quotes;
}
