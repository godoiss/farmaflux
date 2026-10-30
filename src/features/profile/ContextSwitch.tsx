import { useStore } from '../../state/AppStore';
import { useAnnounce } from '../../state/Announcer';
import { USAGE_MODE_LABEL } from '../../domain/labels';
import type { UsageMode } from '../../domain/types';
import { activePerson } from '../../state/selectors';

/** Alterna "Para mim" / "Estou ajudando alguém" — muda a pessoa dos registros visíveis e novos. */
export function ContextSwitch({ label = 'Contexto de uso' }: { label?: string }) {
  const { data, dispatch } = useStore();
  const announce = useAnnounce();

  const select = (mode: UsageMode) => {
    if (mode === data.profile.mode) return;
    // Calcula o estado futuro para obter o nome correto após a troca
    const futureData = { ...data, profile: { ...data.profile, mode } };
    const personName = activePerson(futureData).name;
    dispatch({ type: 'profile/setMode', mode });
    announce(
      mode === 'self'
        ? `Agora você está vendo os seus registros.`
        : `Agora você está vendo os registros de ${personName}.`,
      'info',
    );
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
