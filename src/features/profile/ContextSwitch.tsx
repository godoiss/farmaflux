import { useStore } from '../../state/AppStore';
import { useAnnounce } from '../../state/Announcer';
import { USAGE_MODE_LABEL } from '../../domain/labels';
import type { UsageMode } from '../../domain/types';

/** Alterna "Para mim" / "Estou ajudando alguém" — muda a pessoa dos registros visíveis e novos. */
export function ContextSwitch({ label = 'Contexto de uso' }: { label?: string }) {
  const { data, dispatch } = useStore();
  const announce = useAnnounce();

  const select = (mode: UsageMode) => {
    if (mode === data.profile.mode) return;
    dispatch({ type: 'profile/setMode', mode });
    const person = data.people.find((p) => p.id === (mode === 'self' ? data.profile.selfPersonId : data.profile.assistedPersonId));
    announce(`Agora você está vendo os registros de ${person?.name ?? 'outra pessoa'}.`, 'info');
  };

  return (
    <div role="group" aria-label={label} className="segmented">
      {(['helping', 'self'] as UsageMode[]).map((mode) => (
        <button key={mode} type="button" aria-pressed={data.profile.mode === mode} onClick={() => select(mode)}>
          {USAGE_MODE_LABEL[mode]}
        </button>
      ))}
    </div>
  );
}
