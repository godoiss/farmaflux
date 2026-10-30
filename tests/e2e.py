"""Testes de ponta a ponta reais no Chromium (Playwright).

Uso: python3 tests/e2e.py   (com `npm run preview` rodando em :4173)
Cada verificação imprime OK/FALHA; o script termina com código 1 se algo falhar.
"""
import os, re, sys, tempfile
from playwright.sync_api import sync_playwright, expect, Page

BASE = os.environ.get("BASE", "http://localhost:4173")
results: list[tuple[bool, str]] = []
console_errors: list[str] = []


def check(cond: bool, label: str):
    results.append((bool(cond), label))
    print(("OK    " if cond else "FALHA ") + label)


def vis(loc) -> bool:
    """Aguarda até 4 s o elemento ficar visível (evita falsos negativos de tempo)."""
    try:
        expect(loc.first).to_be_visible(timeout=4000)
        return True
    except AssertionError:
        return False


def count_is(loc, n: int) -> bool:
    try:
        expect(loc).to_have_count(n, timeout=4000)
        return True
    except AssertionError:
        return False


def fresh(page: Page, scenario: str = "A"):
    """Reinicia pelo Modo apresentação (fluxo real de UI)."""
    page.goto(BASE + "/")
    page.get_by_role("button", name=re.compile("Modo apresentação")).first.click()
    page.get_by_label(re.compile(f"^{scenario} ·")).check()
    page.get_by_role("button", name=f"Reiniciar cenário {scenario}").click()
    page.get_by_role("dialog").get_by_role("button", name="Reiniciar", exact=True).click()
    expect(page.get_by_role("heading", level=1)).to_be_visible()


def scenario_a(page: Page):
    fresh(page, "A")
    check(vis(page.get_by_role("heading", level=1, name="Olá, Ana.")), "A: título da tela inicial")
    page.get_by_role("link", name="Conferir receita").click()
    expect(page).to_have_url(re.compile("/receitas/rx-maria"))
    check(vis(page.get_by_text("Possível pendência documental").first), "A: possível falta de data identificada")

    # Pendência não pode ser eliminada pela transcrição
    page.goto(BASE + "/receitas/rx-maria/conferir")
    page.get_by_label("Data de emissão").fill("29102026")
    page.get_by_role("button", name="Confirmar transcrição").click()
    expect(page).to_have_url(re.compile("/receitas/rx-maria$"))
    check(vis(page.get_by_text("A data digitada na transcrição não altera o documento original")), "A: digitar data não resolve pendência documental")

    # Consulta orientação
    page.goto(BASE + "/ajuda#correcao")
    check(page.locator("#correcao[open]").count() == 1, "A: ajuda abre o tópico de correção")

    # Envia receita corrigida (nova versão)
    page.goto(BASE + "/receitas/rx-maria")
    page.get_by_role("link", name="Enviar receita corrigida").first.click()
    page.get_by_role("button", name=re.compile("Receita corrigida da Dona Maria")).click()
    page.get_by_role("button", name="Salvar nova versão e conferir").click()
    expect(page).to_have_url(re.compile("/conferir"))
    check(vis(page.get_by_text("versão 2 de 2")), "A: nova versão 2 vinculada")
    page.get_by_role("button", name="Confirmar transcrição").click()
    expect(page).to_have_url(re.compile("/receitas/rx-maria$"))
    check(vis(page.get_by_text("Nenhuma pendência identificada nesta pré-conferência.")), "A: resultado positivo exato")
    page.get_by_role("button", name=re.compile("Versão 1 · substituída")).click()
    check(vis(page.get_by_role("dialog").get_by_text("Possível pendência documental").first), "A: histórico da versão 1 preservado")
    page.keyboard.press("Escape")
    check(page.get_by_role("button", name=re.compile("Versão 1 · substituída")).evaluate("e => e === document.activeElement"), "A: Escape fecha e devolve o foco")

    # Escolhe unidade com todos os itens
    page.goto(BASE + "/unidades")
    card = page.locator("li", has_text="UBS Demonstrativa Jardim Aurora")
    check(vis(card.get_by_text("2 de 2 itens com disponibilidade informada")), "A: cobertura 2 de 2")
    card.get_by_role("link", name="Escolher para o plano").click()
    expect(page).to_have_url(re.compile("/planos/novo"))

    # Data inválida e passada
    page.get_by_role("button", name="Salvar plano").click()
    check(vis(page.get_by_role("alert").get_by_text("Informe a data")), "Plano: validação de data vazia")
    page.get_by_label("Data pretendida").fill("29102026")
    check(vis(page.get_by_text("A data precisa ser hoje (30/10/2026) ou depois.").first), "Plano: rejeita data passada")
    page.get_by_label("Data pretendida").fill("31022026")
    check(vis(page.get_by_text("Data inválida").first), "Plano: rejeita data inválida")
    page.get_by_label("Data pretendida").fill("03112026")
    check(vis(page.get_by_text("Nenhum conflito com o prazo demonstrativo")), "Plano: sem conflito em 03/11")
    boxes = page.locator("form input[type=checkbox]")
    check(all(not boxes.nth(i).is_checked() for i in range(boxes.count())), "Plano: checklist inicia desmarcado")
    for i in range(boxes.count()):
        boxes.nth(i).check()
    page.get_by_role("button", name="Salvar plano").click()
    expect(page).to_have_url(re.compile(r"/planos/plan-"))
    check(vis(page.get_by_role("heading", name="Plano salvo")), "A: plano salvo")
    check(vis(page.get_by_text("Receita de uso contínuo · versão 2")), "A: resumo mostra receita e versão")
    plan_url = page.url

    # Lembrete a partir do plano + duplo clique
    page.get_by_role("button", name="Criar lembrete").click()
    dlg = page.get_by_role("dialog")
    dlg.get_by_role("button", name="Criar lembrete").dblclick()
    page.wait_for_timeout(300)
    check(page.locator("section", has_text="Lembretes deste plano").locator("li").count() == 1, "A: lembrete criado sem duplicar")

    # Copiar (permissão concedida no contexto)
    page.get_by_role("button", name="Copiar resumo").click()
    page.wait_for_timeout(300)
    clip = page.evaluate("navigator.clipboard.readText()")
    check("Plano salvo" in clip and "Dona Maria" in clip, "A: resumo copiado de verdade")

    # Imprimir: folha limpa (emula mídia de impressão)
    page.emulate_media(media="print")
    check(vis(page.locator("article.print-only")) and not vis(page.locator("nav").first), "A: CSS de impressão mostra só a folha")
    page.emulate_media(media="screen")

    # Jornada concluída na tela inicial
    page.goto(BASE + "/")
    check(vis(page.get_by_text("Tudo organizado para a próxima ida")), "A: início reflete jornada concluída")

    # Editar transcrição depois do plano -> precisa revisar e checklist invalidado
    page.goto(BASE + "/receitas/rx-maria/conferir")
    page.get_by_label("Identificação do prescritor").fill("Dra. Helena Prado · CRM-DF 000000 (fictício) - revisado")
    page.get_by_role("button", name="Confirmar transcrição").click()
    page.goto(plan_url)
    check(vis(page.get_by_text("Precisa revisar").first), "Alterar receita marca plano para revisão")
    check(vis(page.get_by_text("A receita mudou depois desta marcação")), "Alterar receita invalida 'Revisar receita' no checklist")
    page.get_by_role("link", name="Revisar e salvar plano").click()
    page.get_by_label("Revisar receita").check()
    page.get_by_role("button", name="Salvar alterações").click()
    expect(page).to_have_url(re.compile(r"/planos/plan-[^/]+$"))
    check(vis(page.get_by_role("heading", name="Plano salvo")), "Revisão do plano volta a 'Plano salvo'")

    # Persistência após F5
    page.reload()
    check(vis(page.get_by_role("heading", name="Plano salvo")), "Persistência após recarregar")

    # Voltar/avançar do navegador
    page.goto(BASE + "/unidades")
    page.go_back()
    expect(page).to_have_url(plan_url)
    page.go_forward()
    expect(page).to_have_url(re.compile("/unidades"))
    check(True, "Voltar e avançar do navegador")


def notifications(page: Page):
    fresh(page, "A")
    bell = page.get_by_role("button", name=re.compile("^Notificações")).first
    check("nenhuma" in (bell.get_attribute("aria-label") or ""), "Notificações: nenhuma antes do vencimento")
    page.get_by_role("button", name=re.compile("Modo apresentação")).first.click()
    page.get_by_role("button", name="+1 hora").click()
    page.keyboard.press("Escape")
    check("1 não lida" in (bell.get_attribute("aria-label") or ""), "Notificação emitida ao atingir o horário")
    page.reload()
    page.wait_for_timeout(200)
    bell = page.get_by_role("button", name=re.compile("^Notificações")).first
    check("1 não lida" in (bell.get_attribute("aria-label") or ""), "Sem duplicar após recarregar")
    bell.click()
    page.get_by_role("button", name="Abrir lembrete").click()
    expect(page).to_have_url(re.compile("lembrete=rem-maria-revisar"))
    check("nenhuma" in (page.get_by_role("button", name=re.compile("^Notificações")).first.get_attribute("aria-label") or ""), "Abrir marca como lida e navega")
    check(vis(page.get_by_text("Vencidos")), "Lembrete aparece como vencido")
    # .ics real
    with page.expect_download() as dl:
        page.get_by_role("button", name="Adicionar ao calendário: Revisar a receita da Dona Maria").click()
    path = dl.value.path()
    ics = open(path, encoding="utf-8").read()
    check("BEGIN:VCALENDAR" in ics and "UID:rem-maria-revisar@farmaflux.demo" in ics and "DTSTART:20261030T130000Z" in ics, "Download .ics válido do lembrete")
    # concluir e excluir
    page.get_by_role("button", name="Concluir").first.click()
    check(vis(page.get_by_text("Concluídos")), "Concluir lembrete")
    page.get_by_role("button", name="Excluir lembrete Revisar a receita da Dona Maria").click()
    page.get_by_role("dialog").get_by_role("button", name="Excluir").click()
    page.get_by_role("button", name=re.compile("^Notificações")).first.click()
    check(vis(page.get_by_text("O lembrete relacionado foi excluído.")), "Notificação de lembrete excluído tratada")
    page.keyboard.press("Escape")
    # contexto Para mim não mistura
    page.goto(BASE + "/perfil")
    page.get_by_role("button", name="Para mim").click()
    page.goto(BASE + "/lembretes")
    check(vis(page.get_by_text("Meu retorno na UBS")) and page.get_by_text("Revisar a receita").count() == 0, "Contexto 'Para mim' mostra só registros da Ana")
    page.goto(BASE + "/receitas/rx-maria")
    check(vis(page.get_by_text("Este registro é de Dona Maria")), "Registro de outra pessoa não é misturado")


def scenario_b(page: Page):
    fresh(page, "B")
    page.get_by_role("link", name="Conferir receita").click()
    check(vis(page.get_by_text("Nenhuma pendência identificada nesta pré-conferência.")), "B: receita sem pendências")
    page.get_by_role("link", name="Preparar retirada").click()
    page.get_by_label(re.compile("UBS Demonstrativa Jardim Aurora")).check()
    page.get_by_role("button", name=re.compile("Amanhã")).click()
    page.get_by_role("button", name="Salvar plano").click()
    check(vis(page.get_by_role("heading", name="Plano salvo")), "B: plano salvo em poucos passos")


def scenario_c(page: Page):
    fresh(page, "C")
    page.goto(BASE + "/lembretes?aba=planos")
    page.get_by_role("link", name=re.compile("Jardim Aurora")).click()
    check(vis(page.get_by_text("A data pretendida (06/11/2026) é posterior ao prazo demonstrativo da receita (05/11/2026).")), "C: alerta específico de conflito de data")
    check(vis(page.get_by_text("Precisa revisar").first), "C: plano como 'Precisa revisar'")
    page.get_by_role("link", name="Editar").click()
    page.get_by_label("Data pretendida").fill("05112026")
    check(vis(page.get_by_text("Nenhum conflito com o prazo demonstrativo")), "C: data dentro do prazo recalcula avisos")
    page.get_by_role("link", name="Cancelar").click()
    check(vis(page.get_by_role("dialog").get_by_text("Sair sem salvar?")), "Confirmação ao abandonar alterações")
    page.get_by_role("button", name="Continuar editando").click()
    check("/editar" in page.url, "Cancelar a confirmação mantém a edição")


def scenario_d_and_units(page: Page):
    fresh(page, "D")
    page.goto(BASE + "/unidades/unit-demo-02")
    check(vis(page.get_by_text("Sem disponibilidade informada").first) and vis(page.get_by_text("Informação não disponível").first), "D: itens sem informação e sem disponibilidade distintos")
    check(vis(page.get_by_text("Não confirmada").first), "D: farmacêutico 'Não confirmada'")
    check(vis(page.get_by_text("Informação desatualizada")), "D: informação desatualizada sinalizada")
    page.goto(BASE + "/unidades")
    page.get_by_label("Disponibilidade").select_option("todos")
    check(count_is(page.locator("main ul.grid > li"), 1), "Filtro 'todos os itens' altera resultados")
    page.get_by_label("Região").select_option("Ceilândia")
    check(vis(page.get_by_text("Nenhuma unidade com esses filtros")), "Filtros combinados com estado vazio")
    page.get_by_role("button", name="Limpar filtros").click()
    check(count_is(page.locator("main ul.grid > li"), 3), "Limpar filtros restaura a lista")
    page.get_by_label("Ordenar por").select_option("nome")
    first = page.locator("main ul.grid > li h2").first.inner_text()
    check("Jardim Aurora" in first, "Ordenar por nome")


def files_and_delete(page: Page):
    fresh(page, "A")
    page.goto(BASE + "/receitas/nova")
    tmp = tempfile.mkdtemp()
    bad = os.path.join(tmp, "nota.txt"); open(bad, "w").write("x")
    empty = os.path.join(tmp, "vazio.png"); open(empty, "wb").close()
    big = os.path.join(tmp, "grande.pdf"); open(big, "wb").write(b"%PDF" + b"0" * (10 * 1024 * 1024 + 10))
    good = os.path.join(tmp, "receita.png")
    open(good, "wb").write(bytes.fromhex("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da6364f8ffbf1e000502027f3d8bb6a70000000049454e44ae426082"))
    inp = page.get_by_test_id("file-input")
    inp.set_input_files(bad)
    check(vis(page.get_by_text("Formato não aceito").first), "Arquivo: tipo inválido rejeitado")
    inp.set_input_files(empty)
    check(vis(page.get_by_text("O arquivo está vazio").first), "Arquivo: vazio rejeitado")
    inp.set_input_files(big)
    check(vis(page.get_by_text("mais de 10 MB").first), "Arquivo: acima de 10 MB rejeitado")
    inp.set_input_files(good)
    expect(page.get_by_text("Preenchimento manual").first).to_be_visible()
    check(vis(page.get_by_alt_text(re.compile("Prévia do documento receita.png"))), "Arquivo: prévia do upload")
    page.get_by_role("button", name="Salvar e conferir dados").click()
    expect(page).to_have_url(re.compile("/conferir"))
    check(page.get_by_label("Pessoa").input_value() == "", "Upload livre não inventa dados")
    page.get_by_role("button", name="Confirmar transcrição").click()
    check(vis(page.get_by_role("alert").get_by_text("Informe o nome da pessoa")), "Validação acessível ao confirmar incompleto")

    # exclusão com vínculos
    fresh(page, "C")
    page.goto(BASE + "/receitas/rx-maria")
    page.get_by_role("button", name="Excluir receita").click()
    page.get_by_label("Cancelar também os planos vinculados").uncheck()
    page.get_by_role("dialog").get_by_role("button", name="Excluir receita").click()
    expect(page).to_have_url(re.compile("/receitas$"))
    page.goto(BASE + "/planos/plan-maria-c")
    check(vis(page.get_by_text("A receita vinculada a este plano foi excluída")), "Exclusão: plano avisa receita excluída")
    page.goto(BASE + "/")
    check(page.get_by_text("0 cadastradas").count() + page.locator("text=/^0$/").count() >= 1, "Contadores refletem exclusão")


def clipboard_denied(browser):
    ctx = browser.new_context(viewport={"width": 1280, "height": 900}, locale="pt-BR")
    page = ctx.new_page()
    page.add_init_script("Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('negado')) } })")
    fresh(page, "C")
    page.goto(BASE + "/planos/plan-maria-c")
    page.get_by_role("button", name="Copiar resumo").click()
    dlg = page.get_by_role("dialog")
    check(vis(dlg.get_by_text("Copiar manualmente")), "Clipboard negado: alternativa manual")
    check(page.get_by_text("Resumo copiado").count() == 0, "Clipboard negado: nunca mostra 'Copiado'")
    ctx.close()


def storage_corrupt(browser):
    ctx = browser.new_context()
    page = ctx.new_page()
    page.goto(BASE + "/")
    page.evaluate("localStorage.setItem('farmaflux:demo:v1:data', '{\"schemaVersion\":7}'); localStorage.setItem('outro-app','x')")
    page.reload()
    check(vis(page.get_by_text("formato incompatível")), "Esquema inválido: restaura e informa")
    fresh(page, "B")
    check(page.evaluate("localStorage.getItem('outro-app')") == "x", "Reset não apaga dados fora do namespace")
    ctx.close()


def mobile(browser):
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, locale="pt-BR", has_touch=True, is_mobile=True)
    page = ctx.new_page()
    page.goto(BASE + "/planos/novo?receita=rx-maria")
    save = page.get_by_role("button", name="Salvar plano")
    save.scroll_into_view_if_needed()
    box = save.bounding_box(); nav = page.locator("nav[aria-label=Principal]").last.bounding_box()
    check(box["y"] + box["height"] <= nav["y"], "Celular: botão final não fica sob a navegação inferior")
    check(page.locator("nav[aria-label=Principal]").last.get_by_role("link").count() == 4, "Celular: navegação inferior com 4 itens")
    ctx.close()


with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={"width": 1280, "height": 900}, locale="pt-BR", timezone_id="America/Sao_Paulo", accept_downloads=True, permissions=["clipboard-read", "clipboard-write"])
    page = ctx.new_page()
    page.on("pageerror", lambda e: console_errors.append(str(e)))
    page.on("console", lambda m: m.type == "error" and console_errors.append(m.text))
    for fn in (scenario_a, notifications, scenario_b, scenario_c, scenario_d_and_units, files_and_delete):
        try:
            fn(page)
        except Exception as e:  # registra e segue para os próximos cenários
            check(False, f"{fn.__name__} interrompido: {str(e).splitlines()[0]}")
    ctx.close()
    for fn in (clipboard_denied, storage_corrupt, mobile):
        try:
            fn(browser)
        except Exception as e:
            check(False, f"{fn.__name__} interrompido: {str(e).splitlines()[0]}")
    browser.close()

check(not console_errors, "Sem erros de console/JS" + ("" if not console_errors else f": {console_errors[:3]}"))
failed = [l for ok, l in results if not ok]
print(f"\n{len(results) - len(failed)}/{len(results)} verificações passaram")
sys.exit(1 if failed else 0)
