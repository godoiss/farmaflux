import type { ChecklistItem, ChecklistKey, DocumentVersion, LocalDate, LocalDateTime, Plan, Prescription, Unit } from '../types';
import { datePart, formatDate, isValidLocalDate, parseBrDate } from '../time';
import { runPreCheck, type PreCheckResult } from './preCheck';
import { AVAILABILITY_LABEL, conditionOn, conditionText, coverage, isStale } from './unitRules';

export type PlanStatus = 'saved' | 'needs_review' | 'cancelled';

export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
  saved: 'Plano salvo',
  needs_review: 'Precisa revisar',
  cancelled: 'Cancelado',
};

export type PlanWarningKind =
  | 'prescription_deleted'
  | 'prescription_changed'
  | 'document_pending'
  | 'after_deadline'
  | 'unit_no_service'
  | 'unit_suspended'
  | 'unit_unconfirmed'
  | 'item_unavailable'
  | 'item_not_informed'
  | 'stale_info'
  | 'date_passed';

export interface PlanWarning {
  kind: PlanWarningKind;
  text: string;
  /** Avisos de bloqueio documental/data levam a "Precisa revisar". */
  requiresReview: boolean;
}

/* ---------- Validação da data de intenção ---------- */

export type DateInputResult = { ok: true; date: LocalDate } | { ok: false; error: string };

/** Aceita "dd/mm/aaaa" (digitado) ou "aaaa-mm-dd" (campo nativo). */
export function validateIntendedDate(raw: string, now: LocalDateTime): DateInputResult {
  const value = raw.trim();
  if (!value) return { ok: false, error: 'Informe a data em que pretende ir à unidade.' };
  const date = isValidLocalDate(value) ? value : parseBrDate(value);
  if (!date) return { ok: false, error: 'Data inválida. Use o formato dd/mm/aaaa.' };
  if (date < datePart(now)) {
    return { ok: false, error: `A data precisa ser hoje (${formatDate(datePart(now))}) ou depois.` };
  }
  return { ok: true, date };
}

/* ---------- Comparação da intenção com receita e unidade ---------- */

export function intentionWarnings(date: LocalDate, version: DocumentVersion | undefined, unit: Unit, now: LocalDateTime): PlanWarning[] {
  const warnings: PlanWarning[] = [];

  if (date < datePart(now)) {
    warnings.push({ kind: 'date_passed', requiresReview: true, text: `A data pretendida (${formatDate(date)}) já passou.` });
  }

  if (version) {
    const pc = runPreCheck(version, now);
    if (pc.deadline && date > pc.deadline.date) {
      warnings.push({
        kind: 'after_deadline',
        requiresReview: true,
        text: `A data pretendida (${formatDate(date)}) é posterior ao prazo demonstrativo da receita (${formatDate(pc.deadline.date)}).`,
      });
    }
  }

  const c = conditionOn(unit, date);
  if (c.kind === 'no_service') {
    warnings.push({ kind: 'unit_no_service', requiresReview: true, text: `${conditionText(c)} nesta unidade (${formatDate(date)}).` });
  } else if (c.kind === 'suspended') {
    warnings.push({ kind: 'unit_suspended', requiresReview: true, text: `Na data pretendida: ${conditionText(c)}.` });
  } else if (c.kind === 'unconfirmed') {
    warnings.push({ kind: 'unit_unconfirmed', requiresReview: false, text: `${c.message}. Confira antes de sair.` });
  }

  if (version) {
    const meds = (version.confirmed ?? version.extracted).medications;
    for (const item of coverage(unit, meds).items) {
      const name = `${item.medication.name} ${item.medication.strength}`;
      if (item.availability === 'informed_unavailable') {
        warnings.push({ kind: 'item_unavailable', requiresReview: false, text: `${name}: ${AVAILABILITY_LABEL.informed_unavailable.toLowerCase()} nesta unidade.` });
      } else if (item.availability === 'not_informed') {
        warnings.push({ kind: 'item_not_informed', requiresReview: false, text: `${name}: informação de disponibilidade não disponível.` });
      }
    }
  }

  if (isStale(unit, now)) {
    warnings.push({ kind: 'stale_info', requiresReview: false, text: 'As informações desta unidade podem estar desatualizadas.' });
  }

  return warnings;
}

/* ---------- Avaliação de um plano salvo ---------- */

export interface PlanEvaluation {
  status: PlanStatus;
  warnings: PlanWarning[];
  preCheck: PreCheckResult | null;
  version: DocumentVersion | undefined;
  checklist: Array<ChecklistItem & { effectiveDone: boolean; staleReason: string | null }>;
  checklistDone: number;
}

export function currentVersionOf(p: Prescription | undefined): DocumentVersion | undefined {
  return p?.versions.find((v) => v.id === p.currentVersionId);
}

export function evaluatePlan(plan: Plan, prescription: Prescription | undefined, unit: Unit, now: LocalDateTime): PlanEvaluation {
  const warnings: PlanWarning[] = [];
  const planVersion = prescription?.versions.find((v) => v.id === plan.prescriptionVersionId);
  const current = currentVersionOf(prescription);

  if (!prescription) {
    warnings.push({ kind: 'prescription_deleted', requiresReview: true, text: 'A receita vinculada a este plano foi excluída. Escolha outra receita ou cancele o plano.' });
  } else if (prescription.revision !== plan.prescriptionRevision) {
    const changedVersion = current && current.id !== plan.prescriptionVersionId;
    warnings.push({
      kind: 'prescription_changed',
      requiresReview: true,
      text: changedVersion
        ? `A receita ganhou uma nova versão (v${current?.number}) depois deste plano (feito com a v${plan.prescriptionVersionNumber}). Revise o plano.`
        : 'A transcrição da receita foi alterada depois deste plano. Revise o plano.',
    });
  }

  // Avalia a versão atual quando existe, para não manter status positivo antigo.
  const evaluated = current ?? planVersion;
  const preCheck = evaluated ? runPreCheck(evaluated, now) : null;
  if (preCheck && preCheck.status !== 'no_issues') {
    warnings.push({
      kind: 'document_pending',
      requiresReview: true,
      text: `Pré-conferência da receita: ${preCheck.issues.filter((i) => i.severity !== 'info').map((i) => i.title).join('; ')}.`,
    });
  }

  warnings.push(...intentionWarnings(plan.intendedDate, evaluated, unit, now));

  const checklist = plan.checklist.map((item) => {
    const staleReview = item.key === 'review_prescription' && item.done && prescription !== undefined && item.checkedRevision !== prescription.revision;
    return {
      ...item,
      effectiveDone: item.done && !staleReview,
      staleReason: staleReview ? 'A receita mudou depois desta marcação. Revise novamente.' : null,
    };
  });

  const status: PlanStatus = plan.cancelledAt ? 'cancelled' : warnings.some((w) => w.requiresReview) ? 'needs_review' : 'saved';
  return { status, warnings, preCheck, version: evaluated, checklist, checklistDone: checklist.filter((c) => c.effectiveDone).length };
}

/* ---------- Checklist contextual ---------- */

export function checklistKeysFor(preCheck: PreCheckResult | null): ChecklistKey[] {
  const keys: ChecklistKey[] = [];
  if (preCheck?.status === 'possible_document_issue') keys.push('correction');
  keys.push('review_prescription', 'identification', 'unit_info', 'availability');
  return keys;
}

/** Monta o checklist preservando marcações existentes; itens novos nunca começam marcados. */
export function buildChecklist(keys: ChecklistKey[], previous: ChecklistItem[] = [], opts: { resetAvailability?: boolean } = {}): ChecklistItem[] {
  return keys.map((key) => {
    const prev = previous.find((p) => p.key === key);
    if (!prev || (opts.resetAvailability && (key === 'availability' || key === 'unit_info'))) {
      return { key, done: false, doneAt: null, checkedRevision: null };
    }
    return prev;
  });
}
