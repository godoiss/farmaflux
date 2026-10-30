import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';

type Tone = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  message: string;
  tone: Tone;
}

const AnnouncerContext = createContext<(message: string, tone?: Tone) => void>(() => undefined);

const ICON = { success: CircleCheck, error: CircleAlert, info: Info };

/** Feedback visual + anúncio para leitores de tela. Complementa, nunca substitui, a operação. */
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [politeText, setPoliteText] = useState('');
  const [assertiveText, setAssertiveText] = useState('');
  const seq = useRef(0);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const announce = useCallback(
    (message: string, tone: Tone = 'success') => {
      const id = ++seq.current;
      setToasts((t) => [...t.slice(-2), { id, message, tone }]);
      if (tone === 'error') setAssertiveText(message);
      else setPoliteText(message);
      timers.current.set(id, window.setTimeout(() => dismiss(id), tone === 'error' ? 7000 : 4500));
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => window.clearTimeout(t));
  }, []);

  return (
    <AnnouncerContext.Provider value={announce}>
      {children}
      <div className="sr-only" aria-live="polite" role="status">{politeText}</div>
      <div className="sr-only" aria-live="assertive" role="alert">{assertiveText}</div>
      <div className="toast-region no-print" aria-hidden="true">
        {toasts.map((t) => {
          const Icon = ICON[t.tone];
          return (
            <div key={t.id} className={`toast toast-${t.tone}`}>
              <Icon size={20} aria-hidden />
              <span className="flex-1">{t.message}</span>
              <button type="button" className="toast-close" onClick={() => dismiss(t.id)} tabIndex={-1} aria-label="Fechar aviso">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </AnnouncerContext.Provider>
  );
}

export const useAnnounce = () => useContext(AnnouncerContext);
