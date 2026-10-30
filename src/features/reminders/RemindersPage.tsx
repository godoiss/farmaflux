import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BellRing, CalendarPlus, Check, ChevronRight, ListChecks, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Button, LinkButton } from '../../components/ui/Button';
import { Callout, EmptyState, PageHeader, StatusPill } from '../../components/ui/Display';
import { ConfirmDialog } from '../../components/ui/Dialog';
import { useStore } from '../../state/AppStore';
import { useAnnounce } from '../../state/Announcer';
import { activePerson, findPlan, findPrescription, findUnit, planView, plansOfActive, reminderBuckets } from '../../state/selectors';
import { PLAN_STATUS_LABEL } from '../../domain/rules/planRules';
import { REMINDER_TYPE_LABEL } from '../../domain/labels';
import { buildReminderIcs, icsFileName } from '../../domain/ics';
import { formatDate, formatDateTime } from '../../domain/time';
import type { Reminder } from '../../domain/types';
import { downloadText } from '../../lib/files';
import { ReminderDialog } from './ReminderDialog';

type Tab = 'lembretes' | 'planos';

export function RemindersPage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('aba') === 'planos' ? 'planos' : 'lembretes';
  const setTab = (t: Tab) => setParams(t === 'planos' ? { aba: 'planos' } : {});

  return (
    <div>
      <PageHeader
        eyebrow="Organização da próxima ida"
        title="Lembretes e planos"
        description="Lembretes pessoais e planos de ida da pessoa selecionada."
      />
      <div role="tablist" aria-label="Seções" className="segmented mb-6">
        <button type="button" role="tab" id="tab-lembretes" aria-selected={tab === 'lembretes'} aria-controls="panel" onClick={() => setTab('lembretes')}>
          Lembretes
        </button>
        <button type="button" role="tab" id="tab-planos" aria-selected={tab === 'planos'} aria-controls="panel" onClick={() => setTab('planos')}>
          Planos de ida
        </button>
      </div>
      <div id="panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'lembretes' ? <RemindersPanel /> : <PlansPanel />}
      </div>
    </div>
  );
}

function RemindersPanel() {
  const { data, dispatch } = useStore();
  const announce = useAnnounce();
  const [params] = useSearchParams();
  const highlight = params.get('lembrete');
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Reminder | null>(null);
  const buckets = reminderBuckets(data);
  const person = activePerson(data);
  const total = buckets.overdue.length + buckets.upcoming.length + buckets.done.length;
  const highlightMissing = highlight && !data.reminders.some((r) => r.id === highlight);

  useEffect(() => {
    if (!highlight) return;
    const el = document.getElementById(`rem-${highlight}`);
    if (el) {
      el.scrollIntoView({ block: 'center' });
      el.focus({ preventScroll: true });
    }
  }, [highlight]);

  const downloadIcs = (r: Reminder) => {
    const linkDetails = r.link?.kind === 'plan' ? planDetails(r.link.id) : r.link?.kind === 'prescription' ? `Receita: ${findPrescription(data, r.link.id)?.title ?? ''}` : null;
    const ics = buildReminderIcs(r, { personName: person.name, details: linkDetails, stamp: data.clock });
    downloadText(ics, icsFileName(r), 'text/calendar;charset=utf-8');
    announce(`Arquivo de calendário baixado: ${icsFileName(r)}.`);
  };

  const planDetails = (planId: string) => {
    const p = findPlan(data, planId);
    const u = p && findUnit(data, p.unitId);
    return p && u ? `Plano de ida: ${u.name}, ${u.address}. Data pretendida ${formatDate(p.intendedDate)}.` : null;
  };

  const linkLabel = (r: Reminder) => {
    if (!r.link) return null;
    if (r.link.kind === 'plan') {
      const p = findPlan(data, r.link.id);
      return p ? { to: `/planos/${p.id}`, text: `Plano: ${findUnit(data, p.unitId)?.name ?? 'unidade'} · ${formatDate(p.intendedDate)}` } : { to: null, text: 'Plano vinculado não existe mais' };
    }
    const rx = findPrescription(data, r.link.id);
    return rx ? { to: `/receitas/${rx.id}`, text: `Receita: ${rx.title}` } : { to: null, text: 'Receita vinculada foi excluída' };
  };

  const renderGroup = (title: string, list: Reminder[], state: 'overdue' | 'upcoming' | 'done') =>
    list.length > 0 && (
      <section aria-labelledby={`g-${state}`} className="space-y-3">
        <h2 id={`g-${state}`} className="flex items-center gap-2 text-lg font-bold">
          {title} <span className="rounded-full bg-neutral-bg px-2.5 py-0.5 text-sm font-semibold text-ink-soft">{list.length}</span>
        </h2>
        <ul className="space-y-3">
          {list.map((r) => {
            const link = linkLabel(r);
            return (
              <li
                key={r.id}
                id={`rem-${r.id}`}
                tabIndex={-1}
                className={`card card-pad outline-none transition-shadow ${highlight === r.id ? 'ring-2 ring-teal' : ''} ${state === 'done' ? 'opacity-80' : ''}`}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <StatusPill tone={state === 'overdue' ? 'warning' : state === 'done' ? 'success' : 'info'}>
                        {state === 'overdue' ? 'Vencido' : state === 'done' ? 'Concluído' : 'Próximo'}
                      </StatusPill>
                      <span className="text-sm text-ink-soft">{REMINDER_TYPE_LABEL[r.type]}</span>
                    </div>
                    <p className={`text-lg font-semibold ${state === 'done' ? 'line-through decoration-ink-faint' : ''}`}>{r.title}</p>
                    <p className="text-ink-soft">{formatDateTime(r.dueAt)}</p>
                    {link &&
                      (link.to ? (
                        <Link to={link.to} className="mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-teal hover:underline">
                          {link.text} <ChevronRight size={15} aria-hidden />
                        </Link>
                      ) : (
                        <p className="mt-1 text-sm text-ink-soft">{link.text}</p>
                      ))}
                  </div>
                  <div className="flex flex-wrap gap-2 md:max-w-xs md:justify-end">
                    <Button
                      variant={state === 'done' ? 'ghost' : 'soft'}
                      className="px-4 text-sm"
                      icon={state === 'done' ? <RotateCcw size={16} aria-hidden /> : <Check size={16} aria-hidden />}
                      onClick={() => {
                        dispatch({ type: 'reminder/toggleDone', id: r.id });
                        announce(state === 'done' ? 'Lembrete reaberto.' : 'Lembrete concluído.');
                      }}
                    >
                      {state === 'done' ? 'Reabrir' : 'Concluir'}
                    </Button>
                    <Button variant="ghost" className="px-4 text-sm" icon={<Pencil size={16} aria-hidden />} onClick={() => setEditing(r)} aria-label={`Editar lembrete ${r.title}`}>
                      Editar
                    </Button>
                    <Button variant="ghost" className="px-4 text-sm" icon={<CalendarPlus size={16} aria-hidden />} onClick={() => downloadIcs(r)} aria-label={`Adicionar ao calendário: ${r.title}`}>
                      Adicionar ao calendário
                    </Button>
                    <Button variant="danger-ghost" className="px-4 text-sm" icon={<Trash2 size={16} aria-hidden />} onClick={() => setDeleting(r)} aria-label={`Excluir lembrete ${r.title}`}>
                      Excluir
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-[0.9375rem] text-ink-soft">
          Os lembretes são acompanhados apenas com o FarmaFlux aberto. Não enviamos WhatsApp, SMS nem notificações com o app fechado.
        </p>
        <Button icon={<Plus size={18} aria-hidden />} onClick={() => setCreating(true)}>
          Novo lembrete
        </Button>
      </div>

      {highlightMissing && <Callout tone="warning">O lembrete aberto pela notificação foi excluído.</Callout>}

      {total === 0 ? (
        <EmptyState icon={<BellRing size={26} aria-hidden />} title="Nenhum lembrete pessoal" action={<Button onClick={() => setCreating(true)}>Criar lembrete</Button>}>
          Crie um aviso para conferir a unidade antes da ida ou revisar o prazo da receita.
        </EmptyState>
      ) : (
        <>
          {renderGroup('Vencidos', buckets.overdue, 'overdue')}
          {renderGroup('Próximos', buckets.upcoming, 'upcoming')}
          {renderGroup('Concluídos', buckets.done, 'done')}
        </>
      )}

      <ReminderDialog open={creating || editing !== null} reminder={editing} onClose={() => { setCreating(false); setEditing(null); }} />
      <ConfirmDialog
        open={deleting !== null}
        title="Excluir este lembrete?"
        description={deleting ? `“${deleting.title}” será removido. Notificações já emitidas continuam no histórico, indicando que o lembrete foi excluído.` : ''}
        confirmLabel="Excluir"
        variant="danger"
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) dispatch({ type: 'reminder/delete', id: deleting.id });
          setDeleting(null);
          announce('Lembrete excluído.');
        }}
      />
    </div>
  );
}

function PlansPanel() {
  const { data } = useStore();
  const plans = [...plansOfActive(data)].sort((a, b) => Number(Boolean(a.cancelledAt)) - Number(Boolean(b.cancelledAt)) || a.intendedDate.localeCompare(b.intendedDate));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-[0.9375rem] text-ink-soft">Cada plano guarda a receita, a versão, a unidade e a data em que você pretende ir.</p>
        <LinkButton to="/planos/novo" icon={<Plus size={18} aria-hidden />}>
          Planejar minha ida
        </LinkButton>
      </div>
      {plans.length === 0 ? (
        <EmptyState icon={<ListChecks size={26} aria-hidden />} title="Nenhum plano de ida" action={<LinkButton to="/planos/novo">Planejar minha ida</LinkButton>}>
          Escolha a receita, a unidade e a data pretendida.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {plans.map((p) => {
            const v = planView(data, p);
            const status = v.evaluation?.status ?? 'needs_review';
            return (
              <li key={p.id}>
                <Link to={`/planos/${p.id}`} className={`card card-link card-pad flex h-full flex-col gap-3 ${status === 'cancelled' ? 'opacity-75' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-bold">{v.unit?.name ?? 'Unidade'}</p>
                      <p className="text-sm text-ink-soft">
                        {v.prescription?.title ?? p.prescriptionTitle} · versão {p.prescriptionVersionNumber}
                      </p>
                    </div>
                    <ChevronRight size={20} className="mt-1 shrink-0 text-ink-faint" aria-hidden />
                  </div>
                  <StatusPill className="self-start" tone={status === 'saved' ? 'success' : status === 'cancelled' ? 'neutral' : 'warning'}>
                    {PLAN_STATUS_LABEL[status]}
                  </StatusPill>
                  <p className="text-[0.9375rem]">Ida pretendida: {formatDate(p.intendedDate)}</p>
                  <p className="mt-auto text-sm text-ink-soft">
                    Checklist: {v.evaluation?.checklistDone ?? 0} de {p.checklist.length}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
