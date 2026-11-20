import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from '../firebase/config';

/**
 * Sessão do usuário via Firebase Authentication com conta Google.
 * A sessão fica salva no navegador até o usuário sair.
 */

const AuthContext = createContext(null);

const googleProvider = new GoogleAuthProvider();
// Sempre mostra o seletor de contas: quem usa mais de uma conta Google escolhe qual.
googleProvider.setCustomParameters({ prompt: 'select_account' });

export function AuthProvider({ children }) {
  // `undefined` = ainda verificando a sessão salva; `null` = sem login.
  const [user, setUser] = useState(undefined);

  useEffect(() => onAuthStateChanged(auth, (current) => setUser(current || null)), []);

  const value = useMemo(
    () => ({
      user: user || null,
      loading: user === undefined,
      signInWithGoogle: () => signInWithPopup(auth, googleProvider),
      signOut: () => firebaseSignOut(auth),
    }),
    [user],
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
