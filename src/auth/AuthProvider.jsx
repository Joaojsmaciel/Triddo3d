import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { isAllowedUser } from './access';

/**
 * Sessão do usuário via Firebase Authentication com conta Google.
 * A sessão fica salva no navegador até o usuário sair. Só as contas de
 * `access.js` entram; as demais são desconectadas na hora.
 */

const AuthContext = createContext(null);

const googleProvider = new GoogleAuthProvider();
// Sempre mostra o seletor de contas: quem usa mais de uma conta Google escolhe qual.
googleProvider.setCustomParameters({ prompt: 'select_account' });

export function AuthProvider({ children }) {
  // `undefined` = ainda verificando a sessão salva; `null` = sem login.
  const [user, setUser] = useState(undefined);
  // E-mail da última conta recusada, para a tela de login explicar o motivo.
  const [deniedEmail, setDeniedEmail] = useState('');

  useEffect(
    () =>
      onAuthStateChanged(auth, (current) => {
        if (current && !isAllowedUser(current)) {
          setDeniedEmail(current.email || 'esta conta');
          setUser(null);
          firebaseSignOut(auth).catch(() => {});
          return;
        }
        setUser(current || null);
      }),
    [],
  );

  const value = useMemo(
    () => ({
      user: user || null,
      loading: user === undefined,
      deniedEmail,
      signInWithGoogle: () => {
        setDeniedEmail('');
        return signInWithPopup(auth, googleProvider);
      },
      signOut: () => firebaseSignOut(auth),
    }),
    [user, deniedEmail],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  }
  return context;
}
