import { SearchX } from 'lucide-react';
import { LinkButton } from '../ui/Button';
import { EmptyState } from '../ui/Display';

/** Estado para rota desconhecida ou registro inexistente (ex.: excluído). */
export function NotFound({ what }: { what?: 'receita' | 'unidade' | 'plano' }) {
  const title = what ? `Não encontramos ${what === 'unidade' ? 'esta unidade' : what === 'plano' ? 'este plano' : 'esta receita'}` : 'Página não encontrada';
  const back = what === 'unidade' ? '/unidades' : what === 'plano' ? '/lembretes?aba=planos' : what === 'receita' ? '/receitas' : '/';
  return (
    <div className="pt-6">
      <h1 tabIndex={-1} className="sr-only">
        {title}
      </h1>
      <EmptyState
        icon={<SearchX size={26} aria-hidden />}
        title={title}
        action={
          <>
            <LinkButton to={back}>{what ? 'Voltar para a lista' : 'Ir para o início'}</LinkButton>
            {what && (
              <LinkButton to="/inicio" variant="secondary">
                Início
              </LinkButton>
            )}
          </>
        }
      >
        {what ? 'O registro pode ter sido excluído, pertencer a outra pessoa do perfil ou o cenário foi reiniciado.' : 'O endereço pode estar incorreto.'}
      </EmptyState>
    </div>
  );
}
