import { Link } from 'react-router-dom';
import { CircleCheck, Info, TriangleAlert, ChevronRight } from 'lucide-react';
import { DefinitionList, StatusPill } from '../../components/ui/Display';
import { FINAL_ASSESSMENT_NOTE, POSITIVE_RESULT_MESSAGE, STATUS_COPY, type PreCheckResult } from '../../domain/rules/preCheck';
import { formatDate } from '../../domain/time';
import { issueAction, severityLabel, statusTone } from './prescriptionUi';

/** Resultado da pré-conferência com ocorrências, próximos passos e base do resultado. */
export function PreCheckPanel({ result, prescriptionId, readOnly = false }: { result: PreCheckResult; prescriptionId: string; readOnly?: boolean }) {
  const positive = result.status === 'no_issues';
  const visible = result.issues.filter((i) => !(positive && i.kind === 'demo_deadline_identified'));

  return (
    <div className="space-y-5">
      {positive ? (
        <div className="callout callout-success items-start">
          <CircleCheck size={24} className="shrink-0 text-green-ink" aria-hidden />
          <div>
            <p className="text-lg font-bold">{POSITIVE_RESULT_MESSAGE}</p>
            <p className="mt-1 text-ink-soft">{FINAL_ASSESSMENT_NOTE}</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill tone={statusTone(result.status)}>{STATUS_COPY[result.status].label}</StatusPill>
          <span className="text-sm text-ink-soft">{FINAL_ASSESSMENT_NOTE}</span>
        </div>
      )}

      {result.deadline && positive && (
        <p className="flex items-center gap-2 text-[0.9375rem]">
          <Info size={18} className="text-teal" aria-hidden />
          Prazo demonstrativo identificado: até <strong>{formatDate(result.deadline.date)}</strong>
          <span className="text-ink-soft">(regra do cenário, não legal)</span>
        </p>
      )}

      {visible.length > 0 && !positive && (
        <ul className="space-y-3" aria-label="Ocorrências da pré-conferência">
          {visible.map((issue) => {
            const action = readOnly ? null : issueAction(issue.kind, prescriptionId);
            const Icon = issue.severity === 'info' ? Info : TriangleAlert;
            return (
              <li key={issue.id} className={`rounded-2xl border p-4 ${issue.severity === 'info' ? 'border-mint-strong bg-mint/40' : 'border-amber-line bg-amber-bg/60'}`}>
                <div className="flex gap-3">
                  <Icon size={20} className={`mt-0.5 shrink-0 ${issue.severity === 'info' ? 'text-teal' : 'text-amber-ink'}`} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      <span className="sr-only">{severityLabel[issue.severity]}: </span>
                      {issue.title}
                    </p>
                    <p className="mt-0.5 text-[0.9375rem] text-ink-soft">{issue.description}</p>
                    <p className="mt-2 text-[0.9375rem]">
                      <span className="font-semibold">Próximo passo: </span>
                      {issue.nextStep}
                    </p>
                    {action && (
                      <Link to={action.to} className="btn btn-secondary mt-3 min-h-11 px-4 text-sm">
                        {action.label} <ChevronRight size={16} aria-hidden />
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <details className="group rounded-2xl border border-line">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 font-semibold">
          Informações que embasaram o resultado
          <ChevronRight size={18} className="transition-transform group-open:rotate-90" aria-hidden />
        </summary>
        <div className="border-t border-line px-4 pb-2">
          <DefinitionList
            items={result.facts.map((f) => ({
              term: f.label,
              detail: (
                <span className="flex flex-wrap items-baseline justify-between gap-2">
                  <span>{f.value}</span>
                  <span className="text-xs font-normal text-ink-faint">{f.origin}</span>
                </span>
              ),
            }))}
          />
        </div>
      </details>
    </div>
  );
}
