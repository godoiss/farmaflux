import type { LocalDate, LocalDateTime } from './types';

/**
 * Utilitários de data em "relógio de parede" (America/Sao_Paulo, UTC-03:00).
 * A aritmética usa Date em UTC apenas como calculadora de calendário,
 * nunca como fonte do "agora" — o agora vem do relógio de demonstração.
 */
export const SAO_PAULO_UTC_OFFSET_HOURS = -3;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const BR_DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

const WEEKDAYS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const pad = (n: number) => String(n).padStart(2, '0');

export function isValidLocalDate(value: string): boolean {
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const probe = new Date(Date.UTC(y, mo - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === mo - 1 && probe.getUTCDate() === d;
}

export function isValidLocalDateTime(value: string): boolean {
  const m = DATETIME_RE.exec(value);
  if (!m) return false;
  const hh = Number(m[4]);
  const mm = Number(m[5]);
  return isValidLocalDate(value.slice(0, 10)) && hh < 24 && mm < 60;
}

/** Converte "dd/mm/aaaa" em LocalDate; retorna null se inválida. */
export function parseBrDate(value: string): LocalDate | null {
  const m = BR_DATE_RE.exec(value.trim());
  if (!m) return null;
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  return isValidLocalDate(iso) ? iso : null;
}

export const datePart = (dt: LocalDateTime): LocalDate => dt.slice(0, 10);
export const timePart = (dt: LocalDateTime): string => dt.slice(11, 16);

export function formatDate(date: LocalDate | null | undefined): string {
  if (!date || !isValidLocalDate(date)) return '—';
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}

export function formatDateTime(dt: LocalDateTime | null | undefined): string {
  if (!dt || !isValidLocalDateTime(dt)) return '—';
  return `${formatDate(datePart(dt))} às ${timePart(dt)}`;
}

function toUtcCalendar(date: LocalDate): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUtcCalendar(date: Date): LocalDate {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function weekday(date: LocalDate): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  return toUtcCalendar(date).getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export const weekdayName = (day: number) => WEEKDAYS[day];
export const weekdayShort = (day: number) => WEEKDAYS_SHORT[day];

export function addDays(date: LocalDate, days: number): LocalDate {
  const d = toUtcCalendar(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtcCalendar(d);
}

/** Diferença em dias de calendário (b - a). */
export function diffDays(a: LocalDate, b: LocalDate): number {
  return Math.round((toUtcCalendar(b).getTime() - toUtcCalendar(a).getTime()) / 86_400_000);
}

function toMinutes(dt: LocalDateTime): number {
  const m = DATETIME_RE.exec(dt);
  if (!m) return NaN;
  const base = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
  return base / 60_000;
}

function fromMinutes(minutes: number): LocalDateTime {
  const d = new Date(minutes * 60_000);
  return `${fromUtcCalendar(d)}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function addMinutes(dt: LocalDateTime, minutes: number): LocalDateTime {
  return fromMinutes(toMinutes(dt) + minutes);
}

export function diffHours(a: LocalDateTime, b: LocalDateTime): number {
  return (toMinutes(b) - toMinutes(a)) / 60;
}

/** Comparação lexicográfica é segura para o formato fixo. */
export const isBefore = (a: string, b: string) => a < b;
export const isOnOrBefore = (a: string, b: string) => a <= b;

/** Converte horário local de São Paulo em carimbo UTC "AAAAMMDDTHHmmssZ" (ICS). */
export function toUtcStamp(dt: LocalDateTime): string {
  const utc = addMinutes(dt, -SAO_PAULO_UTC_OFFSET_HOURS * 60);
  return `${utc.slice(0, 4)}${utc.slice(5, 7)}${utc.slice(8, 10)}T${utc.slice(11, 13)}${utc.slice(14, 16)}00Z`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}
