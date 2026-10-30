import { useState } from 'react';
import { ArrowUpRight, Building2, Clock, Landmark, Pill, Search, ShieldCheck } from 'lucide-react';
import { PageHeader, Callout, StatusPill } from '../../components/ui/Display';
import { MEDICATION_CATALOG } from '../../data/fixtures/catalog';

/**
 * Painel de fontes oficiais da proposta (demonstração). Reúne os órgãos e
 * cadastros citados no pitch com link oficial e um "status" de exemplo. A
 * integração ao vivo exigiria backend; aqui os dados de amostra são rotulados.
 */
type Source = {
  name: string;
  org: string;
  category: string;
  description: string;
  updated: string;
  url: string;
};

const SOURCES: Source[] = [
  { name: 'CFF', org: 'Conselho Federal de Farmácia', category: 'Órgão de classe', description: 'Registro e normas do exercício farmacêutico; base para identificar o profissional responsável.', updated: 'hoje, 08:00', url: 'https://www.cff.org.br' },
  { name: 'CFM', org: 'Conselho Federal de Medicina', category: 'Órgão de classe', description: 'Validação do prescritor (CRM) por trás da receita.', updated: 'hoje, 08:00', url: 'https://portal.cfm.org.br' },
  { name: 'ANVISA', org: 'Medicamentos registrados', category: 'Registro', description: 'Consulta de registro e situação de medicamentos.', updated: 'hoje, 07:30', url: 'https://consultas.anvisa.gov.br/#/medicamentos/' },
  { name: 'CNES', org: 'Cadastro Nacional de Estabelecimentos de Saúde · DataSUS', category: 'Cadastro', description: 'Cadastro oficial das farmácias e unidades de saúde.', updated: 'ontem', url: 'https://cnes.datasus.gov.br' },
  { name: 'SES-DF', org: 'Secretaria de Saúde do DF', category: 'Regras de receita', description: 'Regras de dispensação e validade de receitas no DF.', updated: 'hoje, 06:00', url: 'https://www.saude.df.gov.br' },
  { name: 'Farmácia Popular', org: 'Ministério da Saúde', category: 'Programa', description: 'Medicamentos gratuitos/subsidiados e rede credenciada.', updated: 'hoje, 09:00', url: 'https://www.gov.br/saude/pt-br/composicao/sectics/farmacia-popular' },
  { name: 'CONASS', org: 'Conselho Nacional de Secretários de Saúde', category: 'Catálogo', description: 'Catálogos e referências de medicamentos e assistência.', updated: 'esta semana', url: 'https://www.conass.org.br' },
  { name: 'InfoSaúde DF', org: 'Prontuário eletrônico · SES-DF', category: 'Integração', description: 'Base assistencial do DF (integração futura).', updated: '—', url: 'https://www.saude.df.gov.br' },
  { name: 'gov.br Farmácia', org: 'Serviços de farmácia do Governo Federal', category: 'Portal', description: 'Serviços e orientações oficiais ao cidadão.', updated: 'hoje', url: 'https://www.gov.br/pt-br/servicos?q=farmacia' },
];

/** Farmácias ambulatoriais de referência (amostra). */
const PHARMACIES = [
  { unit: 'UBS 2 — Guará II', cnes: 'DEMO-CNES-2001', hours: 'Seg–Sex · 07h00–11h30 e 13h00–17h00', ref: true },
  { unit: 'UBS 5 — Guará I', cnes: 'DEMO-CNES-2002', hours: 'Seg–Sex · 07h00–17h00' },
  { unit: 'UBS 1 — Taguatinga', cnes: 'DEMO-CNES-3001', hours: 'Seg–Sex · 08h00–18h00' },
];

/** Dados de registro de amostra por medicamento (apenas demonstração). */
const MED_EXTRA: Record<string, { anvisa: string; popular: boolean }> = {
  'DEMO-MED-001': { anvisa: '1.0000.0001', popular: true },
  'DEMO-MED-002': { anvisa: '1.0000.0002', popular: true },
  'DEMO-MED-003': { anvisa: '1.0000.0003', popular: false },
};

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function SourcesPage() {
  const [q, setQ] = useState('');
  const meds = MEDICATION_CATALOG.filter((m) => !q.trim() || normalize(`${m.name} ${m.strength}`).includes(normalize(q.trim())));

  return (
    <div>
      <PageHeader
        eyebrow="Rede · Dados da proposta"
        title="Fontes oficiais"
        description="Os órgãos e cadastros que sustentam a proposta, reunidos em um só lugar."
      />

      <Callout tone="info" title="Demonstração">
        Links oficiais reais; os indicadores de atualização e os registros abaixo são de exemplo. A integração em tempo real
        depende de backend e de credenciais de cada órgão.
      </Callout>

      <section className="mt-6" aria-labelledby="fontes-title">
        <h2 id="fontes-title" className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Landmark size={20} className="text-teal" aria-hidden /> Órgãos e cadastros
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {SOURCES.map((s) => (
            <a
              key={s.name}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="card card-pad card-link flex flex-col"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-xs text-ink-soft">{s.org}</p>
                </div>
                <ArrowUpRight size={18} className="shrink-0 text-ink-faint" aria-hidden />
              </div>
              <p className="mt-3 flex-1 text-[0.9375rem] text-ink-soft">{s.description}</p>
              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="pill tone-neutral">{s.category}</span>
                <span className="flex items-center gap-1 text-xs text-ink-faint">
                  <Clock size={13} aria-hidden /> {s.updated}
                </span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="farmacias-title">
        <h2 id="farmacias-title" className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Building2 size={20} className="text-teal" aria-hidden /> Farmácias ambulatoriais
        </h2>
        <div className="card overflow-hidden">
          <ul className="divide-y divide-line">
            {PHARMACIES.map((p) => (
              <li key={p.cnes} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-medium">
                    {p.unit}
                    {p.ref && <StatusPill tone="success">Referência</StatusPill>}
                  </p>
                  <p className="text-xs text-ink-soft">CNES {p.cnes}</p>
                </div>
                <p className="flex items-center gap-1.5 text-sm text-ink-soft">
                  <Clock size={14} aria-hidden /> {p.hours}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="med-title">
        <h2 id="med-title" className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Pill size={20} className="text-teal" aria-hidden /> Consulta de medicamento
        </h2>
        <div className="relative mb-4 sm:w-96">
          <label htmlFor="med-search" className="sr-only">Buscar medicamento</label>
          <Search size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input
            id="med-search"
            className="input pl-11"
            placeholder="Buscar por nome…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {meds.map((m) => {
            const extra = MED_EXTRA[m.code];
            return (
              <div key={m.code} className="card card-pad">
                <p className="font-semibold">{m.name}</p>
                <p className="text-sm text-ink-soft">{m.strength} · {m.form}</p>
                <dl className="mt-3 space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-ink-soft">
                    <ShieldCheck size={15} className="text-teal" aria-hidden />
                    Registro ANVISA <strong className="text-ink">{extra?.anvisa ?? '—'}</strong>
                  </div>
                  {extra?.popular && <StatusPill tone="info">Farmácia Popular</StatusPill>}
                </dl>
              </div>
            );
          })}
          {meds.length === 0 && <p className="text-ink-soft">Nenhum medicamento encontrado.</p>}
        </div>
        <p className="mt-3 text-xs text-ink-faint">Registros e disponibilidade são de exemplo (demonstração).</p>
      </section>
    </div>
  );
}
