import type { AppData, Person, Plan, Prescription, Profile, Reminder, ScenarioId } from '../../domain/types';
import { buildChecklist, checklistKeysFor } from '../../domain/rules/planRules';
import { runPreCheck } from '../../domain/rules/preCheck';
import { confirmVersion, versionFromSample } from '../factories';
import { findSample } from './samples';
import { seedUnits } from './units';

export const DEMO_START = '2026-10-30T09:00';

export const SCENARIOS: Record<ScenarioId, { title: string; description: string }> = {
  A: { title: 'A · Caminho principal', description: 'Receita da Dona Maria com data não identificada, correção e plano de ida.' },
  B: { title: 'B · Caminho direto', description: 'Receita sem pendências identificadas, pronta para planejar a ida.' },
  C: { title: 'C · Conflito de data', description: 'Prazo demonstrativo até 05/11/2026 e ida planejada para 06/11/2026.' },
  D: { title: 'D · Disponibilidade parcial', description: 'Receita com três itens para comparar unidades com informação parcial ou desconhecida.' },
};

const PEOPLE: Person[] = [
  { id: 'person-ana', name: 'Ana', role: 'self' },
  { id: 'person-maria', name: 'Dona Maria', role: 'assisted' },
];

const PROFILE: Profile = { displayName: 'Ana', mode: 'helping', selfPersonId: 'person-ana', assistedPersonId: 'person-maria' };

function prescriptionFrom(sampleId: string, opts: { confirmed: boolean; id?: string; title?: string; personId?: string }): Prescription {
  const sample = findSample(sampleId);
  if (!sample) throw new Error(`Amostra inexistente: ${sampleId}`);
  const created = '2026-10-29T19:00';
  let version = versionFromSample(sample, { number: 1, now: created, replacesVersionId: null, id: `ver-${sampleId}-1` });
  if (opts.confirmed) version = confirmVersion(version, version.extracted, created);
  return {
    id: opts.id ?? `rx-${sampleId}`,
    personId: opts.personId ?? 'person-maria',
    title: opts.title ?? 'Receita de uso contínuo',
    createdAt: created,
    updatedAt: created,
    currentVersionId: version.id,
    revision: 1,
    versions: [version],
  };
}

function base(scenario: ScenarioId): AppData {
  return {
    schemaVersion: 1,
    scenario,
    clock: DEMO_START,
    profile: { ...PROFILE },
    people: PEOPLE.map((p) => ({ ...p })),
    prescriptions: [],
    units: seedUnits(),
    plans: [],
    reminders: [],
    notifications: [],
  };
}

const anaReturn: Reminder = {
  id: 'rem-ana-retorno',
  personId: 'person-ana',
  type: 'personal_return',
  title: 'Meu retorno na UBS',
  dueAt: '2026-11-10T08:00',
  link: null,
  doneAt: null,
  createdAt: '2026-10-28T20:00',
  updatedAt: '2026-10-28T20:00',
};

export function createScenario(id: ScenarioId): AppData {
  const data = base(id);
  switch (id) {
    case 'A': {
      const rx = prescriptionFrom('maria-sem-data', { confirmed: false, id: 'rx-maria' });
      data.prescriptions = [rx];
      data.reminders = [
        {
          id: 'rem-maria-revisar',
          personId: 'person-maria',
          type: 'review_deadline',
          title: 'Revisar a receita da Dona Maria',
          dueAt: '2026-10-30T10:00',
          link: { kind: 'prescription', id: rx.id },
          doneAt: null,
          createdAt: '2026-10-29T19:05',
          updatedAt: '2026-10-29T19:05',
        },
        anaReturn,
      ];
      break;
    }
    case 'B': {
      data.prescriptions = [prescriptionFrom('maria-direta', { confirmed: true, id: 'rx-maria' })];
      data.reminders = [anaReturn];
      break;
    }
    case 'C': {
      const rx = prescriptionFrom('maria-prazo-curto', { confirmed: true, id: 'rx-maria' });
      const version = rx.versions[0];
      const plan: Plan = {
        id: 'plan-maria-c',
        personId: 'person-maria',
        prescriptionId: rx.id,
        prescriptionVersionId: version.id,
        prescriptionVersionNumber: 1,
        prescriptionRevision: rx.revision,
        prescriptionTitle: rx.title,
        unitId: 'unit-demo-01',
        intendedDate: '2026-11-06',
        checklist: buildChecklist(checklistKeysFor(runPreCheck(version, DEMO_START))),
        createdAt: '2026-10-29T19:10',
        updatedAt: '2026-10-29T19:10',
        cancelledAt: null,
        prescriptionDeletedAt: null,
      };
      data.prescriptions = [rx];
      data.plans = [plan];
      data.reminders = [
        {
          id: 'rem-maria-c',
          personId: 'person-maria',
          type: 'check_unit',
          title: 'Conferir a UBS antes da ida',
          dueAt: '2026-11-05T08:00',
          link: { kind: 'plan', id: plan.id },
          doneAt: null,
          createdAt: '2026-10-29T19:10',
          updatedAt: '2026-10-29T19:10',
        },
      ];
      break;
    }
    case 'D': {
      data.prescriptions = [prescriptionFrom('maria-tres-itens', { confirmed: true, id: 'rx-maria' })];
      break;
    }
  }
  return data;
}
