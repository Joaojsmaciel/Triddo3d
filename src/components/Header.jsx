import React from 'react';

const Header = () => {
  return (
    <header className="text-center mb-8 bg-gray-900/90 p-8 rounded-2xl shadow-2xl border border-gray-800">
      <div className="inline-flex flex-col items-start gap-1.5">
        <div className="inline-flex items-center gap-4">
          <div className="w-20 h-20 text-brand-blue" aria-hidden="true">
            <svg viewBox="0 0 100 100" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <g stroke="currentColor" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d="M 50 10 L 90 30 L 50 50 L 10 30 Z" className="brand-layer base" />
                <path d="M 50 50 L 90 70 L 50 90 L 10 70 Z" className="brand-layer mid" />
                <line x1="10" y1="30" x2="10" y2="70" className="brand-depth"/>
                <line x1="90" y1="30" x2="90" y2="70" className="brand-depth"/>
                <line x1="50" y1="10" x2="50" y2="50" className="brand-depth"/>
              </g>
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-brand-blue uppercase m-0">
            Triddo
          </h1>
        </div>
        <p className="ml-24 text-blue-300 uppercase tracking-widest font-semibold text-sm mb-1">
          Print and Design 3D
        </p>
      </div>
      <h2 className="mt-2 text-gray-200 text-lg font-semibold">
        Calculadora de Custo de Impressão 3D
      </h2>
    </header>
  );
};

export default Header;

