/**
 * Regras puras da sincronização dos dados do usuário com o Firestore.
 *
 * Sem SDK nem rede, para poder ser testado com `node --test`: o repositório
 * (`src/firebase/userData.js`) só grava o que estas funções decidem.
 */

import {
  COLLECTIONS,
  createMaterial,
  createPrinter,
  createQuote,
  createTransaction,
  defaultSettings,
} from './schema.js';

export const CLOUD_COLLECTIONS = Object.values(COLLECTIONS);

const FACTORIES = {
  [COLLECTIONS.MATERIALS]: createMaterial,
  [COLLECTIONS.PRINTERS]: createPrinter,
  [COLLECTIONS.QUOTES]: createQuote,
  [COLLECTIONS.TRANSACTIONS]: createTransaction,
};

/* ------------------------------------------------------------ Materiais */

/** Campos de material aceitos pelas regras do Firestore (validação estrita). */
export const MATERIAL_FIELDS = [
  'id',
  'brand',
  'name',
  'type',
  'color',
  'colorHex',
  'spoolGrams',
  'priceCents',
  'shippingCents',
  'notes',
  'createdAt',
  'updatedAt',
];

/** Limites de tamanho de texto, iguais aos de `firestore.rules`. */
const TEXT_LIMITS = { brand: 200, name: 200, type: 50, color: 100, colorHex: 20, notes: 5000 };

const text = (value, max) => String(value ?? '').slice(0, max);
const amount = (value) => (Number.isFinite(value) && value > 0 ? value : 0);
const isoDate = (value, fallback) => {
  const date = new Date(value);
  return value && !Number.isNaN(date.getTime()) ? date.toISOString() : fallback;
};

/**
 * Normaliza um material para o formato exato do documento no Firestore.
 * Saneia tudo o que as regras recusariam (texto longo, número negativo, data
 * em outro formato): um único registro inválido derrubaria a gravação em lote.
 */
export function toMaterialDoc(material = {}) {
  const normalized = createMaterial(material);
  const now = new Date().toISOString();
  return {
    id: text(normalized.id, 200),
    brand: text(normalized.brand, TEXT_LIMITS.brand),
    name: text(normalized.name, TEXT_LIMITS.name),
    type: text(normalized.type, TEXT_LIMITS.type),
    color: text(normalized.color, TEXT_LIMITS.color),
    colorHex: text(normalized.colorHex, TEXT_LIMITS.colorHex),
    spoolGrams: amount(normalized.spoolGrams),
    priceCents: amount(normalized.priceCents),
    shippingCents: amount(normalized.shippingCents),
    notes: text(normalized.notes, TEXT_LIMITS.notes),
    createdAt: isoDate(normalized.createdAt, now),
    updatedAt: isoDate(normalized.updatedAt, now),
  };
}

/* ------------------------------------------------------- Documentos gerais */

/**
 * Converte para algo que o Firestore aceita: remove `undefined` e funções e
 * troca NaN/Infinity por null (o JSON faz exatamente isso).
 */
function toPlainData(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

/** Normaliza um registro de qualquer coleção para gravação. */
export function toCloudDoc(collection, item = {}) {
  if (collection === COLLECTIONS.MATERIALS) return toMaterialDoc(item);
  const factory = FACTORIES[collection];
  if (!factory) throw new Error(`Coleção desconhecida: ${collection}`);
  return toPlainData(factory(item));
}

/**
 * Versão gravada de um registro criado ou editado, preservando a data de
 * criação do registro existente (mesmo comportamento do repositório local).
 */
export function buildCloudDoc(collection, patch = {}, existing = null, now = new Date()) {
  return toCloudDoc(collection, {
    ...(existing || {}),
    ...patch,
    createdAt: existing?.createdAt || patch?.createdAt || now.toISOString(),
    updatedAt: now.toISOString(),
  });
}

/** Cópia de um registro com novo id e novas datas. */
export function buildCloudCopy(collection, original, overrides = {}, now = new Date()) {
  const copy = { ...original, ...overrides };
  delete copy.id;
  delete copy.createdAt;
  delete copy.updatedAt;
  return buildCloudDoc(collection, copy, null, now);
}

/** Atalhos mantidos para os materiais. */
export const buildMaterialDoc = (patch, existing, now) =>
  buildCloudDoc(COLLECTIONS.MATERIALS, patch, existing, now);
export const buildMaterialCopy = (original, overrides, now) =>
  buildCloudCopy(COLLECTIONS.MATERIALS, original, overrides, now);

/** Configurações completas: valores padrão + o que estiver gravado. */
export function toCloudSettings(settings = {}) {
  const base = defaultSettings();
  const source = settings && typeof settings === 'object' ? settings : {};
  return toPlainData({
    ...base,
    ...source,
    company: { ...base.company, ...(source.company || {}) },
  });
}

/* --------------------------------------------------------------- Migração */

const normalizeKey = (value) => String(value || '').trim().toLowerCase();

/**
 * Chave "de conteúdo" usada quando a conta já tem dados: evita que o material
 * e a impressora de exemplo de um navegador novo se dupliquem na conta.
 */
const CONTENT_KEYS = {
  [COLLECTIONS.MATERIALS]: (item) => normalizeKey(item?.name),
  [COLLECTIONS.PRINTERS]: (item) => normalizeKey(`${item?.brand || ''} ${item?.model || ''}`),
};

function dedupeById(list) {
  const seen = new Set();
  return list.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

/**
 * O que sobe de uma coleção do navegador para a conta.
 *
 * Conta vazia: sobe tudo. Conta já em uso: sobe só o que ainda não existe nela
 * (pelo id e, para materiais e impressoras, também pelo nome). Os ids são
 * mantidos para que os orçamentos continuem ligados a materiais e impressoras.
 */
export function planCollectionMigration(collection, localItems, cloudItems) {
  const local = Array.isArray(localItems) ? localItems : [];
  const cloud = Array.isArray(cloudItems) ? cloudItems : [];
  const docs = dedupeById(local.map((item) => toCloudDoc(collection, item)));
  if (cloud.length === 0) return docs;

  const ids = new Set(cloud.map((item) => item?.id));
  const contentKey = CONTENT_KEYS[collection];
  const keys = contentKey ? new Set(cloud.map(contentKey)) : null;
  return docs.filter((item) => !ids.has(item.id) && !(keys && keys.has(contentKey(item))));
}

/** Compatibilidade: migração só dos materiais. */
export const planMaterialMigration = (local, cloud) =>
  planCollectionMigration(COLLECTIONS.MATERIALS, local, cloud);

/**
 * Plano completo de migração do navegador para a conta.
 * As configurações locais só sobem se a conta ainda não tiver configurações.
 */
export function planStateMigration(localState = {}, cloudState = {}) {
  const collections = {};
  CLOUD_COLLECTIONS.forEach((collection) => {
    collections[collection] = planCollectionMigration(
      collection,
      localState?.[collection],
      cloudState?.[collection],
    );
  });
  const settings = cloudState?.settings ? null : toCloudSettings(localState?.settings);
  const total = Object.values(collections).reduce((sum, list) => sum + list.length, 0);
  return { collections, settings, total };
}

/** Registros de um backup que ainda não existem na conta (mesclagem por id). */
export function planCollectionMerge(collection, incomingItems, existingItems) {
  const incoming = Array.isArray(incomingItems) ? incomingItems : [];
  const existingIds = new Set(
    (Array.isArray(existingItems) ? existingItems : []).map((item) => item?.id),
  );
  return dedupeById(incoming.map((item) => toCloudDoc(collection, item))).filter(
    (item) => !existingIds.has(item.id),
  );
}

export const planMaterialMerge = (incoming, existing) =>
  planCollectionMerge(COLLECTIONS.MATERIALS, incoming, existing);

/** Quantos registros locais existem (decide se há algo a migrar). */
export function countLocalRecords(localState = {}) {
  return CLOUD_COLLECTIONS.reduce(
    (sum, collection) => sum + (Array.isArray(localState?.[collection]) ? localState[collection].length : 0),
    0,
  );
}

/* ---------------------------------------------------------------- Escrita */

/** Divide em lotes: o Firestore aceita até 500 operações por gravação em lote. */
export function chunk(list, size = 400) {
  const result = [];
  for (let index = 0; index < list.length; index += size) {
    result.push(list.slice(index, index + size));
  }
  return result;
}

export const WRITE_STATUS = { SYNCED: 'synced', PENDING: 'pending' };

/**
 * Espera a confirmação do servidor por no máximo `timeoutMs`. Sem internet o
 * Firestore guarda a gravação no cache e só confirma quando a conexão volta;
 * aguardar isso travaria a tela. Depois do prazo, devolve PENDING e entrega um
 * erro tardio (ex.: regra recusou) para `onLateError`.
 */
export function settleWrite(promise, { timeoutMs = 6000, onLateError = () => {} } = {}) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve(WRITE_STATUS.PENDING), timeoutMs);
  });
  return Promise.race([promise.then(() => WRITE_STATUS.SYNCED), timeout])
    .then((status) => {
      if (status === WRITE_STATUS.PENDING) promise.catch(onLateError);
      return status;
    })
    .finally(() => clearTimeout(timer));
}

/** Mensagem legível para falhas do Firestore. */
export function describeCloudError(error) {
  const code = String(error?.code || '');
  if (code === 'unauthenticated') {
    return 'Sua sessão expirou. Saia e entre novamente.';
  }
  if (code === 'permission-denied') {
    return 'O Firebase recusou a operação. Confirme que as regras do Firestore foram publicadas (firebase deploy --only firestore:rules).';
  }
  if (code === 'unavailable' || code === 'deadline-exceeded') {
    return 'Sem conexão com o Firebase. Verifique sua internet e tente novamente.';
  }
  if (code === 'resource-exhausted') {
    return 'O limite de uso do Firebase foi atingido. Tente novamente mais tarde.';
  }
  return error?.message || 'Não foi possível acessar seus dados no Firebase.';
}
