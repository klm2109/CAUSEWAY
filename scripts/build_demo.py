"""Regenerate the offline demo from the same portal sources used by FastAPI."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def build() -> None:
    page = (ROOT / "static/index.html").read_text(encoding="utf-8")
    for name in ("styles.css", "updates.css"):
        css = (ROOT / "static" / name).read_text(encoding="utf-8")
        # File-open demonstrations should not depend on an online font service.
        css = "\n".join(line for line in css.splitlines() if not line.startswith("@import"))
        page = page.replace(f'<link rel="stylesheet" href="/static/{name}">', f"<style>{css}</style>")
    research = (ROOT / "static/research_catalogue.json").read_text(encoding="utf-8").replace("</", "<\\/")
    script = (ROOT / "static/app.js").read_text(encoding="utf-8")
    page = page.replace('<script src="/static/app.js"></script>', f'<script id="research-data" type="application/json">{research}</script>\n<script>{script}</script>')
    (ROOT / "CAUSEWAY_demo.html").write_text(page, encoding="utf-8")
    print("Regenerated CAUSEWAY_demo.html from the portal sources")


if __name__ == "__main__":
    build()
