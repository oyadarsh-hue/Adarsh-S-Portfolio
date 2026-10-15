"""Browser smoke checks for the static site, served under a repository subpath.

Run with Python 3.12+, Playwright 1.58.0 and its Chromium browser installed.
No application accounts, messages or external mutations are used.
"""
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
    def log_message(self, *_args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT.parent)))
Thread(target=server.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{server.server_port}/{ROOT.name}/'
checks = []
errors = []

def check(condition, message):
    assert condition, message
    checks.append(message)

def open_page(page, path):
    response = page.goto(BASE + path, wait_until='networkidle')
    check(response.status == 200, f'HTTP 200: {path}')

def layout(page, label):
    check(page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'No horizontal overflow: {label}')
    for selector in ['.recruiter-strip', '.project-tools', '.summary-hero', '.role-card', '.proof-item', '.evidence-grid']:
        for el in page.locator(selector).all():
            if not el.is_visible():
                continue
            box = el.bounding_box()
            check(box['x'] >= -1 and box['x'] + box['width'] <= page.viewport_size['width'] + 1,
                  f'Content inside viewport: {label} {selector}')

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1440, 'height': 1000})
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        open_page(page, 'index.html')
        check(page.locator('[data-project-tags]').count() == 5, 'Five project cards')
        check(page.locator('.project-copy .typing-original').count() == 0, 'Project titles stay complete')
        for width in [1440, 768, 390, 320]:
            page.set_viewport_size({'width': width, 'height': 900})
            layout(page, f'Homepage {width}px')
        page.set_viewport_size({'width': 1440, 'height': 1000})
        page.screenshot(path=str(OUT / 'homepage-desktop.png'), animations='disabled')
        page.locator('[data-project-filter="web"]').click()
        check(page.locator('[data-project-tags]:visible').count() == 2, 'Web filter shows two projects')
        page.locator('#projectSearch').fill('PostgreSQL')
        check(page.locator('[data-project-tags]:visible').count() == 1, 'Combined filter and query')
        check(page.locator('#project-quietnote').is_visible(), 'Correct project matched')
        page.locator('#projectSearch').fill('no-such-project-zz')
        check(page.locator('#projectEmpty').is_visible(), 'Empty result explained')
        page.locator('#projectSearch').fill('')
        page.locator('[data-project-filter="all"]').click()
        check(page.locator('[data-project-tags]:visible').count() == 5, 'All work restores cards')
        check(page.locator('#projectResults').inner_text() == 'Showing 5 of 5 projects.', 'Accessible result status')
        page.locator('#projects').scroll_into_view_if_needed()
        before = page.locator('#project-assenttag h3').bounding_box()
        page.wait_for_timeout(3600)
        after = page.locator('#project-assenttag h3').bounding_box()
        check(abs(before['y'] - after['y']) < 1 and abs(before['height'] - after['height']) < 1, 'Project heading remains stable while reading')
        page.screenshot(path=str(OUT / 'projects-desktop.png'), animations='disabled')
        open_page(page, 'index.html?focus=security&q=postgresql#projects')
        check(page.locator('[data-project-tags]:visible').count() == 1, 'Role and query deep link restored')
        page.set_viewport_size({'width': 390, 'height': 844})
        page.locator('#menuButton').click()
        check(page.locator('#menuButton').get_attribute('aria-expanded') == 'true', 'Mobile menu opens')
        page.keyboard.press('Escape')
        check(page.locator('#menuButton').get_attribute('aria-expanded') == 'false', 'Escape closes mobile menu')
        page.locator('#menuButton').click()
        page.locator('#nav a[href="recruiter.html"]').click()
        page.wait_for_url('**/recruiter.html')
        check(page.locator('h1').inner_text() == 'Adarsh S', 'Recruiter navigation works without script errors')
        for width in [1440, 768, 390, 320]:
            page.set_viewport_size({'width': width, 'height': 900})
            layout(page, f'Recruiter {width}px')
        page.set_viewport_size({'width': 1440, 'height': 1000})
        page.screenshot(path=str(OUT / 'recruiter-desktop.png'), full_page=True, animations='disabled')
        page.set_viewport_size({'width': 390, 'height': 844})
        page.screenshot(path=str(OUT / 'recruiter-mobile.png'), full_page=True, animations='disabled')
        page.locator('#themeButton').click()
        check(page.locator('html').get_attribute('data-theme') == 'dark', 'Dark theme toggles')
        page.reload(wait_until='networkidle')
        check(page.locator('html').get_attribute('data-theme') == 'dark', 'Theme persists after reload')
        page.screenshot(path=str(OUT / 'recruiter-dark-mobile.png'), full_page=True, animations='disabled')
        page.locator('#themeButton').click()
        page.emulate_media(media='print')
        page.pdf(path=str(OUT / 'recruiter-print.pdf'), print_background=True)
        check(page.locator('#contact').is_visible(), 'Contact remains visible when printing')
        page.emulate_media(media='screen')
        for path in sorted((ROOT / 'projects').glob('*.html')):
            open_page(page, 'projects/' + path.name)
            check(page.locator('.case-evidence').is_visible(), f'Implementation evidence: {path.name}')
            layout(page, f'Case study {path.name} mobile')
        nojs = browser.new_context(java_script_enabled=False, viewport={'width': 390, 'height': 844})
        fallback = nojs.new_page()
        open_page(fallback, 'index.html')
        check(fallback.locator('[data-project-tags]:visible').count() == 5, 'All projects available without JavaScript')
        check(not fallback.locator('[data-project-tools]').is_visible(), 'Inactive search hidden without JavaScript')
        open_page(fallback, 'recruiter.html')
        check(fallback.locator('a[download]').first.is_visible(), 'CV available without JavaScript')
        reduced = browser.new_context(reduced_motion='reduce', viewport={'width':390,'height':844})
        reduced_page = reduced.new_page()
        open_page(reduced_page, 'index.html')
        check('paused' in (reduced_page.locator('html').get_attribute('class') or ''), 'System reduced motion respected')
        check(reduced_page.locator('#motionButton').is_disabled(), 'Reduced-motion control announced')
        restricted = browser.new_context(viewport={'width':390,'height':844})
        restricted.add_init_script("Object.defineProperty(window, 'localStorage', {get(){throw new Error('Storage blocked')}}); Object.defineProperty(navigator, 'clipboard', {value:undefined});")
        restricted_page = restricted.new_page()
        restricted_page.on('pageerror', lambda error: errors.append(str(error)))
        open_page(restricted_page, 'recruiter.html')
        restricted_page.locator('[data-copy-email]').click()
        check('oyadarsh@gmail.com' in restricted_page.locator('[data-copy-status]').inner_text(), 'Clipboard fallback exposes the address')
        check(errors == [], f'No browser script errors: {errors}')
        browser.close()
    report = {'passed': len(checks), 'checks': checks, 'browser_errors': errors}
    (OUT / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf8')
    print(json.dumps({'passed': len(checks), 'browser_errors': errors}), flush=True)
finally:
    server.shutdown()
    server.server_close()
