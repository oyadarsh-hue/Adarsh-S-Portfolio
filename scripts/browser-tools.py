"""Exercise new tools under a repository subpath with Chromium."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'qa-artifacts'
OUT.mkdir(exist_ok=True)

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT.parent)))
Thread(target=server.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{server.server_port}/{ROOT.name}/'
checks, errors = [], []

def check(condition, message):
    assert condition, message
    checks.append(message)

def visit(page, path):
    response = page.goto(BASE + path, wait_until='networkidle')
    check(response.status == 200, f'HTTP 200: {path}')

def layout(page, label):
    check(page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'No horizontal overflow: {label}')
    for selector in ['.tool-section', '.tool-hero', '.tool-intro-note', '.feature-launchpad']:
        for el in page.locator(selector).all():
            if not el.is_visible():
                continue
            box = el.bounding_box()
            check(box['x'] >= -1 and box['x'] + box['width'] <= page.viewport_size['width'] + 1,
                  f'Inside viewport: {label} {selector}')

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width':1440,'height':1000})
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        for entrance in ['index.html','recruiter.html']:
            visit(page, entrance)
            check(page.locator('.feature-launchpad a[href="lab.html"]').is_visible(), f'Lab entrance: {entrance}')
            check(page.locator('.feature-launchpad a[href="workbench.html"]').is_visible(), f'Workbench entrance: {entrance}')
            for width in [1440,390,320]:
                page.set_viewport_size({'width':width,'height':900})
                layout(page, f'{entrance} {width}')
        visit(page, 'workbench.html')
        check(page.locator('[data-choose-project]:checked').count() == 2, 'Default comparison has two projects')
        page.locator('#rolePreset').select_option('python')
        check('AssentTag' in page.locator('#matchList').inner_text(), 'Python preset finds evidence')
        page.locator('#jobText').fill('JavaScript, AWS, C#, React.js')
        result = page.locator('#matchList').inner_text()
        check('JavaScript' in result and 'Deciphera' in result, 'JavaScript term maps to evidence')
        check('No linked project evidence' in result, 'Missing project evidence is explicit')
        check(page.locator('#matchList strong').all_text_contents() == ['React','JavaScript','AWS','C#'], 'Term boundaries avoid Java/JavaScript confusion')
        page.locator('#jobText').fill('zz-no-supported-term')
        check(page.locator('#suggestProjects').is_disabled(), 'No matches disables suggestion')
        check('No catalog terms' in page.locator('#matchSummary').inner_text(), 'Empty match is explained')
        page.locator('#jobText').fill('PostgreSQL')
        page.locator('#suggestProjects').click()
        check(page.locator('[data-choose-project]:checked').count() == 1, 'Suggested selection follows actual evidence')
        check(page.locator('[value="quietnote"][data-choose-project]').is_checked(), 'PostgreSQL selects QuietNote')
        page.locator('[value="assenttag"][data-choose-project]').check()
        page.locator('[value="aegisforge-x"][data-choose-project]').check()
        check(page.locator('[value="deciphera"][data-choose-project]').is_disabled(), 'Comparison capped at three projects')
        check(page.locator('#comparison thead th').count() == 4, 'Comparison has three project columns')
        page.locator('#company').fill('Example & Co <script>')
        page.locator('#targetRole').fill('Backend Developer')
        check('Example & Co <script>' in page.locator('#briefText').inner_text(), 'Company text is rendered literally')
        check(page.locator('#briefText script').count() == 0, 'User text cannot create markup')
        check('not end-to-end encrypted' in page.locator('#briefText').inner_text(), 'Brief preserves project limits')
        check('Example' not in page.url and 'PostgreSQL' not in page.url, 'Company and job text stay out of URL')
        check(page.evaluate("Object.keys(localStorage).every(k=>k==='adarsh-theme-v2'||k==='adarsh-motion')"), 'Draft inputs not saved to storage')
        with page.expect_download() as event:
            page.locator('#downloadBrief').click()
        download = event.value
        check(download.suggested_filename == 'Adarsh-S-project-brief.txt', 'Download filename is meaningful')
        downloaded = Path(download.path()).read_text(encoding='utf8')
        check('Backend Developer' in downloaded and 'Example & Co <script>' in downloaded, 'Downloaded brief contains current fields')
        check('Original CV: https://' in downloaded, 'Downloaded brief contains original CV link')
        for width in [1440,768,390,320]:
            page.set_viewport_size({'width':width,'height':1000})
            layout(page, f'Workbench {width}')
        page.set_viewport_size({'width':1440,'height':1000})
        page.screenshot(path=str(OUT/'workbench-desktop.png'), full_page=True, animations='disabled')
        page.set_viewport_size({'width':390,'height':844})
        page.locator('#themeButton').click()
        check(page.locator('html').get_attribute('data-theme') == 'dark', 'Workbench theme toggles')
        page.screenshot(path=str(OUT/'workbench-dark-mobile.png'), full_page=True, animations='disabled')
        page.locator('#themeButton').click()
        page.emulate_media(media='print')
        check(not page.locator('#match').is_visible() and not page.locator('#compare').is_visible(), 'Print contains only project brief')
        check(page.locator('#briefText').is_visible(), 'Brief visible in print')
        page.pdf(path=str(OUT/'project-brief.pdf'), print_background=True)
        page.emulate_media(media='screen')
        page.locator('#clearSelection').click()
        check(page.locator('#downloadBrief').is_disabled(), 'Empty selection disables download')
        check('Select a project' in page.locator('#comparison').inner_text(), 'Empty selection explained')
        visit(page, 'workbench.html?projects=deciphera,invalid,quietnote,deciphera#compare')
        check(page.locator('[data-choose-project]:checked').count() == 2, 'Shared selection validates and deduplicates IDs')
        check(page.locator('#comparison thead th').all_text_contents() == ['Review area','Deciphera','QuietNote'], 'Shared selection preserves chosen order')
        visit(page, 'workbench.html?projects=')
        check(page.locator('[data-choose-project]:checked').count() == 0, 'Shared empty selection remains empty')

        visit(page, 'lab.html')
        page.locator('#stepRace').click()
        check(page.locator('#winnerCount').inner_text() == '0', 'Read alone does not return content')
        page.locator('#runRace').click()
        check(page.locator('#winnerCount').inner_text() == '2', 'Unsafe schedule demonstrates duplicate access')
        check(page.locator('#stepRace').is_disabled(), 'Completed schedule cannot advance')
        page.locator('#raceMode').select_option('atomic')
        check(page.locator('#winnerCount').inner_text() == '0', 'Changing strategy resets experiment')
        page.locator('#readerCount').select_option('25')
        page.locator('#runRace').click()
        check(page.locator('#winnerCount').inner_text() == '1', 'Atomic model admits one of 25 readers')
        check(page.locator('#raceLog li').count() == 25, 'Every atomic operation is visible')
        for state in ['expired','revoked']:
            page.locator('#initialState').select_option(state)
            page.locator('#runRace').click()
            check(page.locator('#winnerCount').inner_text() == '0', f'{state} note returns no content')
        page.locator('#initialState').select_option('available')
        page.locator('#runRace').click()
        expect(page.locator('#hashStatus')).to_contain_text('MATCH')
        baseline = page.locator('#baselineHash').inner_text()
        page.locator('#tamperSample').click()
        expect(page.locator('#hashStatus')).to_contain_text('CHANGED')
        check(page.locator('#baselineHash').inner_text() == baseline, 'Editing leaves baseline intact')
        page.locator('#setBaseline').click()
        expect(page.locator('#hashStatus')).to_contain_text('MATCH')
        check(page.locator('#baselineHash').inner_text() != baseline, 'Setting baseline uses edited content')
        page.locator('#hashInput').fill('abc')
        expect(page.locator('#currentHash')).to_have_text('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
        check(True, 'Browser SHA-256 matches known vector')
        page.locator('#hashInput').fill('')
        expect(page.locator('#currentHash')).to_have_text('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
        check(True, 'Empty input hash handled correctly')
        page.locator('#resetHash').click()
        expect(page.locator('#hashStatus')).to_contain_text('MATCH')
        check(page.locator('#baselineHash').inner_text() == baseline, 'Reset restores original baseline')
        for width in [1440,768,390,320]:
            page.set_viewport_size({'width':width,'height':1000})
            layout(page, f'Lab {width}')
        page.set_viewport_size({'width':1440,'height':1000})
        page.screenshot(path=str(OUT/'lab-desktop.png'), full_page=True, animations='disabled')
        page.set_viewport_size({'width':390,'height':844})
        page.screenshot(path=str(OUT/'lab-mobile.png'), full_page=True, animations='disabled')

        nojs = browser.new_context(java_script_enabled=False, viewport={'width':390,'height':844})
        fallback = nojs.new_page()
        for name, selector in [('workbench.html','data-workbench'),('lab.html','data-lab')]:
            visit(fallback,name)
            check(fallback.locator('.no-script').is_visible(), f'No-JS guidance: {name}')
            check(fallback.locator(f'[{selector}]:visible').count() == 0, f'Inactive controls hidden: {name}')

        restricted = browser.new_context(viewport={'width':390,'height':844}, reduced_motion='reduce')
        restricted.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked')}}); Object.defineProperty(navigator,'clipboard',{value:undefined});")
        restricted_page = restricted.new_page()
        restricted_page.on('pageerror', lambda error: errors.append(str(error)))
        visit(restricted_page,'workbench.html')
        restricted_page.locator('#company').fill('Private Company')
        restricted_page.locator('#jobText').fill('Private job details')
        restricted_page.locator('#shareSelection').click()
        expect(restricted_page.locator('#copyFallbackWrap')).to_be_visible()
        shared = restricted_page.locator('#copyFallback').input_value()
        check('projects=quietnote' in shared and 'Private' not in shared, 'Share fallback excludes private inputs')
        restricted_page.locator('#copyBrief').click()
        check('Private Company' in restricted_page.locator('#copyFallback').input_value(), 'Brief clipboard fallback remains usable')
        check(restricted_page.evaluate("getComputedStyle(document.documentElement).scrollBehavior") == 'auto', 'Reduced motion disables smooth scrolling')
        restricted.add_init_script("Object.defineProperty(window,'crypto',{value:{}});")
        visit(restricted_page,'lab.html')
        expect(restricted_page.locator('#hashStatus')).to_contain_text('unavailable')
        check(restricted_page.locator('#setBaseline').is_disabled(), 'Missing Web Crypto gets usable error state')
        restricted_page.locator('#runRace').click()
        check(restricted_page.locator('#winnerCount').inner_text() == '2', 'Race still works without crypto/storage')
        check(errors == [], f'No browser errors: {errors}')
        browser.close()
    (OUT/'tools-report.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'browser_errors':errors},indent=2),encoding='utf8')
    print(json.dumps({'passed':len(checks),'browser_errors':errors}),flush=True)
finally:
    server.shutdown()
    server.server_close()
