import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { getAnalytics, isSupported as analyticsSupported } from 'firebase/analytics';

// Configuração pública do app web (não é segredo: o acesso é controlado pelas
// regras do Firestore e pelo Firebase Authentication).
const firebaseConfig = {
  apiKey: "AIzaSyCqe-DGSdLLDO_UJw48owvUspAMvyxInbU",
  authDomain: "triddo-eeb4d.firebaseapp.com",
  projectId: "triddo-eeb4d",
  storageBucket: "triddo-eeb4d.firebasestorage.app",
  messagingSenderId: "1009648845290",
  appId: "1:1009648845290:web:3c8355f17040d09d457293",
  measurementId: "G-274Q8B3WYV"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
// E-mails de recuperação de senha em português.
auth.languageCode = 'pt-BR';

/**
 * Firestore com cache local persistente: a lista de materiais abre na hora a
 * partir do cache e continua disponível sem internet. Em navegadores que não
 * permitem IndexedDB (navegação privada) o SDK cai sozinho para memória.
 */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

// Analytics só onde o navegador suporta (evita erro com cookies bloqueados).
let analytics = null;
if (typeof window !== 'undefined') {
  analyticsSupported()
    .then((supported) => {
      if (supported) analytics = getAnalytics(app);
    })
    .catch(() => {});
}

export { analytics };
export default app;
