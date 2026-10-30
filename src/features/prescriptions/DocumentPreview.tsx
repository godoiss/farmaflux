import { ExternalLink, FileText } from 'lucide-react';
import type { DocumentVersion } from '../../domain/types';
import { formatFileSize } from '../../domain/time';
import { getPreview } from '../../state/previewRegistry';

interface PreviewSource {
  url: string | null;
  kind: DocumentVersion['previewKind'];
  fileName: string;
  fileSize: number;
}

export function previewSourceOf(v: DocumentVersion): PreviewSource {
  return { url: v.assetPath ?? getPreview(v.id), kind: v.previewKind, fileName: v.fileName, fileSize: v.fileSize };
}

/** Prévia do documento: imagem, PDF nativo (com alternativa de abrir) ou aviso. */
export function DocumentPreview({ source, compact = false }: { source: PreviewSource; compact?: boolean }) {
  const { url, kind, fileName, fileSize } = source;
  return (
    <figure className="overflow-hidden rounded-2xl border border-line bg-canvas">
      <div className={`flex items-center justify-center bg-[#eef2f4] ${compact ? 'max-h-72' : 'max-h-[34rem]'} overflow-hidden`}>
        {url && kind === 'image' && <img src={url} alt={`Prévia do documento ${fileName}`} className={`w-full object-contain ${compact ? 'max-h-72' : 'max-h-[34rem]'}`} />}
        {url && kind === 'pdf' && (
          <object data={url} type="application/pdf" className={`w-full ${compact ? 'h-72' : 'h-[34rem]'}`} aria-label={`Prévia do PDF ${fileName}`}>
            <p className="p-6 text-center text-ink-soft">Seu navegador não mostra PDFs aqui. Use “Abrir documento”.</p>
          </object>
        )}
        {!url && (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center text-ink-soft">
            <FileText size={32} aria-hidden />
            <p className="max-w-xs text-sm">A prévia de arquivos enviados fica disponível só durante a sessão em que foram selecionados. O arquivo não é enviado nem armazenado.</p>
          </div>
        )}
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-surface px-4 py-3 text-sm">
        <span className="min-w-0">
          <span className="block truncate font-semibold">{fileName}</span>
          <span className="text-ink-soft">{formatFileSize(fileSize)}</span>
        </span>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost min-h-11 px-3 text-sm">
            <ExternalLink size={16} aria-hidden /> Abrir documento
            <span className="sr-only">(abre em nova aba)</span>
          </a>
        )}
      </figcaption>
    </figure>
  );
}
