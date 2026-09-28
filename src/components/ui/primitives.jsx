import React, { useEffect, useId, useRef } from 'react';
import Icon from './Icon';

/**
 * Componentes reutilizáveis da interface. Sem regra de negócio: recebem valores
 * já formatados e devolvem eventos.
 */

/* ------------------------------------------------------------------ Botões */

const BUTTON_VARIANTS = {
  primary:
    'bg-brand-gradient text-white shadow-glow hover:brightness-110 focus-visible:ring-brand-blue/60',
  secondary: 'bg-ink-750 text-gray-100 hover:bg-ink-700 border border-ink-600',
  ghost: 'bg-transparent text-gray-400 hover:bg-ink-800 hover:text-gray-100',
  outline: 'bg-transparent text-brand-blue border border-brand-blue/40 hover:bg-brand-blue/10',
  danger: 'bg-negative/15 text-negative border border-negative/40 hover:bg-negative/25',
  positive: 'bg-positive/15 text-positive border border-positive/40 hover:bg-positive/25',
};

const BUTTON_SIZES = {
  sm: 'px-2.5 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-5 py-3 text-base gap-2',
  icon: 'p-2',
};

export function Button({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  className = '',
  type = 'button',
  ...rest
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-lg font-semibold transition-all
        disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100
        ${BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.secondary} ${BUTTON_SIZES[size]} ${className}`}
      {...rest}
    >
      {icon ? <Icon name={icon} size={size === 'sm' ? 14 : 16} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={size === 'sm' ? 14 : 16} /> : null}
    </button>
  );
}

export function IconButton({ icon, label, variant = 'ghost', className = '', ...rest }) {
  return (
    <Button variant={variant} size="icon" aria-label={label} title={label} className={className} {...rest}>
      <Icon name={icon} size={16} />
    </Button>
  );
}

/* ------------------------------------------------------------------ Cartões */

export function Card({ children, className = '', as: Tag = 'section', ...rest }) {
  return (
    <Tag className={`card ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

export function CardHeader({ title, subtitle, icon, actions, className = '' }) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 border-b border-ink-700 p-4 sm:p-5 ${className}`}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span className="mt-0.5 grid h-9 w-9 place-items-center rounded-lg bg-brand-gradient-soft text-brand-blue ring-1 ring-inset ring-brand-blue/25">
            <Icon name={icon} size={18} />
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-gray-100">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function CardBody({ children, className = '' }) {
  return <div className={`p-4 sm:p-5 ${className}`}>{children}</div>;
}

/** Título de seção dentro de um formulário longo. */
export function SectionTitle({ index, title, hint, icon }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      {index !== undefined ? (
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-gradient text-xs font-bold text-white">
          {index}
        </span>
      ) : null}
      {icon ? <Icon name={icon} size={18} className="text-brand-blue" /> : null}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">{title}</h3>
        {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Campos */

export function Field({ label, hint, error, children, htmlFor, className = '' }) {
  return (
    <div className={className}>
      {label ? (
        <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400">
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="mt-1 flex items-center gap-1 text-xs text-negative">
          <Icon name="alert" size={12} />
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({ label, hint, error, className = '', prefix, suffix, id, ...rest }) {
  const generatedId = useId();
  const inputId = id || generatedId;

  const input = (
    <input
      id={inputId}
      className={`field-input ${error ? 'field-input-invalid' : ''} ${prefix ? 'pl-9' : ''} ${suffix ? 'pr-12' : ''}`}
      {...rest}
    />
  );

  return (
    <Field label={label} hint={hint} error={error} htmlFor={inputId} className={className}>
      {prefix || suffix ? (
        <div className="relative">
          {prefix ? (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-500">
              {prefix}
            </span>
          ) : null}
          {input}
          {suffix ? (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-ink-500">
              {suffix}
            </span>
          ) : null}
        </div>
      ) : (
        input
      )}
    </Field>
  );
}

/**
 * Campo monetário. Trabalha com texto para não atropelar a digitação
 * ("12," é um estado válido enquanto o usuário escreve "12,50") e devolve o
 * valor cru para a página converter em centavos.
 */
export function MoneyInput({ label, hint, error, value, onChange, className = '', ...rest }) {
  return (
    <TextInput
      label={label}
      hint={hint}
      error={error}
      className={className}
      prefix="R$"
      inputMode="decimal"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="0,00"
      {...rest}
    />
  );
}

export function NumberInput({ label, hint, error, value, onChange, suffix, className = '', ...rest }) {
  return (
    <TextInput
      label={label}
      hint={hint}
      error={error}
      className={className}
      suffix={suffix}
      inputMode="decimal"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="0"
      {...rest}
    />
  );
}

export function Select({ label, hint, error, options = [], placeholder, className = '', id, children, ...rest }) {
  const generatedId = useId();
  const selectId = id || generatedId;

  return (
    <Field label={label} hint={hint} error={error} htmlFor={selectId} className={className}>
      <div className="relative">
        <select
          id={selectId}
          className={`field-input appearance-none pr-9 ${error ? 'field-input-invalid' : ''}`}
          {...rest}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
          {children}
        </select>
        <Icon
          name="chevronDown"
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-500"
        />
      </div>
    </Field>
  );
}

export function Textarea({ label, hint, error, className = '', id, rows = 3, ...rest }) {
  const generatedId = useId();
  const textareaId = id || generatedId;

  return (
    <Field label={label} hint={hint} error={error} htmlFor={textareaId} className={className}>
      <textarea
        id={textareaId}
        rows={rows}
        className={`field-input resize-y ${error ? 'field-input-invalid' : ''}`}
        {...rest}
      />
    </Field>
  );
}

/** Grupo de opções mutuamente exclusivas, mais claro que um select de 2 itens. */
export function ToggleGroup({ label, hint, value, onChange, options = [], className = '' }) {
  return (
    <Field label={label} hint={hint} className={className}>
      <div className="flex flex-wrap gap-1 rounded-lg border border-ink-700 bg-ink-850 p-1">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              title={option.hint}
              className={`flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                active
                  ? 'bg-brand-gradient text-white shadow-glow'
                  : 'text-gray-400 hover:bg-ink-800 hover:text-gray-200'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

export function Slider({ label, value, onChange, min = 0, max = 100, step = 1, suffix = '%', hint }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</label>
        <span className="text-sm font-bold text-brand-blue">
          {value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ink-700 accent-brand-blue"
      />
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}

export function Checkbox({ label, checked, onChange, hint, className = '' }) {
  const id = useId();
  return (
    <div className={`flex items-start gap-2.5 ${className}`}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-ink-600 bg-ink-850 accent-brand-blue"
      />
      <label htmlFor={id} className="cursor-pointer text-sm text-gray-300">
        {label}
        {hint ? <span className="block text-xs text-gray-500">{hint}</span> : null}
      </label>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Pesquisar...', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="field-input pl-9"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ Diversos */

const BADGE_TONES = {
  neutral: 'bg-ink-750 text-gray-300 ring-ink-600',
  blue: 'bg-brand-blue/15 text-brand-blue-400 ring-brand-blue/30',
  purple: 'bg-brand-purple/15 text-brand-purple-400 ring-brand-purple/30',
  positive: 'bg-positive/15 text-positive ring-positive/30',
  warning: 'bg-warning/15 text-warning ring-warning/30',
  negative: 'bg-negative/15 text-negative ring-negative/30',
};

export function Badge({ children, tone = 'neutral', icon, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
        BADGE_TONES[tone] || BADGE_TONES.neutral
      } ${className}`}
    >
      {icon ? <Icon name={icon} size={12} /> : null}
      {children}
    </span>
  );
}

export function EmptyState({ icon = 'box', title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-ink-800 text-ink-500 ring-1 ring-inset ring-ink-700">
        <Icon name={icon} size={26} />
      </span>
      <h3 className="text-base font-semibold text-gray-200">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-gray-500">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function StatCard({ label, value, hint, icon, tone = 'neutral', className = '' }) {
  const tones = {
    neutral: 'text-gray-100',
    blue: 'text-brand-blue-400',
    purple: 'text-brand-purple-400',
    positive: 'text-positive',
    warning: 'text-warning',
    negative: 'text-negative',
  };

  return (
    <div className={`card p-4 transition-colors hover:border-ink-600 ${className}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        {icon ? <Icon name={icon} size={16} className="text-ink-500" /> : null}
      </div>
      <p className={`text-2xl font-bold tabular-nums ${tones[tone] || tones.neutral}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}

/** Linha "rótulo: valor" usada nos resumos de custo. */
export function DataRow({ label, value, hint, tone = 'neutral', strong = false, className = '' }) {
  const tones = {
    neutral: 'text-gray-200',
    muted: 'text-gray-400',
    positive: 'text-positive',
    negative: 'text-negative',
    blue: 'text-brand-blue-400',
  };

  return (
    <div className={`flex items-baseline justify-between gap-4 py-1.5 ${className}`}>
      <span className={`text-sm ${strong ? 'font-semibold text-gray-200' : 'text-gray-400'}`}>
        {label}
        {hint ? <span className="ml-1 text-xs text-gray-600">{hint}</span> : null}
      </span>
      <span
        className={`shrink-0 tabular-nums ${strong ? 'text-base font-bold' : 'text-sm font-semibold'} ${
          tones[tone] || tones.neutral
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);

    // Trava o scroll do fundo enquanto o diálogo está aberto.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl' };

  return (
    <div
      className="no-print fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-[92vh] w-full ${sizes[size]} animate-scaleIn flex-col overflow-hidden rounded-t-2xl border border-ink-700 bg-ink-900 shadow-card sm:rounded-card`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-700 p-4 sm:p-5">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-100">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p> : null}
          </div>
          <IconButton icon="close" label="Fechar" onClick={onClose} />
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>

        {footer ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-ink-700 bg-ink-850/60 p-4 sm:p-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Aviso contextual: erros de validação, alertas do cálculo, dicas. */
export function Callout({ tone = 'info', title, children, className = '' }) {
  const tones = {
    info: 'border-brand-blue/30 bg-brand-blue/10 text-brand-blue-400',
    warning: 'border-warning/30 bg-warning/10 text-warning',
    negative: 'border-negative/30 bg-negative/10 text-negative',
    positive: 'border-positive/30 bg-positive/10 text-positive',
  };
  const icons = { info: 'info', warning: 'alert', negative: 'alert', positive: 'check' };

  return (
    <div className={`flex items-start gap-2.5 rounded-lg border p-3 ${tones[tone]} ${className}`}>
      <Icon name={icons[tone]} size={16} className="mt-0.5" />
      <div className="min-w-0 flex-1 text-sm">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className="text-gray-300">{children}</div>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-50">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-gray-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
