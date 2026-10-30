# Inventário de interações e verificação

Persistência: **L** = localStorage `farmaflux:demo:v1:data` · **P** = `farmaflux:demo:v1:prefs` · **S** = só sessão · **URL** = parâmetros da rota (voltar/avançar funcionam) · — = nenhuma.

## Navegação e estrutura

| Local | Rótulo | Ação | Estado | Pers. | Erro / borda |
|---|---|---|---|---|---|
| Sidebar (desktop) | Início, Minhas receitas, Unidades, Lembretes e planos, Perfil e acessibilidade, Ajuda | Navega (rota real) | `aria-current` | URL | Rota desconhecida → "Página não encontrada" com saída |
| Navegação inferior (celular) | Início, Receitas, Unidades, Lembretes | Navega | ativo destacado | URL | Conteúdo com padding inferior (teste automatizado) |
| Cabeçalho celular | Sino, Ajuda, Perfil | Abre central / navega | — | — | — |
| Barra superior desktop | "Para: Dona Maria" / sino | Perfil / central | — | — | — |
| Global | Pular para o conteúdo | Foca `<main>` | — | — | — |
| Sidebar | Modo apresentação (mostra relógio) | Abre drawer técnico | — | — | — |
| Registros de outra pessoa | Ver registros de X | Alterna contexto | `profile.mode` | L | Evita mistura entre pessoas |

## Início

| Rótulo | Ação | Estado | Pers. | Observação |
|---|---|---|---|---|
| Conferir receita | Abre a receita mais urgente (ou conferência / nova) | — | — | Destino derivado da jornada |
| Ver unidades | `/unidades` | — | — | |
| Estou ajudando alguém / Para mim | Troca pessoa ativa | `profile.mode` | L | Anuncia mudança; contadores recalculam |
| Próximo passo (CTA dinâmico) | Corrigir, conferir, preparar, revisar ou abrir plano | — | — | |
| Ver todas / Abrir / itens de resumo | Navega para registro | — | — | Contadores derivados do estado |
| Saiba mais | `/ajuda` | — | — | |

## Receitas

| Local | Rótulo | Ação | Estado | Pers. | Erro / borda |
|---|---|---|---|---|---|
| Lista | Pesquisar | Filtra por nome, prescritor, medicamento | lista | URL | Vazio → "Limpar filtros" |
| Lista | Todas / Com pendência / A conferir / Sem pendências | Filtro | lista | URL | |
| Lista | Adicionar receita | `/receitas/nova` | — | — | |
| Lista | Cartão | Abre detalhes | — | — | |
| Envio | Arrastar e soltar / Selecionar arquivo / Fotografar receita (celular) | Valida e processa | etapas | S | Tipo, vazio, >10 MB, erro de leitura; cancelar seletor mantém seleção anterior |
| Envio | Tentar novamente / Trocar arquivo | Reprocessa / abre seletor | — | — | Botões desabilitados com motivo durante processamento |
| Envio | Usar receita de exemplo (6 opções) | Leitura demonstrativa | seleção | S | |
| Envio | Salvar e conferir dados / Salvar nova versão e conferir | Cria receita ou versão vinculada | receita/versão | L | Nome obrigatório; sair sem salvar pede confirmação |
| Envio | Abrir documento | Abre o arquivo local em nova aba | — | — | Object URL revogado ao descartar |
| Conferência | Campos Pessoa, Data, Prescritor, Categoria | Edita transcrição | formulário | — | Selos: Leitura demonstrativa / Não conseguimos ler / Editado / Manual |
| Conferência | Remover item / Adicionar item | Edita lista de medicamentos | formulário | — | "Adicionar" desabilitado com motivo |
| Conferência | Confirmar transcrição | Grava `confirmed` e incrementa revisão | receita | L | Resumo de erros com links e foco; pendência do documento não some |
| Conferência | Cancelar | Volta | — | — | Confirmação se houver alteração |
| Detalhe | Conferir dados / Editar transcrição | `/conferir` | — | — | |
| Detalhe | Preparar retirada | `/planos/novo?receita=` | — | — | Permitido com pendência (plano fica "Precisa revisar") |
| Detalhe | Botões de próximo passo por ocorrência | Navega à ação adequada | — | — | |
| Detalhe | Informações que embasaram o resultado | Expande fatos e origem | — | — | |
| Detalhe | Enviar receita corrigida | `/corrigir` | — | — | |
| Detalhe | Versão N (Ver) | Modal com documento e pré-conferência da versão | — | — | Escape fecha e devolve foco |
| Detalhe | Excluir receita | Confirma; opção de cancelar planos vinculados | receitas, planos, lembretes | L | Planos nunca apontam em silêncio para receita excluída |

## Unidades

| Rótulo | Ação | Pers. | Borda |
|---|---|---|---|
| Buscar / Região / Itens da receita / Disponibilidade / Ordenar | Filtram e ordenam | URL | Combinados; vazio com "Limpar filtros"; disponibilidade desabilitada sem receita (com dica) |
| Ver detalhes | `/unidades/:id` | — | Id inexistente → estado "não encontrada" |
| Escolher para o plano / Escolher esta unidade para o plano | `/planos/novo?receita&unidade` | — | |
| Detalhe: Cruzar com a receita | Recalcula cobertura | URL | |
| Detalhe: Outros itens | Expande | — | |

## Plano de ida

| Rótulo | Ação | Estado | Pers. | Borda |
|---|---|---|---|---|
| Receita (select) / Unidade (rádios) / Data pretendida / sugestões de data | Formulário com avisos ao vivo | — | — | Data vazia, inválida ou passada; troca de unidade desmarca itens dependentes |
| Checklist (formulário) | Marca o já verificado | — | — | Inicia desmarcado |
| Salvar plano / Salvar alterações | Cria/atualiza com versão e revisão atuais | plano | L | Com conflito: "Precisa revisar"; proteção contra reenvio |
| Detalhe: Editar | `/planos/:id/editar` | — | — | |
| Detalhe: Imprimir plano | `window.print()` com folha limpa | — | — | CSS de impressão |
| Detalhe: Copiar resumo | Clipboard API | — | — | Falha → modal com texto selecionado; nunca mostra "copiado" |
| Detalhe: checklist | Alterna item | checklist | L | Item "Revisar receita" invalida se a receita mudar |
| Detalhe: Criar lembrete | Modal pré-preenchido (véspera 08:00) | lembrete | L | |
| Detalhe: Revisar e salvar plano | Abre edição | — | — | Aparece após mudança/exclusão da receita |
| Detalhe: Cancelar plano | Confirma e cancela | plano | L | Checklist fica somente leitura |

## Lembretes e notificações

| Rótulo | Ação | Pers. | Borda |
|---|---|---|---|
| Abas Lembretes / Planos de ida | Troca painel | URL | |
| Novo lembrete / Editar | Modal (tipo, título, data, hora, vínculo) | L | Validação; horário no passado para novo; duplo clique não duplica |
| Concluir / Reabrir | Alterna `doneAt` | L | |
| Adicionar ao calendário | Baixa `.ics` do lembrete | — | UTC correto, UID estável, texto escapado |
| Excluir | Confirma e remove | L | Notificações antigas indicam "lembrete excluído" |
| Vínculo (plano/receita) | Navega | — | Vínculo removido → texto não clicável |
| Sino | Abre central (contador real por pessoa) | — | |
| Abrir lembrete | Marca lida e navega com destaque | L | |
| Marcar como lida / Marcar todas como lidas | Atualiza `readAt` | L | |
| Planejar minha ida | `/planos/novo` | — | |

## Perfil, ajuda e apresentação

| Rótulo | Ação | Pers. | Borda |
|---|---|---|---|
| Contexto de uso | Alterna pessoa | L | |
| Salvar nomes | Atualiza nome de exibição e pessoa assistida | L | Campos obrigatórios; desabilitado sem alteração (com motivo) |
| Tamanho do texto (Padrão/Grande/Maior) | Ajusta `font-size` raiz | P | |
| Abrir modo apresentação | Abre drawer | — | |
| Ajuda: 5 tópicos | Expande (também via `#âncora`) | — | |
| Apresentação: +1 hora / +1 dia / Início / Aplicar data e hora | Ajusta relógio central | L | Data/hora inválidas → erro |
| Apresentação: cenário A–D + Reiniciar | Confirma e restaura fixtures | L | Remove só o namespace FarmaFlux |
| Avisos de armazenamento | Fechar (esquema inválido) | — | Falha de gravação mantém sessão e informa |

## Testes realmente executados (30/10/2026)

- `npm run typecheck` — sem erros. `npm run lint` — sem erros. `npm run build` — ok.
- `npm test` (Vitest) — **14/14**: datas e fuso, motor de pré-conferência (pendência não resolvida pela transcrição, upload sem dados inventados, prazo vencido), cobertura sem converter desconhecido em zero, suspensão/dia sem atendimento, conflito do cenário C, revisão após alteração da receita, exclusão com vínculo, emissão única de notificações, ICS, repositório (esquema inválido, reset só do namespace).
- `python3 tests/e2e.py` (Playwright/Chromium, interface real) — **64/64**: cenários A, B, C e D completos; validações de data; checklist inicial desmarcado; duplo clique no lembrete; cópia real e cópia negada; CSS de impressão; edição da receita → plano "Precisa revisar" e item invalidado; F5; voltar/avançar; URL direta; notificação ao avançar relógio sem duplicar após recarregar; download e conteúdo do `.ics`; exclusão de lembrete com notificação existente; separação entre pessoas; filtros combinados e estado vazio; arquivos inválidos (tipo, vazio, >10 MB) e upload válido com prévia; validação acessível; exclusão de receita com plano vinculado; esquema corrompido; reset preservando outras chaves; navegação inferior não cobre o botão final; nenhum erro de console.
- `python3 tests/smoke.py` — 14 rotas em 1440, 768 e 390 px: sem erros de JS e sem scroll horizontal. Capturas revisadas manualmente (início, receita, conferência, unidades, plano).

## Limitações conhecidas

- "Fotografar receita" depende do suporte do navegador ao atributo `capture`; em navegadores sem suporte abre o seletor comum.
- O erro de leitura de arquivo (FileReader) está tratado no código, mas não foi possível provocá-lo de forma automatizada.
- A prévia de arquivos enviados não sobrevive ao recarregamento (por decisão: o arquivo não é armazenado). Exemplos sempre têm prévia.
- Não houve teste com leitor de tela real; a verificação de acessibilidade foi feita por rótulos, foco, papéis ARIA e anúncios.
