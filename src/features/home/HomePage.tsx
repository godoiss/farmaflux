import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, ArrowUpRight, BellRing, CalendarDays, Check, ChevronDown, ChevronRight, FileText, ListChecks, Plus, ShieldCheck } from 'lucide-react';
import { LinkButton } from '../../components/ui/Button';
import { StatusPill } from '../../components/ui/Display';
import { useStore } from '../../state/AppStore';
import { activePerson, preCheckOf, prescriptionsOfActive, reminderBuckets } from '../../state/selectors';
import { STATUS_COPY } from '../../domain/rules/preCheck';
import { formatDateTime, datePart, weekday, weekdayName } from '../../domain/time';
import { ContextSwitch } from '../profile/ContextSwitch';
import { computeJourney } from './journey';

export function HomePage() {
  const { data } = useStore();
  const person = activePerson(data);
  const journey = computeJourney(data);
  const prescriptions = prescriptionsOfActive(data);
  const withIssues = prescriptions.filter((p) => preCheckOf(data, p)?.status !== 'no_issues').length;
  const reminders = reminderBuckets(data);
  const nextReminder = reminders.overdue[0] ?? reminders.upcoming[0];
  const completed = journey.stages.filter((stage) => stage.state === 'done').length;
  const checkTarget = journey.prescription
    ? journey.preCheck?.status === 'awaiting_review'
      ? `/receitas/${journey.prescription.id}/conferir`
      : `/receitas/${journey.prescription.id}`
    : '/receitas/nova';

  return (
    <div className="home-page">
      <header className="home-heading">
        <div>
          <p className="eyebrow">Seu espaço de cuidado</p>
          <h1 id="home-title" tabIndex={-1}>Olá, {data.profile.displayName}<span className="text-teal">.</span></h1>
          <p>Vamos deixar sua próxima ida à UBS mais tranquila.</p>
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

      <div className="home-feature-grid">
        <section className="care-hero" aria-labelledby="hero-title">
          <div className="flow-art" aria-hidden="true">
            <svg viewBox="0 0 380 380" fill="none">
              <circle cx="265" cy="180" r="145" /><circle cx="265" cy="180" r="110" /><circle cx="265" cy="180" r="75" />
              <path d="M-20 330C80 330 90 180 195 180H400" /><path d="M-20 295C70 295 90 145 195 145H400" />
              <path d="M-20 365C90 365 100 215 195 215H400" />
              <circle className="flow-dot" cx="195" cy="145" r="5" /><circle className="flow-dot" cx="265" cy="255" r="4" />
            </svg>
          </div>
          <div className="care-hero-content">
            <p className="hero-kicker"><span /> Um passo de cada vez</p>
            <h2 id="hero-title">Sua próxima retirada<br />começa aqui.</h2>
            <p className="hero-description">Confira sua receita e organize tudo o que precisa antes de sair de casa.</p>
            <div className="hero-actions">
              <LinkButton to={checkTarget} className="hero-primary" iconRight={<ArrowRight size={18} aria-hidden />}>Ver minha receita</LinkButton>
              <Link to="/unidades" className="hero-secondary">Ver unidades <ArrowUpRight size={17} aria-hidden /></Link>
            </div>
          </div>
        </section>

        <section className="next-step" aria-labelledby="next-title">
          <div className="section-topline"><p className="eyebrow">Próximo passo</p><span className="step-marker" aria-hidden><ArrowDown size={17} /></span></div>
          <div className="next-step-body">
            <h2 id="next-title">{journey.next.title}</h2>
            <StatusPill tone={journey.next.tone}>{journey.next.status}</StatusPill>
            <p className="next-description">{journey.next.description}</p>
          </div>
          <Link to={journey.next.cta.to} className="next-action">{journey.next.cta.label}<ArrowRight size={18} aria-hidden /></Link>
        </section>
      </div>

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

      <div className="home-details-grid">
        <section className="overview-section prescriptions-overview" aria-labelledby="rx-summary">
          <div className="section-topline">
            <h2 id="rx-summary" className="section-heading"><span className="overview-icon"><FileText size={19} strokeWidth={1.7} aria-hidden /></span>Suas receitas <span className="count-badge">{prescriptions.length}</span></h2>
            <Link to="/receitas" className="text-link">Ver todas <ArrowUpRight size={16} aria-hidden /></Link>
          </div>
          <p className="section-caption">{withIssues === 0 ? (prescriptions.length ? 'Tudo em ordem com a pré-conferência documental.' : 'Adicione sua primeira receita para começar.') : `${withIssues} receita${withIssues === 1 ? ' precisa' : 's precisam'} da sua atenção.`}</p>
          <ul className="prescription-list">
            {prescriptions.slice(0, 3).map((p) => {
              const pc = preCheckOf(data, p);
              return (
                <li key={p.id}>
                  <Link to={`/receitas/${p.id}`} className="prescription-row">
                    <span className="document-icon"><FileText size={21} strokeWidth={1.5} aria-hidden /></span>
                    <span className="min-w-0 flex-1"><span className="block font-semibold">{p.title}</span>{pc && <span className="mt-1 block text-sm text-ink-soft">{STATUS_COPY[pc.status].label}</span>}</span>
                    <ChevronRight size={18} className="shrink-0 text-ink-faint" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link to="/receitas/nova" className="add-prescription"><Plus size={17} aria-hidden /> Adicionar receita</Link>
        </section>

        <section className="overview-section reminder-overview" aria-labelledby="rem-summary">
          <div className="section-topline">
            <h2 id="rem-summary" className="section-heading"><span className="overview-icon"><BellRing size={19} strokeWidth={1.7} aria-hidden /></span>Lembretes</h2>
            <Link to="/lembretes" className="text-link">Abrir <ArrowUpRight size={16} aria-hidden /></Link>
          </div>
          <div className="reminder-numbers">
            <div><strong>{reminders.upcoming.length}</strong><span>próximo{reminders.upcoming.length === 1 ? '' : 's'}</span></div>
            {reminders.overdue.length > 0
              ? <div className="has-overdue"><strong>{reminders.overdue.length}</strong><span>vencido{reminders.overdue.length === 1 ? '' : 's'}</span></div>
              : <p className="reminder-clear"><Check size={15} aria-hidden /> Nenhum vencido</p>}
          </div>
          {nextReminder ? (
            <Link to={`/lembretes?lembrete=${nextReminder.id}`} className="reminder-item">
              <span className="min-w-0"><span className="block font-medium">{nextReminder.title}</span><span className="mt-1 block text-xs text-ink-soft">{formatDateTime(nextReminder.dueAt)}</span></span>
              <ArrowRight size={18} className="shrink-0" aria-hidden />
            </Link>
          ) : <p className="reminder-empty"><Check size={17} aria-hidden /> Nenhum lembrete pendente. Tudo tranquilo.</p>}
        </section>
      </div>

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
