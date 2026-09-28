import React, { useEffect, useState } from 'react';
import Logo from '../brand/Logo';
import Icon from '../ui/Icon';
import { Button } from '../ui/primitives';
import { NAV_ITEMS, ROUTES, buildHash, labelForPath } from '../../router/routes';

/**
 * Casca da aplicação: menu lateral fixo no desktop, gaveta no celular e barra
 * inferior de acesso rápido em telas pequenas.
 */

function NavList({ currentPath, onNavigate }) {
  return (
    <nav className="space-y-1">
      {NAV_ITEMS.map((item) => {
        const active = currentPath === item.path;
        return (
          <a
            key={item.path}
            href={buildHash(item.path)}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`nav-link ${active ? 'nav-link-active' : ''}`}
          >
            <Icon name={item.icon} size={18} className={active ? 'text-brand-blue' : ''} />
            <span className="truncate">{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}

export default function AppShell({ currentPath, children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fecha a gaveta ao trocar de página: sem isso ela fica aberta sobre o
  // conteúdo novo no celular.
  useEffect(() => {
    setDrawerOpen(false);
  }, [currentPath]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  return (
    <div className="min-h-full bg-ink-950">
      {/* Menu lateral: desktop */}
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-ink-800 bg-ink-900/60 backdrop-blur lg:flex">
        <div className="border-b border-ink-800 px-5 py-5">
          <a href={buildHash(ROUTES.DASHBOARD)} aria-label="Ir para o dashboard">
            <Logo />
          </a>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <NavList currentPath={currentPath} />
        </div>

        <div className="border-t border-ink-800 p-3">
          <a href={buildHash(ROUTES.PRICING)} className="block">
            <Button variant="primary" icon="plus" className="w-full">
              Nova precificação
            </Button>
          </a>
          <p className="mt-3 px-1 text-[11px] leading-relaxed text-gray-600">
            Dados salvos neste navegador. Faça backup em Configurações.
          </p>
        </div>
      </aside>

      {/* Cabeçalho: celular e tablet */}
      <header className="no-print sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-ink-800 bg-ink-950/90 px-4 py-3 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-ink-800 hover:text-gray-100"
          aria-label="Abrir menu"
          aria-expanded={drawerOpen}
        >
          <Icon name="menu" size={20} />
        </button>

        <span className="truncate text-sm font-semibold text-gray-200">{labelForPath(currentPath)}</span>

        <a href={buildHash(ROUTES.DASHBOARD)} aria-label="Ir para o dashboard">
          <Logo compact size={28} />
        </a>
      </header>

      {/* Gaveta: celular e tablet */}
      {drawerOpen ? (
        <div
          className="no-print fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:hidden"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDrawerOpen(false);
          }}
        >
          <div className="flex h-full w-72 max-w-[85vw] animate-slideIn flex-col border-r border-ink-800 bg-ink-900">
            <div className="flex items-center justify-between border-b border-ink-800 px-4 py-4">
              <Logo />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-ink-800 hover:text-gray-100"
                aria-label="Fechar menu"
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <NavList currentPath={currentPath} onNavigate={() => setDrawerOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}

      {/* Conteúdo */}
      <main className="lg:pl-64">
        <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12 lg:pt-8">{children}</div>
      </main>

      {/* Barra inferior: atalhos no celular */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-40 flex border-t border-ink-800 bg-ink-950/95 backdrop-blur lg:hidden">
        {NAV_ITEMS.map((item) => {
          const active = currentPath === item.path;
          return (
            <a
              key={item.path}
              href={buildHash(item.path)}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                active ? 'text-brand-blue' : 'text-gray-500'
              }`}
            >
              <Icon name={item.icon} size={20} />
              <span className="max-w-full truncate px-0.5">{item.short}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}
