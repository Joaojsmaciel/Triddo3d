import React from 'react';

/**
 * Conjunto de ícones em SVG embutido.
 *
 * Substitui o Font Awesome carregado por CDN: mesmo traço em todos os ícones,
 * sem requisição externa e sem quebrar a interface se o CDN estiver fora.
 */
const PATHS = {
  dashboard: 'M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6V11h-6v9zm0-16v5h6V4h-6z',
  calculator:
    'M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm1 4h8v3H8V7zm0 6h2v2H8v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zM8 17h2v2H8v-2zm4 0h6v2h-6v-2z',
  spool:
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 3a7 7 0 1 1 0 14 7 7 0 0 1 0-14zm0 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  printer:
    'M7 3h10v4H7V3zm-2 6h14a2 2 0 0 1 2 2v5h-4v4H7v-4H3v-5a2 2 0 0 1 2-2zm4 7h6v3H9v-3z',
  receipt:
    'M6 2h12a1 1 0 0 1 1 1v18l-3-2-2 2-2-2-2 2-2-2-3 2V3a1 1 0 0 1 1-1zm2 5v2h8V7H8zm0 4v2h8v-2H8zm0 4v2h5v-2H8z',
  settings:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0 2.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM10.6 2h2.8l.4 2.3c.5.2 1 .4 1.4.7l2.2-.9 1.4 2.4-1.8 1.5c.1.5.1 1 0 1.6l1.8 1.5-1.4 2.4-2.2-.9c-.4.3-.9.5-1.4.7l-.4 2.3h-2.8l-.4-2.3c-.5-.2-1-.4-1.4-.7l-2.2.9L3 13.1l1.8-1.5a6 6 0 0 1 0-1.6L3 8.5l1.4-2.4 2.2.9c.4-.3.9-.5 1.4-.7L10.6 2z',
  plus: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5z',
  trash: 'M9 3h6l1 2h4v2H4V5h4l1-2zM6 9h12l-1 12H7L6 9zm4 2v8h1v-8h-1zm3 0v8h1v-8h-1z',
  edit: 'M4 17.5 16.9 4.6a2 2 0 0 1 2.8 0l.7.7a2 2 0 0 1 0 2.8L7.5 21H4v-3.5zM3 22h18v2H3v-2z',
  copy: 'M9 2h9a2 2 0 0 1 2 2v12h-2V4H9V2zM5 6h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z',
  search: 'M10 3a7 7 0 1 1-4.2 12.6l-3.1 3.1-1.4-1.4 3.1-3.1A7 7 0 0 1 10 3zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10z',
  download: 'M11 3h2v9l3.5-3.5 1.4 1.4L12 16 6.1 9.9l1.4-1.4L11 12V3zM4 18h16v2H4v-2z',
  upload: 'M12 3l6 6-1.4 1.4L13 6.8V16h-2V6.8L7.4 10.4 6 9l6-6zM4 18h16v2H4v-2z',
  check: 'M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6L20.1 8.4 18.7 7l-9.2 9.2z',
  close: 'M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3 1.4 1.4z',
  alert: 'M12 2 1 21h22L12 2zm0 5 7.5 12h-15L12 7zm-1 4v4h2v-4h-2zm0 5v2h2v-2h-2z',
  info: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1 5h2v2h-2V7zm0 4h2v6h-2v-6z',
  chevronDown: 'M7.4 8.6 12 13.2l4.6-4.6L18 10l-6 6-6-6 1.4-1.4z',
  chevronRight: 'M9 6l6 6-6 6-1.4-1.4L12.2 12 7.6 7.4 9 6z',
  menu: 'M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z',
  chart: 'M4 20V10h4v10H4zm6 0V4h4v16h-4zm6 0v-7h4v7h-4z',
  money:
    'M3 6h18a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zm9 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 5h-2v6l5 3 1-1.7-4-2.3V7z',
  weight: 'M12 2a3 3 0 0 1 2.8 4H18l3 14H3l3-14h3.2A3 3 0 0 1 12 2zm0 2a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
  zap: 'M13 2 4 14h6l-1 8 9-12h-6l1-8z',
  wrench:
    'M14.7 2a6 6 0 0 0-5.3 8.8L2 18.2 5.8 22l7.4-7.4A6 6 0 0 0 22 9.3l-3.3 3.3-2.6-.7-.7-2.6L18.7 6A6 6 0 0 0 14.7 2z',
  trendingUp: 'M3 17.5 9.5 11l4 4L20 8.5V6h-6l2.3 2.3-2.8 2.8-4-4L2 15.6l1 1.9z',
  folder: 'M3 5a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5zm2 4v9h14V9H5z',
  file: 'M6 2h8l4 4v16H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm7 1.5V8h4.5L13 3.5zM8 12h8v2H8v-2zm0 4h8v2H8v-2z',
  send: 'M2 21 23 12 2 3v7l13 2-13 2v7z',
  save: 'M5 3h11l3 3v15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm2 2v5h8V5H7zm5 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  refresh:
    'M12 4V1L8 5l4 4V6a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8zm6.4 2.6A8 8 0 0 1 20 12h-2a6 6 0 0 0-1.2-3.6l1.6-1.8z',
  sparkles: 'M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6zm6 12 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z',
  arrowLeft: 'M11 5l1.4 1.4L8.8 10H20v2H8.8l3.6 3.6L11 17l-6-6 6-6z',
  users:
    'M9 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 10c4 0 7 2 7 4v2H2v-2c0-2 3-4 7-4zm8-9a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm0 8c3 0 5 1.5 5 3v2h-4v-2c0-1.2-.6-2.2-1.6-3H17z',
  box: 'M12 2 3 6.5v11L12 22l9-4.5v-11L12 2zm0 2.3 6.2 3.1L12 10.5 5.8 7.4 12 4.3zM5 9.4l6 3v7l-6-3v-7zm8 10v-7l6-3v7l-6 3z',
};

export default function Icon({ name, size = 18, className = '', title }) {
  const path = PATHS[name];
  if (!path) return null;

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      fill="currentColor"
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <path d={path} />
    </svg>
  );
}

export const ICON_NAMES = Object.keys(PATHS);
