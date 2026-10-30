import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/** Falso quando as variáveis de ambiente não foram configuradas (mostra aviso em vez de quebrar). */
export const supabaseConfigured = Boolean(url && publishableKey);

/**
 * Cliente Supabase para o navegador (SPA). A sessão é guardada e renovada pelo
 * próprio SDK de forma segura. A chave "publishable" é pública por design.
 */
export const supabase: SupabaseClient = createClient(
  url ?? 'https://placeholder.supabase.co',
  publishableKey ?? 'placeholder-key',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
);
