/**
 * Roteador por hash, escrito à mão.
 *
 * O hash dispensa configuração de servidor: funciona em hospedagem estática
 * (InfinityFree, GitHub Pages) e conviveria com o `base: './'` do Vite mesmo se
 * o .htaccess não estiver ativo.
 */

import { useEffect, useState } from 'react';

export const ROUTES = {
  DASHBOARD: '/',
  PRICING: '/precificacao',
  MATERIALS: '/materiais',
  PRINTERS: '/impressoras',
  QUOTES: '/orcamentos',
  SETTINGS: '/configuracoes',
};

/** `short` é o rótulo da barra inferior no celular, onde cabem poucos caracteres. */
export const NAV_ITEMS = [
  { path: ROUTES.DASHBOARD, label: 'Dashboard', short: 'Painel', icon: 'dashboard' },
  { path: ROUTES.PRICING, label: 'Nova precificação', short: 'Precificar', icon: 'calculator' },
  { path: ROUTES.MATERIALS, label: 'Materiais', short: 'Materiais', icon: 'spool' },
  { path: ROUTES.PRINTERS, label: 'Impressoras', short: 'Máquinas', icon: 'printer' },
  { path: ROUTES.QUOTES, label: 'Orçamentos', short: 'Orçamentos', icon: 'receipt' },
  { path: ROUTES.SETTINGS, label: 'Configurações', short: 'Ajustes', icon: 'settings' },
];

/** Separa "/orcamentos?id=abc" em caminho e parâmetros. */
function parseHash(hash) {
  const raw = (hash || '').replace(/^#/, '') || ROUTES.DASHBOARD;
  const [path, search = ''] = raw.split('?');
  return {
    path: path.startsWith('/') ? path : `/${path}`,
    params: Object.fromEntries(new URLSearchParams(search)),
  };
}

export function buildHash(path, params = {}) {
  const search = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  ).toString();
  return `#${path}${search ? `?${search}` : ''}`;
}

export function navigate(path, params = {}) {
  window.location.hash = buildHash(path, params);
}

export function useRoute() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));

  useEffect(() => {
    const handle = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', handle);
    return () => window.removeEventListener('hashchange', handle);
  }, []);

  // Rola para o topo ao trocar de página: sem isso, abrir uma página longa a
  // partir do fim de outra deixa o usuário no meio do conteúdo novo.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [route.path]);

  return { ...route, navigate };
}

export function labelForPath(path) {
  return NAV_ITEMS.find((item) => item.path === path)?.label || 'TRIDDO 3D';
}
