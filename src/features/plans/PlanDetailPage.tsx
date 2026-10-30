import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BellPlus, Ban, CircleCheck, Copy, Info, Pencil, Printer, TriangleAlert } from 'lucide-react';
import { Button, LinkButton } from '../../components/ui/Button';
import { Callout, DefinitionList, PageHeader, StatusPill } from '../../components/ui/Display';
import { ConfirmDialog, Dialog } from '../../components/ui/Dialog';
import { NotFound } from '../../components/layout/NotFound';
import { LogoMark } from '../../components/brand/Logo';
import { useStore } from '../../state/AppStore';
import { useAnnounce } from '../../state/Announcer';
import { findPlan, personName, planView } from '../../state/selectors';
import { PLAN_STATUS_LABEL } from '../../domain/rules/planRules';
import { conditionOn, conditionText } from '../../domain/rules/unitRules';
import { suggestCheckDue } from '../../domain/rules/reminderRules';
import { CHECKLIST_LABEL, REMINDER_TYPE_LABEL } from '../../domain/labels';
import { formatDate, formatDateTime, weekday, weekdayName } from '../../domain/time';
import { copyText } from '../../lib/files';
import { OwnerGuard } from '../prescriptions/OwnerGuard';
import { ReminderDialog, type ReminderDefaults } from '../reminders/ReminderDialog';
import { buildPlanSummary } from './planSummary';

export function PlanDetailPage() {
  const { id } = useParams();
  const { data, dispatch } = useStore();
  const announce = useAnnounce();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [manualCopy, setManualCopy] = useState<string | null>(null);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [copying, setCopying] = useState(false);
  const manualRef = useRef<HTMLTextAreaElement>(null);

  const plan = findPlan(data, id);
  if (!plan) return <NotFound what="plano" />;
  const { unit, prescription, evaluation } = planView(data, plan);
  if (!unit || !evaluation) return <NotFound what="plano" />;

  const owner = personName(data, plan.personId);
  const status = evaluation.status;
  const cancelled = status === 'cancelled';
  const rxTitle = prescription?.title ?? plan.prescriptionTitle;
  const summary = buildPlanSummary({ plan, unit, evaluation, personName: owner, prescriptionTitle: rxTitle, now: data.clock });
  const linkedReminders = data.reminders.filter((r) => r.link?.kind === 'plan' && r.link.id === plan.id);
  const reminderDefaults: ReminderDefaults = {
    type: 'check_unit',
    title: `Conferir ${unit.name} antes da ida`,
    dueAt: suggestCheckDue(plan.intendedDate, data.clock),
    link: { kind: 'plan', id: plan.id },
  };

  const copy = async () => {
    setCopying(true);
    const ok = await copyText(summary);
    setCopying(false);
    if (ok) announce('Resumo copiado para a área de transferência.');
    else {
      announce('Não foi possível copiar automaticamente. Selecione o texto para copiar.', 'error');
      setManualCopy(summary);
    }
  };

  const tone = status === 'saved' ? 'success' : status === 'cancelled' ? 'neutral' : 'warning';

  return (
    <OwnerGuard ownerId={plan.personId}>
      <div className="no-print">
        <PageHeader
          back={
            <Link to="/lembretes?aba=planos" className="btn btn-ghost -ml-3 min-h-11 px-3">
              <ArrowLeft size={18} aria-hidden /> Planos de ida
            </Link>
          }
          eyebrow={`Plano de ida · atualizado em ${formatDateTime(plan.updatedAt)}`}
          title={cancelled ? 'Plano cancelado' : status === 'saved' ? 'Plano salvo' : 'Plano salvo · Precisa revisar'}
          description={`${owner} · ${unit.name} · ${formatDate(plan.intendedDate)}`}
          actions={
            !cancelled && (
              <>
                <LinkButton to={`/planos/${plan.id}/editar`} variant="secondary" icon={<Pencil size={18} aria-hidden />}>
                  Editar
                </LinkButton>
                <Button variant="secondary" icon={<Printer size={18} aria-hidden />} onClick={() => window.print()}>
                  Imprimir plano
                </Button>
                <Button variant="secondary" icon={<Copy size={18} aria-hidden />} onClick={() => void copy()} loading={copying} loadingLabel="Copiando…">
                  Copiar resumo
                </Button>
              </>
            )
          }
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-8">
          <div className="space-y-6">
            <section className="card card-pad" aria-labelledby="sum-title">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <h2 id="sum-title" className="text-lg font-bold">
                  Resumo
                </h2>
                <StatusPill tone={tone}>{PLAN_STATUS_LABEL[status]}</StatusPill>
              </div>
              <DefinitionList
                items={[
                  { term: 'Pessoa', detail: owner },
                  {
                    term: 'Receita e versão',
                    detail: prescription ? (
                      <Link to={`/receitas/${prescription.id}`} className="text-teal underline-offset-2 hover:underline">
                        {rxTitle} · versão {plan.prescriptionVersionNumber}
                      </Link>
                    ) : (
                      <span>
                        {rxTitle} · versão {plan.prescriptionVersionNumber} <span className="text-red-ink">(excluída)</span>
                      </span>
                    ),
                  },
                  {
                    term: 'Unidade',
                    detail: (
                      <Link to={`/unidades/${unit.id}${prescription ? `?receita=${prescription.id}` : ''}`} className="text-teal underline-offset-2 hover:underline">
                        {unit.name} ({unit.code})
                      </Link>
                    ),
                  },
                  { term: 'Data pretendida', detail: `${formatDate(plan.intendedDate)} · ${weekdayName(weekday(plan.intendedDate))}` },
                  { term: 'Condição cadastrada no dia', detail: conditionText(conditionOn(unit, plan.intendedDate)) },
                ]}
              />
              <p className="mt-3 text-sm text-ink-soft">Não é agendamento nem reserva. A avaliação final é do farmacêutico.</p>
            </section>

            <section className="card card-pad" aria-labelledby="warn-title">
              <h2 id="warn-title" className="mb-3 text-lg font-bold">
                Pendências e avisos
              </h2>
              {evaluation.warnings.length === 0 ? (
                <p className="flex items-center gap-2 text-green-ink">
                  <CircleCheck size={18} aria-hidden /> Nenhuma pendência identificada para este plano.
                </p>
              ) : (
                <ul className="space-y-3">
                  {evaluation.warnings.map((w) => (
                    <li key={w.kind + w.text} className={`flex gap-3 rounded-2xl border p-3 ${w.requiresReview ? 'border-amber-line bg-amber-bg/60' : 'border-line'}`}>
                      {w.requiresReview ? <TriangleAlert size={18} className="mt-0.5 shrink-0 text-amber-ink" aria-hidden /> : <Info size={18} className="mt-0.5 shrink-0 text-teal" aria-hidden />}
                      <span className="text-[0.9375rem]">
                        <span className="sr-only">{w.requiresReview ? 'Precisa revisar: ' : 'Aviso: '}</span>
                        {w.text}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              {!cancelled && evaluation.warnings.some((w) => w.kind === 'prescription_changed' || w.kind === 'prescription_deleted') && (
                <div className="mt-4">
                  <Callout tone="warning" title="Revise o plano" action={<LinkButton to={`/planos/${plan.id}/editar`} variant="secondary">Revisar e salvar plano</LinkButton>}>
                    Abra o plano, confira os dados e salve para usar a versão atual da receita.
                  </Callout>
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="card card-pad" aria-labelledby="chk-title">
              <h2 id="chk-title" className="mb-1 text-lg font-bold">
                Checklist
              </h2>
              <p className="mb-3 text-sm text-ink-soft">
                {evaluation.checklistDone} de {evaluation.checklist.length} itens verificados
              </p>
              <ul className="space-y-2">
                {evaluation.checklist.map((c) => (
                  <li key={c.key}>
                    <label className={`flex gap-3 rounded-2xl border border-line p-3 ${cancelled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:border-line-strong'}`}>
                      <input
                        type="checkbox"
                        className="checkbox mt-0.5"
                        checked={c.effectiveDone}
                        disabled={cancelled}
                        onChange={(e) => dispatch({ type: 'plan/toggleItem', planId: plan.id, key: c.key, done: e.target.checked })}
                      />
                      <span>
                        <span className="block font-medium">{CHECKLIST_LABEL[c.key].label}</span>
                        <span className={`block text-sm ${c.staleReason ? 'font-medium text-amber-ink' : 'text-ink-soft'}`}>{c.staleReason ?? CHECKLIST_LABEL[c.key].hint}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              {cancelled && <p className="mt-3 text-sm text-ink-soft">Plano cancelado: o checklist fica apenas para consulta.</p>}
            </section>

            <section className="card card-pad" aria-labelledby="rem-title">
              <h2 id="rem-title" className="mb-2 text-lg font-bold">
                Lembretes deste plano
              </h2>
              {linkedReminders.length === 0 ? (
                <p className="text-ink-soft">Nenhum lembrete vinculado. Que tal um aviso para conferir a unidade perto da ida?</p>
              ) : (
                <ul className="space-y-2">
                  {linkedReminders.map((r) => (
                    <li key={r.id}>
                      <Link to={`/lembretes?lembrete=${r.id}`} className="block rounded-xl border border-line px-3 py-2.5 hover:border-line-strong hover:bg-canvas">
                        <span className="block font-medium">{r.title}</span>
                        <span className="text-sm text-ink-soft">
                          {REMINDER_TYPE_LABEL[r.type]} · {formatDateTime(r.dueAt)}
                          {r.doneAt ? ' · concluído' : ''}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {!cancelled && (
                <Button variant="soft" block className="mt-4" icon={<BellPlus size={18} aria-hidden />} onClick={() => setReminderOpen(true)}>
                  Criar lembrete
                </Button>
              )}
            </section>

            {!cancelled && (
              <Button variant="danger-ghost" block icon={<Ban size={18} aria-hidden />} onClick={() => setConfirmCancel(true)}>
                Cancelar plano
              </Button>
            )}
          </aside>
        </div>
      </div>

      {/* Folha de impressão */}
      <article className="print-only text-[#142D3B]">
        <header className="mb-4 flex items-center gap-3 border-b border-[#ccc] pb-3">
          <LogoMark size={32} />
          <div>
            <p className="text-lg font-bold">FarmaFlux · Plano de ida</p>
            <p className="text-sm">Demonstração · dados fictícios</p>
          </div>
        </header>
        <pre className="font-sans text-[11pt] leading-relaxed whitespace-pre-wrap">{summary}</pre>
      </article>

      <ConfirmDialog
        open={confirmCancel}
        title="Cancelar este plano?"
        description="O plano continua no histórico como cancelado. Lembretes vinculados são mantidos; você pode excluí-los em Lembretes."
        confirmLabel="Cancelar plano"
        cancelLabel="Manter plano"
        variant="danger"
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() => {
          dispatch({ type: 'plan/cancel', id: plan.id });
          setConfirmCancel(false);
          announce('Plano cancelado.');
        }}
      />

      <Dialog
        open={manualCopy !== null}
        onClose={() => setManualCopy(null)}
        title="Copiar manualmente"
        description="O navegador não permitiu copiar automaticamente. O texto abaixo já está selecionado: use Ctrl+C (ou toque e segure para copiar)."
        footer={<Button variant="secondary" onClick={() => setManualCopy(null)}>Fechar</Button>}
      >
        <label htmlFor="manual-copy" className="label">
          Resumo do plano
        </label>
        <textarea
          id="manual-copy"
          ref={manualRef}
          readOnly
          data-autofocus
          rows={12}
          className="input font-mono text-sm"
          value={manualCopy ?? ''}
          onFocus={(e) => e.currentTarget.select()}
        />
      </Dialog>

      <ReminderDialog open={reminderOpen} onClose={() => setReminderOpen(false)} defaults={reminderDefaults} />
    </OwnerGuard>
  );
}
