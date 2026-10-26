from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=b.new_page(viewport={'width':1440,'height':960},device_scale_factor=1)
    errors=[]
    page.on('pageerror',lambda err: errors.append(str(err)))
    page.set_content((root/'CAUSEWAY_demo.html').read_text(),wait_until='domcontentloaded')
    page.locator('#load-example').click()
    assert '4 selected' in page.locator('#selected-count').inner_text()
    assert 'Neuro-psychological' in page.locator('#theme-results').inner_text()
    page.screenshot(path=str(root/'preview_patient.png'),full_page=True)
    page.locator('[data-tab="doctor"]').click()
    assert 'Brain fog' in page.locator('#doctor-symptoms').inner_text()
    page.locator('[data-decision="uncertain"]').click()
    page.locator('#review-note').fill('More clinical information would be needed.')
    page.locator('#submit-review').click()
    assert 'browser preview only' in page.locator('#review-message').inner_text().lower()
    page.screenshot(path=str(root/'preview_doctor.png'),full_page=True)
    page.locator('[data-tab="researcher"]').click()
    assert page.locator('#genes-table tr').count()==11
    page.locator('#method-filter').select_option('MR')
    assert page.locator('#genes-table tr').count()==5
    page.locator('#gene-search').fill('PNPO')
    assert page.locator('#genes-table tr').count()==1
    page.locator('#gene-search').fill('')
    page.locator('#method-filter').select_option('all')
    page.screenshot(path=str(root/'preview_researcher.png'),full_page=True)
    print('HTML UI tabs, intake, doctor review, gene filters: PASS')
    print('Browser JS exceptions:',errors)
    assert not errors
    b.close()
