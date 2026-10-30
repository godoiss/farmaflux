"""Smoke: abre todas as rotas, coleta erros de console e gera screenshots."""
import sys, os
from playwright.sync_api import sync_playwright

BASE = os.environ.get("BASE", "http://localhost:4173")
OUT = sys.argv[1] if len(sys.argv) > 1 else "shots"
os.makedirs(OUT, exist_ok=True)
ROUTES = ["/", "/receitas", "/receitas/rx-maria", "/receitas/rx-maria/conferir", "/receitas/rx-maria/corrigir", "/receitas/nova",
          "/unidades", "/unidades/unit-demo-02", "/planos/novo?receita=rx-maria", "/lembretes", "/lembretes?aba=planos", "/perfil", "/ajuda", "/nao-existe"]
errors = []
with sync_playwright() as p:
    b = p.chromium.launch()
    for w, h, tag in [(1440, 900, "d"), (390, 844, "m"), (768, 1024, "t")]:
        ctx = b.new_context(viewport={"width": w, "height": h}, locale="pt-BR", timezone_id="America/Sao_Paulo", reduced_motion="reduce")
        page = ctx.new_page()
        page.on("console", lambda m: m.type == "error" and errors.append(m.text))
        page.on("pageerror", lambda e: errors.append(str(e)))
        for r in ROUTES:
            page.goto(BASE + r)
            page.evaluate("document.fonts.ready")
            sw = page.evaluate("document.documentElement.scrollWidth")
            if sw > w:
                errors.append(f"overflow {tag} {r}: {sw}>{w}")
            name = r.strip("/").replace("/", "_").replace("?", "_").replace("=", "-") or "home"
            if tag != "t" or r in ("/", "/unidades", "/planos/novo?receita=rx-maria"):
                page.screenshot(path=f"{OUT}/{tag}-{name}.png", full_page=True)
        ctx.close()
    b.close()
print("\n".join(errors) or "OK sem erros")
sys.exit(1 if errors else 0)
