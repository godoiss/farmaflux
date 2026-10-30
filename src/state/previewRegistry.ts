/**
 * Prévias de arquivos enviados vivem apenas na sessão (object URLs).
 * O arquivo nunca é enviado a serviços externos nem gravado no navegador.
 */
const previews = new Map<string, string>();

export function registerPreview(versionId: string, url: string): void {
  const old = previews.get(versionId);
  if (old && old !== url) URL.revokeObjectURL(old);
  previews.set(versionId, url);
}

export const getPreview = (versionId: string) => previews.get(versionId) ?? null;

export function revokePreview(versionId: string): void {
  const url = previews.get(versionId);
  if (url) URL.revokeObjectURL(url);
  previews.delete(versionId);
}

export function revokeAllPreviews(): void {
  previews.forEach((url) => URL.revokeObjectURL(url));
  previews.clear();
}
