import type { AppData, Preferences } from '../../domain/types';
import { isValidLocalDateTime } from '../../domain/time';

/**
 * Validação estrutural do estado persistido. Não depende de bibliotecas:
 * confere o suficiente para garantir que a UI não quebre com dados antigos
 * ou corrompidos. Qualquer falha descarta o estado salvo.
 */
type Guard = (v: unknown) => boolean;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr: Guard = (v) => typeof v === 'string';
const isNum: Guard = (v) => typeof v === 'number' && Number.isFinite(v);
const isNullable = (g: Guard): Guard => (v) => v === null || g(v);
const arrayOf = (g: Guard): Guard => (v) => Array.isArray(v) && v.every(g);
const shape = (spec: Record<string, Guard>): Guard => (v) => isObj(v) && Object.entries(spec).every(([k, g]) => g(v[k]));
const oneOf = (...values: string[]): Guard => (v) => typeof v === 'string' && values.includes(v);

const field = shape({ reading: oneOf('read', 'unreadable', 'manual') });
const medication = shape({ code: isStr, name: isStr, strength: isStr, form: isStr });
const fields = shape({ patientName: field, issueDate: field, prescriber: field, category: field, medications: arrayOf(medication) });

const version = shape({
  id: isStr,
  number: isNum,
  createdAt: isStr,
  source: oneOf('sample', 'upload'),
  fileName: isStr,
  fileSize: isNum,
  readingMode: oneOf('demo', 'manual'),
  extracted: fields,
  confirmed: isNullable(fields),
  documentFindings: arrayOf(isStr),
  demoValidUntil: isNullable(isStr),
});

const prescription = shape({
  id: isStr,
  personId: isStr,
  title: isStr,
  currentVersionId: isStr,
  revision: isNum,
  versions: (v) => arrayOf(version)(v) && (v as unknown[]).length > 0,
});

const unit = shape({ id: isStr, code: isStr, name: isStr, region: isStr, schedule: isObj, exception: isObj, stock: Array.isArray, updatedAt: isStr });

const checklistItem = shape({ key: isStr, done: (v) => typeof v === 'boolean', checkedRevision: isNullable(isNum) });

const plan = shape({
  id: isStr,
  personId: isStr,
  prescriptionId: isStr,
  prescriptionVersionId: isStr,
  prescriptionRevision: isNum,
  unitId: isStr,
  intendedDate: isStr,
  checklist: arrayOf(checklistItem),
  cancelledAt: isNullable(isStr),
});

const reminder = shape({
  id: isStr,
  personId: isStr,
  type: oneOf('check_unit', 'review_deadline', 'personal_return'),
  title: isStr,
  dueAt: isStr,
  doneAt: isNullable(isStr),
});

const notification = shape({ id: isStr, personId: isStr, reminderId: isStr, dedupeKey: isStr, title: isStr, readAt: isNullable(isStr) });

const appData = shape({
  schemaVersion: (v) => v === 1,
  scenario: oneOf('A', 'B', 'C', 'D'),
  clock: (v) => typeof v === 'string' && isValidLocalDateTime(v),
  profile: shape({ displayName: isStr, mode: oneOf('self', 'helping'), selfPersonId: isStr, assistedPersonId: isStr }),
  people: arrayOf(shape({ id: isStr, name: isStr, role: oneOf('self', 'assisted') })),
  prescriptions: arrayOf(prescription),
  units: arrayOf(unit),
  plans: arrayOf(plan),
  reminders: arrayOf(reminder),
  notifications: arrayOf(notification),
});

export function parseAppData(value: unknown): AppData | null {
  return appData(value) ? (value as AppData) : null;
}

export function parsePreferences(value: unknown): Preferences | null {
  if (!isObj(value)) return null;
  return value.textScale === 1 || value.textScale === 1.125 || value.textScale === 1.25 ? { textScale: value.textScale } : null;
}
