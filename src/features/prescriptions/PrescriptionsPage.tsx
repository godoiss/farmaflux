import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, FileText, Plus, Search } from 'lucide-react';
import { Button, LinkButton } from '../../components/ui/Button';
import { EmptyState, PageHeader, StatusPill } from '../../components/ui/Display';
import { useStore } from '../../state/AppStore';
import { activePerson, preCheckOf, prescriptionsOfActive } from '../../state/selectors';
import { STATUS_COPY, type DocumentStatus } from '../../domain/rules/preCheck';
import { currentVersionOf } from '../../domain/rules/planRules';
import { formatDateTime } from '../../domain/time';
import { statusTone } from './prescriptionUi';

const FILTERS = [
  { id: 'todas', label: 'Todas', test: () => true },
  { id: 'pendencia', label: 'Com pendência', test: (s: DocumentStatus) => ['possible_document_issue', 'deadline_passed', 'incomplete', 'needs_confirmation'].includes(s) },
  { id: 'conferir', label: 'A conferir', test: (s: DocumentStatus) => s === 'awaiting_review' },
  { id: 'sem', label: 'Sem pendências', test: (s: DocumentStatus) => s === 'no_issues' },
] as const;

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function PrescriptionsPage() {
  const { data } = useStore();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const filterId = FILTERS.some((f) => f.id === params.get('filtro')) ? (params.get('filtro') as (typeof FILTERS)[number]['id']) : 'todas';
  const filter = FILTERS.find((f) => f.id === filterId)!;

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value && value !== 'todas') next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: key === 'q' });
  };

  const all = prescriptionsOfActive(data).map((p) => ({ p, pc: preCheckOf(data, p)!, v: currentVersionOf(p)! }));
  const list = all.filter(({ p, pc, v }) => {
    if (!filter.test(pc.status)) return false;
    if (!q.trim()) return true;
    const f = v.confirmed ?? v.extracted;
    const haystack = normalize([p.title, f.prescriber.value ?? '', ...f.medications.map((m) => `${m.name} ${m.strength}`)].join(' '));
    return haystack.includes(normalize(q.trim()));
  });

  return (
    <div>
      <PageHeader
        eyebrow={`Receitas de ${activePerson(data).name}`}
        title="Minhas receitas"
        description="Pré-conferência documental, versões e situação de cada receita."
        actions={
          <LinkButton to="/receitas/nova" icon={<Plus size={18} aria-hidden />}>
            Adicionar receita
          </LinkButton>
        }
      />

      {all.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative md:w-80">
            <label htmlFor="rx-search" className="sr-only">
              Pesquisar receitas
            </label>
            <Search size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-faint" aria-hidden />
            <input id="rx-search" type="search" className="input pl-11" placeholder="Pesquisar por nome ou medicamento" value={q} onChange={(e) => update('q', e.target.value)} />
          </div>
          <div role="group" aria-label="Filtrar por situação" className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filterId === f.id}
                onClick={() => update('filtro', f.id)}
                className={`min-h-11 shrink-0 rounded-full border px-4 text-[0.9375rem] font-semibold transition-colors ${filterId === f.id ? 'border-teal bg-teal text-white' : 'border-line-strong bg-surface text-ink-soft hover:border-teal hover:text-ink'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="sr-only" role="status">
        {list.length} receita(s) encontrada(s)
      </p>

      {all.length === 0 ? (
        <EmptyState icon={<FileText size={26} aria-hidden />} title="Nenhuma receita por aqui" action={<LinkButton to="/receitas/nova">Adicionar receita</LinkButton>}>
          Envie um documento ou use um exemplo para fazer a pré-conferência.
        </EmptyState>
      ) : list.length === 0 ? (
        <EmptyState icon={<Search size={26} aria-hidden />} title="Nada encontrado com esses filtros" action={<Button variant="secondary" onClick={() => setParams(new URLSearchParams())}>Limpar filtros</Button>}>
          Tente outro termo ou outra situação.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {list.map(({ p, pc, v }) => {
            const f = v.confirmed ?? v.extracted;
            return (
              <li key={p.id}>
                <Link to={`/receitas/${p.id}`} className="card card-link card-pad flex h-full flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-lg font-bold">{p.title}</h2>
                      <p className="text-sm text-ink-soft">
                        Versão {v.number} · {v.readingMode === 'demo' ? 'Leitura demonstrativa' : 'Preenchimento manual'}
                      </p>
                    </div>
                    <ChevronRight size={20} className="mt-1 shrink-0 text-ink-faint" aria-hidden />
                  </div>
                  <StatusPill tone={statusTone(pc.status)} className="self-start">
                    {STATUS_COPY[pc.status].label}
                  </StatusPill>
                  <p className="text-[0.9375rem] text-ink-soft">{f.medications.map((m) => `${m.name} ${m.strength}`).join(' · ') || 'Sem medicamentos transcritos'}</p>
                  <p className="mt-auto text-xs text-ink-faint">Atualizada em {formatDateTime(p.updatedAt)}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
