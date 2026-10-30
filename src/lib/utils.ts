/** Junta classes condicionais, ignorando valores falsos. Leve, sem dependências. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
