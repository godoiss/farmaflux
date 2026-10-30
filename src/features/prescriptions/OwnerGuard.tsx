import type { ReactNode } from 'react';
import { Users } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/Display';
import { useStore } from '../../state/AppStore';
import { activePersonId, personName } from '../../state/selectors';

/**
 * Evita misturar registros entre pessoas: se o registro pertence a outra
 * pessoa do perfil, oferece alternar o contexto em vez de exibi-lo.
 */
export function OwnerGuard({ ownerId, children }: { ownerId: string; children: ReactNode }) {
  const { data, dispatch } = useStore();
  if (ownerId === activePersonId(data)) return <>{children}</>;
  const owner = personName(data, ownerId);
  const mode = ownerId === data.profile.selfPersonId ? 'self' : 'helping';
  return (
    <div className="pt-6">
      <h1 tabIndex={-1} className="sr-only">
        Registro de outra pessoa
      </h1>
      <EmptyState
        icon={<Users size={26} aria-hidden />}
        title={`Este registro é de ${owner}`}
        action={<Button onClick={() => dispatch({ type: 'profile/setMode', mode })}>Ver registros de {owner}</Button>}
      >
        Você está vendo os registros de outra pessoa. Alterne o contexto para abrir este registro.
      </EmptyState>
    </div>
  );
}
