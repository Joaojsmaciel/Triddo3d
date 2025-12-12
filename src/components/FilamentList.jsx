import React from 'react';

const FilamentList = ({ filaments, onSelect, onDelete, selectedId }) => {
  if (filaments.length === 0) {
    return (
      <div className="bg-white/4 p-8 rounded-2xl shadow-2xl border border-gray-800">
        <h3 className="text-gray-200 mb-5 text-lg font-semibold">Filamentos Salvos</h3>
        <div className="max-h-72 overflow-y-auto border-2 border-gray-800 rounded-lg p-4 bg-gray-900/50">
          <p className="text-center text-gray-400 py-5">
            Nenhum filamento salvo ainda.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/4 p-8 rounded-2xl shadow-2xl border border-gray-800">
      <h3 className="text-gray-200 mb-5 text-lg font-semibold">Filamentos Salvos</h3>
      <div className="max-h-72 overflow-y-auto border-2 border-gray-800 rounded-lg p-4 bg-gray-900/50">
        {filaments.map((filament) => {
          const colors = filament.colors || ['#4C7DFF'];
          const isSelected = selectedId === filament.id;
          
          return (
            <div
              key={filament.id}
              className={`flex items-center justify-between p-4 mb-2.5 bg-white/4 rounded-lg shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                isSelected
                  ? 'border-2 border-brand-blue bg-gradient-to-br from-blue-50/10 to-blue-100/10'
                  : 'border-2 border-transparent'
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-7 h-7 rounded-full border-2 border-gray-800 shadow-sm"
                  style={{
                    background: `linear-gradient(90deg, ${colors.slice(0, 3).join(', ')})`
                  }}
                ></div>
                <div>
                  <h4 className="text-gray-200 text-base mb-1">
                    {filament.name} ·{' '}
                    <span className="text-brand-blue font-bold">
                      {filament.type || 'PLA'}
                    </span>
                  </h4>
                  <p className="text-gray-400 text-sm">
                    R$ {filament.price.toFixed(2)} / {filament.weight}g - R${' '}
                    {filament.costPerGram.toFixed(3)}/g
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Cores: {colors.join(', ')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2.5">
                <button
                  onClick={() => onSelect(filament.id)}
                  className="px-3 py-2 bg-brand-blue text-white rounded-md text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-blue/40 flex items-center gap-1.5"
                >
                  <i className="fas fa-check"></i>
                  Usar
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Tem certeza que deseja excluir este filamento?')) {
                      onDelete(filament.id);
                    }
                  }}
                  className="px-3 py-2 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-md text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-red-500/40 flex items-center gap-1.5"
                >
                  <i className="fas fa-trash"></i>
                  Excluir
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FilamentList;

