"""End-to-end checks for the public portfolio, its links, and saved preferences."""
from playwright.sync_api import expect
from browser_fixture import ROOT, run_suite


def check_theme(page, test, expected):
    expect(page.locator('html')).to_have_attribute('data-theme', expected)
    button = page.locator('#themeToggle')
    expect(button).to_have_attribute('aria-pressed', str(expected == 'dark').lower())
    test.check(bool(button.get_attribute('aria-label') or button.inner_text().strip()),
               'Theme control has an accessible name')


with run_suite('portfolio') as (browser, test):
    with browser.new_context(viewport={'width': 1440, 'height': 950}, color_scheme='light') as context:
        page = test.page(context)
        test.visit(page)
        check_theme(page, test, 'light')
        light_background = page.evaluate('getComputedStyle(document.body).backgroundColor')
        portrait = page.locator('#about img[src$="adarsh-s.jpeg"]')
        portrait.scroll_into_view_if_needed()
        portrait.evaluate('i => i.decode()')
        test.check(portrait.evaluate('''i => {
            const frame = i.closest('figure');
            const style = getComputedStyle(frame);
            return i.naturalWidth > 0 && parseFloat(style.borderTopLeftRadius) < 16
                && style.clipPath === 'none';
        }'''), 'Original portrait decodes inside a rectangular frame')
        page.locator('#themeToggle').focus()
        page.keyboard.press('Space')
        check_theme(page, test, 'dark')
        test.check(page.evaluate('getComputedStyle(document.body).backgroundColor') != light_background,
                   'The theme switch changes the painted page background')
        page.reload()
        check_theme(page, test, 'dark')
        test.capture(page, 'portfolio-dark')
        test.visit(page, 'projects/assenttag.html')
        expect(page.locator('html')).to_have_attribute('data-theme', 'dark')
        page.locator('#themeButton').click()
        expect(page.locator('html')).to_have_attribute('data-theme', 'light')
        test.visit(page)
        check_theme(page, test, 'light')

        cards = page.locator('[data-project-tags]:visible')
        expect(cards).to_have_count(5)
        page.locator('[data-project-filter="web"]').click()
        expect(cards).to_have_count(2)
        page.locator('#projectSearch').fill('postgresql')
        expect(cards).to_have_count(1)
        expect(cards).to_contain_text('QuietNote')
        page.locator('#projectSearch').fill('zzzz no such project')
        expect(page.locator('#projectEmpty')).to_be_visible()
        expect(cards).to_have_count(0)
        page.locator('#projectSearch').fill('')
        page.locator('[data-project-filter="all"]').click()
        expect(cards).to_have_count(5)
        expect(page.locator('#projectResults')).to_contain_text('5')
        test.check(True, 'Project filters, search, empty state and reset work')
        for query, expected_id in [('focus=vision&q=epigraph', 'project-epigraphix-ai'),
                                   ('focus=security&q=quietnote', 'project-quietnote')]:
            test.visit(page, 'index.html?' + query + '#projects')
            expect(cards).to_have_count(1)
            expect(cards).to_have_id(expected_id)
        test.visit(page)
        page.locator('[data-lo-filter="intelligence"]').click()
        expect(page.locator('[data-lo-category]:visible')).to_have_count(2)
        expect(page.locator('#skills')).to_contain_text('OpenCV')
        page.locator('[data-lo-filter="all"]').click()
        expect(page.locator('[data-lo-category]:visible')).to_have_count(6)
        test.check(True, 'All disciplines restore after filtering the toolkit')

        for width in (1440, 900, 768, 390, 320):
            page.set_viewport_size({'width': width, 'height': 900})
            test.layout(page, f'home / {width}')
            hero_portrait = page.locator('.portrait-mat img')
            hero_portrait.scroll_into_view_if_needed()
            hero_portrait.evaluate('i => i.decode()')
            picture = hero_portrait.bounding_box()
            if width <= 700:
                gap = page.locator('.hero-role').evaluate('role => role.getBoundingClientRect().top - document.querySelector(".hero-portrait").getBoundingClientRect().bottom')
                test.check(gap >= 4, f'Portrait and role have separate rows at {width}px')
            test.check(picture is not None and picture['width'] >= (295 if width >= 1200 else 160)
                       and picture['height'] >= 145 and picture['x'] >= -1
                       and picture['x'] + picture['width'] <= width + 1,
                       f'Color portrait fits and remains legible at {width}px')
            test.check(hero_portrait.evaluate('i => !!i.alt.trim() && !getComputedStyle(i).filter.includes("grayscale")'),
                       'The profile photo retains its color and accessible name')
            about_image = page.locator('.lo-portrait-print > img')
            about_image.scroll_into_view_if_needed()
            about_image.evaluate('i => i.decode()')
            about_box = about_image.bounding_box()
            min_width = 290 if width >= 1200 else 180 if width >= 390 else 145
            test.check(about_box is not None and about_box['width'] >= min_width,
                       f'About page portrait is legible at {width}px')
        for selector in ('.work-cover .window-photo', '#experience .lo-scene-photo', '#education .lo-scene-photo'):
            photo = page.locator(selector)
            photo.scroll_into_view_if_needed()
            photo.evaluate('i => i.decode()')
            test.check(photo.evaluate('i => i.naturalWidth >= 640 && i.getBoundingClientRect().height >= 120'),
                       f'Visible photographic background: {selector}')
        handles = [('gmail','mailto:oyadarsh@gmail.com'), ('phone','tel:+919061448229'),
                   ('github','https://github.com/oyadarsh-hue'), ('linkedin','https://www.linkedin.com/in/')]
        for icon, destination in handles:
            link = page.locator(f'#contact a[href^="{destination}"]').first
            image = link.locator(f'img[src$="/{icon}.svg"]')
            image.scroll_into_view_if_needed()
            image.evaluate('i=>i.decode()')
            test.check(image.evaluate('i=>i.naturalWidth>0 && i.getBoundingClientRect().width>=16')
                       and bool(link.get_attribute('aria-label') or link.inner_text().strip()),
                       f'Contact {icon} icon loads and has an accessible link')
        page.locator('#menuButton').click()
        expect(page.locator('#menuButton')).to_have_attribute('aria-expanded', 'true')
        page.keyboard.press('Escape')
        expect(page.locator('#menuButton')).to_have_attribute('aria-expanded', 'false')
        page.locator('#menuButton').click()
        page.locator('#nav a[href="#skills"]').click()
        expect(page.locator('#menuButton')).to_have_attribute('aria-expanded', 'false')
        test.check(page.url.endswith('#skills'), 'Mobile navigation reaches the selected section')
        page.evaluate('window.scrollTo({top:0,behavior:"instant"})')
        test.capture(page, 'portfolio-mobile')

        studio = page.locator('a[href="audio-studio.html"]:visible').first
        studio.click()
        expect(page.locator('#sourceText')).to_be_visible()
        expect(page.locator('#output')).to_be_visible()
        test.layout(page, 'audio studio / mobile')
        test.visit(page)

        for case in sorted((ROOT / 'projects').glob('*.html')):
            test.visit(page, f'projects/{case.name}')
            expect(page.locator('.case-evidence')).to_be_visible()
            cover = page.locator('.case-splash .cover-image img')
            cover.evaluate('img=>img.decode()')
            test.check(cover.evaluate('img=>img.naturalWidth>=640 && img.clientHeight>=250'),
                       case.stem + ' has a large photographic cover')
            title = page.locator('.case-splash .ed-title')
            page.evaluate('scrollTo(0,0)')
            page.wait_for_timeout(100)
            initial = title.evaluate('t=>getComputedStyle(t).transform')
            page.evaluate('scrollTo(0,180)')
            page.wait_for_function('initial=>getComputedStyle(document.querySelector(".case-splash .ed-title")).transform!==initial',
                                   arg=initial)
            expect(page.locator('.case-jump a[href="#workflow"]')).to_be_visible()
            expect(page.locator(f'.screen-card[data-clip="{case.stem}"] video')).to_have_count(1)
            test.layout(page, case.stem + ' mobile')
        test.visit(page, 'recruiter.html')
        test.check(page.locator('a[href="index.html#skills"]').count() > 0, 'Recruiter view links to skills')
        page.emulate_media(media='print')
        expect(page.locator('#contact')).to_be_visible()
    with browser.new_context(java_script_enabled=False, viewport={'width': 390, 'height': 844}) as context:
        page = test.page(context)
        test.visit(page)
        expect(page.locator('[data-project-tags]:visible')).to_have_count(5)
        expect(page.locator('[data-lo-category]:visible')).to_have_count(6)
        test.check(page.locator('a[href$=".pdf"]:visible').count() > 0, 'CV is reachable without JavaScript')
        videos = page.locator('.screen-card video')
        test.check(videos.count() == 21 and videos.evaluate_all("""vs=>vs.every(v=>
            v.playsInline && v.controls && (v.getAttribute('src') || v.querySelector('source[src]'))
        )"""), 'All twenty-one native videos work without JavaScript')
        expect(page.locator('#journey-film a[href="assets/field/journey-v2.mp4"]')).to_be_visible()
        test.check(True, 'Journey film has its own native UHD link without JavaScript')
        test.layout(page, 'no JavaScript')
    with browser.new_context(color_scheme='dark', reduced_motion='reduce') as context:
        context.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw Error('blocked')}})")
        page = test.page(context)
        test.visit(page)
        check_theme(page, test, 'dark')
        page.locator('#themeToggle').click()
        check_theme(page, test, 'light')
        test.check(True, 'Theme still switches with storage disabled')
