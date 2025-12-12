import React, { useEffect, useRef } from 'react';

const Results = ({ results }) => {
  const resultsRef = useRef(null);

  useEffect(() => {
    if (results && resultsRef.current) {
      resultsRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }, [results]);

  if (!results) return null;

  return (
    <div
      ref={resultsRef}
      className="mt-8 pt-8 border-t-2 border-gray-800 animate-fadeIn"
    >
      <h3 className="text-gray-200 mb-5 text-lg font-semibold flex items-center gap-2.5">
        <i className="fas fa-chart-line text-brand-blue"></i>
        Resultados
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
        <div className="bg-white/4 p-6 rounded-2xl text-center border-2 border-gray-800 transition-all hover:-translate-y-1 hover:shadow-xl">
          <h4 className="text-base mb-2.5 font-semibold text-gray-200">
            Custo do Filamento
          </h4>
          <p className="text-2xl font-bold text-gray-200">
            R$ {results.filamentCost.toFixed(2)}
          </p>
        </div>

        <div className="bg-white/4 p-6 rounded-2xl text-center border-2 border-gray-800 transition-all hover:-translate-y-1 hover:shadow-xl">
          <h4 className="text-base mb-2.5 font-semibold text-gray-200">
            Custo de Energia
          </h4>
          <p className="text-2xl font-bold text-gray-200">
            R$ {results.energyCost.toFixed(2)}
          </p>
        </div>

        <div className="bg-white/4 p-6 rounded-2xl text-center border-2 border-gray-800 transition-all hover:-translate-y-1 hover:shadow-xl">
          <h4 className="text-base mb-2.5 font-semibold text-gray-200">
            Taxa de Serviço
          </h4>
          <p className="text-2xl font-bold text-gray-200">
            R$ {results.serviceFee.toFixed(2)}
          </p>
          <small className="text-gray-400 text-xs">R$ 0,10/g</small>
        </div>

        <div className="bg-white/4 p-6 rounded-2xl text-center border-2 border-gray-800 transition-all hover:-translate-y-1 hover:shadow-xl">
          <h4 className="text-base mb-2.5 font-semibold text-gray-200">
            Custo Total
          </h4>
          <p className="text-2xl font-bold text-gray-200">
            R$ {results.totalCost.toFixed(2)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-brand-blue to-brand-blue-700 p-6 rounded-2xl text-center border-2 border-brand-blue text-white transition-all hover:-translate-y-1 hover:shadow-xl col-span-1 md:col-span-2 lg:col-span-3">
          <h4 className="text-base mb-2.5 font-semibold">
            Preço Final Sugerido
          </h4>
          <p className="text-4xl font-bold">
            R$ {results.finalPrice.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Results;

