import React, { useState, useEffect } from 'react';

const Calculator = ({ filaments, onCalculate, selectedFilamentId }) => {
  const [formData, setFormData] = useState({
    selectedFilament: '',
    pieceWeight: '',
    printTime: '',
    profitMargin: ''
  });

  // Sincronizar com a seleção externa
  useEffect(() => {
    if (selectedFilamentId) {
      setFormData(prev => ({
        ...prev,
        selectedFilament: selectedFilamentId
      }));
    }
  }, [selectedFilamentId]);

  const printerConsumption = 110; // W
  const energyTariff = 0.857; // R$/kWh
  const consumptionKW = printerConsumption / 1000; // 0.110 kW
  const costPerHour = (consumptionKW * energyTariff).toFixed(3);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const selectedId = formData.selectedFilament;
    const pieceWeight = parseFloat(formData.pieceWeight);
    const printTime = parseFloat(formData.printTime);
    const profitMargin = parseFloat(formData.profitMargin) || 0;

    if (!selectedId) {
      alert('Por favor, selecione um filamento.');
      return;
    }

    if (!pieceWeight || pieceWeight <= 0) {
      alert('Por favor, insira um peso válido para a peça.');
      return;
    }

    if (!printTime || printTime <= 0) {
      alert('Por favor, insira um tempo de impressão válido.');
      return;
    }

    if (profitMargin < 0) {
      alert('A margem de lucro não pode ser negativa.');
      return;
    }

    const filament = filaments.find(f => f.id === selectedId);
    if (!filament) return;

    // Cálculo do custo do filamento
    const filamentCost = pieceWeight * filament.costPerGram;

    // Cálculo do consumo de energia
    const energyConsumption = consumptionKW * printTime; // kWh
    const energyCost = energyConsumption * energyTariff;

    // Taxa de serviço: R$ 0,10 por grama
    const serviceFee = pieceWeight * 0.10;

    // Custo total
    const totalCost = filamentCost + energyCost + serviceFee;

    // Preço final com margem
    const finalPrice = totalCost * (1 + profitMargin / 100);

    onCalculate({
      filamentCost,
      energyCost,
      serviceFee,
      totalCost,
      finalPrice
    });
  };

  return (
    <div className="bg-white/4 p-8 rounded-2xl shadow-2xl border border-gray-800">
      <h2 className="text-gray-200 mb-6 text-xl font-semibold flex items-center gap-2.5">
        <i className="fas fa-calculator text-brand-blue"></i>
        Cálculo de Custo
      </h2>

      <form onSubmit={handleSubmit}>
        <div className="mb-5">
          <label className="block mb-2 font-semibold text-gray-200 text-sm">
            Filamento:
          </label>
          <select
            name="selectedFilament"
            value={formData.selectedFilament}
            onChange={handleChange}
            className="w-full px-4 py-3 border-2 border-gray-800 rounded-lg text-base transition-all bg-gray-900/60 text-gray-200 focus:outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/15"
          >
            <option value="">Selecione um filamento</option>
            {filaments.map((filament) => (
              <option key={filament.id} value={filament.id}>
                {filament.name} · {filament.type || 'PLA'} (R${' '}
                {filament.costPerGram.toFixed(3)}/g)
              </option>
            ))}
          </select>
        </div>

        <div className="mb-5">
          <label className="block mb-2 font-semibold text-gray-200 text-sm">
            Peso da Peça (g):
          </label>
          <input
            type="number"
            name="pieceWeight"
            value={formData.pieceWeight}
            onChange={handleChange}
            step="0.1"
            placeholder="0.0"
            className="w-full px-4 py-3 border-2 border-gray-800 rounded-lg text-base transition-all bg-gray-900/60 text-gray-200 focus:outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/15"
          />
        </div>

        <div className="mb-5">
          <label className="block mb-2 font-semibold text-gray-200 text-sm">
            Consumo da Impressora:
          </label>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg p-4 text-center">
            <span className="text-lg font-bold text-gray-700 block mb-1">
              110W (0,857 kWh/h)
            </span>
            <small className="text-gray-500 text-sm italic">
              Valor fixo da impressora
            </small>
          </div>
        </div>

        <div className="mb-5">
          <label className="block mb-2 font-semibold text-gray-200 text-sm">
            Tempo de Impressão (h):
          </label>
          <input
            type="number"
            name="printTime"
            value={formData.printTime}
            onChange={handleChange}
            step="0.1"
            placeholder="0.0"
            className="w-full px-4 py-3 border-2 border-gray-800 rounded-lg text-base transition-all bg-gray-900/60 text-gray-200 focus:outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/15"
          />
        </div>

        <div className="mb-5">
          <label className="block mb-2 font-semibold text-gray-200 text-sm">
            Tarifa de Energia:
          </label>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg p-4 text-center mb-2">
            <span className="text-lg font-bold text-gray-700 block mb-1">
              R$ 0,857/kWh
            </span>
            <small className="text-gray-500 text-sm italic">
              Valor fixo da tarifa
            </small>
          </div>
          <div className="mt-2 px-3 py-2 bg-gradient-to-br from-green-50 to-green-100 border border-green-300 rounded-md text-center">
            <small className="text-gray-800 font-semibold text-sm">
              Custo por hora: <span className="text-green-600 font-bold">R$ {costPerHour}</span>
            </small>
          </div>
        </div>

        <div className="mb-5">
          <label className="block mb-2 font-semibold text-gray-200 text-sm">
            Margem de Lucro (%):
          </label>
          <input
            type="number"
            name="profitMargin"
            value={formData.profitMargin}
            onChange={handleChange}
            step="0.1"
            placeholder="0.0"
            className="w-full px-4 py-3 border-2 border-gray-800 rounded-lg text-base transition-all bg-gray-900/60 text-gray-200 focus:outline-none focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/15"
          />
        </div>

        <button
          type="submit"
          className="w-full px-6 py-3 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg text-base font-semibold transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-500/40 flex items-center justify-center gap-2"
        >
          <i className="fas fa-calculator"></i>
          Calcular Custo
        </button>
      </form>
    </div>
  );
};

export default Calculator;

