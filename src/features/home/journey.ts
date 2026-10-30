import type { AppData, Prescription } from '../../domain/types';
import type { PreCheckResult } from '../../domain/rules/preCheck';
import { STATUS_COPY } from '../../domain/rules/preCheck';
import { planView, plansOfActive, preCheckOf, prescriptionsOfActive, remindersOfActive, type PlanView } from '../../state/selectors';
import type { Tone } from '../../components/ui/Display';

export interface NextStep {
  tone: Tone;
  status: string;
  title: string;
  description: string;
  cta: { label: string; to: string };
}

export interface JourneyStage {
  label: string;
  state: 'done' | 'current' | 'todo';
  detail: string;
}

export interface Journey {
  prescription: Prescription | undefined;
  preCheck: PreCheckResult | null;
  plan: PlanView | undefined;
  next: NextStep;
  stages: JourneyStage[];
}

const PRIORITY: Record<PreCheckResult['status'], number> = {
  possible_document_issue: 0,
  deadline_passed: 1,
  awaiting_review: 2,
  incomplete: 3,
  needs_confirmation: 4,
  no_issues: 5,
};

/** Escolhe a receita que mais precisa de atenção para guiar o próximo passo. */
export function primaryPrescription(data: AppData): { prescription: Prescription; preCheck: PreCheckResult } | undefined {
  return prescriptionsOfActive(data)
    .map((prescription) => ({ prescription, preCheck: preCheckOf(data, prescription)! }))
    .filter((x) => x.preCheck)
    .sort((a, b) => PRIORITY[a.preCheck.status] - PRIORITY[b.preCheck.status] || b.prescription.updatedAt.localeCompare(a.prescription.updatedAt))[0];
}

export function computeJourney(data: AppData): Journey {
  const primary = primaryPrescription(data);
  const prescription = primary?.prescription;
  const preCheck = primary?.preCheck ?? null;
  const plans = plansOfActive(data).filter((p) => !p.cancelledAt && (!prescription || p.prescriptionId === prescription.id));
  const plan = plans.map((p) => planView(data, p)).sort((a, b) => b.plan.updatedAt.localeCompare(a.plan.updatedAt))[0];
  // O lembrete da etapa final é o da ida: vinculado ao plano atual.
  const hasReminder = Boolean(plan) && remindersOfActive(data).some((r) => !r.doneAt && r.link?.kind === 'plan' && r.link.id === plan?.plan.id);

  let next: NextStep;
  if (!prescription || !preCheck) {
    next = {
      tone: 'neutral',
      status: 'Nenhuma receita cadastrada',
      title: 'Comece pela receita',
      description: 'Envie uma foto, um PDF ou use um documento de exemplo para fazer a pré-conferência.',
      cta: { label: 'Adicionar receita', to: '/receitas/nova' },
    };
  } else if (preCheck.status === 'possible_document_issue') {
    const issue = preCheck.issues.find((i) => i.kind === 'possible_document_issue');
    next = {
      tone: 'warning',
      status: STATUS_COPY[preCheck.status].label,
      title: issue?.description.split('.')[0] + '.',
      description: issue?.nextStep ?? '',
      cta: { label: 'Enviar receita corrigida', to: `/receitas/${prescription.id}/corrigir` },
    };
  } else if (preCheck.status === 'awaiting_review' || preCheck.status === 'incomplete') {
    next = {
      tone: preCheck.status === 'incomplete' ? 'warning' : 'neutral',
      status: STATUS_COPY[preCheck.status].label,
      title: 'Confira os dados transcritos da receita',
      description: 'Compare os campos com o documento e confirme. Isso não altera o documento original.',
      cta: { label: 'Conferir dados', to: `/receitas/${prescription.id}/conferir` },
    };
  } else if (preCheck.status === 'deadline_passed') {
    next = {
      tone: 'danger',
      status: STATUS_COPY[preCheck.status].label,
      title: 'O prazo demonstrativo desta receita terminou',
      description: 'Procure quem prescreveu para orientação sobre um novo documento.',
      cta: { label: 'Ver receita', to: `/receitas/${prescription.id}` },
    };
  } else if (!plan) {
    next = {
      tone: preCheck.status === 'no_issues' ? 'success' : 'warning',
      status: STATUS_COPY[preCheck.status].label,
      title: 'Agora, prepare a retirada',
      description: 'Escolha a unidade, informe quando pretende ir e organize o checklist.',
      cta: { label: 'Preparar retirada', to: `/planos/novo?receita=${prescription.id}` },
    };
  } else if (plan.evaluation?.status === 'needs_review') {
    next = {
      tone: 'warning',
      status: 'Plano precisa revisar',
      title: plan.evaluation.warnings.find((w) => w.requiresReview)?.text ?? 'Há avisos no plano de ida.',
      description: 'Revise o plano antes de sair de casa.',
      cta: { label: 'Revisar plano', to: `/planos/${plan.plan.id}` },
    };
  } else if (!hasReminder) {
    next = {
      tone: 'success',
      status: 'Plano salvo',
      title: 'Crie um lembrete pessoal para a ida',
      description: 'Um aviso para conferir a unidade perto da data ajuda a não esquecer.',
      cta: { label: 'Abrir plano', to: `/planos/${plan.plan.id}` },
    };
  } else {
    next = {
      tone: 'success',
      status: 'Plano salvo',
      title: 'Tudo organizado para a próxima ida',
      description: 'Revise o checklist perto da data e confira a unidade antes de sair.',
      cta: { label: 'Ver plano', to: `/planos/${plan.plan.id}` },
    };
  }

  const preDone = preCheck?.usingConfirmed ?? false;
  const docOk = preCheck ? !['possible_document_issue', 'deadline_passed', 'awaiting_review', 'incomplete'].includes(preCheck.status) : false;
  const stages: JourneyStage[] = [
    { label: 'Pré-conferência', state: preDone ? 'done' : prescription ? 'current' : 'todo', detail: preDone ? 'Transcrição confirmada' : 'Conferir dados' },
    { label: 'Situação documental', state: docOk ? 'done' : preDone ? 'current' : 'todo', detail: preCheck ? STATUS_COPY[preCheck.status].label : 'Sem receita' },
    { label: 'Preparar retirada', state: plan ? (plan.evaluation?.status === 'saved' ? 'done' : 'current') : docOk ? 'current' : 'todo', detail: plan ? (plan.evaluation?.status === 'saved' ? 'Plano salvo' : 'Precisa revisar') : 'Unidade e data' },
    { label: 'Lembrete pessoal', state: hasReminder ? 'done' : plan ? 'current' : 'todo', detail: hasReminder ? 'Lembrete criado' : 'Perto da ida' },
  ];

  return { prescription, preCheck, plan, next, stages };
}
