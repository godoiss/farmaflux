import { Link, useSearchParams } from 'react-router-dom';
import { Building2, ChevronRight, Clock, MapPin, Search, Stethoscope } from 'lucide-react';
import { Button, LinkButton } from '../../components/ui/Button';
import { Callout, EmptyState, PageHeader, StatusPill } from '../../components/ui/Display';
import { SelectField } from '../../components/ui/Field';
import { useStore } from '../../state/AppStore';
import { prescriptionsOfActive } from '../../state/selectors';
import { currentVersionOf } from '../../domain/rules/planRules';
import { coverage, isStale, unitHeadline } from '../../domain/rules/unitRules';
import { PHARMACIST_LABEL } from '../../domain/labels';
import { formatDateTime } from '../../domain/time';
import { REGIONS } from '../../data/fixtures/units';
import { primaryPrescription } from '../home/journey';
import { CoverageList, coverageText, coverageTone } from './UnitParts';

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Resolve a receita usada para cruzar disponibilidade (parâmetro "receita" ou a principal). */
export function useSelectedPrescription() {
  const { data } = useStore();
  const [params] = useSearchParams();
  const raw = params.get('receita');
  const options = prescriptionsOfActive(data);
  if (raw === 'nenhuma') return { options, prescription: undefined, value: 'nenhuma' };
  const prescription = options.find((p) => p.id === raw) ?? primaryPrescription(data)?.prescription;
  return { options, prescription, value: prescription?.id ?? 'nenhuma' };
}

export function UnitsPage() {
  const { data } = useStore();
  const [params, setParams] = useSearchParams();
  const { options, prescription, value: rxValue } = useSelectedPrescription();
  const meds = prescription ? (currentVersionOf(prescription)?.confirmed ?? currentVersionOf(prescription)?.extracted)?.medications ?? [] : [];

  const q = params.get('q') ?? '';
  const region = params.get('regiao') ?? '';
  const availability = params.get('disp') ?? 'qualquer';
  const order = params.get('ordem') === 'nome' ? 'nome' : 'cobertura';

  const update = (key: string, value: string, replace = false) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace });
  };

  const clearFilters = () => {
    const next = new URLSearchParams();
    if (params.get('receita')) next.set('receita', params.get('receita')!);
    setParams(next);
  };

  const list = data.units
    .filter((u) => !region || u.region === region)
    .filter((u) => !q.trim() || normalize(`${u.name} ${u.code} ${u.region}`).includes(normalize(q.trim())))
    .filter((u) => {
      if (!meds.length || availability === 'qualquer') return true;
      const c = coverage(u, meds);
      return availability === 'todos' ? c.informed === c.total : c.informed > 0;
    })
    .sort((a, b) => (order === 'nome' || !meds.length ? a.name.localeCompare(b.name, 'pt-BR') : coverage(b, meds).informed - coverage(a, meds).informed || a.name.localeCompare(b.name, 'pt-BR')));

  const latest = data.units.map((u) => u.updatedAt).sort().at(-1);
  const hasFilters = Boolean(q || region || availability !== 'qualquer' || params.get('ordem'));
  const suffix = prescription ? `?receita=${prescription.id}` : '';

  return (
    <div>
      <PageHeader eyebrow="Preparar retirada" title="Unidades" description="Compare horários cadastrados, condições e a disponibilidade informada dos itens da receita." />

      <div className="mb-6">
        <Callout tone="info" title="Dados demonstrativos">
          Unidades e estoques fictícios, atualizados até {formatDateTime(latest)}. Disponibilidade informada não é reserva nem garantia de estoque.
        </Callout>
      </div>

      <section className="card card-pad mb-6" aria-label="Filtros">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div>
            <label htmlFor="unit-search" className="label">
              Buscar unidade
            </label>
            <div className="relative">
              <Search size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-faint" aria-hidden />
              <input id="unit-search" type="search" className="input pl-11" placeholder="Nome ou código" value={q} onChange={(e) => update('q', e.target.value, true)} />
            </div>
          </div>
          <SelectField label="Região" value={region} onChange={(e) => update('regiao', e.target.value)}>
            <option value="">Todas as regiões</option>
            {REGIONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </SelectField>
          <SelectField label="Itens da receita" value={rxValue} onChange={(e) => update('receita', e.target.value)}>
            <option value="nenhuma">Não cruzar com receita</option>
            {options.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title} (v{currentVersionOf(p)?.number})
              </option>
            ))}
          </SelectField>
          <SelectField label="Disponibilidade" value={availability} onChange={(e) => update('disp', e.target.value === 'qualquer' ? '' : e.target.value)} disabled={!meds.length} hint={!meds.length ? 'Escolha uma receita para filtrar.' : undefined}>
            <option value="qualquer">Qualquer</option>
            <option value="todos">Todos os itens informados</option>
            <option value="algum">Ao menos um item informado</option>
          </SelectField>
          <SelectField label="Ordenar por" value={order} onChange={(e) => update('ordem', e.target.value === 'cobertura' ? '' : e.target.value)}>
            <option value="cobertura">Cobertura dos itens</option>
            <option value="nome">Nome</option>
          </SelectField>
        </div>
      </section>

      <p className="sr-only" role="status">
        {list.length} unidade(s) encontrada(s)
      </p>

      {list.length === 0 ? (
        <EmptyState icon={<Building2 size={26} aria-hidden />} title="Nenhuma unidade com esses filtros" action={<Button variant="secondary" onClick={clearFilters}>Limpar filtros</Button>}>
          Ajuste a busca, a região ou a disponibilidade.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {list.map((u) => {
            const head = unitHeadline(u, data.clock);
            const c = coverage(u, meds);
            return (
              <li key={u.id} className="card card-pad flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold tracking-wide text-ink-faint uppercase">{u.code} · fictícia</p>
                    <h2 className="text-lg font-bold">{u.name}</h2>
                    <p className="flex items-center gap-1.5 text-sm text-ink-soft">
                      <MapPin size={15} aria-hidden /> {u.region}
                    </p>
                  </div>
                  {meds.length > 0 && <StatusPill tone={coverageTone(u, meds)}>{`${c.informed}/${c.total}`}</StatusPill>}
                </div>

                <div className="flex flex-wrap gap-2">
                  <StatusPill tone={head.tone}>{head.text}</StatusPill>
                  {isStale(u, data.clock) && <StatusPill tone="warning">Informação desatualizada</StatusPill>}
                </div>

                {meds.length > 0 ? (
                  <div className="rounded-2xl bg-canvas p-4">
                    <p className="mb-2 font-semibold">{coverageText(c)}</p>
                    <CoverageList unit={u} medications={meds} />
                  </div>
                ) : (
                  <p className="text-sm text-ink-soft">Escolha uma receita no filtro para ver a cobertura dos itens.</p>
                )}

                <div className="space-y-1 text-sm text-ink-soft">
                  <p className="flex items-center gap-2">
                    <Stethoscope size={15} aria-hidden /> Atendimento farmacêutico: {PHARMACIST_LABEL[u.pharmacist]}
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock size={15} aria-hidden /> Atualizado em {formatDateTime(u.updatedAt)}
                  </p>
                </div>

                <div className="mt-auto flex flex-col gap-2 sm:flex-row">
                  <LinkButton to={`/unidades/${u.id}${suffix}`} variant="secondary" iconRight={<ChevronRight size={18} aria-hidden />}>
                    Ver detalhes
                  </LinkButton>
                  {prescription && (
                    <LinkButton to={`/planos/novo?receita=${prescription.id}&unidade=${u.id}`} variant="soft">
                      Escolher para o plano
                    </LinkButton>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {hasFilters && list.length > 0 && (
        <p className="mt-6 text-center">
          <button type="button" className="btn btn-ghost" onClick={clearFilters}>
            Limpar filtros
          </button>
        </p>
      )}
      <p className="mt-6 text-center text-sm text-ink-soft">
        Fonte: Dados demonstrativos. Sem integração com sistemas oficiais. <Link to="/ajuda#disponibilidade" className="font-semibold text-teal hover:underline">Entenda a disponibilidade</Link>
      </p>
    </div>
  );
}
