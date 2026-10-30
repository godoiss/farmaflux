import type { LocalDateTime, Reminder } from './types';
import { addMinutes, toUtcStamp } from './time';
import { REMINDER_TYPE_LABEL } from './labels';

/** Escapa texto conforme RFC 5545 (barra, ponto e vírgula, vírgula, quebra de linha). */
export function escapeIcsText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Dobra linhas acima de 75 octetos (RFC 5545 §3.1), respeitando UTF-8. */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  for (const ch of line) {
    const limit = parts.length === 0 ? 75 : 74;
    if (encoder.encode(current + ch).length > limit) {
      parts.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts.join('\r\n ');
}

export interface IcsContext {
  personName: string;
  details: string | null;
  stamp: LocalDateTime;
}

export function buildReminderIcs(reminder: Reminder, ctx: IcsContext): string {
  const description = [
    `${REMINDER_TYPE_LABEL[reminder.type]} para ${ctx.personName}.`,
    ctx.details,
    'Lembrete pessoal do FarmaFlux (demonstração · dados fictícios). Não é agendamento oficial.',
  ]
    .filter(Boolean)
    .join('\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FarmaFlux//Demonstracao//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${reminder.id}@farmaflux.demo`,
    `DTSTAMP:${toUtcStamp(ctx.stamp)}`,
    `DTSTART:${toUtcStamp(reminder.dueAt)}`,
    `DTEND:${toUtcStamp(addMinutes(reminder.dueAt, 15))}`,
    `SUMMARY:${escapeIcsText(reminder.title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText(reminder.title)}`,
    'TRIGGER:-PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

export function icsFileName(reminder: Reminder): string {
  const slug = reminder.title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return `farmaflux-${slug || 'lembrete'}.ics`;
}
