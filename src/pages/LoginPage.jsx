import React, { useState } from 'react';
import Logo from '../components/brand/Logo';
import { Callout, Card, CardBody } from '../components/ui/primitives';
import { useAuth } from '../auth/AuthProvider';
import { authErrorMessage } from '../auth/authErrors';

/** Marca do Google nas cores oficiais, exigida no botão de login. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

export default function LoginPage() {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleGoogle = async () => {
    setError('');
    setBusy(true);
    try {
      // Ao concluir, o AuthGate troca esta tela pelo sistema.
      await signInWithGoogle();
    } catch (failure) {
      setError(authErrorMessage(failure) || '');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-ink-950 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <Card>
          <CardBody>
            <h1 className="text-xl font-bold tracking-tight text-gray-50">Entrar</h1>
            <p className="mb-6 mt-1 text-sm text-gray-500">
              Use sua conta Google. Seus materiais, orçamentos e demais dados ficam salvos na conta e aparecem em qualquer navegador.
            </p>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={busy}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <GoogleMark />
              {busy ? 'Aguardando o Google...' : 'Entrar com o Google'}
            </button>

            {error ? (
              <Callout tone="negative" className="mt-4">
                {error}
              </Callout>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
