import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import Icon from './Icon';

/**
 * Feedback visual das operações importantes (salvar, excluir, importar).
 * Substitui os `alert()` bloqueantes da versão anterior.
 */

const ToastContext = createContext(null);

const STYLES = {
  success: { icon: 'check', ring: 'ring-positive/40', accent: 'text-positive', bar: 'bg-positive' },
  error: { icon: 'alert', ring: 'ring-negative/40', accent: 'text-negative', bar: 'bg-negative' },
  warning: { icon: 'alert', ring: 'ring-warning/40', accent: 'text-warning', bar: 'bg-warning' },
  info: { icon: 'info', ring: 'ring-brand-blue/40', accent: 'text-brand-blue', bar: 'bg-brand-blue' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (message, type = 'info', options = {}) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const duration = options.duration ?? (type === 'error' ? 7000 : 4000);

      setToasts((current) => [...current, { id, message, type, title: options.title }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), duration),
      );
      return id;
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      show,
      dismiss,
      success: (message, options) => show(message, 'success', options),
      error: (message, options) => show(message, 'error', options),
      warning: (message, options) => show(message, 'warning', options),
      info: (message, options) => show(message, 'info', options),
    }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="no-print pointer-events-none fixed inset-x-4 top-4 z-[100] flex flex-col items-end gap-2 sm:left-auto sm:right-5 sm:top-5 sm:w-96"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const style = STYLES[toast.type] || STYLES.info;
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex w-full animate-slideIn items-start gap-3 overflow-hidden rounded-xl border border-ink-700 bg-ink-850/95 p-3.5 shadow-card ring-1 ${style.ring} backdrop-blur`}
            >
              <Icon name={style.icon} size={18} className={`mt-0.5 ${style.accent}`} />
              <div className="min-w-0 flex-1">
                {toast.title ? (
                  <p className="text-sm font-semibold text-gray-100">{toast.title}</p>
                ) : null}
                <p className="break-words text-sm text-gray-300">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="rounded p-1 text-ink-500 transition-colors hover:text-gray-200"
                aria-label="Fechar aviso"
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast precisa estar dentro de <ToastProvider>.');
  }
  return context;
}
