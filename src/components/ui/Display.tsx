import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, CircleDashed, Info, TriangleAlert, type LucideIcon } from 'lucide-react';
import { cx } from './Button';

export type Tone = 'success' | 'warning' | 'danger' | 'neutral' | 'info';

const TONE_ICON: Record<Tone, LucideIcon> = {
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleAlert,
  neutral: CircleDashed,
  info: Info,
};

/** Selo de status: sempre ícone + texto, nunca só cor. */
export function StatusPill({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  const Icon = TONE_ICON[tone];
  return (
    <span className={cx('pill', `tone-${tone}`, className)}>
      <Icon size={15} className="shrink-0" aria-hidden />
      {children}
    </span>
  );
}

export function Callout({ tone = 'info', title, children, icon, action }: { tone?: 'info' | 'warning' | 'danger' | 'success'; title?: ReactNode; children?: ReactNode; icon?: ReactNode; action?: ReactNode }) {
  const Icon = TONE_ICON[tone];
  const iconColor = { info: 'text-teal', warning: 'text-amber-ink', danger: 'text-red-ink', success: 'text-green-ink' }[tone];
  return (
    <div className={`callout callout-${tone}`}>
      <span className={cx('mt-0.5 shrink-0', iconColor)}>{icon ?? <Icon size={20} aria-hidden />}</span>
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cx(title ? 'mt-0.5' : '', 'text-ink-soft [&_strong]:text-ink')}>{children}</div>}
        {action && <div className="mt-3 flex flex-wrap gap-2">{action}</div>}
      </div>
    </div>
  );
}

interface PageHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions, back }: PageHeaderProps) {
  return (
    <header className="page-header mb-6 sm:mb-8">
      {back && <div className="mb-3">{back}</div>}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
          <h1 tabIndex={-1} className="text-[2rem] leading-tight font-semibold outline-none sm:text-[2.5rem]">
            {title}
          </h1>
          {description && <p className="mt-2 max-w-2xl text-[1.0625rem] text-ink-soft">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2 sm:shrink-0">{actions}</div>}
      </div>
    </header>
  );
}

export function EmptyState({ icon, title, children, action }: { icon: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="card card-pad flex flex-col items-center py-10 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-mint text-teal">{icon}</div>
      <h2 className="text-lg font-bold">{title}</h2>
      {children && <p className="mt-1 max-w-md text-ink-soft">{children}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function DefinitionList({ items }: { items: Array<{ term: ReactNode; detail: ReactNode }> }) {
  return (
    <dl className="divide-y divide-line">
      {items.map((it, i) => (
        <div key={i} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,13rem)_1fr] sm:gap-4">
          <dt className="text-[0.9375rem] text-ink-soft">{it.term}</dt>
          <dd className="font-medium break-words">{it.detail}</dd>
        </div>
      ))}
    </dl>
  );
}
