import type { Unit, WeekSchedule } from '../../domain/types';
import { MEDICATIONS } from './catalog';

const weekdays = (open: string, close: string, extra: Partial<WeekSchedule> = {}, brk?: [string, string]): WeekSchedule => {
  const day = { open, close, ...(brk ? { breakStart: brk[0], breakEnd: brk[1] } : {}) };
  return { 0: null, 1: day, 2: day, 3: day, 4: day, 5: day, 6: null, ...extra };
};

/** Três unidades FICTÍCIAS. Nomes, endereços e estoques são demonstrativos. */
export function seedUnits(): Unit[] {
  return [
    {
      id: 'unit-demo-01',
      code: 'UBS-DEMO-01',
      name: 'UBS Demonstrativa Jardim Aurora',
      region: 'Asa Sul',
      address: 'Quadra Demonstrativa 100, Bloco A · endereço fictício',
      schedule: weekdays('07:00', '18:00', { 6: { open: '08:00', close: '12:00' } }, ['12:00', '13:00']),
      exception: { kind: 'none', message: null, from: null, until: null },
      pharmacist: 'informed_present',
      stock: [
        { code: MEDICATIONS.losartana.code, status: 'informed_available' },
        { code: MEDICATIONS.metformina.code, status: 'informed_available' },
        { code: MEDICATIONS.sinvastatina.code, status: 'informed_available' },
      ],
      updatedAt: '2026-10-30T07:40',
    },
    {
      id: 'unit-demo-02',
      code: 'UBS-DEMO-02',
      name: 'UBS Demonstrativa Vila Serena',
      region: 'Taguatinga',
      address: 'Avenida Exemplo 200, Lote 5 · endereço fictício',
      schedule: weekdays('07:00', '17:00'),
      exception: { kind: 'none', message: null, from: null, until: null },
      pharmacist: 'unknown',
      stock: [
        { code: MEDICATIONS.losartana.code, status: 'informed_available' },
        { code: MEDICATIONS.metformina.code, status: 'informed_unavailable' },
      ],
      updatedAt: '2026-10-27T16:00',
    },
    {
      id: 'unit-demo-03',
      code: 'UBS-DEMO-03',
      name: 'UBS Demonstrativa Recanto Verde',
      region: 'Ceilândia',
      address: 'Rua Fictícia 300, Conjunto C · endereço fictício',
      schedule: weekdays('07:00', '19:00', { 6: { open: '07:00', close: '12:00' } }),
      exception: {
        kind: 'suspended',
        message: 'Atendimento da farmácia temporariamente suspenso (manutenção informada)',
        from: '2026-10-29',
        until: '2026-11-03',
      },
      pharmacist: 'unknown',
      stock: [
        { code: MEDICATIONS.losartana.code, status: 'informed_available' },
        { code: MEDICATIONS.metformina.code, status: 'informed_available' },
      ],
      updatedAt: '2026-10-29T18:10',
    },
  ];
}

export const REGIONS = ['Asa Sul', 'Taguatinga', 'Ceilândia'];
