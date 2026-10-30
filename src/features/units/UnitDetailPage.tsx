import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, MapPin, Package, Stethoscope } from 'lucide-react';
import { LinkButton } from '../../components/ui/Button';
import { Callout, DefinitionList, PageHeader, StatusPill } from '../../components/ui/Display';
import { SelectField } from '../../components/ui/Field';
import { NotFound } from '../../components/layout/NotFound';
import { useStore } from '../../state/AppStore';
import { findUnit } from '../../state/selectors';
import { currentVersionOf } from '../../domain/rules/planRules';
import { AVAILABILITY_LABEL, conditionOn, conditionText, coverageText, coverage, isStale, scheduleText, unitHeadline } from '../../domain/rules/unitRules';
import { PHARMACIST_LABEL } from '../../domain/labels';
import { datePart, formatDate, formatDateTime, weekday, weekdayName } from '../../domain/time';
import { MEDICATION_CATALOG } from '../../data/fixtures/catalog';
import { CoverageList } from './UnitParts';
import { useSelectedPrescription } from './UnitsPage';

const DAYS = [1, 2, 3, 4, 5, 6, 0] as const;

export function UnitDetailPage() {
  const { id } = useParams();
  const { data } = useStore();
  const [params, setParams] = useSearchParams();
  const { options, prescription, value } = useSelectedPrescription();
  const unit = findUnit(data, id);
  if (!unit) return <NotFound what="unidade" />;

  const today = datePart(data.clock);
  const head = unitHeadline(unit, data.clock);
  const todayCondition = conditionOn(unit, today);
  const version = currentVersionOf(prescription);
  const meds = (version?.confirmed ?? version?.extracted)?.medications ?? [];
  const otherItems = MEDICATION_CATALOG.filter((m) => !meds.some((x) => x.code === m.code));

  return (
    <div>
      <PageHeader
        back={
          <Link to={`/unidades${prescription ? `?receita=${prescription.id}` : ''}`} className="btn btn-ghost -ml-3 min-h-11 px-3">
            <ArrowLeft size={18} aria-hidden /> Unidades
          </Link>
        }
        eyebrow={`${unit.code} · unidade fictícia`}
        title={unit.name}
        description={
          <span className="flex items-center gap-1.5">
            <MapPin size={17} aria-hidden /> {unit.region} · {unit.address}
          </span>
        }
        actions={
          prescription ? (
            <LinkButton to={`/planos/novo?receita=${prescription.id}&unidade=${unit.id}`}>Escolher esta unidade para o plano</LinkButton>
          ) : undefined
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <StatusPill tone={head.tone}>{head.text}</StatusPill>
        {isStale(unit, data.clock) && <StatusPill tone="warning">Informação desatualizada</StatusPill>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-8">
        <div className="space-y-6">
          <section className="card card-pad" aria-labelledby="avail-title">
            <h2 id="avail-title" className="mb-1 flex items-center gap-2 text-lg font-bold">
              <Package size={20} className="text-teal" aria-hidden /> Disponibilidade informada
            </h2>
            <p className="mb-4 text-sm text-ink-soft">Atualizada em {formatDateTime(unit.updatedAt)} · Dados demonstrativos. Não representa reserva.</p>
            <div className="mb-4 max-w-sm">
              <SelectField
                label="Cruzar com a receita"
                value={value}
                onChange={(e) => {
                  const next = new URLSearchParams(params);
                  next.set('receita', e.target.value);
                  setParams(next, { replace: true });
                }}
              >
                <option value="nenhuma">Não cruzar com receita</option>
                {options.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </SelectField>
            </div>
            {meds.length > 0 && (
              <div className="rounded-2xl bg-canvas p-4">
                <p className="mb-3 font-semibold">{coverageText(coverage(unit, meds))}</p>
                <CoverageList unit={unit} medications={meds} />
              </div>
            )}
            {coverage(unit, meds).items.some((i) => i.availability !== 'informed_available') && (
              <div className="mt-4">
                <Callout tone="warning" title="Itens que precisam de verificação">
                  A falta de informação sobre um item não impede a consulta dos demais. Confirme na unidade e, em caso de dúvida sobre o tratamento, fale com quem prescreveu. Não interrompa o uso por conta desta consulta.
                </Callout>
              </div>
            )}
            {otherItems.length > 0 && (
              <details className="group mt-4 rounded-2xl border border-line">
                <summary className="flex min-h-12 cursor-pointer list-none items-center px-4 font-semibold">Outros itens demonstrativos desta unidade</summary>
                <ul className="space-y-1 border-t border-line px-4 py-3 text-[0.9375rem]">
                  {otherItems.map((m) => {
                    const s = unit.stock.find((x) => x.code === m.code)?.status ?? 'not_informed';
                    return (
                      <li key={m.code}>
                        {m.name} {m.strength} · <span className="text-ink-soft">{AVAILABILITY_LABEL[s]}</span>
                      </li>
                    );
                  })}
                </ul>
              </details>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card card-pad" aria-labelledby="hours-title">
            <h2 id="hours-title" className="mb-1 flex items-center gap-2 text-lg font-bold">
              <CalendarDays size={20} className="text-teal" aria-hidden /> Horários cadastrados
            </h2>
            <p className="mb-3 text-sm text-ink-soft">Horário cadastrado não confirma funcionamento no momento.</p>
            {unit.exception.kind !== 'none' && (
              <div className="mb-3">
                <Callout tone={unit.exception.kind === 'suspended' ? 'danger' : 'warning'} title={unit.exception.kind === 'suspended' ? 'Suspensão temporária informada' : 'Condição não confirmada'}>
                  {unit.exception.message}
                  {unit.exception.from && ` · de ${formatDate(unit.exception.from)}`}
                  {unit.exception.until && ` até ${formatDate(unit.exception.until)}`}
                </Callout>
              </div>
            )}
            <ul className="divide-y divide-line">
              {DAYS.map((d) => {
                const s = unit.schedule[d];
                const isToday = weekday(today) === d;
                return (
                  <li key={d} className={`flex items-center justify-between gap-3 py-2.5 ${isToday ? 'font-semibold' : ''}`}>
                    <span className="capitalize">
                      {weekdayName(d)}
                      {isToday && <span className="ml-2 rounded-full bg-mint px-2 py-0.5 text-xs text-mint-ink">hoje</span>}
                    </span>
                    <span className={`text-right text-[0.9375rem] ${s ? '' : 'text-ink-soft'}`}>{s ? scheduleText(s) : 'Sem atendimento'}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-sm text-ink-soft">Hoje: {conditionText(todayCondition)}.</p>
          </section>

          <section className="card card-pad" aria-labelledby="info-title">
            <h2 id="info-title" className="mb-1 flex items-center gap-2 text-lg font-bold">
              <Stethoscope size={20} className="text-teal" aria-hidden /> Informações
            </h2>
            <DefinitionList
              items={[
                { term: 'Identificador', detail: unit.code },
                { term: 'Região', detail: unit.region },
                { term: 'Endereço', detail: unit.address },
                { term: 'Atendimento farmacêutico', detail: PHARMACIST_LABEL[unit.pharmacist] },
                { term: 'Fonte', detail: `Dados demonstrativos · ${formatDateTime(unit.updatedAt)}` },
              ]}
            />
          </section>
        </aside>
      </div>
    </div>
  );
}
