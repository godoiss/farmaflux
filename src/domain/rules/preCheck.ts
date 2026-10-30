import type { DocumentVersion, LocalDateTime, PrescriptionFields } from '../types';
import { CATEGORY_LABEL } from '../labels';
import { datePart, diffDays, formatDate } from '../time';

/**
 * Motor de pré-conferência documental.
 *
 * Isolado de propósito: recebe uma versão do documento e o relógio e
 * devolve ocorrências. As regras aqui são DO CENÁRIO DEMONSTRATIVO —
 * não representam legislação. Para usar regras verificadas no futuro,
 * substitua este módulo mantendo o mesmo contrato (PreCheckResult).
 */

export type DocumentStatus =
  | 'possible_document_issue'
  | 'deadline_passed'
  | 'awaiting_review'
  | 'incomplete'
  | 'needs_confirmation'
  | 'no_issues';

export type IssueKind =
  | 'possible_document_issue'
  | 'unreadable_field'
  | 'missing_field'
  | 'transcription_pending'
  | 'demo_deadline_identified'
  | 'demo_deadline_passed'
  | 'validity_needs_confirmation'
  | 'category_to_confirm';

/** pending: impede resultado positivo · attention: precisa confirmar · info: informativo */
export type IssueSeverity = 'pending' | 'attention' | 'info';

export type FieldKey = 'patientName' | 'issueDate' | 'prescriber' | 'category' | 'medications';

export interface PreCheckIssue {
  id: string;
  kind: IssueKind;
  severity: IssueSeverity;
  title: string;
  description: string;
  nextStep: string;
  field?: FieldKey;
}

export type FactOrigin = 'Leitura demonstrativa' | 'Transcrição confirmada' | 'Preenchimento manual' | 'Regra do cenário';

export interface PreCheckFact {
  label: string;
  value: string;
  origin: FactOrigin;
}

export interface PreCheckResult {
  status: DocumentStatus;
  issues: PreCheckIssue[];
  facts: PreCheckFact[];
  deadline: { date: string; daysLeft: number } | null;
  usingConfirmed: boolean;
}

export const FIELD_LABEL: Record<FieldKey, string> = {
  patientName: 'Pessoa',
  issueDate: 'Data de emissão',
  prescriber: 'Identificação do prescritor',
  category: 'Categoria',
  medications: 'Medicamentos',
};

export const STATUS_COPY: Record<DocumentStatus, { label: string; tone: 'danger' | 'warning' | 'neutral' | 'success' }> = {
  possible_document_issue: { label: 'Possível pendência documental', tone: 'warning' },
  deadline_passed: { label: 'Prazo demonstrativo encerrado', tone: 'danger' },
  awaiting_review: { label: 'Aguardando sua conferência', tone: 'neutral' },
  incomplete: { label: 'Campos a completar', tone: 'warning' },
  needs_confirmation: { label: 'Validade precisa de confirmação', tone: 'warning' },
  no_issues: { label: 'Nenhuma pendência identificada', tone: 'success' },
};

export const POSITIVE_RESULT_MESSAGE = 'Nenhuma pendência identificada nesta pré-conferência.';
export const FINAL_ASSESSMENT_NOTE = 'A avaliação final é sempre do farmacêutico, na unidade.';

const TEXT_FIELDS: Array<Exclude<FieldKey, 'medications'>> = ['patientName', 'issueDate', 'prescriber', 'category'];

function isEmpty(fields: PrescriptionFields, key: FieldKey): boolean {
  if (key === 'medications') return fields.medications.length === 0;
  const v = fields[key].value;
  return v === null || v === '';
}

function originOf(version: DocumentVersion, usingConfirmed: boolean): FactOrigin {
  if (usingConfirmed) return 'Transcrição confirmada';
  return version.readingMode === 'demo' ? 'Leitura demonstrativa' : 'Preenchimento manual';
}

export function runPreCheck(version: DocumentVersion, now: LocalDateTime): PreCheckResult {
  const usingConfirmed = version.confirmed !== null;
  const fields = version.confirmed ?? version.extracted;
  const issues: PreCheckIssue[] = [];
  const hasDateFinding = version.documentFindings.includes('issue_date_not_found');

  // 1. Achados do documento original: não são resolvidos pela transcrição.
  if (hasDateFinding) {
    const typedDate = !isEmpty(fields, 'issueDate');
    issues.push({
      id: 'doc-issue-date',
      kind: 'possible_document_issue',
      severity: 'pending',
      field: 'issueDate',
      title: 'Possível pendência documental',
      description:
        'A data de emissão não foi identificada no documento. Isso pode exigir correção pelo prescritor.' +
        (typedDate ? ' A data digitada na transcrição não altera o documento original.' : ''),
      nextStep: 'Fale com quem prescreveu e envie a receita corrigida como nova versão.',
    });
  }

  // 2. Campos não lidos (leitura) ou vazios (transcrição).
  for (const key of [...TEXT_FIELDS, 'medications'] as FieldKey[]) {
    if (key === 'issueDate' && hasDateFinding) continue;
    if (!isEmpty(fields, key)) continue;
    const unreadable = key !== 'medications' && version.extracted[key].reading === 'unreadable' && !usingConfirmed;
    issues.push(
      unreadable
        ? {
            id: `unreadable-${key}`,
            kind: 'unreadable_field',
            severity: 'pending',
            field: key,
            title: `Não conseguimos ler este campo: ${FIELD_LABEL[key]}`,
            description: 'Isso não significa que a informação esteja ausente no documento.',
            nextStep: 'Confira o documento e digite o que estiver legível na transcrição.',
          }
        : {
            id: `missing-${key}`,
            kind: 'missing_field',
            severity: 'pending',
            field: key,
            title: `${FIELD_LABEL[key]} sem informação na transcrição`,
            description: 'Sem este dado não é possível concluir a pré-conferência.',
            nextStep: 'Revise a transcrição e preencha o campo conforme o documento.',
          },
    );
  }

  // 3. Transcrição ainda não confirmada.
  if (!usingConfirmed) {
    issues.push({
      id: 'transcription-pending',
      kind: 'transcription_pending',
      severity: 'pending',
      title: 'Transcrição aguardando sua conferência',
      description: 'Compare os campos com o documento antes de confirmar.',
      nextStep: 'Abra “Conferir dados” e confirme a transcrição.',
    });
  }

  // 4. Categoria.
  if (fields.category.value === 'a_confirmar') {
    issues.push({
      id: 'category-to-confirm',
      kind: 'category_to_confirm',
      severity: 'attention',
      field: 'category',
      title: 'Categoria a confirmar',
      description: 'A categoria não foi identificada com segurança.',
      nextStep: 'A categoria é confirmada pela farmácia na unidade.',
    });
  }

  // 5. Prazo demonstrativo (regra explícita do cenário, nunca genérica).
  const today = datePart(now);
  let deadline: PreCheckResult['deadline'] = null;
  if (version.demoValidUntil && !hasDateFinding) {
    const daysLeft = diffDays(today, version.demoValidUntil);
    deadline = { date: version.demoValidUntil, daysLeft };
    if (daysLeft < 0) {
      issues.push({
        id: 'deadline-passed',
        kind: 'demo_deadline_passed',
        severity: 'pending',
        title: `Prazo demonstrativo encerrado em ${formatDate(version.demoValidUntil)}`,
        description: 'Pelo cenário desta demonstração, o prazo do documento já terminou.',
        nextStep: 'Procure quem prescreveu para orientação sobre um novo documento.',
      });
    } else {
      issues.push({
        id: 'deadline-identified',
        kind: 'demo_deadline_identified',
        severity: daysLeft <= 7 ? 'attention' : 'info',
        title: `Prazo demonstrativo identificado: até ${formatDate(version.demoValidUntil)}`,
        description:
          (daysLeft === 0 ? 'Termina hoje. ' : `Faltam ${daysLeft} dia${daysLeft === 1 ? '' : 's'}. `) +
          'Prazo definido pelo cenário demonstrativo, não por regra legal.',
        nextStep: daysLeft <= 7 ? 'Planeje a ida antes do fim do prazo.' : 'Use esta data como referência ao planejar a ida.',
      });
    }
  } else {
    issues.push({
      id: 'validity-confirm',
      kind: 'validity_needs_confirmation',
      severity: 'attention',
      title: 'Validade precisa de confirmação',
      description: hasDateFinding
        ? 'Sem data de emissão identificada, não há como indicar um prazo.'
        : 'Este documento não tem prazo demonstrativo cadastrado.',
      nextStep: 'Confirme a validade com quem prescreveu ou na unidade.',
    });
  }

  const origin = originOf(version, usingConfirmed);
  const facts: PreCheckFact[] = [
    { label: FIELD_LABEL.patientName, value: fields.patientName.value ?? 'Não informado', origin },
    { label: FIELD_LABEL.issueDate, value: fields.issueDate.value ? formatDate(fields.issueDate.value) : 'Não identificado', origin },
    { label: FIELD_LABEL.prescriber, value: fields.prescriber.value ?? 'Não informado', origin },
    { label: FIELD_LABEL.category, value: fields.category.value ? CATEGORY_LABEL[fields.category.value] : 'A confirmar', origin },
    { label: FIELD_LABEL.medications, value: `${fields.medications.length} item(ns)`, origin },
    {
      label: 'Prazo',
      value: version.demoValidUntil && !hasDateFinding ? `Demonstrativo até ${formatDate(version.demoValidUntil)}` : 'Sem prazo demonstrativo',
      origin: 'Regra do cenário',
    },
  ];

  return { status: deriveStatus(issues), issues, facts, deadline, usingConfirmed };
}

function deriveStatus(issues: PreCheckIssue[]): DocumentStatus {
  const has = (kind: IssueKind) => issues.some((i) => i.kind === kind);
  if (has('possible_document_issue')) return 'possible_document_issue';
  if (has('demo_deadline_passed')) return 'deadline_passed';
  if (has('transcription_pending')) return 'awaiting_review';
  if (has('missing_field') || has('unreadable_field')) return 'incomplete';
  if (has('validity_needs_confirmation') || has('category_to_confirm')) return 'needs_confirmation';
  return 'no_issues';
}

export const blockingIssues = (r: PreCheckResult) => r.issues.filter((i) => i.severity !== 'info');
