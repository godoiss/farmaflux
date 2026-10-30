import { useNavigate } from 'react-router-dom';
import { BellRing, CheckCheck, ChevronRight, Inbox } from 'lucide-react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { useStore } from '../../state/AppStore';
import { useAnnounce } from '../../state/Announcer';
import { activePerson, notificationsOfActive } from '../../state/selectors';
import { formatDateTime } from '../../domain/time';

export function NotificationCenter({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, dispatch } = useStore();
  const announce = useAnnounce();
  const navigate = useNavigate();
  const person = activePerson(data);
  const list = [...notificationsOfActive(data)].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unread = list.filter((n) => !n.readAt).length;

  const openRelated = (id: string, reminderId: string) => {
    dispatch({ type: 'notification/read', id });
    onClose();
    navigate(`/lembretes?lembrete=${encodeURIComponent(reminderId)}`);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="drawer"
      title="Notificações"
      description={`Avisos de ${person.name}, gerados com o FarmaFlux aberto.`}
      footer={
        unread > 0 ? (
          <Button
            variant="secondary"
            icon={<CheckCheck size={18} aria-hidden />}
            onClick={() => {
              dispatch({ type: 'notification/readAll', personId: person.id });
              announce('Todas as notificações foram marcadas como lidas.');
            }}
          >
            Marcar todas como lidas
          </Button>
        ) : undefined
      }
    >
      {list.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-mint text-teal">
            <Inbox size={24} aria-hidden />
          </span>
          <p className="font-semibold">Nenhuma notificação</p>
          <p className="mt-1 max-w-xs text-ink-soft">Quando um lembrete vencer, o aviso aparece aqui.</p>
        </div>
      ) : (
        <ul className="space-y-3" aria-label={`${unread} não lida(s) de ${list.length}`}>
          {list.map((n) => {
            const reminderExists = data.reminders.some((r) => r.id === n.reminderId);
            return (
              <li key={n.id} className={`rounded-2xl border p-4 ${n.readAt ? 'border-line bg-surface' : 'border-mint-strong bg-mint/50'}`}>
                <div className="flex items-start gap-3">
                  <BellRing size={20} className={`mt-0.5 shrink-0 ${n.readAt ? 'text-ink-faint' : 'text-teal'}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {!n.readAt && <span className="sr-only">Não lida: </span>}
                      {n.title}
                    </p>
                    <p className="text-sm text-ink-soft">{n.body}</p>
                    <p className="mt-1 text-xs text-ink-faint">Emitida em {formatDateTime(n.createdAt)}</p>
                    {!reminderExists && <p className="mt-2 text-sm font-medium text-ink-soft">O lembrete relacionado foi excluído.</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {reminderExists && (
                        <Button variant="soft" className="min-h-11 px-4 text-sm" onClick={() => openRelated(n.id, n.reminderId)} icon={<ChevronRight size={16} aria-hidden />}>
                          Abrir lembrete
                        </Button>
                      )}
                      {!n.readAt && (
                        <Button variant="ghost" className="min-h-11 px-4 text-sm" onClick={() => dispatch({ type: 'notification/read', id: n.id })}>
                          Marcar como lida
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Dialog>
  );
}
