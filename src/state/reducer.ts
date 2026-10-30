import type { AppData, Plan, Prescription } from '../domain/types';
import { dueNotifications } from '../domain/rules/reminderRules';
import { activePersonId } from './selectors';
import type { Action } from './actions';

/**
 * Reducer puro do estado de domínio. Todo carimbo de tempo vem do relógio
 * de demonstração (state.clock) — nunca de Date.now().
 */
export function reducer(state: AppData, action: Action): AppData {
  return emitDueNotifications(apply(state, action));
}

/** Após qualquer ação, emite notificações vencidas (idempotente). */
function emitDueNotifications(state: AppData): AppData {
  const fresh = dueNotifications(state.reminders, state.notifications, state.clock, () => '');
  if (fresh.length === 0) return state;
  return { ...state, notifications: [...fresh.map((n) => ({ ...n, id: `ntf-${n.dedupeKey}` })), ...state.notifications] };
}

const updatePrescription = (state: AppData, id: string, fn: (p: Prescription) => Prescription): AppData => ({
  ...state,
  prescriptions: state.prescriptions.map((p) => (p.id === id ? fn(p) : p)),
});

const updatePlan = (state: AppData, id: string, fn: (p: Plan) => Plan): AppData => ({
  ...state,
  plans: state.plans.map((p) => (p.id === id ? fn(p) : p)),
});

function apply(state: AppData, action: Action): AppData {
  const now = state.clock;
  switch (action.type) {
    case 'profile/setMode':
      return { ...state, profile: { ...state.profile, mode: action.mode } };

    case 'profile/update': {
      const { selfPersonId, assistedPersonId } = state.profile;
      return {
        ...state,
        profile: { ...state.profile, displayName: action.displayName },
        people: state.people.map((p) =>
          p.id === selfPersonId ? { ...p, name: action.displayName } : p.id === assistedPersonId ? { ...p, name: action.assistedName } : p,
        ),
      };
    }

    case 'prescription/add': {
      if (state.prescriptions.some((p) => p.id === action.id)) return state; // proteção contra reenvio
      const prescription: Prescription = {
        id: action.id,
        personId: activePersonId(state),
        title: action.title,
        createdAt: now,
        updatedAt: now,
        currentVersionId: action.version.id,
        revision: 1,
        versions: [action.version],
      };
      return { ...state, prescriptions: [prescription, ...state.prescriptions] };
    }

    case 'prescription/addVersion':
      return updatePrescription(state, action.prescriptionId, (p) =>
        p.versions.some((v) => v.id === action.version.id)
          ? p
          : { ...p, versions: [...p.versions, action.version], currentVersionId: action.version.id, revision: p.revision + 1, updatedAt: now },
      );

    case 'prescription/confirm':
      return updatePrescription(state, action.prescriptionId, (p) => {
        const target = p.versions.find((v) => v.id === action.versionId);
        if (!target) return p;
        const changed = JSON.stringify(target.confirmed) !== JSON.stringify(action.fields);
        return {
          ...p,
          title: action.title?.trim() || p.title,
          updatedAt: now,
          revision: changed ? p.revision + 1 : p.revision,
          versions: p.versions.map((v) => (v.id === action.versionId ? { ...v, confirmed: structuredClone(action.fields), confirmedAt: now } : v)),
        };
      });

    case 'prescription/delete':
      return {
        ...state,
        prescriptions: state.prescriptions.filter((p) => p.id !== action.id),
        plans: state.plans.map((pl) =>
          pl.prescriptionId === action.id
            ? { ...pl, prescriptionDeletedAt: now, cancelledAt: action.cancelPlans ? (pl.cancelledAt ?? now) : pl.cancelledAt, updatedAt: now }
            : pl,
        ),
        reminders: state.reminders.map((r) =>
          r.link?.kind === 'prescription' && r.link.id === action.id ? { ...r, link: null, updatedAt: now } : r,
        ),
      };

    case 'plan/create':
      if (state.plans.some((p) => p.id === action.plan.id)) return state;
      return { ...state, plans: [action.plan, ...state.plans] };

    case 'plan/update': {
      const prescription = state.prescriptions.find((p) => p.id === action.prescriptionId);
      if (!prescription) return state;
      const current = prescription.versions.find((v) => v.id === prescription.currentVersionId);
      return updatePlan(state, action.id, (pl) => ({
        ...pl,
        unitId: action.unitId,
        intendedDate: action.intendedDate,
        checklist: action.checklist,
        prescriptionId: prescription.id,
        prescriptionTitle: prescription.title,
        prescriptionVersionId: current?.id ?? pl.prescriptionVersionId,
        prescriptionVersionNumber: current?.number ?? pl.prescriptionVersionNumber,
        prescriptionRevision: prescription.revision,
        prescriptionDeletedAt: null,
        updatedAt: now,
      }));
    }

    case 'plan/toggleItem': {
      const plan = state.plans.find((p) => p.id === action.planId);
      const revision = state.prescriptions.find((p) => p.id === plan?.prescriptionId)?.revision ?? null;
      return updatePlan(state, action.planId, (pl) => ({
        ...pl,
        updatedAt: now,
        checklist: pl.checklist.map((c) =>
          c.key === action.key
            ? { ...c, done: action.done, doneAt: action.done ? now : null, checkedRevision: action.done ? revision : null }
            : c,
        ),
      }));
    }

    case 'plan/cancel':
      return updatePlan(state, action.id, (pl) => ({ ...pl, cancelledAt: pl.cancelledAt ?? now, updatedAt: now }));

    case 'reminder/save': {
      const exists = state.reminders.some((r) => r.id === action.id);
      if (action.isNew && exists) return state; // duplo clique / reenvio
      if (!action.isNew) {
        return {
          ...state,
          reminders: state.reminders.map((r) =>
            r.id === action.id ? { ...r, type: action.reminderType, title: action.title.trim(), dueAt: action.dueAt, link: action.link, updatedAt: now } : r,
          ),
        };
      }
      return {
        ...state,
        reminders: [
          {
            id: action.id,
            personId: activePersonId(state),
            type: action.reminderType,
            title: action.title.trim(),
            dueAt: action.dueAt,
            link: action.link,
            doneAt: null,
            createdAt: now,
            updatedAt: now,
          },
          ...state.reminders,
        ],
      };
    }

    case 'reminder/toggleDone':
      return {
        ...state,
        reminders: state.reminders.map((r) => (r.id === action.id ? { ...r, doneAt: r.doneAt ? null : now, updatedAt: now } : r)),
      };

    case 'reminder/delete':
      return { ...state, reminders: state.reminders.filter((r) => r.id !== action.id) };

    case 'notification/read':
      return { ...state, notifications: state.notifications.map((n) => (n.id === action.id && !n.readAt ? { ...n, readAt: now } : n)) };

    case 'notification/readAll':
      return {
        ...state,
        notifications: state.notifications.map((n) => (n.personId === action.personId && !n.readAt ? { ...n, readAt: now } : n)),
      };

    case 'clock/set':
      return { ...state, clock: action.value };

    case 'demo/replace':
      return action.data;
  }
}
