import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as db from '../data/db';
import { COLLECTIONS } from '../data/schema';
import { useToast } from '../components/ui/Toast';

/**
 * Ponte entre a camada de persistência e o React.
 *
 * As páginas nunca importam `db` diretamente: usam os hooks daqui. Assim a
 * troca do meio de armazenamento fica contida em `src/data`.
 */

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const toast = useToast();
  const [state, setState] = useState(() => db.getState());

  useEffect(() => db.subscribe(setState), []);

  /**
   * Executa uma operação de escrita relatando o resultado ao usuário.
   * Erros de gravação (cota estourada, storage bloqueado) chegam como aviso
   * visível em vez de falharem silenciosamente.
   */
  const run = useCallback(
    async (operation, successMessage) => {
      try {
        const result = await operation();
        if (successMessage) toast.success(successMessage);
        return result;
      } catch (error) {
        toast.error(error?.message || 'Não foi possível concluir a operação.');
        return null;
      }
    },
    [toast],
  );

  const actions = useMemo(
    () => ({
      /**
       * `silent` suprime o aviso individual: operações em lote (importação)
       * relatam um resumo só no fim, em vez de um aviso por registro.
       */
      saveMaterial: (material, { silent = false } = {}) =>
        run(() => db.put(COLLECTIONS.MATERIALS, material), silent ? null : 'Material salvo.'),
      deleteMaterial: (id) => run(() => db.remove(COLLECTIONS.MATERIALS, id), 'Material excluído.'),
      duplicateMaterial: (id, name) =>
        run(() => db.duplicate(COLLECTIONS.MATERIALS, id, { name }), 'Material duplicado.'),

      savePrinter: (printer) => run(() => db.put(COLLECTIONS.PRINTERS, printer), 'Impressora salva.'),
      deletePrinter: (id) => run(() => db.remove(COLLECTIONS.PRINTERS, id), 'Impressora excluída.'),
      duplicatePrinter: (id, model) =>
        run(() => db.duplicate(COLLECTIONS.PRINTERS, id, { model }), 'Impressora duplicada.'),

      saveQuote: (quote, message = 'Orçamento salvo.') =>
        run(() => db.put(COLLECTIONS.QUOTES, quote), message),
      deleteQuote: (id) => run(() => db.remove(COLLECTIONS.QUOTES, id), 'Orçamento excluído.'),
      duplicateQuote: async (id) => {
        const code = await db.reserveQuoteCode();
        return run(
          () => db.duplicate(COLLECTIONS.QUOTES, id, { code, status: 'draft', approvedAt: null }),
          'Orçamento duplicado como rascunho.',
        );
      },
      updateQuoteStatus: async (id, status) => {
        const quote = await db.get(COLLECTIONS.QUOTES, id);
        if (!quote) return null;
        const approvedAt = status === 'approved' ? quote.approvedAt || new Date().toISOString() : null;
        return run(() => db.put(COLLECTIONS.QUOTES, { ...quote, status, approvedAt }), 'Status atualizado.');
      },
      reserveQuoteCode: () => db.reserveQuoteCode(),

      saveTransaction: (transaction) =>
        run(() => db.put(COLLECTIONS.TRANSACTIONS, transaction), 'Lançamento salvo.'),
      deleteTransaction: (id) => run(() => db.remove(COLLECTIONS.TRANSACTIONS, id), 'Lançamento excluído.'),

      updateSettings: (patch, message = 'Configurações salvas.') =>
        run(() => db.updateSettings(patch), message),
      resetSettings: () => run(() => db.resetSettings(), 'Configurações restauradas.'),

      replaceState: (incoming) => run(() => db.replaceState(incoming), 'Backup importado.'),
      mergeState: (incoming) => run(() => db.mergeState(incoming), 'Backup mesclado aos dados atuais.'),
      clearAll: () => run(() => db.clearAll(), 'Dados apagados.'),
    }),
    [run],
  );

  const value = useMemo(
    () => ({
      settings: state.settings,
      materials: state[COLLECTIONS.MATERIALS],
      printers: state[COLLECTIONS.PRINTERS],
      quotes: state[COLLECTIONS.QUOTES],
      transactions: state[COLLECTIONS.TRANSACTIONS],
      state,
      actions,
    }),
    [state, actions],
  );

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
