import { CircleCheck, CircleDashed, CircleX } from 'lucide-react';
import type { Medication, Unit } from '../../domain/types';
import { AVAILABILITY_LABEL, coverage, coverageText, type ItemAvailability } from '../../domain/rules/unitRules';
import type { Tone } from '../../components/ui/Display';

const ICON: Record<ItemAvailability, typeof CircleCheck> = {
  informed_available: CircleCheck,
  informed_unavailable: CircleX,
  not_informed: CircleDashed,
};
const COLOR: Record<ItemAvailability, string> = {
  informed_available: 'text-green-ink',
  informed_unavailable: 'text-red-ink',
  not_informed: 'text-ink-faint',
};

/** Cobertura por item: ícone + texto, sem converter "não informado" em zero. */
export function CoverageList({ unit, medications }: { unit: Unit; medications: Medication[] }) {
  const c = coverage(unit, medications);
  return (
    <ul className="space-y-2">
      {c.items.map(({ medication: m, availability }) => {
        const Icon = ICON[availability];
        return (
          <li key={m.code} className="flex items-start gap-2.5 text-[0.9375rem]">
            <Icon size={18} className={`mt-0.5 shrink-0 ${COLOR[availability]}`} aria-hidden />
            <span className="min-w-0">
              <span className="font-medium">
                {m.name} {m.strength}
              </span>
              <span className="text-ink-soft"> · {m.form}</span>
              <span className="block text-sm text-ink-soft">{AVAILABILITY_LABEL[availability]}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function coverageTone(unit: Unit, medications: Medication[]): Tone {
  const c = coverage(unit, medications);
  if (c.total === 0) return 'neutral';
  return c.informed === c.total ? 'success' : c.informed === 0 ? 'neutral' : 'warning';
}

export { coverageText, coverage };
