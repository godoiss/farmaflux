import type { Plan, Unit } from '../../domain/types';
import type { PlanEvaluation } from '../../domain/rules/planRules';
import { PLAN_STATUS_LABEL } from '../../domain/rules/planRules';
import { CHECKLIST_LABEL } from '../../domain/labels';
import { conditionOn, conditionText } from '../../domain/rules/unitRules';
import { formatDate, formatDateTime, weekday, weekdayName } from '../../domain/time';

export interface PlanSummaryInput {
  plan: Plan;
  unit: Unit;
  evaluation: PlanEvaluation;
  personName: string;
  prescriptionTitle: string;
  now: string;
}

/** Texto do resumo do plano, usado em "Copiar resumo" e na alternativa manual. */
export function buildPlanSummary({ plan, unit, evaluation, personName, prescriptionTitle, now }: PlanSummaryInput): string {
  const meds = (evaluation.version?.confirmed ?? evaluation.version?.extracted)?.medications ?? [];
  const lines = [
    `FarmaFlux · ${PLAN_STATUS_LABEL[evaluation.status]}`,
    `Pessoa: ${personName}`,
    `Receita: ${prescriptionTitle} (versão ${plan.prescriptionVersionNumber})`,
    `Unidade: ${unit.name} (${unit.code}) · ${unit.region}`,
    `Endereço: ${unit.address}`,
    `Data pretendida: ${formatDate(plan.intendedDate)} (${weekdayName(weekday(plan.intendedDate))})`,
    `Condição cadastrada no dia: ${conditionText(conditionOn(unit, plan.intendedDate))}`,
    meds.length ? `Itens: ${meds.map((m) => `${m.name} ${m.strength} ${m.form.toLowerCase()}`).join('; ')}` : null,
    '',
    evaluation.warnings.length ? 'Pendências e avisos:' : 'Pendências e avisos: nenhum identificado.',
    ...evaluation.warnings.map((w) => `- ${w.text}`),
    '',
    'Checklist:',
    ...evaluation.checklist.map((c) => `[${c.effectiveDone ? 'x' : ' '}] ${CHECKLIST_LABEL[c.key].label}`),
    '',
    'Não é agendamento nem reserva. Disponibilidade sujeita a mudança. A avaliação final é do farmacêutico.',
    `Demonstração · dados fictícios · gerado em ${formatDateTime(now)}`,
  ];
  return lines.filter((l): l is string => l !== null).join('\n');
}
