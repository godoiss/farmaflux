import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CircleAlert, Pill, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Callout, PageHeader, StatusPill } from '../../components/ui/Display';
import { MaskedField, SelectField, TextField } from '../../components/ui/Field';
import { NotFound } from '../../components/layout/NotFound';
import { useStore } from '../../state/AppStore';
import { useAnnounce } from '../../state/Announcer';
import { findPrescription } from '../../state/selectors';
import { currentVersionOf } from '../../domain/rules/planRules';
import { CATEGORY_LABEL } from '../../domain/labels';
import { datePart, formatDate, parseBrDate } from '../../domain/time';
import type { DocumentVersion, FieldReading, FieldValue, Medication, PrescriptionCategory, PrescriptionFields } from '../../domain/types';
import { MEDICATION_CATALOG } from '../../data/fixtures/catalog';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { DocumentPreview, previewSourceOf } from './DocumentPreview';
import { OwnerGuard } from './OwnerGuard';

interface FormState {
  title: string;
  patientName: string;
  issueDate: string;
  prescriber: string;
  category: PrescriptionCategory;
  medications: Medication[];
}

type Errors = Partial<Record<'title' | 'patientName' | 'issueDate' | 'prescriber' | 'medications', string>>;

const ERROR_ORDER: Array<keyof Errors> = ['title', 'patientName', 'issueDate', 'prescriber', 'medications'];
const FIELD_IDS: Record<keyof Errors, string> = { title: 'f-title', patientName: 'f-patient', issueDate: 'f-date', prescriber: 'f-prescriber', medications: 'f-med-add' };

function initialForm(title: string, v: DocumentVersion): FormState {
  const f = v.confirmed ?? v.extracted;
  return {
    title,
    patientName: f.patientName.value ?? '',
    issueDate: f.issueDate.value ? formatDate(f.issueDate.value) : '',
    prescriber: f.prescriber.value ?? '',
    category: f.category.value ?? 'a_confirmar',
    medications: [...f.medications],
  };
}

/** Badge que diferencia leitura, campo não lido e preenchimento manual. */
function ReadingBadge({ reading, edited }: { reading: FieldReading; edited: boolean }) {
  if (edited) return <StatusPill tone="neutral">Editado por você</StatusPill>;
  if (reading === 'read') return <StatusPill tone="info">Leitura demonstrativa</StatusPill>;
  if (reading === 'unreadable') return <StatusPill tone="warning">Não conseguimos ler este campo</StatusPill>;
  return <StatusPill tone="neutral">Preenchimento manual</StatusPill>;
}

function toField<T>(value: T | null, original: FieldValue<T>): FieldValue<T> {
  if (value === null || value === '') return { value: null, reading: original.reading === 'unreadable' ? 'unreadable' : 'manual' };
  return { value, reading: original.reading === 'read' && original.value === value ? 'read' : 'manual' };
}

export function ReviewPage() {
  const { id } = useParams();
  const { data } = useStore();
  const prescription = findPrescription(data, id);
  const version = currentVersionOf(prescription);
  if (!prescription || !version) return <NotFound what="receita" />;
  return (
    <OwnerGuard ownerId={prescription.personId}>
      <ReviewForm key={version.id} prescriptionId={prescription.id} title={prescription.title} version={version} versionCount={prescription.versions.length} />
    </OwnerGuard>
  );
}

function ReviewForm({ prescriptionId, title, version, versionCount }: { prescriptionId: string; title: string; version: DocumentVersion; versionCount: number }) {
  const { data, dispatch } = useStore();
  const announce = useAnnounce();
  const navigate = useNavigate();
  const initial = useMemo(() => initialForm(title, version), [title, version]);
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [addCode, setAddCode] = useState('');
  const [done, setDone] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const dirty = !done && JSON.stringify(form) !== JSON.stringify(initial);
  const blocker = useUnsavedChanges(dirty, 'A transcrição tem alterações não confirmadas.');
  const ext = version.extracted;
  const hasDateFinding = version.documentFindings.includes('issue_date_not_found');
  const today = datePart(data.clock);

  useEffect(() => {
    if (done) navigate(`/receitas/${prescriptionId}`);
  }, [done, navigate, prescriptionId]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key as keyof Errors]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (!form.title.trim()) e.title = 'Dê um nome para identificar a receita.';
    if (!form.patientName.trim()) e.patientName = 'Informe o nome da pessoa como está no documento.';
    if (form.issueDate) {
      const d = parseBrDate(form.issueDate);
      if (!d) e.issueDate = 'Data inválida. Use dd/mm/aaaa ou deixe em branco se não estiver legível.';
      else if (d > today) e.issueDate = `A data de emissão não pode ser depois de ${formatDate(today)}.`;
    }
    if (!form.prescriber.trim()) e.prescriber = 'Informe a identificação de quem prescreveu.';
    if (form.medications.length === 0) e.medications = 'Adicione ao menos um medicamento do documento.';
    return e;
  };

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.values(e).some(Boolean)) {
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    const fields: PrescriptionFields = {
      patientName: toField(form.patientName.trim(), ext.patientName),
      issueDate: toField(form.issueDate ? parseBrDate(form.issueDate) : null, ext.issueDate),
      prescriber: toField(form.prescriber.trim(), ext.prescriber),
      category: form.category === 'a_confirmar' ? { value: 'a_confirmar', reading: ext.category.reading === 'unreadable' ? 'unreadable' : 'manual' } : toField(form.category, ext.category),
      medications: form.medications,
    };
    dispatch({ type: 'prescription/confirm', prescriptionId, versionId: version.id, fields, title: form.title });
    announce('Transcrição confirmada. A pré-conferência foi atualizada.');
    setDone(true);
  };

  const errorList = ERROR_ORDER.filter((k) => errors[k]);
  const available = MEDICATION_CATALOG.filter((m) => !form.medications.some((x) => x.code === m.code));
  const edited = (key: 'patientName' | 'prescriber', value: string) => ext[key].reading === 'read' && (ext[key].value ?? '') !== value;
  const dateEdited = ext.issueDate.reading === 'read' && formatDate(ext.issueDate.value) !== form.issueDate;

  return (
    <div>
      <PageHeader
        back={
          <Link to={`/receitas/${prescriptionId}`} className="btn btn-ghost -ml-3 min-h-11 px-3">
            <ArrowLeft size={18} aria-hidden /> Voltar para a receita
          </Link>
        }
        eyebrow={`Pré-conferência · versão ${version.number} de ${versionCount}`}
        title="Conferir dados da receita"
        description="Compare cada campo com o documento e corrija o que estiver diferente."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-8">
        <aside className="lg:sticky lg:top-24 lg:self-start" aria-label="Documento original">
          <DocumentPreview source={previewSourceOf(version)} />
          <p className="mt-3 text-sm text-ink-soft">
            {version.readingMode === 'demo' ? 'Campos preenchidos pela leitura demonstrativa deste exemplo.' : 'Leitura automática não conectada: preencha os campos conforme o documento.'}
          </p>
        </aside>

        <form className="card card-pad space-y-5" onSubmit={submit} noValidate aria-labelledby="review-title">
          <h2 id="review-title" className="sr-only">
            Transcrição
          </h2>
          {errorList.length > 0 && (
            <div ref={summaryRef} tabIndex={-1} className="callout callout-danger outline-none" role="alert">
              <CircleAlert size={20} className="mt-0.5 shrink-0 text-red-ink" aria-hidden />
              <div>
                <p className="font-semibold">Revise {errorList.length === 1 ? 'o campo' : `${errorList.length} campos`} antes de confirmar:</p>
                <ul className="mt-1 list-disc pl-5">
                  {errorList.map((k) => (
                    <li key={k}>
                      <a href={`#${FIELD_IDS[k]}`} className="font-medium text-red-ink underline" onClick={(e) => { e.preventDefault(); document.getElementById(FIELD_IDS[k])?.focus(); }}>
                        {errors[k]}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <Callout tone="info">Confirmar a transcrição não altera o documento original nem corrige a receita.</Callout>
          {hasDateFinding && (
            <Callout tone="warning" title="Possível pendência documental">
              A data de emissão não foi identificada no documento. Mesmo que você digite uma data aqui, a pendência continua até o envio da receita corrigida.
            </Callout>
          )}

          <TextField id="f-title" label="Nome para identificar" value={form.title} onChange={(e) => set('title', e.target.value)} error={errors.title} maxLength={60} />
          <TextField id="f-patient" label="Pessoa" autoComplete="off" value={form.patientName} onChange={(e) => set('patientName', e.target.value)} error={errors.patientName} badge={<ReadingBadge reading={ext.patientName.reading} edited={edited('patientName', form.patientName)} />} />
          <MaskedField
            id="f-date"
            mask="date"
            label="Data de emissão"
            value={form.issueDate}
            onValueChange={(v) => set('issueDate', v)}
            error={errors.issueDate}
            hint="Deixe em branco se a data não estiver legível no documento."
            badge={<ReadingBadge reading={ext.issueDate.reading} edited={dateEdited} />}
          />
          <TextField id="f-prescriber" label="Identificação do prescritor" autoComplete="off" value={form.prescriber} onChange={(e) => set('prescriber', e.target.value)} error={errors.prescriber} badge={<ReadingBadge reading={ext.prescriber.reading} edited={edited('prescriber', form.prescriber)} />} />
          <SelectField
            id="f-category"
            label="Categoria"
            value={form.category}
            onChange={(e) => set('category', e.target.value as PrescriptionCategory)}
            hint="Se não tiver certeza, mantenha “A confirmar”."
            badge={<ReadingBadge reading={ext.category.reading} edited={ext.category.reading === 'read' && ext.category.value !== form.category} />}
          >
            {(Object.keys(CATEGORY_LABEL) as PrescriptionCategory[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </SelectField>

          <fieldset>
            <legend className="label">Medicamentos</legend>
            <p className="hint -mt-1 mb-3">Itens demonstrativos identificados por código. O FarmaFlux não sugere doses nem substituições.</p>
            <ul className="space-y-2">
              {form.medications.map((m) => (
                <li key={m.code} className="flex items-center gap-3 rounded-2xl border border-line p-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-mint text-teal">
                    <Pill size={18} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">
                      {m.name} {m.strength}
                    </span>
                    <span className="block text-sm text-ink-soft">
                      {m.form} · {m.code}
                    </span>
                  </span>
                  <button type="button" className="btn-icon text-red-ink hover:bg-red-bg hover:text-red-ink" aria-label={`Remover ${m.name} ${m.strength}`} onClick={() => set('medications', form.medications.filter((x) => x.code !== m.code))}>
                    <Trash2 size={18} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
            {form.medications.length === 0 && <p className="rounded-2xl border border-dashed border-line-strong p-4 text-sm text-ink-soft">Nenhum medicamento na transcrição.</p>}
            {available.length > 0 && (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <SelectField id="f-med-add" label="Adicionar item do documento" value={addCode} onChange={(e) => setAddCode(e.target.value)} error={errors.medications}>
                    <option value="">Escolha um item demonstrativo</option>
                    {available.map((m) => (
                      <option key={m.code} value={m.code}>
                        {m.name} {m.strength} · {m.form}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <Button
                  variant="secondary"
                  icon={<Plus size={18} aria-hidden />}
                  disabled={!addCode}
                  title={!addCode ? 'Escolha um item na lista primeiro' : undefined}
                  className={errors.medications ? 'sm:mb-7' : ''}
                  onClick={() => {
                    const med = MEDICATION_CATALOG.find((m) => m.code === addCode);
                    if (med) set('medications', [...form.medications, med]);
                    setAddCode('');
                  }}
                >
                  Adicionar
                </Button>
              </div>
            )}
          </fieldset>

          <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
            <Link to={`/receitas/${prescriptionId}`} className="btn btn-ghost">
              Cancelar
            </Link>
            <Button type="submit">Confirmar transcrição</Button>
          </div>
        </form>
      </div>
      {blocker}
    </div>
  );
}
