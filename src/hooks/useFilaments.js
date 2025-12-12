import { useState, useEffect } from 'react';
import { loadFilaments, saveFilament, deleteFilament as deleteFilamentFirebase } from '../firebase/filaments';

export const useFilaments = () => {
  const [filaments, setFilaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carregar filamentos do Firebase
  const fetchFilaments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await loadFilaments();
      setFilaments(data);
    } catch (err) {
      // Mensagem mais amigável para erros de permissão
      if (err.code === 'permission-denied' || err.message.includes('permissions')) {
        setError('PERMISSION_DENIED');
      } else {
        setError(err.message);
      }
      console.error('Erro ao carregar filamentos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Carregar filamentos ao montar o componente
  useEffect(() => {
    fetchFilaments();
  }, []);

  // Adicionar novo filamento
  const addFilament = async (filamentData) => {
    try {
      await saveFilament(filamentData);
      await fetchFilaments(); // Recarregar lista
      return true;
    } catch (err) {
      // Mensagem mais amigável para erros de permissão
      if (err.code === 'permission-denied' || err.message.includes('permissions')) {
        setError('PERMISSION_DENIED');
        throw new Error('PERMISSION_DENIED');
      }
      setError(err.message);
      throw err;
    }
  };

  // Excluir filamento
  const removeFilament = async (id) => {
    try {
      await deleteFilamentFirebase(id);
      await fetchFilaments(); // Recarregar lista
      return true;
    } catch (err) {
      // Mensagem mais amigável para erros de permissão
      if (err.code === 'permission-denied' || err.message.includes('permissions')) {
        setError('PERMISSION_DENIED');
        throw new Error('PERMISSION_DENIED');
      }
      setError(err.message);
      throw err;
    }
  };

  return {
    filaments,
    loading,
    error,
    addFilament,
    removeFilament,
    refreshFilaments: fetchFilaments
  };
};

