import { useEffect, useRef, useState } from 'react';
import { MessagesSquare, Send } from 'lucide-react';
import { PageHeader } from '../../components/ui/Display';
import { Button } from '../../components/ui/Button';

/**
 * Chat de coordenação entre farmacêuticos (demonstração).
 * Pilar do pitch: a rede de farmácias combina demanda e estoque antes do
 * deslocamento do paciente. Mensagens ficam salvas só neste navegador.
 */
type Msg = { id: string; mine: boolean; author: string; text: string; at: string };
type Thread = { id: string; name: string; unit: string; online: boolean; messages: Msg[] };

const STORAGE_KEY = 'farmaflux:demo:v1:chat';
const ME = 'Você · Farmácia UBS 2 Guará II';

const SEED: Thread[] = [
  {
    id: 'ubs5-guara1',
    name: 'Rafael Lima',
    unit: 'Farmácia · UBS 5 Guará I',
    online: true,
    messages: [
      { id: 's1', mine: false, author: 'Rafael', text: 'Bom dia! Chegaram 12 intenções de retirada de losartana 50mg para hoje à tarde aqui. Vocês têm folga no estoque?', at: '08:42' },
      { id: 's2', mine: true, author: ME, text: 'Bom dia, Rafael. Temos sim, ~80 caixas. Se precisar, consigo transferir 30 ainda hoje.', at: '08:47' },
      { id: 's3', mine: false, author: 'Rafael', text: 'Perfeito. Fecho 30 então. Mando o motoboy do CAF às 11h.', at: '08:49' },
    ],
  },
  {
    id: 'caf-df',
    name: 'CAF · Central de Abastecimento',
    unit: 'Coordenação de Assistência Farmacêutica',
    online: false,
    messages: [
      { id: 'c1', mine: false, author: 'CAF', text: 'Reposição de metformina 850mg programada para 31/10. Confirmem os saldos até 17h.', at: 'Ontem' },
      { id: 'c2', mine: true, author: ME, text: 'Confirmado: 42 caixas em estoque, consumo médio 9/dia.', at: 'Ontem' },
    ],
  },
  {
    id: 'ubs1-tag',
    name: 'Cláudia Souza',
    unit: 'Farmácia · UBS 1 Taguatinga',
    online: true,
    messages: [
      { id: 't1', mine: false, author: 'Cláudia', text: 'Oi! Paciente marcou intenção de retirada de sinvastatina mas estamos zerados. Conseguem cobrir?', at: '09:05' },
      { id: 't2', mine: true, author: ME, text: 'Conseguimos. Avisa o paciente que a retirada sai pela UBS 2 Guará II hoje das 7h às 11h30.', at: '09:08' },
    ],
  },
];

function loadThreads(): Thread[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Thread[];
  } catch {
    /* armazenamento indisponível: usa o roteiro semeado */
  }
  return SEED;
}

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function PharmacistsPage() {
  const [threads, setThreads] = useState<Thread[]>(() => loadThreads());
  const [activeId, setActiveId] = useState<string>(() => loadThreads()[0]?.id ?? '');
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const active = threads.find((t) => t.id === activeId) ?? threads[0];

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
    } catch {
      /* ignora falha de escrita (janela privada etc.) */
    }
  }, [threads]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [active?.messages.length, activeId]);

  const send = () => {
    const text = draft.trim();
    if (!text || !active) return;
    const msg: Msg = { id: newId(), mine: true, author: ME, text, at: 'agora' };
    setThreads((prev) => prev.map((t) => (t.id === active.id ? { ...t, messages: [...t.messages, msg] } : t)));
    setDraft('');
  };

  return (
    <div>
      <PageHeader
        eyebrow="Rede · Coordenação"
        title="Farmacêuticos"
        description="Converse com as farmácias da rede para combinar estoque e intenções de retirada antes do paciente se deslocar."
      />

      <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
        {/* Lista de conversas */}
        <aside className="card overflow-hidden" aria-label="Conversas">
          <ul className="divide-y divide-line">
            {threads.map((t) => {
              const last = t.messages[t.messages.length - 1];
              const isActive = t.id === active?.id;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(t.id)}
                    aria-current={isActive ? 'true' : undefined}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${isActive ? 'bg-mint/60' : 'hover:bg-neutral-bg'}`}
                  >
                    <span className="person-avatar person-avatar-small mt-0.5" aria-hidden>
                      {t.name.charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <strong className="truncate text-[0.9375rem]">{t.name}</strong>
                        {t.online && <span className="size-2 shrink-0 rounded-full bg-green-ink" aria-label="online" />}
                      </span>
                      <span className="block truncate text-xs text-ink-soft">{t.unit}</span>
                      {last && <span className="mt-1 block truncate text-xs text-ink-faint">{last.mine ? 'Você: ' : ''}{last.text}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Conversa ativa */}
        <section className="card flex min-h-0 flex-col" aria-label={active ? `Conversa com ${active.name}` : 'Conversa'}>
          {active && (
            <>
              <header className="flex items-center gap-3 border-b border-line px-5 py-3.5">
                <span className="person-avatar person-avatar-small" aria-hidden>{active.name.charAt(0)}</span>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{active.name}</p>
                  <p className="truncate text-xs text-ink-soft">{active.unit}{active.online ? ' · online' : ''}</p>
                </div>
              </header>

              <div className="flex h-[clamp(20rem,48vh,32rem)] flex-col gap-3 overflow-y-auto px-5 py-4">
                {active.messages.map((m) => (
                  <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[0.9375rem] ${m.mine ? 'bg-teal-deep text-white' : 'bg-neutral-bg text-ink'}`}>
                      {!m.mine && <p className="mb-0.5 text-xs font-semibold text-teal">{m.author}</p>}
                      <p className="whitespace-pre-wrap">{m.text}</p>
                      <p className={`mt-1 text-[0.6875rem] ${m.mine ? 'text-white/70' : 'text-ink-faint'}`}>{m.at}</p>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>

              <form
                className="flex items-end gap-2 border-t border-line px-4 py-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                <label htmlFor="chat-input" className="sr-only">Mensagem</label>
                <input
                  id="chat-input"
                  className="input"
                  placeholder="Escreva uma mensagem…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  autoComplete="off"
                />
                <Button type="submit" variant="primary" icon={<Send size={18} aria-hidden />} disabled={!draft.trim()}>
                  Enviar
                </Button>
              </form>
            </>
          )}
        </section>
      </div>

      <p className="mt-4 flex items-center gap-2 text-xs text-ink-faint">
        <MessagesSquare size={14} aria-hidden /> Demonstração · as mensagens ficam salvas apenas neste navegador.
      </p>
    </div>
  );
}
