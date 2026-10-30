import type { DocumentStatus, IssueKind, IssueSeverity } from '../../domain/rules/preCheck';
import type { Tone } from '../../components/ui/Display';
import { STATUS_COPY } from '../../domain/rules/preCheck';

export const statusTone = (s: DocumentStatus): Tone => STATUS_COPY[s].tone;

export const severityTone: Record<IssueSeverity, Tone> = { pending: 'warning', attention: 'warning', info: 'info' };
export const severityLabel: Record<IssueSeverity, string> = { pending: 'Pendência', attention: 'Atenção', info: 'Informação' };

/** Ação de próximo passo para cada tipo de ocorrência. */
export function issueAction(kind: IssueKind, prescriptionId: string): { label: string; to: string } | null {
  switch (kind) {
    case 'possible_document_issue':
    case 'demo_deadline_passed':
      return { label: 'Enviar receita corrigida', to: `/receitas/${prescriptionId}/corrigir` };
    case 'transcription_pending':
    case 'unreadable_field':
    case 'missing_field':
      return { label: 'Conferir dados', to: `/receitas/${prescriptionId}/conferir` };
    case 'demo_deadline_identified':
      return { label: 'Planejar minha ida', to: `/planos/novo?receita=${prescriptionId}` };
    case 'validity_needs_confirmation':
    case 'category_to_confirm':
      return { label: 'Entenda na ajuda', to: '/ajuda#validade' };
  }
}
