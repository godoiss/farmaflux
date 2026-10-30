import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { MaskedField, SelectField, TextField } from '../../components/ui/Field';
import { useStore } from '../../state/AppStore';
import { useAnnounce } from '../../state/Announcer';
import { activePerson, findUnit, plansOfActive, prescriptionsOfActive } from '../../state/selectors';
import { validateReminder, type ReminderErrors } from '../../domain/rules/reminderRules';
import { REMINDER_TYPE_LABEL } from '../../domain/labels';
import { datePart, formatDate, formatDateTime, parseBrDate, timePart } from '../../domain/time';
import type { Reminder, ReminderLink, ReminderType } from '../../domain/types';
import { newId } from '../../lib/id';

export interface ReminderDefaults {
  type: ReminderType;
  title: string;
  dueAt: string;
  link: ReminderLink | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  reminder?: Reminder | null;
  defaults?: ReminderDefaults;
  onSaved?: (id: string) => void;
}

const linkValue = (l: ReminderLink | null) => (l ? `${l.kind}:${l.id}` : '');
const parseLink = (v: string): ReminderLink | null => {
  const [kind, id] = v.split(':');
  return (kind === 'plan' || kind === 'prescription') && id ? { kind, id } : null;
};

export function ReminderDialog({ open, onClose, reminder, defaults, onSaved }: Props) {
  const { data, dispatch } = useStore();
  const announce = useAnnounce();
  const isNew = !reminder;
  const [type, setType] = useState<ReminderType>('personal_return');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [link, setLink] = useState('');
  const [errors, setErrors] = useState<ReminderErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const formId = useRef(newId('rem'));

  const latest = useRef({ reminder, defaults });
  latest.current = { reminder, defaults };

  // Reinicia o formulário a cada abertura (e gera novo id idempotente).
  useEffect(() => {
    if (!open) return;
    const { reminder, defaults } = latest.current;
    const src = reminder ?? defaults;
    formId.current = reminder?.id ?? newId('rem');
    setType(src?.type ?? 'personal_return');
    setTitle(src?.title ?? REMINDER_TYPE_LABEL.personal_return);
    setDate(src?.dueAt ? formatDate(datePart(src.dueAt)) : '');
    setTime(src?.dueAt ? timePart(src.dueAt) : '09:00');
    setLink(linkValue(src?.link ?? null));
    setErrors({});
    setSubmitting(false);
  }, [open]);

  const onTypeChange = (next: ReminderType) => {
    if (!title.trim() || Object.values(REMINDER_TYPE_LABEL).includes(title)) setTitle(REMINDER_TYPE_LABEL[next]);
    setType(next);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const d = parseBrDate(date);
    const timeOk = /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
    const dueAt = d && timeOk ? `${d}T${time}` : '';
    const errs = validateReminder({ type, title, dueAt }, data.clock, { isNew });
    if (date && !d) errs.dueAt = 'Data inválida. Use dd/mm/aaaa.';
    else if (d && !timeOk) errs.dueAt = 'Hora inválida. Use hh:mm (24 horas).';
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.getElementById(errs.title ? 'rem-title' : 'rem-date')?.focus();
      return;
    }
    setSubmitting(true);
    dispatch({ type: 'reminder/save', id: formId.current, isNew, reminderType: type, title, dueAt, link: parseLink(link) });
    announce(isNew ? `Lembrete pessoal criado para ${formatDateTime(dueAt)}.` : 'Lembrete atualizado.');
    onSaved?.(formId.current);
    onClose();
  };

  const plans = plansOfActive(data).filter((p) => !p.cancelledAt);
  const prescriptions = prescriptionsOfActive(data);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isNew ? 'Novo lembrete pessoal' : 'Editar lembrete'}
      description={`Para ${activePerson(data).name}. Acompanhado com o FarmaFlux aberto.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="reminder-form" loading={submitting} loadingLabel="Salvando…">
            {isNew ? 'Criar lembrete' : 'Salvar alterações'}
          </Button>
        </>
      }
    >
      <form id="reminder-form" className="space-y-4" onSubmit={submit} noValidate>
        <SelectField label="Tipo" value={type} onChange={(e) => onTypeChange(e.target.value as ReminderType)} data-autofocus>
          {(Object.keys(REMINDER_TYPE_LABEL) as ReminderType[]).map((t) => (
            <option key={t} value={t}>
              {REMINDER_TYPE_LABEL[t]}
            </option>
          ))}
        </SelectField>
        <TextField id="rem-title" label="Título" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} error={errors.title} />
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <MaskedField id="rem-date" mask="date" label="Data" value={date} onValueChange={setDate} error={errors.dueAt} />
          <MaskedField id="rem-time" mask="time" label="Hora" value={time} onValueChange={setTime} />
        </div>
        {type === 'personal_return' && <p className="hint -mt-2">Use a data que você combinou ou que foi orientada. O FarmaFlux não calcula retornos.</p>}
        <SelectField label="Vincular a (opcional)" value={link} onChange={(e) => setLink(e.target.value)}>
          <option value="">Sem vínculo</option>
          {plans.length > 0 && (
            <optgroup label="Planos de ida">
              {plans.map((p) => (
                <option key={p.id} value={`plan:${p.id}`}>
                  {findUnit(data, p.unitId)?.name} · {formatDate(p.intendedDate)}
                </option>
              ))}
            </optgroup>
          )}
          {prescriptions.length > 0 && (
            <optgroup label="Receitas">
              {prescriptions.map((p) => (
                <option key={p.id} value={`prescription:${p.id}`}>
                  {p.title}
                </option>
              ))}
            </optgroup>
          )}
        </SelectField>
      </form>
    </Dialog>
  );
}
