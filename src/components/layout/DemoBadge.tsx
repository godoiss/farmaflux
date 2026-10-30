import { FlaskConical } from 'lucide-react';

/** Identificação permanente exigida: "Demonstração · dados fictícios". */
export function DemoBadge({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-ink-soft ${className}`}>
      <FlaskConical size={13} aria-hidden className="text-teal" />
      Demonstração · dados fictícios
    </span>
  );
}
