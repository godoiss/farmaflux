import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, BellRing, CalendarDays, Check, ChevronDown, FileText, ListChecks, Pill, Plus, ShieldCheck } from 'lucide-react';
import { LinkButton } from '../../components/ui/Button';
import { StatusPill } from '../../components/ui/Display';
import { useStore } from '../../state/AppStore';
import { activePerson, prescriptionsOfActive, reminderBuckets } from '../../state/selectors';
import { currentVersionOf } from '../../domain/rules/planRules';
import { formatDateTime, datePart, weekday, weekdayName } from '../../domain/time';
import { ContextSwitch } from '../profile/ContextSwitch';
import { computeJourney } from './journey';

export function HomePage() {
  const { data } = useStore();
  const person = activePerson(data);
  const journey = computeJourney(data);
  const prescriptions = prescriptionsOfActive(data);
  const reminders = reminderBuckets(data);
  const nextReminder = reminders.overdue[0] ?? reminders.upcoming[0];
  const completed = journey.stages.filter((stage) => stage.state === 'done').length;

  const mainRx = journey.prescription ?? prescriptions[0] ?? null;
  const mainVer = mainRx ? currentVersionOf(mainRx) : null;
  const meds = mainVer ? (mainVer.confirmed ?? mainVer.extracted).medications : [];
  const checkTarget = journey.prescription
    ? journey.preCheck?.status === 'awaiting_review'
      ? `/receitas/${journey.prescription.id}/conferir`
      : `/receitas/${journey.prescription.id}`
    : '/receitas/nova';

  const avisoMeta = reminders.overdue.length
    ? `${reminders.overdue.length} vencido${reminders.overdue.length === 1 ? '' : 's'}`
    : reminders.upcoming.length
      ? `${reminders.upcoming.length} próximo${reminders.upcoming.length === 1 ? '' : 's'}`
      : 'Nenhum pendente';

  return (
    <div className="home-page">
      <header className="home-heading">
        <div>
          <p className="eyebrow">Seu espaço de cuidado</p>
          <h1 id="home-title" tabIndex={-1}>Olá, {data.profile.displayName}<span className="text-teal">.</span></h1>
          <p>Acesse sua receita e suas informações de saúde com facilidade.</p>
        </div>
        <div className="home-date">
          <CalendarDays size={18} aria-hidden />
          <div><span>{weekdayName(weekday(datePart(data.clock)))}</span><small>{formatDateTime(data.clock)} · demo</small></div>
        </div>
      </header>

      <section className="care-context" aria-label="Pessoa dos registros">
        <div className="flex min-w-0 items-center gap-3">
          <span className="person-avatar" aria-hidden>{person.name.replace(/^Dona\s+/i, '').charAt(0)}</span>
          <p><span className="block text-xs text-ink-soft">Organizando o cuidado de</span><strong className="font-semibold">{person.name}</strong></p>
        </div>
        <ContextSwitch label="Esta organização é" />
      </section>

      {/* Prioridade 1 — a receita médica */}
      <section className="rx-hero" aria-labelledby="rx-hero-title">
        <div className="rx-hero-head">
          <span className="rx-ico" aria-hidden><FileText size={26} strokeWidth={1.8} /></span>
          <div className="min-w-0 flex-1">
            <h2 id="rx-hero-title">Sua receita médica</h2>
            <p>Consulte sua receita e as orientações prescritas.</p>
          </div>
          {prescriptions.length > 0 && (
            <Link to="/receitas" className="rx-seeall">Ver todas <ArrowUpRight size={15} aria-hidden /></Link>
          )}
        </div>

        <div className="rx-card">
          {mainRx ? (
            <>
              <h3>{mainRx.title}</h3>
              <p className="rx-sub">{journey.next.description}</p>
              <div className="rx-status">
                <StatusPill tone={journey.next.tone}>{journey.next.status}</StatusPill>
              </div>
              <LinkButton to={checkTarget} variant="primary" block className="rx-cta" iconRight={<ArrowRight size={20} aria-hidden />}>
                Verificar a sua receita
              </LinkButton>
            </>
          ) : (
            <>
              <h3>Nenhuma receita por aqui ainda</h3>
              <p className="rx-sub">Adicione sua receita para conferir e preparar a retirada.</p>
              <LinkButton to="/receitas/nova" variant="primary" block className="rx-cta" icon={<Plus size={20} aria-hidden />}>
                Adicionar receita
              </LinkButton>
            </>
          )}
        </div>
      </section>

      {/* Prioridade 2 e 5 — medicamentos e avisos */}
      <div className="home-tiles">
        <Link to={mainRx ? checkTarget : '/receitas/nova'} className="home-tile">
          <span className="tile-ico" aria-hidden><Pill size={22} strokeWidth={1.8} /></span>
          <h3>Medicamentos</h3>
          <p>Ver informações prescritas</p>
          <span className="tile-meta">
            {meds.length ? `${meds.length} medicamento${meds.length === 1 ? '' : 's'}` : 'Nenhum cadastrado'}
            <ArrowRight size={16} aria-hidden />
          </span>
        </Link>

        <Link to="/lembretes" className="home-tile">
          <span className="tile-ico" aria-hidden><BellRing size={22} strokeWidth={1.8} /></span>
          <h3>Avisos</h3>
          <p>Ver lembretes importantes</p>
          <span className="tile-meta">{avisoMeta}<ArrowRight size={16} aria-hidden /></span>
        </Link>
      </div>

      {nextReminder && (
        <Link to={`/lembretes?lembrete=${nextReminder.id}`} className="rx-next-reminder">
          <BellRing size={18} className="shrink-0 text-teal" aria-hidden />
          <span className="min-w-0 flex-1"><strong className="block font-semibold">{nextReminder.title}</strong><span className="block text-sm text-ink-soft">{formatDateTime(nextReminder.dueAt)}</span></span>
          <ArrowRight size={18} className="shrink-0 text-ink-faint" aria-hidden />
        </Link>
      )}

      {/* Secundário — jornada, plano e aviso legal */}
      <details className="journey-section">
        <summary className="journey-summary">
          <h2 id="journey-title" className="section-heading">Sua jornada de cuidado</h2>
          <span className="journey-summary-meta">
            <span className="journey-count"><strong>{completed}</strong> de 4 etapas concluídas</span>
            <span className="journey-toggle"><span className="when-closed">Ver etapas</span><span className="when-open">Recolher</span><ChevronDown size={16} aria-hidden /></span>
          </span>
        </summary>
        <ol className="journey-track">
          {journey.stages.map((stage, i) => (
            <li key={stage.label} className={`journey-stage is-${stage.state}`} aria-current={stage.state === 'current' ? 'step' : undefined}>
              <div className="journey-node" aria-hidden>{stage.state === 'done' ? <Check size={17} /> : String(i + 1).padStart(2, '0')}</div>
              <h3>{stage.label}</h3>
              <p><span className="sr-only">{stage.state === 'done' ? 'Concluído: ' : stage.state === 'current' ? 'Etapa atual: ' : 'A fazer: '}</span>{stage.detail}</p>
            </li>
          ))}
        </ol>
      </details>

      {journey.plan && (
        <section className="plan-overview" aria-labelledby="plan-summary">
          <ListChecks size={22} className="text-teal" aria-hidden />
          <div className="flex-1"><h2 id="plan-summary" className="font-semibold">Seu plano de ida</h2><p className="text-sm text-ink-soft">{journey.plan.unit?.name ?? 'Unidade'} · {journey.plan.evaluation?.checklistDone ?? 0} de {journey.plan.plan.checklist.length} itens do checklist</p></div>
          <LinkButton to={`/planos/${journey.plan.plan.id}`} variant="secondary" iconRight={<ArrowUpRight size={17} aria-hidden />}>Ver plano</LinkButton>
        </section>
      )}

      <footer className="home-note">
        <ShieldCheck size={19} className="shrink-0 text-teal" aria-hidden />
        <p>O FarmaFlux organiza a pré-conferência e a ida à UBS. Não aprova receitas, reserva medicamentos ou cria agendamentos. A avaliação final é do farmacêutico. <Link to="/ajuda">Saiba mais <ArrowUpRight size={12} aria-hidden /></Link></p>
      </footer>
    </div>
  );
}
