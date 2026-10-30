import type { DocumentVersion, LocalDateTime, PrescriptionFields, PreviewKind } from '../domain/types';
import type { SampleDocument } from './fixtures/samples';
import { newId } from '../lib/id';

export const emptyFields = (): PrescriptionFields => ({
  patientName: { value: null, reading: 'manual' },
  issueDate: { value: null, reading: 'manual' },
  prescriber: { value: null, reading: 'manual' },
  category: { value: 'a_confirmar', reading: 'manual' },
  medications: [],
});

const cloneFields = (f: PrescriptionFields): PrescriptionFields => JSON.parse(JSON.stringify(f));

interface VersionBase {
  number: number;
  now: LocalDateTime;
  replacesVersionId: string | null;
  id?: string;
}

/** Versão criada a partir de um documento de exemplo, com leitura demonstrativa. */
export function versionFromSample(sample: SampleDocument, base: VersionBase): DocumentVersion {
  return {
    id: base.id ?? newId('ver'),
    number: base.number,
    createdAt: base.now,
    source: 'sample',
    sampleId: sample.id,
    fileName: sample.fileName,
    fileSize: sample.fileSize,
    mimeType: sample.mimeType,
    previewKind: 'image',
    assetPath: sample.assetPath,
    readingMode: 'demo',
    extracted: cloneFields(sample.extracted),
    confirmed: null,
    confirmedAt: null,
    documentFindings: [...sample.documentFindings],
    demoValidUntil: sample.demoValidUntil,
    replacesVersionId: base.replacesVersionId,
  };
}

export interface UploadMeta {
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export const previewKindFor = (mime: string): PreviewKind =>
  mime === 'application/pdf' ? 'pdf' : mime.startsWith('image/') ? 'image' : 'none';

/**
 * Versão de um arquivo livre: sem OCR conectado, nada é "extraído".
 * Campos ficam vazios para preenchimento manual e sem prazo demonstrativo.
 */
export function versionFromUpload(meta: UploadMeta, base: VersionBase): DocumentVersion {
  return {
    id: base.id ?? newId('ver'),
    number: base.number,
    createdAt: base.now,
    source: 'upload',
    sampleId: null,
    fileName: meta.fileName,
    fileSize: meta.fileSize,
    mimeType: meta.mimeType,
    previewKind: previewKindFor(meta.mimeType),
    assetPath: null,
    readingMode: 'manual',
    extracted: emptyFields(),
    confirmed: null,
    confirmedAt: null,
    documentFindings: [],
    demoValidUntil: null,
    replacesVersionId: base.replacesVersionId,
  };
}

export function confirmVersion(v: DocumentVersion, fields: PrescriptionFields, now: LocalDateTime): DocumentVersion {
  return { ...v, confirmed: cloneFields(fields), confirmedAt: now };
}
