/**
 * Arquivos dos orçamentos gravados direto no computador, sem passar pela nuvem.
 *
 * Usa a File System Access API (Chrome e Edge no desktop): o usuário escolhe uma
 * pasta raiz uma única vez e cada orçamento ganha a sua subpasta dentro dela,
 * no formato "ORC-2026-0001 - Nome do projeto".
 *
 * O identificador da pasta raiz não cabe no localStorage, por isso fica no
 * IndexedDB. Depois de recarregar a página o navegador pode pedir de novo a
 * permissão de acesso, e esse pedido precisa partir de um clique do usuário.
 */

const DB_NAME = 'triddo3d-files';
const DB_STORE = 'handles';
const ROOT_KEY = 'quotesRoot';

/** Caracteres proibidos em nomes de arquivo/pasta no Windows. */
const INVALID_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;

export function isLocalFilesSupported() {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}

/** Deixa um texto seguro para virar nome de pasta ou arquivo. */
export function sanitizeName(value, fallback = 'sem-nome') {
  const clean = String(value ?? '')
    .replace(INVALID_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')
    .slice(0, 80)
    .trim();
  return clean || fallback;
}

/** Prefixo estável da pasta: o código não muda quando o projeto é renomeado. */
export function quoteFolderKey(quote) {
  return sanitizeName(quote?.code || quote?.id, 'orcamento');
}

export function quoteFolderName(quote) {
  const key = quoteFolderKey(quote);
  return quote?.projectName ? `${key} - ${sanitizeName(quote.projectName)}` : key;
}

/** "peca.stl" já existe → "peca (2).stl", "peca (3).stl"... */
export function uniqueFileName(name, taken) {
  const used = new Set([...taken].map((item) => item.toLowerCase()));
  if (!used.has(name.toLowerCase())) return name;

  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';

  for (let index = 2; ; index += 1) {
    const candidate = `${base} (${index})${ext}`;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
}

/* ------------------------------------------------------------ IndexedDB */

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(DB_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idb(mode, run) {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, mode);
      const request = run(tx.objectStore(DB_STORE));
      tx.oncomplete = () => resolve(request?.result);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/* ------------------------------------------------------------ Pasta raiz */

export async function getRootFolder() {
  if (!isLocalFilesSupported()) return null;
  try {
    return (await idb('readonly', (store) => store.get(ROOT_KEY))) || null;
  } catch {
    return null;
  }
}

/** Abre o seletor do sistema. Precisa ser chamado a partir de um clique. */
export async function pickRootFolder() {
  const handle = await window.showDirectoryPicker({ id: 'triddo-orcamentos', mode: 'readwrite' });
  await idb('readwrite', (store) => store.put(handle, ROOT_KEY));
  return handle;
}

export async function forgetRootFolder() {
  await idb('readwrite', (store) => store.delete(ROOT_KEY));
}

/**
 * Situação da permissão: 'granted', 'prompt' ou 'denied'.
 * Com `request` verdadeiro mostra o pedido do navegador (exige clique).
 */
export async function folderPermission(handle, { request = false } = {}) {
  const options = { mode: 'readwrite' };
  let status = await handle.queryPermission(options);
  if (status !== 'granted' && request) {
    status = await handle.requestPermission(options);
  }
  return status;
}

/* ---------------------------------------------------- Pasta do orçamento */

async function findQuoteFolder(root, quote) {
  const key = quoteFolderKey(quote);
  for await (const entry of root.values()) {
    if (entry.kind !== 'directory') continue;
    if (entry.name === key || entry.name.startsWith(`${key} - `)) return entry;
  }
  return null;
}

async function ensureQuoteFolder(root, quote) {
  return (
    (await findQuoteFolder(root, quote)) ||
    root.getDirectoryHandle(quoteFolderName(quote), { create: true })
  );
}

/** Lista os arquivos da pasta do orçamento (vazia se a pasta ainda não existe). */
export async function listQuoteFiles(root, quote) {
  const folder = await findQuoteFolder(root, quote);
  if (!folder) return { folderName: quoteFolderName(quote), files: [] };

  const files = [];
  for await (const entry of folder.values()) {
    if (entry.kind !== 'file') continue;
    const file = await entry.getFile();
    files.push({ name: entry.name, size: file.size, lastModified: file.lastModified });
  }
  files.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return { folderName: folder.name, files };
}

/** Copia os arquivos escolhidos para a pasta do orçamento, sem sobrescrever. */
export async function saveQuoteFiles(root, quote, fileList) {
  const folder = await ensureQuoteFolder(root, quote);

  const taken = [];
  for await (const entry of folder.values()) taken.push(entry.name);

  const saved = [];
  for (const file of fileList) {
    const name = uniqueFileName(sanitizeName(file.name, 'arquivo'), taken);
    const handle = await folder.getFileHandle(name, { create: true });
    const writable = await handle.createWritable();
    await writable.write(file);
    await writable.close();
    taken.push(name);
    saved.push(name);
  }
  return saved;
}

export async function readQuoteFile(root, quote, name) {
  const folder = await findQuoteFolder(root, quote);
  if (!folder) throw new Error('A pasta deste orçamento não foi encontrada.');
  const handle = await folder.getFileHandle(name);
  return handle.getFile();
}

export async function deleteQuoteFile(root, quote, name) {
  const folder = await findQuoteFolder(root, quote);
  if (!folder) return;
  await folder.removeEntry(name);
}
