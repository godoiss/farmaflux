/**
 * Modelo de domínio do FarmaFlux.
 *
 * Convenções de tempo: todas as datas são strings de "relógio de parede"
 * em America/Sao_Paulo (UTC-03:00, sem horário de verão desde 2019).
 *  - LocalDate:     "AAAA-MM-DD"
 *  - LocalDateTime: "AAAA-MM-DDTHH:mm"
 * Isso evita deslocamentos de data causados por conversões de fuso.
 */
export type LocalDate = string;
export type LocalDateTime = string;

export type ScenarioId = 'A' | 'B' | 'C' | 'D';

/* ---------- Pessoas e perfil ---------- */

export type PersonRole = 'self' | 'assisted';

export interface Person {
  id: string;
  name: string;
  role: PersonRole;
}

/** Contexto de uso: "Para mim" ou "Estou ajudando alguém". */
export type UsageMode = 'self' | 'helping';

export interface Profile {
  displayName: string;
  mode: UsageMode;
  selfPersonId: string;
  assistedPersonId: string;
}

/* ---------- Receitas ---------- */

export type PrescriptionCategory = 'simples' | 'controle_especial' | 'a_confirmar';

export interface Medication {
  code: string;
  name: string;
  strength: string;
  form: string;
}

/** Como um campo chegou ao estado atual. */
export type FieldReading = 'read' | 'unreadable' | 'manual';

export interface FieldValue<T> {
  value: T | null;
  reading: FieldReading;
}

export interface PrescriptionFields {
  patientName: FieldValue<string>;
  issueDate: FieldValue<LocalDate>;
  prescriber: FieldValue<string>;
  category: FieldValue<PrescriptionCategory>;
  medications: Medication[];
}

/** Achado sobre o documento original (não sobre a transcrição). */
export type DocumentFindingCode = 'issue_date_not_found';

export type ReadingMode = 'demo' | 'manual';
export type DocumentSource = 'sample' | 'upload';
export type PreviewKind = 'image' | 'pdf' | 'none';

export interface DocumentVersion {
  id: string;
  number: number;
  createdAt: LocalDateTime;
  source: DocumentSource;
  sampleId: string | null;
  fileName: string;
  fileSize: number;
  mimeType: string;
  previewKind: PreviewKind;
  /** Caminho local do documento de exemplo (somente para amostras). */
  assetPath: string | null;
  readingMode: ReadingMode;
  /** Resultado da leitura (demonstrativa ou vazia, no modo manual). */
  extracted: PrescriptionFields;
  /** Transcrição revisada e confirmada pela pessoa usuária. */
  confirmed: PrescriptionFields | null;
  confirmedAt: LocalDateTime | null;
  /** Achados do documento, definidos pelo cenário demonstrativo. */
  documentFindings: DocumentFindingCode[];
  /** Prazo demonstrativo explícito do cenário (não é regra legal). */
  demoValidUntil: LocalDate | null;
  replacesVersionId: string | null;
}

export interface Prescription {
  id: string;
  personId: string;
  title: string;
  createdAt: LocalDateTime;
  updatedAt: LocalDateTime;
  currentVersionId: string;
  /** Incrementa a cada alteração de conteúdo (nova versão ou transcrição). */
  revision: number;
  versions: DocumentVersion[];
}

/* ---------- Unidades ---------- */

export interface DaySchedule {
  open: string; // HH:mm
  close: string;
  breakStart?: string;
  breakEnd?: string;
}

/** 0 = domingo ... 6 = sábado */
export type WeekSchedule = Record<0 | 1 | 2 | 3 | 4 | 5 | 6, DaySchedule | null>;

export type UnitExceptionKind = 'none' | 'suspended' | 'unconfirmed';

export interface UnitException {
  kind: UnitExceptionKind;
  message: string | null;
  from: LocalDate | null;
  until: LocalDate | null;
}

export type PharmacistCondition = 'informed_present' | 'informed_absent' | 'unknown';

export type StockStatus = 'informed_available' | 'informed_unavailable';

export interface StockEntry {
  code: string;
  status: StockStatus;
}

export interface Unit {
  id: string;
  code: string;
  name: string;
  region: string;
  address: string;
  schedule: WeekSchedule;
  exception: UnitException;
  pharmacist: PharmacistCondition;
  /** Itens sem entrada são tratados como "não informado" — nunca como zero. */
  stock: StockEntry[];
  updatedAt: LocalDateTime;
}

/* ---------- Plano de ida ---------- */

export type ChecklistKey = 'review_prescription' | 'identification' | 'unit_info' | 'availability' | 'correction';

export interface ChecklistItem {
  key: ChecklistKey;
  done: boolean;
  doneAt: LocalDateTime | null;
  /** Revisão da receita no momento em que o item foi marcado. */
  checkedRevision: number | null;
}

export interface Plan {
  id: string;
  personId: string;
  prescriptionId: string;
  prescriptionVersionId: string;
  prescriptionVersionNumber: number;
  prescriptionRevision: number;
  /** Título copiado para manter contexto caso a receita seja excluída. */
  prescriptionTitle: string;
  unitId: string;
  intendedDate: LocalDate;
  checklist: ChecklistItem[];
  createdAt: LocalDateTime;
  updatedAt: LocalDateTime;
  cancelledAt: LocalDateTime | null;
  /** Preenchido quando a receita vinculada é excluída. */
  prescriptionDeletedAt: LocalDateTime | null;
}

/* ---------- Lembretes e notificações ---------- */

export type ReminderType = 'check_unit' | 'review_deadline' | 'personal_return';

export interface ReminderLink {
  kind: 'plan' | 'prescription';
  id: string;
}

export interface Reminder {
  id: string;
  personId: string;
  type: ReminderType;
  title: string;
  dueAt: LocalDateTime;
  link: ReminderLink | null;
  doneAt: LocalDateTime | null;
  createdAt: LocalDateTime;
  updatedAt: LocalDateTime;
}

export interface AppNotification {
  id: string;
  personId: string;
  reminderId: string;
  /** Chave de emissão: impede repetir a mesma notificação. */
  dedupeKey: string;
  title: string;
  body: string;
  createdAt: LocalDateTime;
  readAt: LocalDateTime | null;
}

/* ---------- Estado persistido ---------- */

export interface AppData {
  schemaVersion: 1;
  scenario: ScenarioId;
  clock: LocalDateTime;
  profile: Profile;
  people: Person[];
  prescriptions: Prescription[];
  units: Unit[];
  plans: Plan[];
  reminders: Reminder[];
  notifications: AppNotification[];
}

export interface Preferences {
  textScale: 1 | 1.125 | 1.25;
}
