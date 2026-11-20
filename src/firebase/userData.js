/**
 * Repositório dos dados do usuário no Firestore.
 *
 *   users/{uid}/materials/{id}
 *   users/{uid}/printers/{id}
 *   users/{uid}/quotes/{id}
 *   users/{uid}/transactions/{id}
 *   users/{uid}/meta/settings
 *
 * As regras de segurança garantem que cada conta só acessa os próprios dados.
 *
 * As funções de escrita devolvem a promessa de confirmação do servidor. Sem
 * internet ela só termina quando a conexão volta, por isso quem chama usa
 * `settleWrite` (src/data/cloudSync.js) para não travar a interface; a
 * alteração já aparece na tela na hora, pelo cache local.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDocFromServer,
  getDocs,
  getDocsFromServer,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import { CLOUD_COLLECTIONS, chunk, planStateMigration } from '../data/cloudSync.js';

const collectionRef = (uid, name) => collection(db, 'users', uid, name);
const docRef = (uid, name, id) => doc(db, 'users', uid, name, id);
const settingsRef = (uid) => doc(db, 'users', uid, 'meta', 'settings');

/** Acompanha uma coleção em tempo real. Devolve a função de cancelamento. */
export function subscribeCollection(uid, name, onChange, onError) {
  const ordered = query(collectionRef(uid, name), orderBy('createdAt', 'desc'));
  return onSnapshot(
    ordered,
    (snapshot) => onChange(snapshot.docs.map((item) => ({ ...item.data(), id: item.id }))),
    onError,
  );
}

/** Acompanha as configurações; `null` quando a conta ainda não tem. */
export function subscribeSettings(uid, onChange, onError) {
  return onSnapshot(
    settingsRef(uid),
    (snapshot) => onChange(snapshot.exists() ? snapshot.data() : null),
    onError,
  );
}

export function writeDoc(uid, name, item) {
  return setDoc(docRef(uid, name, item.id), item);
}

export function removeDoc(uid, name, id) {
  return deleteDoc(docRef(uid, name, id));
}

export function writeSettings(uid, settings) {
  return setDoc(settingsRef(uid), settings);
}

/** Aplica operações em lotes de até 400, todos enviados de uma vez. */
function commitInBatches(operations) {
  return Promise.all(
    chunk(operations).map((group) => {
      const batch = writeBatch(db);
      group.forEach((apply) => apply(batch));
      return batch.commit();
    }),
  );
}

const setOperation = (uid, name, item) => (batch) => batch.set(docRef(uid, name, item.id), item);

/** Grava vários registros de uma coleção. */
export function writeDocs(uid, name, items) {
  return commitInBatches(items.map((item) => setOperation(uid, name, item)));
}

/**
 * Substitui uma coleção inteira (importação de backup / apagar tudo).
 * Lê a lista atual (do cache, se estiver sem internet) e devolve a promessa de
 * gravação. Grava os novos antes de excluir os antigos.
 */
export async function replaceCollections(uid, collections) {
  const operations = [];
  for (const [name, items] of Object.entries(collections)) {
    const keep = new Set(items.map((item) => item.id));
    const snapshot = await getDocs(collectionRef(uid, name));
    operations.push(...items.map((item) => setOperation(uid, name, item)));
    snapshot.docs
      .filter((item) => !keep.has(item.id))
      .forEach((item) => operations.push((batch) => batch.delete(item.ref)));
  }
  return { write: commitInBatches(operations) };
}

/**
 * Envia para a conta os dados que estavam só neste navegador. Consulta o
 * servidor (não o cache) para não confundir "cache vazio" com "conta vazia";
 * sem internet, lança erro e a migração fica para o próximo acesso.
 */
export async function migrateLocalState(uid, localState) {
  const cloudState = {};
  for (const name of CLOUD_COLLECTIONS) {
    const snapshot = await getDocsFromServer(collectionRef(uid, name));
    cloudState[name] = snapshot.docs.map((item) => ({ ...item.data(), id: item.id }));
  }
  const settingsSnapshot = await getDocFromServer(settingsRef(uid));
  cloudState.settings = settingsSnapshot.exists() ? settingsSnapshot.data() : null;

  const plan = planStateMigration(localState, cloudState);
  const operations = [];
  Object.entries(plan.collections).forEach(([name, items]) => {
    items.forEach((item) => operations.push(setOperation(uid, name, item)));
  });
  if (plan.settings) operations.push((batch) => batch.set(settingsRef(uid), plan.settings));

  return {
    plan,
    write: operations.length > 0 ? commitInBatches(operations) : Promise.resolve(),
  };
}
