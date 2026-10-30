import type { Medication } from '../../domain/types';

/** Itens demonstrativos. Sem doses, posologia ou sugestão de substituição. */
export const MEDICATIONS = {
  losartana: { code: 'DEMO-MED-001', name: 'Losartana potássica', strength: '50 mg', form: 'Comprimido' },
  metformina: { code: 'DEMO-MED-002', name: 'Cloridrato de metformina', strength: '850 mg', form: 'Comprimido' },
  sinvastatina: { code: 'DEMO-MED-003', name: 'Sinvastatina', strength: '20 mg', form: 'Comprimido' },
} satisfies Record<string, Medication>;

export const MEDICATION_CATALOG: Medication[] = Object.values(MEDICATIONS);
