import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCqe-DGSdLLDO_UJw48owvUspAMvyxInbU",
  authDomain: "triddo-eeb4d.firebaseapp.com",
  projectId: "triddo-eeb4d",
  storageBucket: "triddo-eeb4d.firebasestorage.app",
  messagingSenderId: "1009648845290",
  appId: "1:1009648845290:web:3c8355f17040d09d457293",
  measurementId: "G-274Q8B3WYV"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Firestore
export const db = getFirestore(app);

// Inicializar Analytics (apenas no browser)
let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { analytics };
export default app;

