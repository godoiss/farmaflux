import type { DocumentFindingCode, LocalDate, PrescriptionFields } from '../../domain/types';
import { MEDICATIONS } from './catalog';

/**
 * Documentos de exemplo fictícios, guardados localmente em /public/samples.
 * Cada um traz a "leitura demonstrativa" correspondente — nunca aplicada a
 * arquivos arbitrários enviados pela pessoa usuária.
 */
export interface SampleDocument {
  id: string;
  label: string;
  description: string;
  fileName: string;
  assetPath: string;
  mimeType: string;
  fileSize: number;
  extracted: PrescriptionFields;
  documentFindings: DocumentFindingCode[];
  demoValidUntil: LocalDate | null;
}

export const PRESCRIBER = 'Dra. Helena Prado · CRM-DF 000000 (fictício)';
export const MARIA_DOC_NAME = 'Maria das Graças Oliveira';
export const ANA_DOC_NAME = 'Ana Clara Souza';

const read = <T,>(value: T) => ({ value, reading: 'read' as const });

export const SAMPLES: SampleDocument[] = [
  {
    id: 'maria-sem-data',
    label: 'Receita da Dona Maria (sem data legível)',
    description: 'Leitura demonstrativa com data de emissão não identificada.',
    fileName: 'receita-dona-maria.svg',
    assetPath: '/samples/receita-maria-sem-data.svg',
    mimeType: 'image/svg+xml',
    fileSize: 2_164,
    extracted: {
      patientName: read(MARIA_DOC_NAME),
      issueDate: { value: null, reading: 'unreadable' },
      prescriber: read(PRESCRIBER),
      category: read('simples'),
      medications: [MEDICATIONS.losartana, MEDICATIONS.metformina],
    },
    documentFindings: ['issue_date_not_found'],
    demoValidUntil: null,
  },
  {
    id: 'maria-corrigida',
    label: 'Receita corrigida da Dona Maria',
    description: 'Mesmo conteúdo, agora com data de emissão legível.',
    fileName: 'receita-dona-maria-corrigida.svg',
    assetPath: '/samples/receita-maria-corrigida.svg',
    mimeType: 'image/svg+xml',
    fileSize: 2_160,
    extracted: {
      patientName: read(MARIA_DOC_NAME),
      issueDate: read('2026-10-29'),
      prescriber: read(PRESCRIBER),
      category: read('simples'),
      medications: [MEDICATIONS.losartana, MEDICATIONS.metformina],
    },
    documentFindings: [],
    demoValidUntil: '2026-11-28',
  },
  {
    id: 'maria-direta',
    label: 'Receita sem pendências (caminho direto)',
    description: 'Documento completo, com prazo demonstrativo confortável.',
    fileName: 'receita-caminho-direto.svg',
    assetPath: '/samples/receita-maria-direta.svg',
    mimeType: 'image/svg+xml',
    fileSize: 2_083,
    extracted: {
      patientName: read(MARIA_DOC_NAME),
      issueDate: read('2026-10-20'),
      prescriber: read(PRESCRIBER),
      category: read('simples'),
      medications: [MEDICATIONS.losartana, MEDICATIONS.metformina],
    },
    documentFindings: [],
    demoValidUntil: '2026-11-19',
  },
  {
    id: 'maria-prazo-curto',
    label: 'Receita com prazo até 05/11/2026',
    description: 'Prazo demonstrativo próximo, para testar conflito de data.',
    fileName: 'receita-prazo-curto.svg',
    assetPath: '/samples/receita-maria-prazo-curto.svg',
    mimeType: 'image/svg+xml',
    fileSize: 2_083,
    extracted: {
      patientName: read(MARIA_DOC_NAME),
      issueDate: read('2026-10-06'),
      prescriber: read(PRESCRIBER),
      category: read('simples'),
      medications: [MEDICATIONS.losartana, MEDICATIONS.metformina],
    },
    documentFindings: [],
    demoValidUntil: '2026-11-05',
  },
  {
    id: 'maria-tres-itens',
    label: 'Receita com três itens',
    description: 'Útil para ver disponibilidade parcial e itens sem informação.',
    fileName: 'receita-tres-itens.svg',
    assetPath: '/samples/receita-maria-tres-itens.svg',
    mimeType: 'image/svg+xml',
    fileSize: 2_293,
    extracted: {
      patientName: read(MARIA_DOC_NAME),
      issueDate: read('2026-10-22'),
      prescriber: read(PRESCRIBER),
      category: read('simples'),
      medications: [MEDICATIONS.losartana, MEDICATIONS.metformina, MEDICATIONS.sinvastatina],
    },
    documentFindings: [],
    demoValidUntil: '2026-11-21',
  },
  {
    id: 'ana-categoria',
    label: 'Receita da Ana (categoria a confirmar)',
    description: 'Exemplo para o contexto “Para mim”.',
    fileName: 'receita-ana.svg',
    assetPath: '/samples/receita-ana-categoria.svg',
    mimeType: 'image/svg+xml',
    fileSize: 1_831,
    extracted: {
      patientName: read(ANA_DOC_NAME),
      issueDate: read('2026-10-27'),
      prescriber: read(PRESCRIBER),
      category: { value: 'a_confirmar', reading: 'unreadable' },
      medications: [MEDICATIONS.sinvastatina],
    },
    documentFindings: [],
    demoValidUntil: '2026-11-26',
  },
];

export const findSample = (id: string | null | undefined) => SAMPLES.find((s) => s.id === id);
