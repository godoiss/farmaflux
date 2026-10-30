import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button, cx, type ButtonVariant } from './Button';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  variant?: 'modal' | 'drawer';
  /** Bloqueia fechamento enquanto uma operação está em andamento. */
  busy?: boolean;
  className?: string;
}

/**
 * Modal/drawer acessível baseado em <dialog>: foco preso pelo navegador,
 * Escape fecha, e o foco volta ao controle que abriu.
 */
export function Dialog({ open, onClose, title, description, children, footer, variant = 'modal', busy = false, className }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnTo.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
      const target = dialog.querySelector<HTMLElement>('[data-autofocus]') ?? dialog.querySelector<HTMLElement>('h2');
      target?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Devolve o foco ao fechar (inclusive ao desmontar).
  useEffect(() => {
    if (open) return;
    const target = returnTo.current;
    returnTo.current = null;
    if (!target) return;
    if (target.isConnected) target.focus();
    else document.querySelector<HTMLElement>('main h1')?.focus();
  }, [open]);

  const requestClose = () => {
    if (!busy) onClose();
  };

  return (
    <dialog
      ref={ref}
      className={cx(variant === 'drawer' ? 'drawer' : 'dialog', className)}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(e) => {
        e.preventDefault();
        requestClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      {open && (
        <div className={cx('flex flex-col', variant === 'drawer' ? 'h-full' : 'max-h-[calc(100dvh-2rem)]')}>
          <header className="flex items-start gap-3 border-b border-line px-5 pt-5 pb-4 sm:px-6">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} tabIndex={-1} className="text-xl font-bold outline-none">
                {title}
              </h2>
              {description && (
                <div id={descId} className="mt-1 text-[0.9375rem] text-ink-soft">
                  {description}
                </div>
              )}
            </div>
            <button type="button" className="btn-icon -mt-1 -mr-2" onClick={requestClose} aria-label="Fechar" disabled={busy}>
              <X size={20} />
            </button>
          </header>
          {children && <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>}
          {footer && <footer className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end sm:px-6">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: ButtonVariant;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

export function ConfirmDialog({ open, title, description, confirmLabel, cancelLabel = 'Voltar', variant = 'primary', onConfirm, onCancel, children }: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} data-autofocus>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}
