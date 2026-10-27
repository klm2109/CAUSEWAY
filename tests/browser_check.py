"""Exercise offline and backend-backed views in Chromium using real API handlers."""
from __future__ import annotations

import json
import os
import shutil
import sys
from pathlib import Path
from tempfile import TemporaryDirectory

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))


def check() -> None:
    with TemporaryDirectory(prefix="causeway-browser-") as tmp:
        os.environ["CAUSEWAY_DB"] = str(Path(tmp) / "browser.sqlite3")
        from fastapi.testclient import TestClient
        from app import app
        with TestClient(app) as client, sync_playwright() as playwright:
            installed = [Path(playwright.chromium.executable_path), Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe")]
            executable = next((str(path) for path in installed if path.is_file()), None) or shutil.which("chromium") or shutil.which("google-chrome")
            if not executable:
                raise RuntimeError("Install Playwright Chromium or Microsoft Edge to run this check.")
            browser = playwright.chromium.launch(headless=True, executable_path=executable)
            errors = []
            page = browser.new_page(viewport={"width":1440,"height":960})
            page.on("pageerror", lambda error: errors.append(error.stack or str(error)))
            page.route("https://fonts.googleapis.com/**", lambda route: route.abort())

            def api_route(route):
                request = route.request
                path = request.url.removeprefix("http://causeway.test")
                response = client.request(request.method, path, content=request.post_data, headers={"Content-Type":"application/json"} if request.post_data else {})
                route.fulfill(status=response.status_code, body=response.content, headers={"Content-Type":response.headers.get("content-type","application/json")})

            page.route("http://causeway.test/**",api_route)
            for mode, url in (("offline",(ROOT / "CAUSEWAY_demo.html").as_uri()),("backend","http://causeway.test/")):
                page.goto(url,wait_until="domcontentloaded")
                assert "v2" in page.title()
                assert "v2" in page.locator(".sidebar-bottom b").inner_text()
                assert "v2" in page.locator(".footer").inner_text()
                page.locator('#load-example').click()
                assert "4 selected" in page.locator('#selected-count').inner_text()
                assert page.locator('#condition-status').input_value() == "listed"
                page.locator('#condition-name').fill('<script>alert("example")</script>')
                page.locator('#condition-form button').click()
                assert page.locator('#custom-conditions script').count() == 0
                page.locator('[data-remove-condition]').click()
                page.locator('#medicine-name').fill("Fictional medicine B")
                page.locator('#medicine-dose').fill("Example dose")
                page.locator('#medicine-frequency').fill("Example schedule")
                page.locator('#medicine-reason').fill("Example reason")
                page.locator('#medicine-form button').click()
                page.locator('[data-tab="doctor"]').click()
                assert "Asthma" in page.locator('#doctor-conditions').inner_text()
                assert "Fictional medicine B" in page.locator('#doctor-medicines').inner_text()
                assert "Matched 2 of 4" in page.locator('#doctor-explanation').inner_text()
                page.locator('[data-decision="uncertain"]').click()
                page.locator('#submit-review').click()
                page.wait_for_function("document.getElementById('review-message').textContent.toLowerCase().includes('decision')")
                assert ("SQLite" if mode == "backend" else "browser preview only") in page.locator('#review-message').inner_text()
                page.locator('[data-tab="patient"]').click()
                page.locator('#medicine-status').select_option("none")
                page.locator('[data-tab="doctor"]').click()
                assert "Not taking any medicines" in page.locator('#doctor-medicines').inner_text()
                assert page.locator('#submit-review').is_disabled()
                page.locator('[data-tab="patient"]').click()
                page.locator('#medicine-status').select_option("unknown")
                page.locator('[data-tab="doctor"]').click()
                assert "Not supplied / unknown" in page.locator('#doctor-medicines').inner_text()
                page.locator('[data-tab="patient"]').click()
                page.locator('#load-example').click()
                page.locator('[data-tab="researcher"]').click()
                page.wait_for_function("document.querySelectorAll('#method-catalogue-table tr').length === 10")
                assert page.locator('#shiny-link').get_attribute('href') == "https://sindypin.shinyapps.io/github/"
                page.locator('#stage-filter').select_option("Drug repurposing")
                assert page.locator('#method-catalogue-table tr').count() == 3
                page.locator('#stage-filter').select_option("all")
                page.locator('[data-combine-method="subtyping"]').check()
                page.locator('[data-combine-method="planet"]').check()
                assert "does not automatically define" in page.locator('#combination-preview').inner_text()
                initial_rows=page.locator('#combinations-table tr').count()
                page.locator('#add-combination').click()
                assert page.locator('#combinations-table tr').count() == initial_rows + 1
                assert "Proposed experiment; not validated" in page.locator('#combinations-table tr').last.inner_text()
                page.locator('[data-remove-combination]').click()
                assert page.locator('#combinations-table tr').count() == initial_rows
                page.locator('#clear-combination').click()
                assert page.locator('#add-combination').is_disabled()
                page.locator('#select-all-methods').click()
                assert page.locator('[data-combine-method]:checked').count() == 10
                assert "Proposed experiment; not validated" in page.locator('#combination-preview').inner_text()
                page.locator('#clear-combination').click()
                page.locator('#method-filter').select_option("MR")
                assert page.locator('#genes-table tr').count() == 5
                page.locator('#gene-search').fill("PNPO")
                assert page.locator('#genes-table tr').count() == 1
                page.locator('#gene-search').fill("")
                page.locator('#method-filter').select_option("all")
                page.locator('[data-taco-topic="inputs"]').click()
                page.wait_for_function("!document.getElementById('taco-tool-status').textContent.includes('Running')")
                if mode == "offline":
                    assert "tool not executed" in page.locator('#taco-tool-status').inner_text()
                else:
                    assert "Subject_ID" in page.locator('#taco-tool-result').inner_text()
                    page.locator('#taco-audit').click()
                    page.wait_for_function("document.getElementById('taco-tool-result').textContent.includes('2.2.1')")
                    page.locator('.manifest-details summary').click()
                    page.locator('#taco-manifest').fill("not json")
                    page.locator('#taco-readiness').click()
                    assert "Invalid JSON" in page.locator('#taco-tool-status').inner_text()
                    manifest = json.loads((ROOT / "examples/taco_manifest.json").read_text())
                    page.locator('#taco-manifest').fill(json.dumps(manifest))
                    page.locator('#taco-readiness').click()
                    page.wait_for_function("document.getElementById('taco-tool-result').textContent.includes('Metadata checks passed')")
                    assert "does not validate data" in page.locator('#taco-tool-result').inner_text()
                assert page.evaluate("localStorage.length + sessionStorage.length") == 0
                page.reload(wait_until="domcontentloaded")
                assert page.locator('#condition-status').input_value() == "unknown"
                assert page.locator('#medicine-status').input_value() == "unknown"
                print(f"{mode}: intake, history, explanations, methods, combinations and tools PASS")
            page.set_viewport_size({"width":390,"height":844})
            page.goto((ROOT / 'CAUSEWAY_demo.html').as_uri())
            assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
            page.locator('[data-tab="researcher"]').click()
            assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
            assert not errors, errors
            browser.close()
            print('No browser JavaScript errors; mobile widths PASS')



if __name__ == "__main__":
    check()
