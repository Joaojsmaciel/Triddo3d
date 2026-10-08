import React from 'react';

/**
 * Colunas agrupadas para a evolução mensal, em SVG puro.
 * Cada mês exibe uma coluna por série (receita, custo, lucro).
 */
export default function BarChart({ data = [], series = [], height = 200, formatValue = (value) => value }) {
  if (data.length === 0 || series.length === 0) return null;

  const max = Math.max(
    1,
    ...data.flatMap((point) => series.map((item) => Math.abs(Number(point[item.key]) || 0))),
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-4">
        {series.map((item) => (
          <span key={item.key} className="flex items-center gap-2 text-xs text-gray-400">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
            {item.label}
          </span>
        ))}
      </div>

      <div className="flex items-end gap-2 overflow-x-auto pb-1" style={{ height }}>
        {data.map((point) => (
          <div key={point.key || point.label} className="flex h-full min-w-[56px] flex-1 flex-col justify-end">
            <div className="flex h-full items-end justify-center gap-1">
              {series.map((item) => {
                const value = Number(point[item.key]) || 0;
                // Reserva 2% de altura para que valores baixos ainda apareçam.
                // Valor negativo (mês com prejuízo) usa a altura absoluta, em vermelho.
                const percent = Math.max(value !== 0 ? 2 : 0, (Math.abs(value) / max) * 100);
                return (
                  <div
                    key={item.key}
                    className="group relative w-full max-w-[18px] rounded-t transition-opacity hover:opacity-80"
                    style={{
                      height: `${percent}%`,
                      backgroundColor: value < 0 ? '#F87171' : item.color,
                      minHeight: value !== 0 ? 3 : 0,
                    }}
                  >
                    <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink-800 px-2 py-1 text-[10px] font-semibold text-gray-100 ring-1 ring-ink-600 group-hover:block">
                      {item.label}: {formatValue(value)}
                    </span>
                  </div>
                );
              })}
            </div>
            <span className="mt-2 block text-center text-xs text-gray-500">{point.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
