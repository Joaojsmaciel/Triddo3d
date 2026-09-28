/**
 * Exportação e importação de backup em JSON.
 *
 * A importação nunca sobrescreve nada por conta própria: valida o arquivo,
 * descreve o que encontrou e devolve o resumo para a interface confirmar.
 */

import { COLLECTIONS, SCHEMA_VERSION } from './schema.js';

export const BACKUP_FORMAT = 'triddo3d-backup';

export function buildBackup(state) {
  return {
    format: BACKUP_FORMAT,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    settings: state.settings,
    [COLLECTIONS.MATERIALS]: state[COLLECTIONS.MATERIALS],
    [COLLECTIONS.PRINTERS]: state[COLLECTIONS.PRINTERS],
    [COLLECTIONS.QUOTES]: state[COLLECTIONS.QUOTES],
  };
}

export function backupFileName(date = new Date()) {
  const stamp = date.toISOString().slice(0, 19).replace(/[:T]/g, '-');
  return `triddo3d-backup-${stamp}.json`;
}

/** Dispara o download do backup no navegador. */
export function downloadBackup(state) {
  const payload = JSON.stringify(buildBackup(state), null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = backupFileName();
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Valida o conteúdo de um arquivo de backup.
 *
 * @returns {{valid:boolean, errors:string[], warnings:string[], data:object|null, counts:object}}
 */
export function validateBackup(raw) {
  const errors = [];
  const warnings = [];

  let data = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return {
        valid: false,
        errors: ['O arquivo não é um JSON válido.'],
        warnings,
        data: null,
        counts: {},
      };
    }
  }

  if (!isPlainObject(data)) {
    return {
      valid: false,
      errors: ['O arquivo precisa conter um objeto de backup.'],
      warnings,
      data: null,
      counts: {},
    };
  }

  if (data.format && data.format !== BACKUP_FORMAT) {
    errors.push(`Formato desconhecido: "${data.format}". Esperado "${BACKUP_FORMAT}".`);
  }
  if (!data.format) {
    warnings.push('O arquivo não identifica o formato. Verifique a origem antes de importar.');
  }

  if (data.schemaVersion && Number(data.schemaVersion) > SCHEMA_VERSION) {
    errors.push(
      `O backup foi gerado por uma versão mais nova (${data.schemaVersion}) do que esta (${SCHEMA_VERSION}).`,
    );
  }

  const counts = {};
  Object.values(COLLECTIONS).forEach((collection) => {
    const value = data[collection];
    if (value === undefined) {
      counts[collection] = 0;
      warnings.push(`O backup não contém "${collection}".`);
      return;
    }
    if (!Array.isArray(value)) {
      errors.push(`"${collection}" deveria ser uma lista.`);
      counts[collection] = 0;
      return;
    }
    counts[collection] = value.length;
  });

  if (data.settings !== undefined && !isPlainObject(data.settings)) {
    errors.push('"settings" deveria ser um objeto de configurações.');
  }

  const hasContent = Object.values(counts).some((count) => count > 0) || isPlainObject(data.settings);
  if (!hasContent) {
    errors.push('O backup está vazio: nada para importar.');
  }

  // Um id repetido dentro do próprio arquivo faria dois registros disputarem o
  // mesmo espaço depois da importação.
  Object.values(COLLECTIONS).forEach((collection) => {
    if (!Array.isArray(data[collection])) return;
    const ids = data[collection].map((item) => item?.id).filter(Boolean);
    if (new Set(ids).size !== ids.length) {
      warnings.push(`Há identificadores repetidos em "${collection}".`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    data: errors.length === 0 ? data : null,
    counts,
  };
}

/** Lê um File escolhido pelo usuário e devolve o texto. */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo selecionado.'));
    reader.readAsText(file);
  });
}
