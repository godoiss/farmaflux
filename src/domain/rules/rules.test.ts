import { describe, expect, it } from 'vitest';
import { createScenario, DEMO_START } from '../../data/fixtures/scenarios';
import { findSample } from '../../data/fixtures/samples';
import { confirmVersion, versionFromSample, versionFromUpload } from '../../data/factories';
import { reducer } from '../../state/reducer';
import { buildReminderIcs, escapeIcsText, foldLine } from '../ics';
import { addDays, formatDate, parseBrDate, toUtcStamp, weekday } from '../time';
import { evaluatePlan, validateIntendedDate } from './planRules';
import { POSITIVE_RESULT_MESSAGE, runPreCheck } from './preCheck';
import { coverage, coverageText, conditionOn } from './unitRules';
import { dueNotifications } from './reminderRules';
import { DemoRepository, NAMESPACE, type KeyValueStore } from '../../data/repository/demoRepository';

const sample = (id: string) => {
  const s = findSample(id);
  if (!s) throw new Error(id);
  return s;
};

describe('tempo', () => {
  it('formata e converte sem deslocar o dia', () => {
    expect(formatDate('2026-10-30')).toBe('30/10/2026');
    expect(parseBrDate('06/11/2026')).toBe('2026-11-06');
    expect(parseBrDate('31/02/2026')).toBeNull();
    expect(weekday('2026-10-30')).toBe(5);
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(toUtcStamp('2026-10-30T22:30')).toBe('20261031T013000Z');
  });
});

describe('pré-conferência', () => {
  it('data não identificada no documento gera possível pendência que a transcrição não resolve', () => {
    const v = versionFromSample(sample('maria-sem-data'), { number: 1, now: DEMO_START, replacesVersionId: null });
    const typed = { ...v.extracted, issueDate: { value: '2026-10-29', reading: 'manual' as const } };
    const r = runPreCheck(confirmVersion(v, typed, DEMO_START), DEMO_START);
    expect(r.status).toBe('possible_document_issue');
    expect(r.issues.find((i) => i.kind === 'possible_document_issue')?.description).toContain('não altera o documento original');
  });

  it('versão corrigida confirmada não tem pendências', () => {
    const v = versionFromSample(sample('maria-corrigida'), { number: 2, now: DEMO_START, replacesVersionId: 'x' });
    expect(runPreCheck(v, DEMO_START).status).toBe('awaiting_review');
    const r = runPreCheck(confirmVersion(v, v.extracted, DEMO_START), DEMO_START);
    expect(r.status).toBe('no_issues');
    expect(POSITIVE_RESULT_MESSAGE).toBe('Nenhuma pendência identificada nesta pré-conferência.');
  });

  it('upload livre não inventa dados e exige confirmação de validade', () => {
    const v = versionFromUpload({ fileName: 'a.pdf', fileSize: 10, mimeType: 'application/pdf' }, { number: 1, now: DEMO_START, replacesVersionId: null });
    expect(v.extracted.patientName.value).toBeNull();
    const filled = confirmVersion(
      v,
      { ...v.extracted, patientName: { value: 'X', reading: 'manual' }, issueDate: { value: '2026-10-01', reading: 'manual' }, prescriber: { value: 'Y', reading: 'manual' }, category: { value: 'simples', reading: 'manual' }, medications: [sample('maria-direta').extracted.medications[0]] },
      DEMO_START,
    );
    expect(runPreCheck(filled, DEMO_START).status).toBe('needs_confirmation');
  });

  it('prazo demonstrativo vencido é pendência', () => {
    const v = confirmVersion(versionFromSample(sample('maria-prazo-curto'), { number: 1, now: DEMO_START, replacesVersionId: null }), sample('maria-prazo-curto').extracted, DEMO_START);
    expect(runPreCheck(v, '2026-11-06T09:00').status).toBe('deadline_passed');
  });
});

describe('unidades', () => {
  it('cobertura não converte desconhecido em zero', () => {
    const [u1, u2] = createScenario('D').units;
    const meds = sample('maria-tres-itens').extracted.medications;
    expect(coverageText(coverage(u1, meds))).toBe('3 de 3 itens com disponibilidade informada');
    const c2 = coverage(u2, meds);
    expect(c2.items.map((i) => i.availability)).toEqual(['informed_available', 'informed_unavailable', 'not_informed']);
  });
  it('suspensão e dia sem atendimento', () => {
    const [u1, , u3] = createScenario('A').units;
    expect(conditionOn(u3, '2026-11-02').kind).toBe('suspended');
    expect(conditionOn(u3, '2026-11-04').kind).toBe('scheduled');
    expect(conditionOn(u1, '2026-11-01').kind).toBe('no_service');
  });
});

describe('plano', () => {
  it('cenário C: conflito específico de data', () => {
    const d = createScenario('C');
    const ev = evaluatePlan(d.plans[0], d.prescriptions[0], d.units[0], d.clock);
    expect(ev.status).toBe('needs_review');
    expect(ev.warnings.map((w) => w.text)).toContain('A data pretendida (06/11/2026) é posterior ao prazo demonstrativo da receita (05/11/2026).');
  });
  it('rejeita data inválida e passada', () => {
    expect(validateIntendedDate('32/10/2026', DEMO_START).ok).toBe(false);
    expect(validateIntendedDate('29/10/2026', DEMO_START).ok).toBe(false);
    expect(validateIntendedDate('30/10/2026', DEMO_START)).toEqual({ ok: true, date: '2026-10-30' });
  });
  it('alterar a receita depois do plano exige revisão e invalida o item "Revisar receita"', () => {
    let d = createScenario('B');
    const rx = d.prescriptions[0];
    d = reducer(d, {
      type: 'plan/create',
      plan: {
        id: 'p1', personId: rx.personId, prescriptionId: rx.id, prescriptionVersionId: rx.currentVersionId, prescriptionVersionNumber: 1,
        prescriptionRevision: rx.revision, prescriptionTitle: rx.title, unitId: 'unit-demo-01', intendedDate: '2026-11-03',
        checklist: [{ key: 'review_prescription', done: false, doneAt: null, checkedRevision: null }], createdAt: d.clock, updatedAt: d.clock, cancelledAt: null, prescriptionDeletedAt: null,
      },
    });
    d = reducer(d, { type: 'plan/toggleItem', planId: 'p1', key: 'review_prescription', done: true });
    expect(evaluatePlan(d.plans[0], d.prescriptions[0], d.units[0], d.clock).status).toBe('saved');
    const v = d.prescriptions[0].versions[0];
    d = reducer(d, { type: 'prescription/confirm', prescriptionId: rx.id, versionId: v.id, fields: { ...v.confirmed!, prescriber: { value: 'Outro', reading: 'manual' } } });
    const ev = evaluatePlan(d.plans[0], d.prescriptions[0], d.units[0], d.clock);
    expect(ev.status).toBe('needs_review');
    expect(ev.checklist[0].effectiveDone).toBe(false);
  });
  it('excluir receita marca o plano, sem apontar silenciosamente', () => {
    let d = createScenario('C');
    d = reducer(d, { type: 'prescription/delete', id: 'rx-maria', cancelPlans: false });
    expect(d.plans[0].prescriptionDeletedAt).not.toBeNull();
    expect(evaluatePlan(d.plans[0], undefined, d.units[0], d.clock).warnings[0].kind).toBe('prescription_deleted');
  });
});

describe('lembretes', () => {
  it('emite notificação uma única vez ao avançar o relógio', () => {
    let d = createScenario('A');
    expect(d.notifications).toHaveLength(0);
    d = reducer(d, { type: 'clock/set', value: '2026-10-30T10:00' });
    expect(d.notifications).toHaveLength(1);
    d = reducer(d, { type: 'clock/set', value: '2026-10-30T11:00' });
    expect(d.notifications).toHaveLength(1);
    expect(dueNotifications(d.reminders, d.notifications, d.clock, () => 'x')).toHaveLength(0);
  });
  it('gera ICS válido e escapado', () => {
    const d = createScenario('A');
    const r = { ...d.reminders[0], title: 'Ir à UBS; levar doc, ok' };
    const ics = buildReminderIcs(r, { personName: 'Dona Maria', details: null, stamp: d.clock });
    expect(ics).toContain('UID:rem-maria-revisar@farmaflux.demo');
    expect(ics).toContain('DTSTART:20261030T130000Z');
    expect(ics).toContain('SUMMARY:Ir à UBS\\; levar doc\\, ok');
    expect(escapeIcsText('a\nb')).toBe('a\\nb');
    expect(foldLine('x'.repeat(160)).split('\r\n ').length).toBe(3);
  });
});

describe('repositório', () => {
  class MemoryStore implements KeyValueStore {
    map = new Map<string, string>();
    getItem = (k: string) => this.map.get(k) ?? null;
    setItem = (k: string, v: string) => void this.map.set(k, v);
    removeItem = (k: string) => void this.map.delete(k);
    key = (i: number) => [...this.map.keys()][i] ?? null;
    get length() { return this.map.size; }
  }
  it('esquema inválido volta ao cenário e reset só apaga o namespace', () => {
    const store = new MemoryStore();
    store.setItem(`${NAMESPACE}:data`, '{"schemaVersion":99}');
    store.setItem('outro-app', 'mantém');
    const repo = new DemoRepository(store);
    expect(repo.load().notice).toBe('invalid_schema');
    repo.save(createScenario('B'));
    expect(repo.load().data.scenario).toBe('B');
    repo.reset('A');
    expect(store.getItem('outro-app')).toBe('mantém');
    expect(store.getItem(`${NAMESPACE}:data`)).toBeNull();
  });
});
