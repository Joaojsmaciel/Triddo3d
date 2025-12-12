import React, { useState, useEffect } from 'react';

const FilamentForm = ({ onSave, onSelect }) => {
  const [formData, setFormData] = useState({
    type: 'PLA',
    name: '',
    price: '',
    weight: '',
    color: '#4C7DFF'
  });
  const [pendingColors, setPendingColors] = useState([]);
  const [costPerGram, setCostPerGram] = useState('');

  // Calcular custo por grama automaticamente
  useEffect(() => {
    const price = parseFloat(formData.price) || 0;
    const weight = parseFloat(formData.weight) || 0;
    
    if (price > 0 && weight > 0) {
      const cost = price / weight;
      setCostPerGram(cost.toFixed(3));
    } else {
      setCostPerGram('');
    }
  }, [formData.price, formData.weight]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addColor = () => {
    const color = formData.color;
    if (color && !pendingColors.includes(color)) {
      setPendingColors(prev => [...prev, color]);
    }
  };

  const removeColor = (colorToRemove) => {
    setPendingColors(prev => prev.filter(c => c !== colorToRemove));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const name = formData.name.trim();
    const price = parseFloat(formData.price);
    const weight = parseFloat(formData.weight);

    if (!name) {
      alert('Por favor, insira o nome do filamento.');
      return;
    }

    if (!price || price <= 0) {
      alert('Por favor, insira um preço válido para o rolo.');
      return;
    }

    if (!weight || weight <= 0) {
      alert('Por favor, insira um peso válido para o rolo.');
      return;
    }

    const colors = pendingColors.length > 0 ? [...pendingColors] : [formData.color];
    
    const filament = {
      name,
      type: formData.type,
      colors,
      price,
      weight,
      costPerGram: parseFloat(costPerGram)
    };

    onSave(filament);
    
    // Limpar formulário
    setFormData({
      type: 'PLA',
      name: '',
      price: '',
      weight: '',
      color: '#4C7DFF'
    });
    setPendingColors([]);
  };

  return (
    <div className="bg-white/4 p-8 rounded-2xl shadow-2xl border border-gray-800">
      <h2 className="text-gray-200 mb-6 text-xl font-semibold flex items-center gap-2.5">
        <i className="fas fa-spool text-brand-blue"></i>
        Gerenciar Filamentos
      </h2>
      
      <form onSubmit={handleSubmit} className="mb-6">
        <h3 className="text-gray-200 mb-5 text-lg font-semibold">Adicionar Novo Filamento</h3>
        
        <div className="mb-5">
          <label className="block mb-2 font-semibold text-gray-200 text-sm">
            Tipo do Filamento:
          </label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-800 rounded-lg text-base transition-all bg-gray-900/60 text-gray-200 focus:outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/15"
          >
            <option value="PLA">PLA</option>
            <option value="PETG">PETG</option>
            <option value="ABS">ABS</option>
            <option value="TPU">TPU</option>
          </select>
        </div>

        <div className="mb-5">
          <label className="block mb-2 font-semibold text-gray-200 text-sm">
            Nome do Filamento:
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Ex: PLA Branco"
            className="w-full px-4 py-3 border-2 border-gray-800 rounded-lg text-base transition-all bg-gray-900/60 text-gray-200 focus:outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/15"
          />
        </div>

        <div className="mb-5">
          <label className="block mb-2 font-semibold text-gray-200 text-sm">
            Cor(es):
          </label>
          <div className="flex items-center gap-2.5">
            <input
              type="color"
              name="color"
              value={formData.color}
              onChange={handleChange}
              className="h-12 p-1 cursor-pointer rounded-lg"
            />
            <button
              type="button"
              onClick={addColor}
              className="px-3 py-2 bg-brand-blue text-white rounded-lg text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-blue/40 flex items-center gap-2"
            >
              Adicionar cor
            </button>
          </div>
          {pendingColors.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2.5">
              {pendingColors.map((color, index) => (
                <div
                  key={index}
                  className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-gray-800 bg-white/6 text-gray-200"
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border-2 border-gray-800"
                    style={{ background: color }}
                  ></span>
                  <span className="text-xs">{color.toUpperCase()}</span>
                  <button
                    type="button"
                    onClick={() => removeColor(color)}
                    className="bg-transparent border-none text-gray-400 cursor-pointer font-bold text-sm hover:text-gray-200"
                    aria-label="Remover cor"
                    title="Remover"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mb-5">
          <label className="block mb-2 font-semibold text-gray-200 text-sm">
            Preço do Rolo (R$):
          </label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            step="0.01"
            placeholder="0.00"
            className="w-full px-4 py-3 border-2 border-gray-800 rounded-lg text-base transition-all bg-gray-900/60 text-gray-200 focus:outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/15"
          />
        </div>

        <div className="mb-5">
          <label className="block mb-2 font-semibold text-gray-200 text-sm">
            Peso do Rolo (g):
          </label>
          <input
            type="number"
            name="weight"
            value={formData.weight}
            onChange={handleChange}
            placeholder="1000"
            className="w-full px-4 py-3 border-2 border-gray-800 rounded-lg text-base transition-all bg-gray-900/60 text-gray-200 focus:outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/15"
          />
        </div>

        <div className="mb-5">
          <label className="block mb-2 font-semibold text-gray-200 text-sm">
            Custo por Grama (R$):
          </label>
          <input
            type="number"
            value={costPerGram}
            step="0.001"
            placeholder="0.000"
            readOnly
            className="w-full px-4 py-3 border-2 border-gray-800 rounded-lg text-base transition-all bg-white/6 text-gray-400 cursor-not-allowed"
          />
        </div>

        <button
          type="submit"
          className="w-full px-6 py-3 bg-brand-blue text-white rounded-lg text-base font-semibold transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-blue/40 flex items-center justify-center gap-2"
        >
          <i className="fas fa-save"></i>
          Salvar Filamento
        </button>
      </form>
    </div>
  );
};

export default FilamentForm;

