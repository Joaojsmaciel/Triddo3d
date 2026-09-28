/**
 * Drivers de armazenamento.
 *
 * Esta é a única parte do sistema que conhece o meio de gravação. Trocar
 * localStorage por IndexedDB, Firebase ou uma API REST significa escrever um
 * novo objeto com os mesmos quatro métodos — nada acima desta camada muda.
 */

/** @typedef {{ get(key:string):string|null, set(key:string,value:string):void, remove(key:string):void, keys():string[], name:string }} StorageDriver */

/** Driver de memória: usado quando o navegador bloqueia o storage (modo privado). */
export function createMemoryDriver() {
  const store = new Map();

  return {
    name: 'memory',
    get: (key) => (store.has(key) ? store.get(key) : null),
    set: (key, value) => {
      store.set(key, value);
    },
    remove: (key) => {
      store.delete(key);
    },
    keys: () => [...store.keys()],
  };
}

export function createLocalStorageDriver(storage) {
  return {
    name: 'localStorage',
    get: (key) => storage.getItem(key),
    set: (key, value) => storage.setItem(key, value),
    remove: (key) => storage.removeItem(key),
    keys: () => {
      const result = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key) result.push(key);
      }
      return result;
    },
  };
}

/**
 * Escolhe o melhor driver disponível. Alguns navegadores expõem localStorage mas
 * lançam ao gravar (cota zerada, navegação privada), por isso testamos escrevendo.
 */
export function detectDriver() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const probe = '__triddo_probe__';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return createLocalStorageDriver(window.localStorage);
    }
  } catch {
    // Cai no driver de memória: a sessão funciona, mas sem persistir.
  }
  return createMemoryDriver();
}
