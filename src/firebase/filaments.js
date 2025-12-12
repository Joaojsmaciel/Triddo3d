import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc,
  query,
  orderBy 
} from 'firebase/firestore';
import { db } from './config';

const FILAMENTS_COLLECTION = 'filaments';

// Salvar filamento no Firebase
export const saveFilament = async (filament) => {
  try {
    const docRef = await addDoc(collection(db, FILAMENTS_COLLECTION), {
      ...filament,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error('Erro ao salvar filamento:', error);
    throw error;
  }
};

// Carregar todos os filamentos do Firebase
export const loadFilaments = async () => {
  try {
    const q = query(collection(db, FILAMENTS_COLLECTION), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const filaments = [];
    
    querySnapshot.forEach((doc) => {
      filaments.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return filaments;
  } catch (error) {
    console.error('Erro ao carregar filamentos:', error);
    throw error;
  }
};

// Excluir filamento do Firebase
export const deleteFilament = async (id) => {
  try {
    await deleteDoc(doc(db, FILAMENTS_COLLECTION, id));
  } catch (error) {
    console.error('Erro ao excluir filamento:', error);
    throw error;
  }
};

