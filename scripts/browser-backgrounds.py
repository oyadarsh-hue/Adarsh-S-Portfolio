"""Focused visual, responsive, motion and fallback checks for photographic scenes."""
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
BASE = f'http://127.0.0.1:{server.server_port}/{ROOT.name}/'
checks, errors = [], []
def check(value, message):
    assert value, message
    checks.append(message)
def settle(page):
    page.wait_for_timeout(150)
def scroll(page, y):
    page.evaluate('(y) => scrollTo({top:y,behavior:"instant"})', y)
    settle(page)
def loaded(page, selector):
    page.wait_for_function('(selector) => { const i=document.querySelector(selector); return i.complete && i.naturalWidth>0; }', arg=selector)
def screenshot(page, name):
    page.screenshot(path=str(OUT / f'background-{name}.png'), animations='disabled')
def painted(page, selector):
    backdrop = page.locator(f'{selector} > .scene-backdrop')
    before = backdrop.screenshot(animations='disabled')
    page.locator(f'{selector} .scene-picture img').evaluate('(i)=>i.style.visibility="hidden"')
    after = backdrop.screenshot(animations='disabled')
    page.locator(f'{selector} .scene-picture img').evaluate('(i)=>i.style.removeProperty("visibility")')
    return before != after
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width':1440,'height':1000}, device_scale_factor=1)
        page = context.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(BASE, wait_until='networkidle')
        page.wait_for_function('document.documentElement.classList.contains("studio-entered")')
        loaded(page, '#home .scene-picture img')
        check(page.locator('.scene-backdrop[aria-hidden="true"] img[alt=""]').count() == 4, 'Four decorative images are excluded from accessible content')
        check(page.locator('#home .scene-picture img').evaluate('(i)=>i.currentSrc.endsWith("-1600.webp")'), 'Desktop loads a 1600px image, not a forced 4K download')
        check(page.locator('.scene-picture img[loading="lazy"]').count() == 3, 'All below-fold environments are lazy loaded')
        screenshot(page, 'hero-desktop')
        scroll(page, 100)
        first = page.locator('#home').evaluate('(e)=>e.style.getPropertyValue("--scene-y")')
        scroll(page, 350)
        second = page.locator('#home').evaluate('(e)=>e.style.getPropertyValue("--scene-y")')
        check(first != second and first and second, 'Scrolling updates the hero background transform')
        scroll(page, 100)
        check(page.locator('#home').evaluate('(e)=>e.style.getPropertyValue("--scene-y")') == first, 'Reverse scrolling restores the same background position')
        page.locator('#motionButton').click()
        check(page.locator('html').get_attribute('data-scene-motion') == 'still', 'Existing pause control stops background motion')
        scroll(page, 350)
        check(page.locator('.scene-picture').evaluate_all('(items)=>items.every(e=>getComputedStyle(e).transform==="none")'), 'Paused artwork remains static through scrolling')
        page.locator('#motionButton').click()
        check(page.locator('html').get_attribute('data-scene-motion') == 'scroll', 'Resume restores scroll motion')
        story_top = page.locator('.motion-story').evaluate('(e)=>e.getBoundingClientRect().top+scrollY')
        scroll(page, story_top+150)
        loaded(page, '.story-sticky .scene-picture img')
        check(page.locator('.story-sticky').evaluate('(e)=>getComputedStyle(e).position') == 'sticky', 'Photographic background preserves the existing sticky story')
        before = page.locator('.story-sticky').evaluate('(e)=>e.style.getPropertyValue("--scene-y")')
        scroll(page, story_top+400)
        check(page.locator('.story-sticky').evaluate('(e)=>e.style.getPropertyValue("--scene-y")') != before, 'Story artwork progresses while its content stays sticky')
        screenshot(page, 'story-desktop')
        page.set_viewport_size({'width':1920,'height':1080})
        settle(page)
        check(page.locator('.story-sticky > .scene-backdrop').evaluate('(e)=>{const r=e.getBoundingClientRect();return r.left<=1 && r.right>=document.documentElement.clientWidth-1;}'), 'Story image fills the viewport beyond the 1350px content maximum')
        screenshot(page, 'story-wide-desktop')
        page.set_viewport_size({'width':1440,'height':1000})
        for name, selector in [('research','#publication'),('contact','#contact')]:
            page.locator(selector).scroll_into_view_if_needed()
            loaded(page, f'{selector} .scene-picture img')
            settle(page)
            screenshot(page, f'{name}-desktop')
        check(page.locator('#home').get_attribute('data-scene-active') == 'false', 'Offscreen scenes release will-change promotion')
        page.locator('#motionButton').click()
        # Confirm image pixels actually affect the rendered output, not merely DOM visibility.
        # The screenshot is compared with only that image hidden, all motion paused.
        for selector in ['#home', '.story-sticky', '#publication', '#contact']:
            page.locator(selector).scroll_into_view_if_needed()
            loaded(page, f'{selector} .scene-picture img')
            settle(page)
            check(painted(page, selector), f'Artwork paints above its parent background: {selector}')
        page.locator('#motionButton').click()
        check(page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Desktop has no horizontal overflow')
        page.locator('#themeButton').click()
        page.locator('#motionButton').click()
        check(painted(page, '#contact'), 'Artwork remains painted after changing theme')
        context.close()
        mobile = browser.new_context(viewport={'width':390,'height':844},device_scale_factor=3,is_mobile=True,has_touch=True)
        page = mobile.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(BASE, wait_until='networkidle')
        page.wait_for_function('document.documentElement.classList.contains("studio-entered")')
        for name, selector in [('hero','#home'),('story','.story-sticky'),('research','#publication'),('contact','#contact')]:
            if name == 'hero': scroll(page, 0)
            else: page.locator(selector).scroll_into_view_if_needed()
            loaded(page, f'{selector} .scene-picture img')
            check(page.locator(f'{selector} .scene-picture img').evaluate('(i)=>i.currentSrc.endsWith("-960.webp")'), f'High-DPR phone uses compact 960px artwork: {name}')
            check(page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'No mobile horizontal overflow: {name}')
            check(page.locator(f'{selector} .scene-picture img').evaluate('(i)=>getComputedStyle(i).opacity') == '1', f'Mobile artwork keeps full image contrast: {name}')
            if name == 'research':
                check(page.locator('#publication').evaluate('(e)=>{const h=e.querySelector(".section-heading").getBoundingClientRect(), c=e.querySelector(".publication-card").getBoundingClientRect(); return c.top-h.bottom>=230;}'), 'Manuscript has a visible art window before the opaque reading card')
                scroll(page, page.locator(selector).evaluate('(e)=>e.getBoundingClientRect().top+scrollY')-74)
            screenshot(page, f'{name}-mobile')
        scroll(page, 0)
        start = float(page.locator('#home').evaluate('(e)=>parseFloat(e.style.getPropertyValue("--scene-y"))'))
        screenshot(page, 'mobile-scroll-start')
        scroll(page, 350)
        end = float(page.locator('#home').evaluate('(e)=>parseFloat(e.style.getPropertyValue("--scene-y"))'))
        check(end - start >= 25, 'Phone parallax moves at least 25px over a 350px scroll')
        screenshot(page, 'mobile-scroll-end')
        scroll(page, 0)
        check(abs(float(page.locator('#home').evaluate('(e)=>parseFloat(e.style.getPropertyValue("--scene-y"))')) - start) < .1, 'Phone reverse scroll restores the same background')
        page.set_viewport_size({'width':320,'height':740})
        scroll(page,0)
        check(page.evaluate('document.documentElement.scrollWidth <= innerWidth'), '320px layout remains inside viewport')
        screenshot(page,'hero-320')
        mobile.close()
        reduced = browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
        page = reduced.new_page()
        page.goto(BASE,wait_until='networkidle')
        check(page.locator('html').get_attribute('data-scene-motion') == 'still', 'System reduced motion keeps scenes static')
        check(page.locator('.scene-picture').evaluate_all('(items)=>items.every(e=>getComputedStyle(e).transform==="none")'), 'Reduced motion removes every background transform')
        screenshot(page,'reduced-motion')
        reduced.close()
        noscript = browser.new_context(viewport={'width':390,'height':844},java_script_enabled=False)
        page = noscript.new_page()
        page.goto(BASE,wait_until='networkidle')
        loaded(page,'#home .scene-picture img')
        check(painted(page, '#home'), 'No-JavaScript visitors receive painted hero artwork')
        check(page.locator('.scene-picture').evaluate_all('(items)=>items.every(e=>getComputedStyle(e).transform==="none")'), 'No-JavaScript images are static')
        screenshot(page,'no-javascript')
        noscript.close()
        saving = browser.new_context(viewport={'width':1440,'height':1000})
        saving.add_init_script('Object.defineProperty(navigator,"connection",{value:{saveData:true}})')
        page = saving.new_page()
        page.goto(BASE,wait_until='networkidle')
        check(page.locator('html').get_attribute('data-scene-motion') == 'still', 'Data-saving preference disables the additional motion')
        saving.close()
        check(not errors, f'No JavaScript errors: {errors}')
        browser.close()
    (OUT/'background-report.json').write_text(json.dumps({'checks':checks,'errors':errors},indent=2))
    print(f'PASS: {len(checks)} background scene checks; screenshots saved in qa-artifacts.')
finally:
    server.shutdown()
