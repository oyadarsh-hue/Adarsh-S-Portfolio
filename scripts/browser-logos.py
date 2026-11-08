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
            check(page.locator('#education-mgm a').count() == 0, f'MGM has no hyperlink at {width}px')
            mgm = page.locator('#education-mgm .organization-logo img')
            check(mgm.bounding_box()['width'] >= 140, f'MGM emblem is large enough to see at {width}px')
            details = page.locator('.more-credentials')
            check(details.get_attribute('open') is not None, f'Additional course logos visible initially at {width}px')
            certificate_images = page.locator('.certificate-mark img')
            expected_cards = 15
            pending = json.loads((ROOT / 'assets/images/certificates/sources.json').read_text())['pending']
            check(certificate_images.count() == expected_cards - len(pending), f'Each verified course has its provider logo at {width}px')
            for image in certificate_images.all():
                image.scroll_into_view_if_needed()
                image.evaluate('(img) => img.decode()')
                check(image.evaluate('(img) => img.complete && img.naturalWidth > 0'), f'Loaded course {image.get_attribute("alt")} at {width}px')
                check(image.evaluate('(img) => getComputedStyle(img).objectFit === "contain"'), f'Uncropped course mark at {width}px')
                box = image.bounding_box()
                check(box['width'] >= 90 and box['x'] >= 0 and box['x'] + box['width'] <= width + 1, f'Course logo visible within viewport at {width}px')
            for card in page.locator('#certifications .cert-card').all():
                provider, title, date = [card.locator(s).bounding_box() for s in ['.certificate-provider', 'h3', 'time']]
                overlap = lambda a, b: min(a['x']+a['width'], b['x']+b['width']) - max(a['x'], b['x']) > 1 and min(a['y']+a['height'], b['y']+b['height']) - max(a['y'], b['y']) > 1
                check(not overlap(provider, title) and not overlap(title, date) and not overlap(provider, date), f'Course name, issuer and date do not overlap at {width}px')
            details.locator('summary').click()
            check(details.get_attribute('open') is None, f'Additional courses can close at {width}px')
            details.locator('summary').click()
            check(details.get_attribute('open') is not None, f'Additional courses reopen at {width}px')
            check(page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'No course overflow at {width}px')
            if width in [390, 1440]:
                for section in ['experience', 'education', 'certifications']:
                    page.locator('#' + section).screenshot(path=str(OUT / f'{section}-logos-{width}.png'), animations='disabled')
            context.close()
        context = browser.new_context(java_script_enabled=False, viewport={'width': 390, 'height': 844})
        page = context.new_page()
        page.goto(base, wait_until='networkidle')
        check(page.locator('.organization-logo img').count() == expected_logos, 'All logos remain in no-JavaScript HTML')
        check(page.locator('#experience .timeline-item').count() == 3, 'Three experience entries preserved')
        check(page.locator('#education .timeline-item').count() == 4, 'Four education entries preserved')
        check(page.locator('#certifications .cert-card').count() == 15, 'All courses remain without JavaScript')
        check(page.locator('.more-credentials').get_attribute('open') is not None, 'Additional courses visible without JavaScript')
        context.close()
        check(not errors, f'No runtime errors: {errors}')
        browser.close()
finally:
    server.shutdown()
    server.server_close()
    (OUT / 'logos-report.json').write_text(json.dumps({'checks': checks, 'errors': errors}, indent=2))
print(f'PASS: {len(checks)} organization-logo browser checks; zero runtime errors.')
