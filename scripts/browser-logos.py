"""Verify original organization images and responsive placement, without external requests."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'qa-artifacts'
OUT.mkdir(exist_ok=True)
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args): pass
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT.parent)))
Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}/{ROOT.name}/'
checks, errors = [], []
expected_logos = len(json.loads((ROOT / 'assets/images/logos/sources.json').read_text())['logos'])
def check(condition, label):
    assert condition, label
    checks.append(label)
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for width in [320, 390, 768, 1440]:
            context = browser.new_context(viewport={'width': width, 'height': 1000}, reduced_motion='reduce')
            page = context.new_page()
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.goto(base, wait_until='networkidle')
            check(page.locator('.organization-identity').count() == expected_logos, f'Verified logo blocks at {width}px')
            for image in page.locator('.organization-logo img').all():
                image.scroll_into_view_if_needed()
                image.evaluate('(img) => img.decode()')
                check(image.evaluate('(img) => img.complete && img.naturalWidth > 0'), f'Loaded {image.get_attribute("alt")} at {width}px')
                check(image.evaluate('(img) => getComputedStyle(img).objectFit === "contain"'), f'Uncropped {image.get_attribute("alt")} at {width}px')
                box = image.bounding_box()
                check(box['x'] >= 0 and box['x'] + box['width'] <= width + 1, f'Logo within viewport at {width}px')
            check(page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'No overflow at {width}px')
            check(page.locator('a.organization-link[href="https://bluegensolutions.com/"]').count() == 1, f'Visible Bluegen website link at {width}px')
            if width in [390, 1440]:
                for section in ['experience', 'education']:
                    page.locator('#' + section).screenshot(path=str(OUT / f'{section}-logos-{width}.png'), animations='disabled')
            context.close()
        context = browser.new_context(java_script_enabled=False, viewport={'width': 390, 'height': 844})
        page = context.new_page()
        page.goto(base, wait_until='networkidle')
        check(page.locator('.organization-logo img').count() == expected_logos, 'All logos remain in no-JavaScript HTML')
        check(page.locator('#experience .timeline-item').count() == 3, 'Three experience entries preserved')
        check(page.locator('#education .timeline-item').count() == 4, 'Four education entries preserved')
        context.close()
        check(not errors, f'No runtime errors: {errors}')
        browser.close()
finally:
    server.shutdown()
    server.server_close()
    (OUT / 'logos-report.json').write_text(json.dumps({'checks': checks, 'errors': errors}, indent=2))
print(f'PASS: {len(checks)} organization-logo browser checks; zero runtime errors.')
