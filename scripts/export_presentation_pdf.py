"""Export browser slides to PDF with Playwright Chromium or installed Edge."""
import shutil
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


def export() -> None:
    folder = ROOT / "docs" / "meeting"
    with sync_playwright() as playwright:
        choices = [Path(playwright.chromium.executable_path), Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe")]
        executable = next((str(path) for path in choices if path.is_file()), None) or shutil.which("chromium")
        if not executable:
            raise RuntimeError("Install Playwright Chromium or Microsoft Edge to export the PDF.")
        browser = playwright.chromium.launch(headless=True, executable_path=executable)
        try:
            page = browser.new_page(viewport={"width":1280,"height":720})
            page.goto((folder / "Paper2Agent_CAUSEWAY.html").as_uri())
            page.pdf(path=str(folder / "Paper2Agent_CAUSEWAY.pdf"), width="13.333in", height="7.5in", print_background=True)
            print("Exported PDF from the browser presentation.")
        finally:
            browser.close()


if __name__ == "__main__":
    export()
