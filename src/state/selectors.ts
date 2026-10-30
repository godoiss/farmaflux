import type { AppData, Person, Plan, Prescription, Unit } from '../domain/types';
import { currentVersionOf, evaluatePlan, type PlanEvaluation } from '../domain/rules/planRules';
import { runPreCheck, type PreCheckResult } from '../domain/rules/preCheck';
import { reminderState } from '../domain/rules/reminderRules';

/** Seletores derivados do estado único — nenhuma tela guarda cópia própria. */

export const activePersonId = (s: AppData) => (s.profile.mode === 'self' ? s.profile.selfPersonId : s.profile.assistedPersonId);

export const activePerson = (s: AppData): Person =>
  s.people.find((p) => p.id === activePersonId(s)) ?? { id: activePersonId(s), name: 'Pessoa', role: 'self' };

export const personName = (s: AppData, id: string) => s.people.find((p) => p.id === id)?.name ?? 'Pessoa removida';

export const prescriptionsOfActive = (s: AppData) => s.prescriptions.filter((p) => p.personId === activePersonId(s));
export const plansOfActive = (s: AppData) => s.plans.filter((p) => p.personId === activePersonId(s));
export const remindersOfActive = (s: AppData) => s.reminders.filter((r) => r.personId === activePersonId(s));
export const notificationsOfActive = (s: AppData) => s.notifications.filter((n) => n.personId === activePersonId(s));
export const unreadCount = (s: AppData) => notificationsOfActive(s).filter((n) => !n.readAt).length;

export const findPrescription = (s: AppData, id: string | null | undefined) => s.prescriptions.find((p) => p.id === id);
export const findUnit = (s: AppData, id: string | null | undefined) => s.units.find((u) => u.id === id);
export const findPlan = (s: AppData, id: string | null | undefined) => s.plans.find((p) => p.id === id);

export function preCheckOf(s: AppData, p: Prescription): PreCheckResult | null {
  const v = currentVersionOf(p);
  return v ? runPreCheck(v, s.clock) : null;
}

export interface PlanView {
  plan: Plan;
  unit: Unit | undefined;
  prescription: Prescription | undefined;
  evaluation: PlanEvaluation | null;
}

export function planView(s: AppData, plan: Plan): PlanView {
  const unit = findUnit(s, plan.unitId);
  const prescription = findPrescription(s, plan.prescriptionId);
  return { plan, unit, prescription, evaluation: unit ? evaluatePlan(plan, prescription, unit, s.clock) : null };
}

export function reminderBuckets(s: AppData) {
  const list = [...remindersOfActive(s)].sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  return {
    overdue: list.filter((r) => reminderState(r, s.clock) === 'overdue'),
    upcoming: list.filter((r) => reminderState(r, s.clock) === 'upcoming'),
    done: list.filter((r) => reminderState(r, s.clock) === 'done').reverse(),
  };
}

export const plansForPrescription = (s: AppData, prescriptionId: string) =>
  s.plans.filter((p) => p.prescriptionId === prescriptionId && !p.cancelledAt);
