/** Confirma que o arquivo pode ser lido localmente (nada é enviado para fora). */
export function probeReadable(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve();
    reader.onerror = () => reject(reader.error ?? new Error('Falha de leitura'));
    reader.readAsArrayBuffer(file.slice(0, 1024));
  });
}

/** Baixa um conteúdo de texto como arquivo. */
export function downloadText(content: string, fileName: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Copia texto; retorna false se a permissão ou a API falhar. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
