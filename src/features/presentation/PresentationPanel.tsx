import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, RotateCcw, Projector } from 'lucide-react';
import { Dialog, ConfirmDialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { MaskedField } from '../../components/ui/Field';
import { Callout } from '../../components/ui/Display';
import { useStore } from '../../state/AppStore';
import { useAnnounce } from '../../state/Announcer';
import { addMinutes, datePart, formatDate, formatDateTime, isValidLocalDateTime, parseBrDate, timePart } from '../../domain/time';
import { DEMO_START, SCENARIOS } from '../../data/fixtures/scenarios';
import type { ScenarioId } from '../../domain/types';

/** Controles técnicos da apresentação, separados da jornada do paciente. */
export function PresentationPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, dispatch, resetScenario, persistence } = useStore();
  const announce = useAnnounce();
  const navigate = useNavigate();
  const [date, setDate] = useState(formatDate(datePart(data.clock)));
  const [time, setTime] = useState(timePart(data.clock));
  const [error, setError] = useState<string>();
  const [scenario, setScenario] = useState<ScenarioId>(data.scenario);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDate(formatDate(datePart(data.clock)));
    setTime(timePart(data.clock));
    setScenario(data.scenario);
    setError(undefined);
  }, [open, data.clock, data.scenario]);

  const setClock = (value: string) => {
    dispatch({ type: 'clock/set', value });
    announce(`Relógio da demonstração: ${formatDateTime(value)}.`, 'info');
  };

  const applyManual = () => {
    const d = parseBrDate(date);
    const value = d ? `${d}T${time}` : '';
    if (!d || !isValidLocalDateTime(value)) {
      setError('Use data dd/mm/aaaa e hora hh:mm (24 horas).');
      return;
    }
    setError(undefined);
    setClock(value);
  };

  const doReset = () => {
    resetScenario(scenario);
    setConfirmReset(false);
    onClose();
    navigate('/inicio');
    announce(`Cenário ${SCENARIOS[scenario].title} reiniciado.`);
  };

  return (
    <>
      <Dialog open={open && !confirmReset} onClose={onClose} variant="drawer" title="Modo apresentação" description="Controles técnicos para a banca. Não fazem parte da jornada do paciente.">
        <section aria-labelledby="clock-title" className="space-y-4">
          <div className="rounded-2xl bg-ink p-4 text-white">
            <p id="clock-title" className="flex items-center gap-2 text-sm text-white/75">
              <Clock size={16} aria-hidden /> Relógio da demonstração · America/Sao_Paulo
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums" aria-live="polite">
              {formatDateTime(data.clock)}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="secondary" className="px-2" onClick={() => setClock(addMinutes(data.clock, 60))}>
              +1 hora
            </Button>
            <Button variant="secondary" className="px-2" onClick={() => setClock(addMinutes(data.clock, 24 * 60))}>
              +1 dia
            </Button>
            <Button variant="secondary" className="px-2" onClick={() => setClock(DEMO_START)}>
              Início
            </Button>
          </div>
          <form
            className="grid grid-cols-[1fr_7rem] items-start gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              applyManual();
            }}
            noValidate
          >
            <MaskedField mask="date" label="Data" value={date} onValueChange={setDate} error={error} />
            <MaskedField mask="time" label="Hora" value={time} onValueChange={setTime} />
            <Button type="submit" variant="soft" className="col-span-2">
              Aplicar data e hora
            </Button>
          </form>
          <p className="text-sm text-ink-soft">Vencimentos, prazos, horários e lembretes são recalculados com este relógio.</p>
        </section>

        <section aria-labelledby="opening-title" className="mt-8 space-y-3">
          <h3 id="opening-title" className="text-lg font-bold">
            Tela de abertura
          </h3>
          <p className="text-sm text-ink-soft">Fundo animado da marca para iniciar o pitch no Demo Day.</p>
          <Button
            variant="secondary"
            block
            icon={<Projector size={18} aria-hidden />}
            onClick={() => {
              onClose();
              navigate('/');
            }}
          >
            Abrir tela de abertura
          </Button>
        </section>

        <section aria-labelledby="scenario-title" className="mt-8 space-y-3">
          <h3 id="scenario-title" className="text-lg font-bold">
            Cenário
          </h3>
          <fieldset className="space-y-2">
            <legend className="sr-only">Escolha o cenário para reiniciar</legend>
            {(Object.keys(SCENARIOS) as ScenarioId[]).map((id) => (
              <label key={id} className={`flex cursor-pointer gap-3 rounded-2xl border p-3 transition-colors ${scenario === id ? 'border-teal bg-mint/50' : 'border-line hover:border-line-strong'}`}>
                <input type="radio" name="scenario" className="mt-1 size-5 accent-teal" checked={scenario === id} onChange={() => setScenario(id)} />
                <span>
                  <span className="block font-semibold">
                    {SCENARIOS[id].title}
                    {data.scenario === id && <span className="ml-2 text-xs font-medium text-teal">(atual)</span>}
                  </span>
                  <span className="block text-sm text-ink-soft">{SCENARIOS[id].description}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <Button variant="primary" block icon={<RotateCcw size={18} aria-hidden />} onClick={() => setConfirmReset(true)}>
            Reiniciar cenário {scenario}
          </Button>
          {!persistence.ok && <Callout tone="warning">O armazenamento local não está disponível: a demonstração funciona apenas nesta sessão.</Callout>}
        </section>
      </Dialog>

      <ConfirmDialog
        open={confirmReset}
        title={`Reiniciar ${SCENARIOS[scenario].title}?`}
        description="Todos os dados do FarmaFlux neste navegador voltarão ao início do cenário. Outros sites e apps não são afetados. A preferência de tamanho de texto é mantida."
        confirmLabel="Reiniciar"
        onConfirm={doReset}
        onCancel={() => setConfirmReset(false)}
      />
    </>
  );
}
