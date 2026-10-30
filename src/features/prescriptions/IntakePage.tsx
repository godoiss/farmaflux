import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Camera, Check, FileUp, RefreshCw, Sparkles, Upload } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Callout, PageHeader, StatusPill } from '../../components/ui/Display';
import { TextField } from '../../components/ui/Field';
import { useStore } from '../../state/AppStore';
import { useAnnounce } from '../../state/Announcer';
import { registerPreview } from '../../state/previewRegistry';
import { activePerson, findPrescription, preCheckOf } from '../../state/selectors';
import { SAMPLES, sampleLabel, sampleDescription, type SampleDocument } from '../../data/fixtures/samples';
import { previewKindFor, versionFromSample, versionFromUpload } from '../../data/factories';
import { ACCEPT_ATTR, resolveMime, validateFileMeta } from '../../domain/rules/fileRules';
import { STATUS_COPY } from '../../domain/rules/preCheck';
import { probeReadable, wait } from '../../lib/files';
import { newId } from '../../lib/id';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import { DocumentPreview } from './DocumentPreview';
import { NotFound } from '../../components/layout/NotFound';

type Selection = { kind: 'sample'; sample: SampleDocument } | { kind: 'upload'; file: File; mime: string; url: string };

type Phase = { name: 'choose' } | { name: 'processing'; step: number; kind: 'sample' | 'upload' } | { name: 'ready' } | { name: 'error'; message: string; retry: boolean };

const STEPS_UPLOAD = ['Recebendo o arquivo', 'Verificando formato e tamanho', 'Preparando a conferência'];
const STEPS_SAMPLE = ['Abrindo documento de exemplo', 'Aplicando a leitura demonstrativa', 'Preparando a conferência'];

/** Envio de receita nova ou de versão corrigida (mesmo fluxo, contexto diferente). */
export function IntakePage({ mode }: { mode: 'new' | 'correction' }) {
  const { id } = useParams();
  const { data, dispatch } = useStore();
  const announce = useAnnounce();
  const navigate = useNavigate();
  const target = mode === 'correction' ? findPrescription(data, id) : undefined;
  const person = activePerson(data);

  const [selection, setSelection] = useState<Selection | null>(null);
  const [phase, setPhase] = useState<Phase>({ name: 'choose' });
  const [title, setTitle] = useState('Receita de uso contínuo');
  const [titleError, setTitleError] = useState<string>();
  const [dragging, setDragging] = useState(false);
  const [savedTo, setSavedTo] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const pendingFile = useRef<File | null>(null);
  const runId = useRef(0);
  const ownedUrl = useRef<string | null>(null);

  const dirty = selection !== null && savedTo === null;
  const blockerDialog = useUnsavedChanges(dirty, 'O documento selecionado ainda não foi salvo. Se sair agora, ele será descartado.');

  // Revoga a prévia descartada quando a tela é desmontada sem salvar.
  useEffect(
    () => () => {
      if (ownedUrl.current) URL.revokeObjectURL(ownedUrl.current);
    },
    [],
  );

  useEffect(() => {
    if (savedTo) navigate(savedTo);
  }, [savedTo, navigate]);

  const replaceSelection = useCallback((next: Selection) => {
    if (ownedUrl.current && (next.kind !== 'upload' || next.url !== ownedUrl.current)) URL.revokeObjectURL(ownedUrl.current);
    ownedUrl.current = next.kind === 'upload' ? next.url : null;
    setSelection(next);
  }, []);

  const runSteps = async (count: number, run: number, kind: 'sample' | 'upload') => {
    for (let i = 0; i < count; i++) {
      if (runId.current !== run) return false;
      setPhase({ name: 'processing', step: i, kind });
      await wait(260);
    }
    return runId.current === run;
  };

  const processFile = async (file: File) => {
    const run = ++runId.current;
    pendingFile.current = file;
    const error = validateFileMeta({ name: file.name, size: file.size, type: file.type });
    if (error) {
      setPhase({ name: 'error', message: error, retry: false });
      announce(error, 'error');
      return;
    }
    if (!(await runSteps(1, run, 'upload'))) return;
    try {
      await probeReadable(file);
    } catch {
      const msg = 'Não conseguimos ler este arquivo. Tente novamente ou escolha outro.';
      setPhase({ name: 'error', message: msg, retry: true });
      announce(msg, 'error');
      return;
    }
    if (!(await runSteps(STEPS_UPLOAD.length, run, 'upload'))) return;
    const mime = resolveMime({ name: file.name, size: file.size, type: file.type }) ?? file.type;
    replaceSelection({ kind: 'upload', file, mime, url: URL.createObjectURL(file) });
    setPhase({ name: 'ready' });
    announce('Arquivo pronto. A leitura automática não está conectada: os campos serão preenchidos por você.', 'info');
  };

  const chooseSample = async (sample: SampleDocument) => {
    const run = ++runId.current;
    if (!(await runSteps(STEPS_SAMPLE.length, run, 'sample'))) return;
    replaceSelection({ kind: 'sample', sample });
    setPhase({ name: 'ready' });
    announce('Leitura demonstrativa concluída.', 'info');
  };

  const onPicked = (files: FileList | null) => {
    // Cancelar o seletor não altera a seleção anterior.
    const file = files?.[0];
    if (file) void processFile(file);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    onPicked(e.dataTransfer.files);
  };

  const save = () => {
    if (!selection) return;
    if (mode === 'new' && !title.trim()) {
      setTitleError('Dê um nome para identificar a receita.');
      document.getElementById('rx-title')?.focus();
      return;
    }
    const now = data.clock;
    if (mode === 'correction' && target) {
      const current = target.versions.find((v) => v.id === target.currentVersionId);
      const base = { number: target.versions.length + 1, now, replacesVersionId: current?.id ?? null };
      const version = selection.kind === 'sample' ? versionFromSample(selection.sample, base) : versionFromUpload({ fileName: selection.file.name, fileSize: selection.file.size, mimeType: selection.mime }, base);
      if (selection.kind === 'upload') {
        registerPreview(version.id, selection.url);
        ownedUrl.current = null;
      }
      dispatch({ type: 'prescription/addVersion', prescriptionId: target.id, version });
      announce(`Versão ${version.number} enviada. Confira os dados para atualizar a pré-conferência.`);
      setSavedTo(`/receitas/${target.id}/conferir`);
      return;
    }
    const rxId = newId('rx');
    const base = { number: 1, now, replacesVersionId: null };
    const version = selection.kind === 'sample' ? versionFromSample(selection.sample, base) : versionFromUpload({ fileName: selection.file.name, fileSize: selection.file.size, mimeType: selection.mime }, base);
    if (selection.kind === 'upload') {
      registerPreview(version.id, selection.url);
      ownedUrl.current = null;
    }
    dispatch({ type: 'prescription/add', id: rxId, title: title.trim(), version });
    announce('Receita adicionada. Agora confira os dados.');
    setSavedTo(`/receitas/${rxId}/conferir`);
  };

  if (mode === 'correction' && !target) return <NotFound what="receita" />;

  const currentCheck = target ? preCheckOf(data, target) : null;
  const samples = mode === 'correction' ? [...SAMPLES].sort((a, b) => Number(b.id === 'maria-corrigida') - Number(a.id === 'maria-corrigida')) : SAMPLES;
  const processing = phase.name === 'processing';
  const steps = phase.name === 'processing' && phase.kind === 'sample' ? STEPS_SAMPLE : STEPS_UPLOAD;
  const previewSource =
    selection?.kind === 'sample'
      ? { url: selection.sample.assetPath, kind: 'image' as const, fileName: selection.sample.fileName, fileSize: selection.sample.fileSize }
      : selection?.kind === 'upload'
        ? { url: selection.url, kind: previewKindFor(selection.mime), fileName: selection.file.name, fileSize: selection.file.size }
        : null;

  return (
    <div>
      <PageHeader
        back={
          <Link to={target ? `/receitas/${target.id}` : '/receitas'} className="btn btn-ghost -ml-3 min-h-11 px-3">
            <ArrowLeft size={18} aria-hidden /> {target ? 'Voltar para a receita' : 'Minhas receitas'}
          </Link>
        }
        eyebrow={mode === 'correction' ? 'Correção do documento' : 'Pré-conferência'}
        title={mode === 'correction' ? 'Enviar receita corrigida' : 'Adicionar receita'}
        description={
          mode === 'correction'
            ? 'O novo documento vira uma nova versão ligada à anterior. O histórico é preservado.'
            : `A receita será registrada para ${person.name}. Envie uma foto, um PDF ou use um exemplo.`
        }
      />

      {mode === 'correction' && target && currentCheck && (
        <div className="mb-6">
          <Callout tone="info" title={`Versão atual: v${target.versions.length} · ${STATUS_COPY[currentCheck.status].label}`}>
            Depois de falar com quem prescreveu, envie aqui o documento reemitido. Marcar algo como “resolvido” não substitui o novo documento.
          </Callout>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-8">
        <div className="space-y-6">
          {/* Envio de arquivo */}
          <section className="card card-pad" aria-labelledby="upload-title">
            <h2 id="upload-title" className="text-lg font-bold">
              Enviar arquivo
            </h2>
            <p className="mt-1 text-sm text-ink-soft">JPG, PNG ou PDF, até 10 MB. O arquivo fica no seu aparelho: nada é enviado para outros serviços.</p>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              data-testid="dropzone"
              className={`mt-4 flex flex-col items-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-colors ${dragging ? 'border-teal bg-mint/60' : 'border-line-strong bg-canvas'}`}
            >
              <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-surface text-teal shadow-sm">
                <Upload size={22} aria-hidden />
              </span>
              <p className="font-semibold">Arraste o arquivo para cá</p>
              <p className="text-sm text-ink-soft">ou escolha uma opção</p>
              <div className="mt-4 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Button variant="secondary" icon={<FileUp size={18} aria-hidden />} onClick={() => fileInput.current?.click()} disabled={processing} title={processing ? 'Aguarde o processamento atual' : undefined}>
                  Selecionar arquivo
                </Button>
                <Button variant="secondary" className="lg:hidden" icon={<Camera size={18} aria-hidden />} onClick={() => cameraInput.current?.click()} disabled={processing}>
                  Fotografar receita
                </Button>
              </div>
              <input ref={fileInput} type="file" accept={ACCEPT_ATTR} className="sr-only" tabIndex={-1} aria-hidden data-testid="file-input" onChange={(e) => { onPicked(e.target.files); e.target.value = ''; }} />
              <input ref={cameraInput} type="file" accept="image/jpeg,image/png" capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => { onPicked(e.target.files); e.target.value = ''; }} />
            </div>
          </section>

          {/* Exemplos */}
          <section className="card card-pad" aria-labelledby="samples-title">
            <h2 id="samples-title" className="flex items-center gap-2 text-lg font-bold">
              <Sparkles size={20} className="text-teal" aria-hidden /> Usar receita de exemplo
            </h2>
            <p className="mt-1 text-sm text-ink-soft">Documentos fictícios guardados no aplicativo, com leitura demonstrativa.</p>
            <ul className="mt-4 grid gap-2">
              {samples.map((s) => {
                const selected = selection?.kind === 'sample' && selection.sample.id === s.id;
                const recommended = mode === 'correction' && s.id === 'maria-corrigida';
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => void chooseSample(s)}
                      disabled={processing}
                      aria-pressed={selected}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors disabled:cursor-wait ${selected ? 'border-teal bg-mint/50' : 'border-line hover:border-line-strong hover:bg-canvas'}`}
                    >
                      <img src={s.assetPath} alt="" className="h-14 w-11 shrink-0 rounded-md border border-line bg-white object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2 font-semibold">
                          {sampleLabel(s, person.name)}
                          {recommended && <span className="pill tone-info py-0.5 text-xs">Recomendado</span>}
                        </span>
                        <span className="block text-sm text-ink-soft">{sampleDescription(s, person.name)}</span>
                      </span>
                      {selected && <Check size={20} className="shrink-0 text-teal" aria-hidden />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        {/* Situação e prévia */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start" aria-label="Documento selecionado">
          <section className="card card-pad" aria-live="polite">
            <h2 className="text-lg font-bold">Documento selecionado</h2>

            {processing && (
              <div className="mt-4" role="status">
                <ol className="space-y-2">
                  {steps.map((s, i) => (
                    <li key={s} className={`flex items-center gap-2 text-[0.9375rem] ${i <= phase.step ? 'text-ink' : 'text-ink-faint'}`}>
                      {i < phase.step ? <Check size={16} className="text-teal" aria-hidden /> : <span className={`size-4 rounded-full border-2 ${i === phase.step ? 'border-teal' : 'border-line-strong'}`} aria-hidden />}
                      {s}
                    </li>
                  ))}
                </ol>
                <div className="skeleton-bar mt-4">
                  <div className="animate-progress h-full w-2/5 rounded-full bg-teal" />
                </div>
              </div>
            )}

            {phase.name === 'error' && (
              <div className="mt-4">
                <Callout
                  tone="danger"
                  title="Não foi possível usar este arquivo"
                  action={
                    <>
                      {phase.retry && pendingFile.current && (
                        <Button variant="secondary" icon={<RefreshCw size={16} aria-hidden />} onClick={() => pendingFile.current && void processFile(pendingFile.current)}>
                          Tentar novamente
                        </Button>
                      )}
                      <Button variant="secondary" icon={<FileUp size={16} aria-hidden />} onClick={() => fileInput.current?.click()}>
                        Trocar arquivo
                      </Button>
                    </>
                  }
                >
                  {phase.message}
                </Callout>
                {selection && <p className="mt-3 text-sm text-ink-soft">O documento escolhido antes continua selecionado abaixo.</p>}
              </div>
            )}

            {!processing && !selection && phase.name !== 'error' && <p className="mt-2 text-ink-soft">Nenhum documento escolhido ainda.</p>}

            {!processing && selection && previewSource && (
              <div className="mt-4 space-y-4">
                <StatusPill tone={selection.kind === 'sample' ? 'info' : 'neutral'}>{selection.kind === 'sample' ? 'Leitura demonstrativa' : 'Preenchimento manual'}</StatusPill>
                {selection.kind === 'upload' && <p className="text-sm text-ink-soft">A leitura automática não está conectada neste protótipo. Na próxima etapa, você digita os dados do documento.</p>}
                <DocumentPreview source={previewSource} compact />
                {mode === 'new' && (
                  <TextField
                    id="rx-title"
                    label="Nome para identificar"
                    value={title}
                    maxLength={60}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setTitleError(undefined);
                    }}
                    error={titleError}
                  />
                )}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button onClick={save} block>
                    {mode === 'correction' ? 'Salvar nova versão e conferir' : 'Salvar e conferir dados'}
                  </Button>
                  <Button variant="ghost" onClick={() => fileInput.current?.click()}>
                    Trocar arquivo
                  </Button>
                </div>
              </div>
            )}
          </section>
        </aside>
      </div>
      {blockerDialog}
    </div>
  );
}
