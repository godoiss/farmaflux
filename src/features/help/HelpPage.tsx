import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { BellRing, ChevronRight, ClipboardCheck, FilePlus2, Hourglass, Package, ShieldCheck, type LucideIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/Display';

interface Topic {
  id: string;
  icon: LucideIcon;
  title: string;
  body: string[];
}

const TOPICS: Topic[] = [
  {
    id: 'pre-conferencia',
    icon: ClipboardCheck,
    title: 'O que é a pré-conferência?',
    body: [
      'É uma verificação documental feita antes de sair de casa: o FarmaFlux compara os dados da receita (pessoa, data, prescritor, categoria e itens) e aponta o que pode precisar de atenção.',
      'Ela não aprova a receita, não avalia o tratamento e não substitui o farmacêutico. A avaliação final acontece sempre na unidade.',
      '“Não conseguimos ler este campo” significa que a leitura não identificou a informação — não que ela esteja ausente. “Possível pendência documental” indica algo no documento que pode exigir correção por quem prescreveu.',
    ],
  },
  {
    id: 'disponibilidade',
    icon: Package,
    title: 'Como funciona a disponibilidade?',
    body: [
      'Cada unidade mostra, por item, se há disponibilidade informada, se foi informada a falta ou se não há informação. Item sem informação nunca é tratado como estoque zero.',
      'Disponibilidade informada não é reserva e pode mudar até a sua ida. Por isso o plano sugere um lembrete para conferir de novo perto da data.',
      'Neste protótipo, unidades e estoques são dados demonstrativos, sem integração com sistemas oficiais.',
    ],
  },
  {
    id: 'validade',
    icon: Hourglass,
    title: 'O que é a validade demonstrativa?',
    body: [
      'Os exemplos trazem um prazo explícito, definido pelo cenário da demonstração. Ele aparece como “Prazo demonstrativo” e não representa regra legal.',
      'Quando não há prazo cadastrado ou a data de emissão não foi identificada, mostramos “Validade precisa de confirmação”. Confirme com quem prescreveu ou na unidade.',
      'O FarmaFlux não deduz duração de tratamento nem aplica prazos genéricos a todos os medicamentos.',
    ],
  },
  {
    id: 'lembrete',
    icon: BellRing,
    title: 'Como funciona o lembrete pessoal?',
    body: [
      'Você escolhe título, data e hora, e pode vincular o lembrete a um plano ou a uma receita. Quando o horário chega, com o FarmaFlux aberto, um aviso aparece no sino.',
      'O protótipo não envia WhatsApp, SMS nem notificações com o app fechado. Para receber no celular, use “Adicionar ao calendário”, que baixa um arquivo .ics.',
      'Lembretes de retorno usam a data que você informar. O FarmaFlux não calcula ciclos de retirada.',
    ],
  },
  {
    id: 'correcao',
    icon: FilePlus2,
    title: 'Como corrigir o documento?',
    body: [
      'Se a pré-conferência apontar uma possível pendência, fale com quem prescreveu e peça a correção.',
      'Depois, use “Enviar receita corrigida”: o novo documento vira uma nova versão ligada à anterior, e o histórico continua disponível.',
      'Editar a transcrição corrige o que foi digitado, mas não altera o documento original. Por isso, uma pendência do documento só muda com a nova versão.',
    ],
  },
];

export function HelpPage() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1)) as HTMLDetailsElement | null;
    if (el) {
      el.open = true;
      el.scrollIntoView({ block: 'start' });
    }
  }, [hash]);

  return (
    <div className="max-w-3xl">
      <PageHeader eyebrow="Ajuda" title="Como o FarmaFlux ajuda" description="Explicações curtas sobre cada etapa da preparação da retirada." />
      <div className="space-y-3">
        {TOPICS.map((t) => (
          <details key={t.id} id={t.id} className="group card overflow-hidden">
            <summary className="flex min-h-16 cursor-pointer list-none items-center gap-4 px-5 py-4 sm:px-6">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-mint text-teal">
                <t.icon size={20} aria-hidden />
              </span>
              <span className="flex-1 text-lg font-semibold">{t.title}</span>
              <ChevronRight size={20} className="shrink-0 text-ink-faint transition-transform group-open:rotate-90" aria-hidden />
            </summary>
            <div className="space-y-3 px-5 pb-5 text-ink-soft sm:px-6 sm:pl-20">
              {t.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </details>
        ))}
      </div>
      <section className="mt-8 rounded-[var(--radius-card)] border border-dashed border-line-strong p-5 sm:p-6" aria-labelledby="limits">
        <h2 id="limits" className="flex items-center gap-2 text-lg font-bold">
          <ShieldCheck size={20} className="text-teal" aria-hidden /> Limites desta demonstração
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-ink-soft">
          <li>Não aprova receitas, não diagnostica e não prescreve.</li>
          <li>Não reserva medicamentos, não distribui senha e não cria agendamento oficial.</li>
          <li>Todos os pacientes, documentos, unidades e estoques são fictícios.</li>
          <li>Os documentos ficam no seu aparelho e não são enviados a outros serviços.</li>
        </ul>
      </section>
    </div>
  );
}
