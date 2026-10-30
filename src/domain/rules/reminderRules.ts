import type { AppNotification, LocalDateTime, Reminder, ReminderType } from '../types';
import { addDays, addMinutes, formatDateTime, isValidLocalDateTime } from '../time';
import { REMINDER_TYPE_LABEL } from '../labels';

export type ReminderState = 'upcoming' | 'overdue' | 'done';

export function reminderState(r: Reminder, now: LocalDateTime): ReminderState {
  if (r.doneAt) return 'done';
  return r.dueAt <= now ? 'overdue' : 'upcoming';
}

export interface ReminderInput {
  type: ReminderType;
  title: string;
  dueAt: string;
}

export type ReminderErrors = Partial<Record<'title' | 'dueAt', string>>;

export function validateReminder(input: ReminderInput, now: LocalDateTime, opts: { isNew: boolean }): ReminderErrors {
  const errors: ReminderErrors = {};
  const title = input.title.trim();
  if (!title) errors.title = 'Dê um título ao lembrete.';
  else if (title.length > 80) errors.title = 'Use até 80 caracteres.';
  if (!input.dueAt) errors.dueAt = 'Informe data e hora.';
  else if (!isValidLocalDateTime(input.dueAt)) errors.dueAt = 'Data e hora inválidas.';
  else if (opts.isNew && input.dueAt <= now) errors.dueAt = `Escolha um horário depois de ${formatDateTime(now)} (relógio da demonstração).`;
  return errors;
}

export const dedupeKeyFor = (r: Reminder) => `${r.id}@${r.dueAt}`;

/**
 * Notificações que devem ser emitidas agora. Idempotente: uma chave de
 * emissão (lembrete + horário) já registrada nunca gera nova notificação.
 */
export function dueNotifications(
  reminders: Reminder[],
  existing: AppNotification[],
  now: LocalDateTime,
  makeId: () => string,
): AppNotification[] {
  const emitted = new Set(existing.map((n) => n.dedupeKey));
  return reminders
    .filter((r) => !r.doneAt && r.dueAt <= now && !emitted.has(dedupeKeyFor(r)))
    .map((r) => ({
      id: makeId(),
      personId: r.personId,
      reminderId: r.id,
      dedupeKey: dedupeKeyFor(r),
      title: r.title,
      body: `${REMINDER_TYPE_LABEL[r.type]} · ${formatDateTime(r.dueAt)}`,
      createdAt: now,
      readAt: null,
    }));
}

/** Sugestão de horário para "conferir a unidade": véspera às 08:00, ou o próprio dia cedo. */
export function suggestCheckDue(intendedDate: string, now: LocalDateTime): LocalDateTime {
  const candidates = [`${addDays(intendedDate, -1)}T08:00`, `${intendedDate}T07:00`];
  return candidates.find((c) => c > now) ?? addMinutes(now, 60);
}
