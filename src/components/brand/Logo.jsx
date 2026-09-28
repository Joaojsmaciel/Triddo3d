import React from 'react';

/**
 * Marca TRIDDO 3D.
 *
 * O desenho das camadas empilhadas vem do Header original do projeto; aqui ele
 * virou componente reutilizável (menu, cabeçalho móvel e PDF do orçamento).
 */
export function LogoMark({ size = 36, className = '' }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="triddo-mark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4C7DFF" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <g stroke="url(#triddo-mark)" strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 50 10 L 90 30 L 50 50 L 10 30 Z" />
        <path d="M 50 50 L 90 70 L 50 90 L 10 70 Z" />
        <line x1="10" y1="30" x2="10" y2="70" />
        <line x1="90" y1="30" x2="90" y2="70" />
        <line x1="50" y1="10" x2="50" y2="50" />
      </g>
    </svg>
  );
}

export default function Logo({ size = 36, compact = false, className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      {compact ? null : (
        <div className="leading-none">
          <p className="text-lg font-extrabold uppercase tracking-tight text-gray-50">
            Triddo <span className="bg-brand-gradient bg-clip-text text-transparent">3D</span>
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
            Print and Design 3D
          </p>
        </div>
      )}
    </div>
  );
}
