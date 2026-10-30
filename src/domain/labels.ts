import type { ChecklistKey, PharmacistCondition, PrescriptionCategory, ReminderType, UsageMode } from './types';

export const CATEGORY_LABEL: Record<PrescriptionCategory, string> = {
  simples: 'Receita simples',
  controle_especial: 'Controle especial',
  a_confirmar: 'A confirmar',
};

export const PHARMACIST_LABEL: Record<PharmacistCondition, string> = {
  informed_present: 'Informado',
  informed_absent: 'Ausência informada',
  unknown: 'Não confirmada',
};

export const REMINDER_TYPE_LABEL: Record<ReminderType, string> = {
  check_unit: 'Conferir a unidade antes da ida',
  review_deadline: 'Revisar prazo da receita',
  personal_return: 'Lembrete pessoal de retorno',
};

export const USAGE_MODE_LABEL: Record<UsageMode, string> = {
  self: 'Para mim',
  helping: 'Estou ajudando alguém',
};

export const CHECKLIST_LABEL: Record<ChecklistKey, { label: string; hint: string }> = {
  correction: {
    label: 'Tratar a pendência documental com o prescritor',
    hint: 'Envie a receita corrigida no FarmaFlux para atualizar a pré-conferência.',
  },
  review_prescription: {
    label: 'Revisar receita',
    hint: 'Confira se a versão que você vai levar é a mesma usada neste plano.',
  },
  identification: {
    label: 'Separar identificação conforme orientação aplicável',
    hint: 'Siga a orientação da unidade sobre quais documentos apresentar.',
  },
  unit_info: {
    label: 'Conferir informações da unidade',
    hint: 'Horário cadastrado não confirma funcionamento no dia.',
  },
  availability: {
    label: 'Revisar disponibilidade',
    hint: 'Disponibilidade informada não é reserva e pode mudar.',
  },
};
