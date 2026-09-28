import React from 'react';

/**
 * Rosca de composição de custos, em SVG puro.
 *
 * Desenhada com `stroke-dasharray` sobre um círculo: cada fatia é um trecho do
 * traço, o que dispensa trigonometria e qualquer biblioteca de gráficos.
 */
export default function DonutChart({ data = [], size = 180, thickness = 18, centerLabel, centerValue }) {
  const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    // Empilhado sempre: a rosca e a legenda lado a lado não cabem na coluna de
    // resultados (380px), e o rótulo de cada fatia é a informação mais útil.
    <div className="flex flex-col items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Composição dos custos">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={thickness}
            className="text-ink-800"
          />
          {total > 0 &&
            data.map((item) => {
              const value = Number(item.value) || 0;
              const length = (value / total) * circumference;
              // Gira -90° para a primeira fatia começar no topo.
              const dash = `${length} ${circumference - length}`;
              const element = (
                <circle
                  key={item.key || item.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={item.color}
                  strokeWidth={thickness}
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                >
                  <title>{`${item.label}: ${item.display || ''}`}</title>
                </circle>
              );
              offset += length;
              return element;
            })}
        </svg>

        {centerValue ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{centerLabel}</span>
            <span className="text-lg font-bold tabular-nums text-gray-100">{centerValue}</span>
          </div>
        ) : null}
      </div>

      <ul className="w-full min-w-0 space-y-1.5">
        {data.map((item) => (
          <li key={item.key || item.label} className="flex items-center gap-2.5 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-gray-400">{item.label}</span>
            <span className="shrink-0 tabular-nums text-gray-200">{item.display}</span>
            {item.percent ? (
              <span className="w-12 shrink-0 text-right tabular-nums text-xs text-gray-500">{item.percent}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
