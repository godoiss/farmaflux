import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CircleAlert, Info, MapPin, TriangleAlert } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Callout, PageHeader, StatusPill } from '../../components/ui/Display';
import { MaskedField, SelectField } from '../../components/ui/Field';
import { NotFound } from '../../components/layout/NotFound';
import { useStore } from '../../state/AppStore';
import { useAnnounce } from '../../state/Announcer';
import { activePerson, findPlan, findPrescription, findUnit, prescriptionsOfActive } from '../../state/selectors';
import { buildChecklist, checklistKeysFor, currentVersionOf, evaluatePlan, intentionWarnings, validateIntendedDate } from '../../domain/rules/planRules';
import { runPreCheck, STATUS_COPY } from '../../domain/rules/preCheck';
import { conditionOn, coverage, coverageText, unitHeadline } from '../../domain/rules/unitRules';
import { CHECKLIST_LABEL } from '../../domain/labels';
import { addDays, datePart, formatDate, weekday, weekdayShort } from '../../domain/time';
import type { ChecklistItem, ChecklistKey, Plan } from '../../domain/types';
import { newId } from '../../lib/id';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { OwnerGuard } from '../prescriptions/OwnerGuard';
import { statusTone } from '../prescriptions/prescriptionUi';

type Errors = Partial<Record<'prescription' | 'unit' | 'date', string>>;
const FIELD_IDS = { prescription: 'pl-rx', unit: 'pl-unit-0', date: 'pl-date' };

export function PlanFormPage({ mode }: { mode: 'new' | 'edit' }) {
  const { id } = useParams();
  const { data } = useStore();
  const plan = mode === 'edit' ? findPlan(data, id) : undefined;
  if (mode === 'edit' && !plan) return <NotFound what="plano" />;
  if (plan) {
    return (
      <OwnerGuard ownerId={plan.personId}>
        <PlanForm key={plan.id} plan={plan} />
      </OwnerGuard>
    );
  }
  return <PlanForm />;
}

function PlanForm({ plan }: { plan?: Plan }) {
  const { data, dispatch } = useStore();
  const announce = useAnnounce();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const now = data.clock;
  const today = datePart(now);
  const prescriptions = prescriptionsOfActive(data);

  const initial = useMemo(() => {
    if (plan) {
      const rx = findPrescription(data, plan.prescriptionId);
      const unit = findUnit(data, plan.unitId);
      const evaluation = unit ? evaluatePlan(plan, rx, unit, data.clock) : null;
      return {
        prescriptionId: rx ? plan.prescriptionId : '',
        unitId: plan.unitId,
        date: formatDate(plan.intendedDate),
        checked: (evaluation?.checklist ?? []).filter((c) => c.effectiveDone).map((c) => c.key),
      };
    }
    const rx = params.get('receita');
    const unit = params.get('unidade');
    return {
      prescriptionId: prescriptions.some((p) => p.id === rx) ? rx! : (prescriptions[0]?.id ?? ''),
      unitId: data.units.some((u) => u.id === unit) ? unit! : '',
      date: '',
      checked: [] as ChecklistKey[],
    };
    // Valores iniciais calculados uma única vez por montagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [prescriptionId, setPrescriptionId] = useState(initial.prescriptionId);
  const [unitId, setUnitId] = useState(initial.unitId);
  const [date, setDate] = useState(initial.date);
  const [checked, setChecked] = useState<ChecklistKey[]>(initial.checked);
  const [errors, setErrors] = useState<Errors>({});
  const [savedId, setSavedId] = useState<string | null>(null);
  const submitting = useRef(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const planId = useRef(plan?.id ?? newId('plan'));

  const dirty = savedId === null && JSON.stringify({ prescriptionId, unitId, date, checked }) !== JSON.stringify(initial);
  const blocker = useUnsavedChanges(dirty, 'O plano ainda não foi salvo.');

  useEffect(() => {
    if (savedId) navigate(`/planos/${savedId}`, { replace: !plan });
  }, [savedId, navigate, plan]);

  const prescription = findPrescription(data, prescriptionId);
  const version = currentVersionOf(prescription);
  const preCheck = version ? runPreCheck(version, now) : null;
  const unit = findUnit(data, unitId);
  const meds = (version?.confirmed ?? version?.extracted)?.medications ?? [];
  const keys = checklistKeysFor(preCheck);
  const dateResult = date.length === 10 ? validateIntendedDate(date, now) : null;
  const warnings = dateResult?.ok && unit ? intentionWarnings(dateResult.date, version, unit, now) : [];
  const docPending = preCheck && preCheck.status !== 'no_issues';
  const willNeedReview = Boolean(docPending) || warnings.some((w) => w.requiresReview);

  const quickDates = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < 14 && out.length < 3; i++) {
      const d = addDays(today, i);
      if (!unit || conditionOn(unit, d).kind === 'scheduled') out.push(d);
    }
    return out;
  }, [today, unit]);

  // Trocar de unidade desmarca o que dependia dela: precisa ser verificado de novo.
  const selectUnit = (next: string) => {
    if (next !== unitId) setChecked((c) => c.filter((k) => k !== 'availability' && k !== 'unit_info'));
    setUnitId(next);
    setErrors((x) => ({ ...x, unit: undefined }));
  };

  const toggle = (key: ChecklistKey) => setChecked((c) => (c.includes(key) ? c.filter((k) => k !== key) : [...c, key]));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    const errs: Errors = {};
    if (!prescription) errs.prescription = 'Escolha a receita deste plano.';
    if (!unit) errs.unit = 'Escolha a unidade.';
    const dr = validateIntendedDate(date, now);
    if (!dr.ok) errs.date = dr.error;
    setErrors(errs);
    if (Object.keys(errs).length || !prescription || !unit || !dr.ok) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    submitting.current = true;

    const unitChanged = plan ? plan.unitId !== unit.id : false;
    const previous = plan?.checklist ?? [];
    const base = buildChecklist(keys, previous, { resetAvailability: unitChanged });
    const checklist: ChecklistItem[] = base.map((item) => {
      const isChecked = checked.includes(item.key);
      if (!isChecked) return { ...item, done: false, doneAt: null, checkedRevision: null };
      const keep = item.done && item.checkedRevision === prescription.revision;
      return keep ? item : { ...item, done: true, doneAt: now, checkedRevision: prescription.revision };
    });

    if (plan) {
      dispatch({ type: 'plan/update', id: plan.id, unitId: unit.id, intendedDate: dr.date, checklist, prescriptionId: prescription.id });
    } else {
      const v = currentVersionOf(prescription)!;
      dispatch({
        type: 'plan/create',
        plan: {
          id: planId.current,
          personId: prescription.personId,
          prescriptionId: prescription.id,
          prescriptionVersionId: v.id,
          prescriptionVersionNumber: v.number,
          prescriptionRevision: prescription.revision,
          prescriptionTitle: prescription.title,
          unitId: unit.id,
          intendedDate: dr.date,
          checklist,
          createdAt: now,
          updatedAt: now,
          cancelledAt: null,
          prescriptionDeletedAt: null,
        },
      });
    }
    announce(willNeedReview ? 'Plano salvo como “Precisa revisar”. Veja os avisos.' : 'Plano salvo.');
    setSavedId(planId.current);
  };

  const errorList = (Object.keys(FIELD_IDS) as Array<keyof Errors>).filter((k) => errors[k]);

  return (
    <div>
      <PageHeader
        back={
          <Link to={plan ? `/planos/${plan.id}` : prescription ? `/receitas/${prescription.id}` : '/'} className="btn btn-ghost -ml-3 min-h-11 px-3">
            <ArrowLeft size={18} aria-hidden /> Voltar
          </Link>
        }
        eyebrow="Preparar retirada"
        title={plan ? 'Editar plano de ida' : 'Planejar minha ida'}
        description={`Organize a ida de ${activePerson(data).name}. Isto não é agendamento nem reserva: é a sua intenção de comparecer.`}
      />

      <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-8">
        <div className="space-y-6">
          {errorList.length > 0 && (
            <div ref={summaryRef} tabIndex={-1} className="callout callout-danger outline-none" role="alert">
              <CircleAlert size={20} className="mt-0.5 shrink-0 text-red-ink" aria-hidden />
              <div>
                <p className="font-semibold">Faltam informações para salvar:</p>
                <ul className="mt-1 list-disc pl-5">
                  {errorList.map((k) => (
                    <li key={k}>
                      <a href={`#${FIELD_IDS[k]}`} className="font-medium text-red-ink underline" onClick={(ev) => { ev.preventDefault(); document.getElementById(FIELD_IDS[k])?.focus(); }}>
                        {errors[k]}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* 1. Receita */}
          <section className="card card-pad space-y-4" aria-labelledby="s-rx">
            <h2 id="s-rx" className="text-lg font-bold">
              1. Receita
            </h2>
            {plan && !findPrescription(data, plan.prescriptionId) && <Callout tone="warning">A receita original deste plano foi excluída. Escolha outra para continuar.</Callout>}
            {prescriptions.length === 0 ? (
              <Callout tone="info" title="Nenhuma receita cadastrada" action={<Link to="/receitas/nova" className="btn btn-secondary">Adicionar receita</Link>}>
                Para planejar a ida, adicione uma receita primeiro.
              </Callout>
            ) : (
              <SelectField id="pl-rx" label="Receita" value={prescriptionId} onChange={(e) => { setPrescriptionId(e.target.value); setErrors((x) => ({ ...x, prescription: undefined })); }} error={errors.prescription}>
                <option value="">Escolha uma receita</option>
                {prescriptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} · versão {currentVersionOf(p)?.number}
                  </option>
                ))}
              </SelectField>
            )}
            {preCheck && prescription && (
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill tone={statusTone(preCheck.status)}>{STATUS_COPY[preCheck.status].label}</StatusPill>
                <Link to={`/receitas/${prescription.id}`} className="rounded-lg px-1 py-2 text-sm font-semibold text-teal hover:underline">
                  Ver pré-conferência
                </Link>
              </div>
            )}
          </section>

          {/* 2. Unidade */}
          <section className="card card-pad" aria-labelledby="s-unit">
            <fieldset>
              <legend id="s-unit" className="mb-1 text-lg font-bold">
                2. Unidade
              </legend>
              <p className="mb-4 text-sm text-ink-soft">Disponibilidade informada em dados demonstrativos. Não representa reserva.</p>
              {errors.unit && (
                <p className="field-error mb-3">
                  <CircleAlert size={16} className="mt-0.5" aria-hidden /> {errors.unit}
                </p>
              )}
              <div className="space-y-2">
                {data.units.map((u, i) => {
                  const c = coverage(u, meds);
                  const head = unitHeadline(u, now);
                  return (
                    <label key={u.id} className={`flex cursor-pointer gap-3 rounded-2xl border p-4 transition-colors ${unitId === u.id ? 'border-teal bg-mint/40' : 'border-line hover:border-line-strong'}`}>
                      <input
                        id={`pl-unit-${i}`}
                        type="radio"
                        name="unit"
                        value={u.id}
                        checked={unitId === u.id}
                        onChange={() => selectUnit(u.id)}
                        className="mt-1 size-5 shrink-0 accent-teal"
                        aria-describedby={`pl-unit-desc-${i}`}
                      />
                      <span className="min-w-0 flex-1" id={`pl-unit-desc-${i}`}>
                        <span className="block font-semibold">{u.name}</span>
                        <span className="flex items-center gap-1 text-sm text-ink-soft">
                          <MapPin size={14} aria-hidden /> {u.region} · {u.code}
                        </span>
                        <span className="mt-2 flex flex-wrap gap-2">
                          {meds.length > 0 && <StatusPill tone={c.informed === c.total ? 'success' : c.informed ? 'warning' : 'neutral'}>{coverageText(c)}</StatusPill>}
                          {head.tone !== 'neutral' && <StatusPill tone={head.tone}>{head.text}</StatusPill>}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </section>

          {/* 3. Data */}
          <section className="card card-pad space-y-4" aria-labelledby="s-date">
            <h2 id="s-date" className="text-lg font-bold">
              3. Quando pretende ir
            </h2>
            <MaskedField id="pl-date" mask="date" label="Data pretendida" value={date} onValueChange={(v) => { setDate(v); setErrors((x) => ({ ...x, date: undefined })); }} error={errors.date ?? (dateResult && !dateResult.ok ? dateResult.error : undefined)} hint="Não escolhemos horário: confira o horário cadastrado da unidade." />
            <div role="group" aria-label="Sugestões de data" className="flex flex-wrap gap-2">
              {quickDates.map((d) => (
                <button key={d} type="button" onClick={() => { setDate(formatDate(d)); setErrors((x) => ({ ...x, date: undefined })); }} aria-pressed={date === formatDate(d)} className={`min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors ${date === formatDate(d) ? 'border-teal bg-teal text-white' : 'border-line-strong text-ink-soft hover:border-teal hover:text-ink'}`}>
                  {d === today ? 'Hoje' : d === addDays(today, 1) ? 'Amanhã' : weekdayShort(weekday(d))}, {formatDate(d).slice(0, 5)}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Coluna de avisos e checklist */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <section className="card card-pad" aria-labelledby="s-warn" aria-live="polite">
            <h2 id="s-warn" className="mb-3 text-lg font-bold">
              Avisos do plano
            </h2>
            {!unit || !dateResult?.ok ? (
              <p className="text-ink-soft">Escolha a unidade e a data para comparar com o prazo da receita e o calendário da unidade.</p>
            ) : (
              <div className="space-y-3">
                {docPending && preCheck && (
                  <p className="flex gap-2 text-[0.9375rem]">
                    <TriangleAlert size={18} className="mt-0.5 shrink-0 text-amber-ink" aria-hidden />
                    <span>Receita: {STATUS_COPY[preCheck.status].label.toLowerCase()}.</span>
                  </p>
                )}
                {warnings.map((w) => (
                  <p key={w.kind + w.text} className="flex gap-2 text-[0.9375rem]">
                    {w.requiresReview ? <TriangleAlert size={18} className="mt-0.5 shrink-0 text-amber-ink" aria-hidden /> : <Info size={18} className="mt-0.5 shrink-0 text-teal" aria-hidden />}
                    <span>{w.text}</span>
                  </p>
                ))}
                {!docPending && warnings.length === 0 && <p className="text-[0.9375rem] text-green-ink">Nenhum conflito com o prazo demonstrativo ou o calendário cadastrado.</p>}
                {willNeedReview && <Callout tone="warning">Você pode salvar mesmo assim: o plano ficará como “Precisa revisar”. Isso não impede você de ir à unidade.</Callout>}
                <p className="text-sm text-ink-soft">Disponibilidade futura não é calculada. Crie um lembrete para conferir de novo perto da ida.</p>
              </div>
            )}
          </section>

          <section className="card card-pad" aria-labelledby="s-check">
            <fieldset>
              <legend id="s-check" className="mb-1 text-lg font-bold">
                Checklist de preparação
              </legend>
              <p className="mb-3 text-sm text-ink-soft">Marque só o que você já verificou.</p>
              <ul className="space-y-2">
                {keys.map((key) => (
                  <li key={key}>
                    <label className="flex cursor-pointer gap-3 rounded-2xl border border-line p-3 hover:border-line-strong">
                      <input type="checkbox" className="checkbox mt-0.5" checked={checked.includes(key)} onChange={() => toggle(key)} />
                      <span>
                        <span className="block font-medium">{CHECKLIST_LABEL[key].label}</span>
                        <span className="block text-sm text-ink-soft">{CHECKLIST_LABEL[key].hint}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          </section>

          <div className="flex flex-col gap-2">
            <Button type="submit" block disabled={prescriptions.length === 0} title={prescriptions.length === 0 ? 'Adicione uma receita para planejar' : undefined}>
              {plan ? 'Salvar alterações' : 'Salvar plano'}
            </Button>
            <Link to={plan ? `/planos/${plan.id}` : '/'} className="btn btn-ghost">
              Cancelar
            </Link>
          </div>
        </aside>
      </form>
      {blocker}
    </div>
  );
}
