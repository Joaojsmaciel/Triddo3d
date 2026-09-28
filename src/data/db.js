/**
 * Repositório de dados do TRIDDO 3D.
 *
 * A interface conversa apenas com estas funções, nunca com localStorage direto.
 * A API é assíncrona de propósito: quando a persistência migrar para Firebase ou
 * IndexedDB, só o interior deste módulo e o driver mudam.
 *
 * O estado inteiro vive em um único registro JSON. Para o volume esperado
 * (dezenas de materiais e centenas de orçamentos) isso mantém gravações
 * atômicas e torna exportar/importar backup trivial.
 */

import { detectDriver } from './driver.js';
import {
  COLLECTIONS,
  STATE_KEY,
  createMaterial,
  createPrinter,
  createQuote,
  defaultSettings,
  migrateState,
  nextQuoteCode,
} from './schema.js';

const FACTORIES = {
  [COLLECTIONS.MATERIALS]: createMaterial,
  [COLLECTIONS.PRINTERS]: createPrinter,
  [COLLECTIONS.QUOTES]: createQuote,
};

let driver = detectDriver();
let state = null;
const listeners = new Set();

function assertCollection(collection) {
  if (!FACTORIES[collection]) {
    throw new Error(`Coleção desconhecida: ${collection}`);
  }
}

function load() {
  if (state) return state;

  let stored = null;
  try {
    const raw = driver.get(STATE_KEY);
    stored = raw ? JSON.parse(raw) : null;
  } catch (error) {
    // Registro corrompido: começamos limpo em vez de travar a aplicação.
    console.error('Não foi possível ler os dados salvos. Iniciando com dados novos.', error);
    stored = null;
  }

  state = migrateState(stored, driver);
  persist();
  return state;
}

function persist() {
  try {
    driver.set(STATE_KEY, JSON.stringify(state));
  } catch (error) {
    // Cota estourada ou storage bloqueado: a sessão continua em memória.
    console.error('Não foi possível salvar os dados.', error);
    throw new Error(
      'Não foi possível salvar os dados neste navegador. ' +
        'Verifique o espaço disponível ou desative a navegação privada.',
    );
  }
}

function notify() {
  const snapshot = getState();
  listeners.forEach((listener) => listener(snapshot));
}

function commit() {
  persist();
  notify();
}

/** Cópia defensiva: ninguém de fora altera o estado sem passar por aqui. */
export function getState() {
  const current = load();
  return {
    schemaVersion: current.schemaVersion,
    settings: { ...current.settings, company: { ...current.settings.company } },
    [COLLECTIONS.MATERIALS]: [...current[COLLECTIONS.MATERIALS]],
    [COLLECTIONS.PRINTERS]: [...current[COLLECTIONS.PRINTERS]],
    [COLLECTIONS.QUOTES]: [...current[COLLECTIONS.QUOTES]],
  };
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function list(collection) {
  assertCollection(collection);
  return [...load()[collection]];
}

export async function get(collection, id) {
  assertCollection(collection);
  return load()[collection].find((item) => item.id === id) || null;
}

/** Cria ou atualiza um documento e devolve a versão gravada. */
export async function put(collection, patch) {
  assertCollection(collection);
  const current = load();
  const factory = FACTORIES[collection];

  const existing = patch?.id
    ? current[collection].find((item) => item.id === patch.id)
    : null;

  const doc = factory({
    ...(existing || {}),
    ...patch,
    createdAt: existing?.createdAt || patch?.createdAt,
    updatedAt: new Date().toISOString(),
  });

  current[collection] = existing
    ? current[collection].map((item) => (item.id === doc.id ? doc : item))
    : [doc, ...current[collection]];

  commit();
  return doc;
}

export async function remove(collection, id) {
  assertCollection(collection);
  const current = load();
  const before = current[collection].length;
  current[collection] = current[collection].filter((item) => item.id !== id);

  if (current[collection].length === before) return false;
  commit();
  return true;
}

/** Duplica um documento, devolvendo a cópia já gravada. */
export async function duplicate(collection, id, overrides = {}) {
  assertCollection(collection);
  const original = await get(collection, id);
  if (!original) return null;

  const copy = { ...original, ...overrides };
  delete copy.id;
  delete copy.createdAt;
  delete copy.updatedAt;

  return put(collection, copy);
}

export async function getSettings() {
  return { ...load().settings, company: { ...load().settings.company } };
}

export async function updateSettings(patch = {}) {
  const current = load();
  current.settings = {
    ...current.settings,
    ...patch,
    company: { ...current.settings.company, ...(patch.company || {}) },
  };
  commit();
  return getSettings();
}

export async function resetSettings() {
  const current = load();
  current.settings = defaultSettings();
  commit();
  return getSettings();
}

/** Próximo identificador sequencial de orçamento (ORC-AAAA-0001). */
export async function reserveQuoteCode() {
  return nextQuoteCode(load()[COLLECTIONS.QUOTES]);
}

/** Substitui todo o conteúdo — usado pela importação de backup. */
export async function replaceState(incoming) {
  state = migrateState(incoming, driver);
  commit();
  return getState();
}

/** Acrescenta registros sem apagar os existentes — usado pela importação por mesclagem. */
export async function mergeState(incoming) {
  const current = load();
  const merged = migrateState(incoming, driver);

  Object.values(COLLECTIONS).forEach((collection) => {
    const existingIds = new Set(current[collection].map((item) => item.id));
    const additions = merged[collection].filter((item) => !existingIds.has(item.id));
    current[collection] = [...additions, ...current[collection]];
  });

  commit();
  return getState();
}

export async function clearAll() {
  state = migrateState(null, { get: () => null });
  commit();
  return getState();
}

/** Ponto de injeção para testes: troca o meio de gravação. */
export function __setDriver(nextDriver) {
  driver = nextDriver;
  state = null;
}

export { COLLECTIONS };
