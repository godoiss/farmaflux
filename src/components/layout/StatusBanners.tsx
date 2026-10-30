import { HardDrive, X } from 'lucide-react';
import { useStore } from '../../state/AppStore';

/** Informa limitações de armazenamento sem interromper o uso. */
export function StatusBanners() {
  const { persistence, dismissLoadNotice } = useStore();
  const messages: Array<{ key: string; text: string; dismissible: boolean }> = [];

  if (!persistence.ok) {
    messages.push({
      key: 'save',
      text: 'Não foi possível salvar neste navegador. Você pode continuar usando, mas as alterações se perdem ao recarregar a página.',
      dismissible: false,
    });
  }
  if (persistence.loadNotice === 'invalid_schema') {
    messages.push({
      key: 'schema',
      text: 'Os dados salvos estavam em um formato incompatível. Restauramos a demonstração inicial.',
      dismissible: true,
    });
  }
  if (messages.length === 0) return null;

  return (
    <div className="no-print space-y-2 px-4 pt-4 sm:px-6 lg:px-10" role="status">
      {messages.map((m) => (
        <div key={m.key} className="callout callout-warning mx-auto max-w-6xl items-center">
          <HardDrive size={20} className="shrink-0 text-amber-ink" aria-hidden />
          <p className="flex-1 text-[0.9375rem]">{m.text}</p>
          {m.dismissible && (
            <button type="button" className="btn-icon" onClick={dismissLoadNotice} aria-label="Fechar aviso">
              <X size={18} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
