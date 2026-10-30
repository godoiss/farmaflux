import type {
  AppData,
  ChecklistItem,
  ChecklistKey,
  DocumentVersion,
  LocalDate,
  LocalDateTime,
  Plan,
  PrescriptionFields,
  ReminderLink,
  ReminderType,
  UsageMode,
} from '../domain/types';

export type Action =
  | { type: 'profile/setMode'; mode: UsageMode }
  | { type: 'profile/update'; displayName: string; assistedName: string }
  | { type: 'prescription/add'; id: string; title: string; version: DocumentVersion }
  | { type: 'prescription/addVersion'; prescriptionId: string; version: DocumentVersion }
  | { type: 'prescription/confirm'; prescriptionId: string; versionId: string; fields: PrescriptionFields; title?: string }
  | { type: 'prescription/delete'; id: string; cancelPlans: boolean }
  | { type: 'plan/create'; plan: Plan }
  | {
      type: 'plan/update';
      id: string;
      unitId: string;
      intendedDate: LocalDate;
      checklist: ChecklistItem[];
      prescriptionId: string;
    }
  | { type: 'plan/toggleItem'; planId: string; key: ChecklistKey; done: boolean }
  | { type: 'plan/cancel'; id: string }
  | {
      type: 'reminder/save';
      id: string;
      isNew: boolean;
      reminderType: ReminderType;
      title: string;
      dueAt: LocalDateTime;
      link: ReminderLink | null;
    }
  | { type: 'reminder/toggleDone'; id: string }
  | { type: 'reminder/delete'; id: string }
  | { type: 'notification/read'; id: string }
  | { type: 'notification/readAll'; personId: string }
  | { type: 'clock/set'; value: LocalDateTime }
  | { type: 'demo/replace'; data: AppData };
