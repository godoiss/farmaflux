import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, FilePlus2, History, ListChecks, Pencil, Pill, Trash2 } from 'lucide-react';
import { Button, LinkButton } from '../../components/ui/Button';
import { PageHeader, StatusPill } from '../../components/ui/Display';
import { Dialog } from '../../components/ui/Dialog';
import { NotFound } from '../../components/layout/NotFound';
import { useStore } from '../../state/AppStore';
import { useAnnounce } from '../../state/Announcer';
import { revokePreview } from '../../state/previewRegistry';
import { findPrescription, findUnit, planView, plansForPrescription } from '../../state/selectors';
import { currentVersionOf, PLAN_STATUS_LABEL } from '../../domain/rules/planRules';
import { runPreCheck, STATUS_COPY } from '../../domain/rules/preCheck';
import { formatDate, formatDateTime } from '../../domain/time';
import type { DocumentVersion } from '../../domain/types';
import { DocumentPreview, previewSourceOf } from './DocumentPreview';
import { PreCheckPanel } from './PreCheckPanel';
import { OwnerGuard } from './OwnerGuard';
import { statusTone } from './prescriptionUi';

export function PrescriptionDetailPage() {
  const { id } = useParams();
  const { data, dispatch } = useStore();
  const announce = useAnnounce();
  const navigate = useNavigate();
  const [viewVersion, setViewVersion] = useState<DocumentVersion | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [cancelPlans, setCancelPlans] = useState(true);

  const prescription = findPrescription(data, id);
  const version = currentVersionOf(prescription);
  if (!prescription || !version) return <NotFound what="receita" />;

  const result = runPreCheck(version, data.clock);
  const fields = version.confirmed ?? version.extracted;
  const linkedPlans = plansForPrescription(data, prescription.id);
  const linkedReminders = data.reminders.filter((r) => r.link?.kind === 'prescription' && r.link.id === prescription.id);

  const doDelete = () => {
    prescription.versions.forEach((v) => revokePreview(v.id));
    dispatch({ type: 'prescription/delete', id: prescription.id, cancelPlans });
    setConfirmDelete(false);
    announce(
      linkedPlans.length
        ? `Receita excluída. ${cancelPlans ? 'Planos vinculados cancelados.' : 'Planos vinculados marcados para revisão.'}`
        : 'Receita excluída.',
    );
    navigate('/receitas');
  };

  return (
    <OwnerGuard ownerId={prescription.personId}>
      <PageHeader
        back={
          <Link to="/receitas" className="btn btn-ghost -ml-3 min-h-11 px-3">
            <ArrowLeft size={18} aria-hidden /> Minhas receitas
          </Link>
        }
        eyebrow={`Versão ${version.number} · atualizada em ${formatDateTime(prescription.updatedAt)}`}
        title={prescription.title}
        actions={
          <>
            <LinkButton to={`/receitas/${prescription.id}/conferir`} variant="secondary" icon={<Pencil size={18} aria-hidden />}>
              {version.confirmed ? 'Editar transcrição' : 'Conferir dados'}
            </LinkButton>
            <LinkButton to={`/planos/novo?receita=${prescription.id}`} variant={result.status === 'no_issues' ? 'primary' : 'secondary'} icon={<ListChecks size={18} aria-hidden />}>
              Preparar retirada
            </LinkButton>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-8">
        <div className="space-y-6">
          <section className="card card-pad" aria-labelledby="pc-title">
            <h2 id="pc-title" className="mb-4 flex items-center gap-2 text-lg font-bold">
              <ClipboardCheck size={20} className="text-teal" aria-hidden /> Resultado da pré-conferência
            </h2>
            <PreCheckPanel result={result} prescriptionId={prescription.id} />
          </section>

          <section className="card card-pad" aria-labelledby="meds-title">
            <h2 id="meds-title" className="mb-3 text-lg font-bold">
              Medicamentos
            </h2>
            <ul className="divide-y divide-line">
              {fields.medications.map((m) => (
                <li key={m.code} className="flex items-center gap-3 py-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-mint text-teal">
                    <Pill size={18} aria-hidden />
                  </span>
                  <span>
                    <span className="block font-semibold">
                      {m.name} {m.strength}
                    </span>
                    <span className="block text-sm text-ink-soft">
                      {m.form} · código {m.code}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            {fields.medications.length === 0 && <p className="text-ink-soft">Nenhum medicamento transcrito.</p>}
          </section>

          {linkedPlans.length > 0 && (
            <section className="card card-pad" aria-labelledby="plans-title">
              <h2 id="plans-title" className="mb-3 text-lg font-bold">
                Planos de ida com esta receita
              </h2>
              <ul className="space-y-2">
                {linkedPlans.map((p) => {
                  const view = planView(data, p);
                  return (
                    <li key={p.id}>
                      <Link to={`/planos/${p.id}`} className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 hover:border-line-strong hover:bg-canvas">
                        <span>
                          <span className="block font-semibold">{findUnit(data, p.unitId)?.name}</span>
                          <span className="text-sm text-ink-soft">Ida pretendida em {formatDate(p.intendedDate)} · feito com a v{p.prescriptionVersionNumber}</span>
                        </span>
                        {view.evaluation && <StatusPill tone={view.evaluation.status === 'saved' ? 'success' : 'warning'}>{PLAN_STATUS_LABEL[view.evaluation.status]}</StatusPill>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="card card-pad" aria-labelledby="doc-title">
            <h2 id="doc-title" className="mb-3 text-lg font-bold">
              Documento
            </h2>
            <DocumentPreview source={previewSourceOf(version)} compact />
            <LinkButton to={`/receitas/${prescription.id}/corrigir`} variant="secondary" block className="mt-4" icon={<FilePlus2 size={18} aria-hidden />}>
              Enviar receita corrigida
            </LinkButton>
          </section>

          <section className="card card-pad" aria-labelledby="ver-title">
            <h2 id="ver-title" className="mb-3 flex items-center gap-2 text-lg font-bold">
              <History size={20} className="text-teal" aria-hidden /> Versões
            </h2>
            <ol className="space-y-2">
              {[...prescription.versions].reverse().map((v) => {
                const pc = runPreCheck(v, data.clock);
                const isCurrent = v.id === prescription.currentVersionId;
                return (
                  <li key={v.id}>
                    <button type="button" onClick={() => setViewVersion(v)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 text-left transition-colors hover:border-line-strong hover:bg-canvas">
                      <span className="min-w-0">
                        <span className="block font-semibold">
                          Versão {v.number} {isCurrent ? '· atual' : '· substituída'}
                        </span>
                        <span className="block text-sm text-ink-soft">
                          Enviada em {formatDateTime(v.createdAt)} · {STATUS_COPY[pc.status].label}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-teal">Ver</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>

          <Button variant="danger-ghost" block icon={<Trash2 size={18} aria-hidden />} onClick={() => setConfirmDelete(true)}>
            Excluir receita
          </Button>
        </aside>
      </div>

      <Dialog
        open={viewVersion !== null}
        onClose={() => setViewVersion(null)}
        title={viewVersion ? `Versão ${viewVersion.number}${viewVersion.id === prescription.currentVersionId ? ' (atual)' : ''}` : 'Versão'}
        description={viewVersion ? `Enviada em ${formatDateTime(viewVersion.createdAt)}${viewVersion.replacesVersionId ? ` · substitui a versão ${prescription.versions.find((x) => x.id === viewVersion.replacesVersionId)?.number ?? 'anterior'}` : ''}` : undefined}
        className="max-w-2xl"
        footer={<Button variant="secondary" onClick={() => setViewVersion(null)}>Fechar</Button>}
      >
        {viewVersion && (
          <div className="space-y-4">
            <DocumentPreview source={previewSourceOf(viewVersion)} compact />
            <StatusPill tone={statusTone(runPreCheck(viewVersion, data.clock).status)}>{STATUS_COPY[runPreCheck(viewVersion, data.clock).status].label}</StatusPill>
            <PreCheckPanel result={runPreCheck(viewVersion, data.clock)} prescriptionId={prescription.id} readOnly />
          </div>
        )}
      </Dialog>

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Excluir esta receita?"
        description="Todas as versões e a transcrição serão removidas deste aparelho. Esta ação não pode ser desfeita."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)} data-autofocus>
              Voltar
            </Button>
            <Button variant="danger" onClick={doDelete}>
              Excluir receita
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-[0.9375rem]">
          {linkedPlans.length > 0 ? (
            <>
              <p>
                {linkedPlans.length === 1 ? 'Há 1 plano de ida' : `Há ${linkedPlans.length} planos de ida`} usando esta receita. Eles não ficarão apontando para um registro inexistente:
              </p>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line p-3">
                <input type="checkbox" className="checkbox mt-0.5" checked={cancelPlans} onChange={(e) => setCancelPlans(e.target.checked)} />
                <span>
                  <span className="block font-semibold">Cancelar também os planos vinculados</span>
                  <span className="text-ink-soft">Se desmarcar, os planos ficam como “Precisa revisar”, avisando que a receita foi excluída.</span>
                </span>
              </label>
            </>
          ) : (
            <p className="text-ink-soft">Nenhum plano de ida usa esta receita.</p>
          )}
          {linkedReminders.length > 0 && <p className="text-ink-soft">{linkedReminders.length} lembrete(s) vinculado(s) serão mantidos, sem o vínculo com a receita.</p>}
        </div>
      </Dialog>
    </OwnerGuard>
  );
}
