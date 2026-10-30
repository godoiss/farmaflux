import { useEffect, useState, type FormEvent } from 'react';
import { MonitorPlay, Type } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/Display';
import { TextField } from '../../components/ui/Field';
import { useStore } from '../../state/AppStore';
import { useAnnounce } from '../../state/Announcer';
import { useShell } from '../../components/layout/AppShell';
import { formatDateTime } from '../../domain/time';
import type { Preferences } from '../../domain/types';
import { ContextSwitch } from './ContextSwitch';

const TEXT_SIZES: Array<{ value: Preferences['textScale']; label: string; sample: string }> = [
  { value: 1, label: 'Padrão', sample: 'text-base' },
  { value: 1.125, label: 'Grande', sample: 'text-lg' },
  { value: 1.25, label: 'Maior', sample: 'text-xl' },
];

export function ProfilePage() {
  const { data, dispatch, prefs, setPrefs } = useStore();
  const announce = useAnnounce();
  const { openPresentation } = useShell();
  const assisted = data.people.find((p) => p.id === data.profile.assistedPersonId);
  const [name, setName] = useState(data.profile.displayName);
  const [assistedName, setAssistedName] = useState(assisted?.name ?? '');
  const [errors, setErrors] = useState<{ name?: string; assisted?: string }>({});

  useEffect(() => {
    setName(data.profile.displayName);
    setAssistedName(assisted?.name ?? '');
  }, [data.profile.displayName, assisted?.name]);

  const save = (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!name.trim()) errs.name = 'Informe como você quer ser chamada(o).';
    if (!assistedName.trim()) errs.assisted = 'Informe o nome da pessoa que você ajuda.';
    setErrors(errs);
    if (errs.name || errs.assisted) {
      document.getElementById(errs.name ? 'p-name' : 'p-assisted')?.focus();
      return;
    }
    dispatch({ type: 'profile/update', displayName: name.trim(), assistedName: assistedName.trim() });
    announce('Perfil atualizado.');
  };

  const unchanged = name.trim() === data.profile.displayName && assistedName.trim() === (assisted?.name ?? '');

  return (
    <div>
      <PageHeader eyebrow="Configurações" title="Perfil e acessibilidade" description="Sem CPF, prontuário ou dados clínicos: só o necessário para organizar a ida." />

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="space-y-6">
          <section id="contexto" className="card card-pad" aria-labelledby="ctx-title">
            <h2 id="ctx-title" className="text-lg font-bold">
              Contexto de uso
            </h2>
            <p className="mt-1 mb-4 text-[0.9375rem] text-ink-soft">Define de quem são os registros exibidos e os novos que você criar. Registros antigos continuam com seu dono.</p>
            <ContextSwitch />
          </section>

          <form className="card card-pad space-y-4" onSubmit={save} noValidate aria-labelledby="names-title">
            <h2 id="names-title" className="text-lg font-bold">
              Nomes
            </h2>
            <TextField id="p-name" label="Seu nome de exibição" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} error={errors.name} autoComplete="given-name" />
            <TextField id="p-assisted" label="Pessoa assistida" value={assistedName} maxLength={40} onChange={(e) => setAssistedName(e.target.value)} error={errors.assisted} hint="Como você chama a pessoa que ajuda, por exemplo “Dona Maria”." />
            <Button type="submit" disabled={unchanged} title={unchanged ? 'Nenhuma alteração para salvar' : undefined}>
              Salvar nomes
            </Button>
          </form>
        </div>

        <div className="space-y-6">
          <section className="card card-pad" aria-labelledby="a11y-title">
            <h2 id="a11y-title" className="flex items-center gap-2 text-lg font-bold">
              <Type size={20} className="text-teal" aria-hidden /> Tamanho do texto
            </h2>
            <p className="mt-1 mb-4 text-[0.9375rem] text-ink-soft">Fica salvo neste aparelho. Animações seguem a preferência de movimento reduzido do sistema.</p>
            <fieldset>
              <legend className="sr-only">Tamanho do texto</legend>
              <div className="grid grid-cols-3 gap-2">
                {TEXT_SIZES.map((s) => (
                  <label key={s.value} className={`flex min-h-20 cursor-pointer flex-col has-focus-visible:ring-3 has-focus-visible:ring-teal items-center justify-center gap-1 rounded-2xl border p-3 transition-colors ${prefs.textScale === s.value ? 'border-teal bg-mint/50' : 'border-line hover:border-line-strong'}`}>
                    <input
                      type="radio"
                      name="text-size"
                      className="sr-only"
                      checked={prefs.textScale === s.value}
                      onChange={() => {
                        setPrefs({ textScale: s.value });
                        announce(`Tamanho do texto: ${s.label}.`, 'info');
                      }}
                    />
                    <span className={`font-bold ${s.sample}`} aria-hidden>
                      Aa
                    </span>
                    <span className="text-sm font-semibold">{s.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </section>

          <section className="card card-pad" aria-labelledby="demo-title">
            <h2 id="demo-title" className="flex items-center gap-2 text-lg font-bold">
              <MonitorPlay size={20} className="text-teal" aria-hidden /> Demonstração
            </h2>
            <p className="mt-1 mb-4 text-[0.9375rem] text-ink-soft">
              Relógio da demonstração: <strong className="text-ink">{formatDateTime(data.clock)}</strong>. Use o modo apresentação para mudar data e hora ou reiniciar um cenário.
            </p>
            <Button variant="secondary" onClick={openPresentation} icon={<MonitorPlay size={18} aria-hidden />}>
              Abrir modo apresentação
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
}
