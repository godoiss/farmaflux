/** Regras de aceitação de arquivos de receita. */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

const ACCEPTED: Record<string, string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'application/pdf': ['pdf'],
};

export const ACCEPT_ATTR = '.jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf';

export interface FileMeta {
  name: string;
  size: number;
  type: string;
}

/** Resolve o tipo pelo MIME ou, se ausente, pela extensão. */
export function resolveMime(meta: FileMeta): string | null {
  if (ACCEPTED[meta.type]) return meta.type;
  const ext = meta.name.split('.').pop()?.toLowerCase() ?? '';
  if (meta.type && meta.type !== 'application/octet-stream') return null;
  return Object.entries(ACCEPTED).find(([, exts]) => exts.includes(ext))?.[0] ?? null;
}

export function validateFileMeta(meta: FileMeta): string | null {
  if (!resolveMime(meta)) return 'Formato não aceito. Envie uma imagem JPG ou PNG, ou um PDF.';
  if (meta.size === 0) return 'O arquivo está vazio. Escolha outro arquivo.';
  if (meta.size > MAX_FILE_BYTES) return 'O arquivo tem mais de 10 MB. Envie uma versão menor.';
  return null;
}
