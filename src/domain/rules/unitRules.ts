import type { DaySchedule, LocalDate, LocalDateTime, Medication, Unit } from '../types';
import { diffHours, formatDate, weekday, weekdayName } from '../time';

/** Informação com mais de 48h é sinalizada como desatualizada. */
export const STALE_AFTER_HOURS = 48;

export type ItemAvailability = 'informed_available' | 'informed_unavailable' | 'not_informed';

export const AVAILABILITY_LABEL: Record<ItemAvailability, string> = {
  informed_available: 'Disponibilidade informada',
  informed_unavailable: 'Sem disponibilidade informada',
  not_informed: 'Informação não disponível',
};

export function itemAvailability(unit: Unit, code: string): ItemAvailability {
  const entry = unit.stock.find((s) => s.code === code);
  return entry ? entry.status : 'not_informed';
}

export interface CoverageItem {
  medication: Medication;
  availability: ItemAvailability;
}

export interface Coverage {
  informed: number;
  total: number;
  items: CoverageItem[];
}

export function coverage(unit: Unit, medications: Medication[]): Coverage {
  const items = medications.map((medication) => ({ medication, availability: itemAvailability(unit, medication.code) }));
  return { informed: items.filter((i) => i.availability === 'informed_available').length, total: items.length, items };
}

export function coverageText(c: Coverage): string {
  return `${c.informed} de ${c.total} ${c.total === 1 ? 'item' : 'itens'} com disponibilidade informada`;
}

export const isStale = (unit: Unit, now: LocalDateTime) => diffHours(unit.updatedAt, now) > STALE_AFTER_HOURS;

export type DayCondition =
  | { kind: 'scheduled'; schedule: DaySchedule }
  | { kind: 'no_service'; weekday: number }
  | { kind: 'suspended'; message: string; until: LocalDate | null }
  | { kind: 'unconfirmed'; message: string; schedule: DaySchedule | null };

function exceptionCovers(unit: Unit, date: LocalDate): boolean {
  const { from, until } = unit.exception;
  return (!from || date >= from) && (!until || date <= until);
}

/** Condição cadastrada para uma data. Horário cadastrado NÃO confirma funcionamento. */
export function conditionOn(unit: Unit, date: LocalDate): DayCondition {
  const schedule = unit.schedule[weekday(date)];
  if (unit.exception.kind === 'suspended' && exceptionCovers(unit, date)) {
    return { kind: 'suspended', message: unit.exception.message ?? 'Suspensão temporária informada', until: unit.exception.until };
  }
  if (!schedule) return { kind: 'no_service', weekday: weekday(date) };
  if (unit.exception.kind === 'unconfirmed' && exceptionCovers(unit, date)) {
    return { kind: 'unconfirmed', message: unit.exception.message ?? 'Funcionamento não confirmado', schedule };
  }
  return { kind: 'scheduled', schedule };
}

export function scheduleText(s: DaySchedule): string {
  const base = `${s.open}–${s.close}`;
  return s.breakStart && s.breakEnd ? `${base} (intervalo ${s.breakStart}–${s.breakEnd})` : base;
}

export function conditionText(c: DayCondition): string {
  switch (c.kind) {
    case 'scheduled':
      return `Horário cadastrado: ${scheduleText(c.schedule)}`;
    case 'no_service':
      return `Sem atendimento cadastrado em ${weekdayName(c.weekday)}`;
    case 'suspended':
      return `${c.message}${c.until ? ` até ${formatDate(c.until)}` : ''}`;
    case 'unconfirmed':
      return c.message;
  }
}

export type UnitHeadline = { tone: 'success' | 'warning' | 'danger' | 'neutral'; text: string };

export function unitHeadline(unit: Unit, now: LocalDateTime): UnitHeadline {
  const today = now.slice(0, 10);
  const c = conditionOn(unit, today);
  if (c.kind === 'suspended') return { tone: 'danger', text: 'Suspensão temporária informada' };
  if (c.kind === 'unconfirmed') return { tone: 'warning', text: 'Funcionamento não confirmado' };
  if (c.kind === 'no_service') return { tone: 'neutral', text: 'Sem atendimento cadastrado hoje' };
  return { tone: 'neutral', text: `Hoje: ${scheduleText(c.schedule)}` };
}
