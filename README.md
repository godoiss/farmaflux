# FarmaFlux · protótipo (Hackathon Projeção 2026 · Desafio 02)

Prepara pacientes e cuidadores para retirar medicamentos nas farmácias das UBS do DF **antes de sair de casa**: pré-conferência documental da receita, situação documental e prazos, preparação da retirada (unidade, data, disponibilidade informada, checklist) e lembretes pessoais.

> Demonstração · dados fictícios. Não aprova receitas, não reserva medicamentos, não cria agendamento. A avaliação final é do farmacêutico.

**Demonstração online:** [farmaflux.vercel.app](https://farmaflux.vercel.app)

Os dados são salvos no navegador de cada pessoa. Não há sincronização entre dispositivos ou usuários.

## Como iniciar

```bash
npm install
npm run dev          # http://localhost:5173
# ou a versão de produção:
npm run build && npm run preview   # http://localhost:4173
```

Requisitos: Node 18+. Sem backend, chaves de API ou internet depois de carregar (fontes e documentos de exemplo são locais).

Verificações: `npm run typecheck` · `npm run lint` · `npm test` (regras de domínio) · `python3 tests/e2e.py` e `python3 tests/smoke.py` (Playwright, com o preview rodando em :4173).

## Arquitetura

```
src/
  domain/            regras puras, sem React
    types.ts         modelo: pessoa, receita/versão, campos lidos×confirmados, unidade, plano, lembrete, notificação
    time.ts          datas "relógio de parede" America/Sao_Paulo (AAAA-MM-DD / AAAA-MM-DDTHH:mm)
    rules/preCheck   motor de pré-conferência ISOLADO (regras do cenário, substituível por regras verificadas)
    rules/unitRules  cobertura por item, condição do dia, informação desatualizada
    rules/planRules  validação da data, conflitos (prazo × calendário), status do plano, checklist
    rules/reminderRules  estados, validação, emissão idempotente de notificações
    ics.ts           geração RFC 5545 (UTC, UID estável, texto escapado, linhas dobradas)
  data/
    fixtures/        cenários A–D, unidades, catálogo e documentos de exemplo
    repository/      DemoRepository (namespace farmaflux:demo:v1, validação de esquema, reset seguro)
  state/             store único (useReducer + Context), seletores derivados, anúncios acessíveis
  components/        UI base (Button, Dialog acessível, campos com máscara) e layout (sidebar, navegação inferior)
  features/          telas: home, prescriptions, units, plans, reminders, notifications, profile, help, presentation
```

Estados separados: processamento do arquivo (tela de envio) · situação documental (`DocumentStatus`, derivada dos campos e achados do documento) · condição da unidade (`DayCondition`) · situação do plano (`saved | needs_review | cancelled`). Não existe booleano "aprovado".

Cada plano guarda a versão e a revisão da receita que o originou; qualquer mudança na receita marca o plano como **Precisa revisar** e invalida o item "Revisar receita" do checklist.

## Dados simulados

- Pessoas: Ana (cuidadora) e Dona Maria. Contexto "Para mim" / "Estou ajudando alguém".
- 6 documentos de exemplo SVG em `public/samples` (gerados por `scripts/generate-samples.mjs`), cada um com sua **leitura demonstrativa**.
- Arquivos enviados (JPG/PNG/PDF até 10 MB) **não** passam por OCR: a prévia é mostrada e os campos ficam para preenchimento manual. Nada é enviado para fora do navegador.
- 3 unidades fictícias: Jardim Aurora (todos os itens), Vila Serena (parcial + item sem informação + dado desatualizado + farmacêutico não confirmado), Recanto Verde (suspensão temporária até 03/11/2026).
- Prazos são **demonstrativos**, explícitos em cada exemplo; não há prazos legais genéricos.
- Relógio central da demonstração: começa em **30/10/2026 09:00**.

## Limites da demonstração

- Lembretes só geram aviso com o app aberto (sem WhatsApp, SMS ou push). "Adicionar ao calendário" baixa um `.ics`.
- A prévia de arquivos enviados vale apenas na sessão em que foram selecionados (o arquivo não é armazenado).
- Sem mapas, distâncias ou telefones; sem integração com InfoSaúde, SES-DF ou prontuário.

## Como reiniciar

**Modo apresentação** (barra lateral no desktop; no celular, em Perfil → "Abrir modo apresentação"): escolha o cenário A–D → "Reiniciar cenário" → confirmar. Apaga só as chaves `farmaflux:demo:v1:*` (mantém o tamanho de texto). O mesmo painel altera data/hora (+1 hora, +1 dia, manual) e recalcula prazos, horários e lembretes.

## Roteiro — Cenário A (≈ 60–90 s)

1. Início → **Conferir receita**: aparece "Possível pendência documental — data de emissão não identificada".
2. (Opcional) Ajuda → "Como corrigir o documento?".
3. **Enviar receita corrigida** → escolher "Receita corrigida da Dona Maria" (Recomendado) → **Salvar nova versão e conferir**.
4. **Confirmar transcrição** → "Nenhuma pendência identificada nesta pré-conferência." (versão 1 segue no histórico).
5. **Preparar retirada** → Jardim Aurora ("2 de 2 itens com disponibilidade informada") → data por sugestão rápida → marcar checklist → **Salvar plano**.
6. **Criar lembrete** (já sugerido para a véspera) → **Copiar resumo** ou **Imprimir plano**.
7. Extra: Modo apresentação → "+1 hora" mostra a notificação do lembrete no sino.

## Roteiro — Cenário B

Reiniciar B → **Conferir receita** (sem pendências) → **Preparar retirada** → Jardim Aurora → "Amanhã" → **Salvar plano**.

Cenário C: plano em 06/11/2026 com prazo demonstrativo até 05/11/2026 → alerta específico e "Precisa revisar". Cenário D: compare as unidades com a receita de três itens.

Inventário de interações e testes executados: ver [`INTERACOES.md`](INTERACOES.md).
