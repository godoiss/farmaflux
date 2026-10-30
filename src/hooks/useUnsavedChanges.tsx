import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';
import { ConfirmDialog } from '../components/ui/Dialog';

/**
 * Pede confirmação antes de abandonar alterações não salvas — tanto em
 * navegação interna (rotas) quanto ao fechar/recarregar a aba.
 */
export function useUnsavedChanges(dirty: boolean, message = 'As alterações feitas nesta tela ainda não foram salvas.') {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const dialog = (
    <ConfirmDialog
      open={blocker.state === 'blocked'}
      title="Sair sem salvar?"
      description={message}
      confirmLabel="Sair sem salvar"
      cancelLabel="Continuar editando"
      variant="danger"
      onConfirm={() => blocker.proceed?.()}
      onCancel={() => blocker.reset?.()}
    />
  );
  return dialog;
}
