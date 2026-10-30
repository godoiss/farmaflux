import type { User } from '@supabase/supabase-js';

/** Nome a exibir para a conta logada (metadados do cadastro ou o início do e-mail). */
export function accountDisplayName(user: User | null): string {
  if (!user) return 'Você';
  const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string };
  const name = meta.full_name ?? meta.name;
  if (name && name.trim()) return name.trim();
  const email = user.email ?? '';
  return email ? email.split('@')[0] : 'Você';
}

/** Primeiro nome, para saudações curtas. */
export function accountFirstName(user: User | null): string {
  return accountDisplayName(user).split(' ')[0];
}
