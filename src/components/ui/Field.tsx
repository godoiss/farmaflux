import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import { CircleAlert } from 'lucide-react';

interface FieldShellProps {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  badge?: ReactNode;
  children: ReactNode;
}

function FieldShell({ id, label, hint, error, badge, children }: FieldShellProps) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="label">
          {label}
        </label>
        {badge}
      </div>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field-error">
          <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

const describedBy = (id: string, hint?: ReactNode, error?: string) =>
  [error ? `${id}-error` : null, hint && !error ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  badge?: ReactNode;
  id?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField({ label, hint, error, badge, id, ...rest }, ref) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} badge={badge}>
      <input ref={ref} id={fieldId} className="input" aria-invalid={error ? true : undefined} aria-describedby={describedBy(fieldId, hint, error)} {...rest} />
    </FieldShell>
  );
});

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  badge?: ReactNode;
  id?: string;
  children: ReactNode;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField({ label, hint, error, badge, id, children, ...rest }, ref) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell id={fieldId} label={label} hint={hint} error={error} badge={badge}>
      <select ref={ref} id={fieldId} className="input appearance-auto" aria-invalid={error ? true : undefined} aria-describedby={describedBy(fieldId, hint, error)} {...rest}>
        {children}
      </select>
    </FieldShell>
  );
});

/** Aplica máscara dd/mm/aaaa enquanto a pessoa digita. */
export function maskBrDate(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** Aplica máscara HH:mm. */
export function maskTime(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  return digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

interface MaskedFieldProps extends Omit<TextFieldProps, 'onChange' | 'value'> {
  value: string;
  onValueChange: (value: string) => void;
  mask: 'date' | 'time';
}

export const MaskedField = forwardRef<HTMLInputElement, MaskedFieldProps>(function MaskedField({ value, onValueChange, mask, ...rest }, ref) {
  return (
    <TextField
      ref={ref}
      inputMode="numeric"
      autoComplete="off"
      placeholder={mask === 'date' ? 'dd/mm/aaaa' : 'hh:mm'}
      maxLength={mask === 'date' ? 10 : 5}
      value={value}
      onChange={(e) => onValueChange(mask === 'date' ? maskBrDate(e.target.value) : maskTime(e.target.value))}
      {...rest}
    />
  );
});
