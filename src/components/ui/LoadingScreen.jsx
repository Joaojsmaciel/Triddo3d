import React from 'react';
import Logo from '../brand/Logo';

/** Tela de espera em tela cheia (sessão sendo verificada, dados carregando). */
export default function LoadingScreen({ label = 'Carregando...' }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-5 bg-ink-950 px-4 py-10" role="status">
      <Logo />
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink-700 border-t-brand-blue" aria-hidden="true" />
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}
