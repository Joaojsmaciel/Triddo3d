import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import FilamentForm from './components/FilamentForm';
import FilamentList from './components/FilamentList';
import Calculator from './components/Calculator';
import Results from './components/Results';
import Notification from './components/Notification';
import PermissionAlert from './components/PermissionAlert';
import { useFilaments } from './hooks/useFilaments';

function App() {
  const { filaments, loading, error, addFilament, removeFilament } = useFilaments();
  const [selectedFilamentId, setSelectedFilamentId] = useState('');
  const [results, setResults] = useState(null);
  const [notification, setNotification] = useState(null);
  const [showPermissionAlert, setShowPermissionAlert] = useState(false);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
  };

  const handleSaveFilament = async (filamentData) => {
    try {
      await addFilament(filamentData);
      showNotification('Filamento salvo com sucesso!', 'success');
    } catch (err) {
      if (err.message === 'PERMISSION_DENIED') {
        setShowPermissionAlert(true);
      } else {
        showNotification('Erro ao salvar filamento. Tente novamente.', 'error');
      }
    }
  };

  const handleDeleteFilament = async (id) => {
    try {
      await removeFilament(id);
      if (selectedFilamentId === id) {
        setSelectedFilamentId('');
      }
      showNotification('Filamento excluído com sucesso!', 'success');
    } catch (err) {
      if (err.message === 'PERMISSION_DENIED') {
        setShowPermissionAlert(true);
      } else {
        showNotification('Erro ao excluir filamento. Tente novamente.', 'error');
      }
    }
  };

  const handleSelectFilament = (id) => {
    setSelectedFilamentId(id);
  };

  const handleCalculate = (calculationResults) => {
    setResults(calculationResults);
  };

  // Mostrar alerta de permissão se houver erro
  useEffect(() => {
    if (error === 'PERMISSION_DENIED') {
      setShowPermissionAlert(true);
    }
  }, [error]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando filamentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-5 py-5">
        <Header />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div>
            <FilamentForm onSave={handleSaveFilament} />
            <div className="mt-8">
              <FilamentList
                filaments={filaments}
                onSelect={handleSelectFilament}
                onDelete={handleDeleteFilament}
                selectedId={selectedFilamentId}
              />
            </div>
          </div>
          
          <div>
            <Calculator
              filaments={filaments}
              onCalculate={handleCalculate}
              selectedFilamentId={selectedFilamentId}
            />
            <Results results={results} />
          </div>
        </div>

        <footer className="text-center py-5 bg-gray-900/90 rounded-2xl shadow-2xl border border-gray-800">
          <p className="text-gray-400 text-sm">
            &copy; 2024 Triddo - Print and Design 3D | Calculadora de Custo de Impressão 3D
          </p>
        </footer>
      </div>

      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {showPermissionAlert && (
        <PermissionAlert onDismiss={() => setShowPermissionAlert(false)} />
      )}
    </div>
  );
}

export default App;

