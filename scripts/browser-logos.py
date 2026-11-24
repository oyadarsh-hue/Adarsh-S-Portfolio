"""Verify that the supplied school, employer, publication and course logos remain usable."""
from browser_fixture import run_suite

with run_suite('logos') as (browser, test):
    for width in (320, 390, 768, 1440):
        with browser.new_context(viewport={'width': width, 'height': 900},
                                 reduced_motion='reduce') as context:
            page = test.page(context)
            test.visit(page)
            details = page.locator('#certifications details')
            details.locator('summary').click()
            test.check(details.evaluate('(d) => d.open'), 'More credentials opens')
            test.check(page.locator('#certifications article:visible').count() == 15,
                       f'All 15 credentials are accessible at {width}px')
            page.locator('#publication .lo-citation > summary').click()
            logos = page.locator('main img[src*="/logos/"], main img[src*="/certificates/"]')
            test.check(page.locator('main img[src*="/logos/"]').count() == 8,
                       'Eight verified organization logos')
            for img in logos.all():
                img.scroll_into_view_if_needed()
                img.evaluate('(i) => i.decode()')
                test.check(img.evaluate('''i => {
                    const box = i.getBoundingClientRect();
                    return i.naturalWidth > 0 && box.width >= 20 && box.height >= 10
                        && box.left >= -1 && box.right <= innerWidth + 1;
                }'''), f'Logo loads and fits at {width}px: {img.get_attribute("alt")}')
            test.check(page.locator('#education img[src*="/logos/mgm-"]').evaluate('e => !e.closest("a")'),
                       'Supplied MGM emblem has no unrelated school link')
            test.check(page.locator('#experience a[href="https://bluegensolutions.com/"]').count() == 1,
                       'Original employer website is reachable')
            details.locator('summary').click()
            test.check(not details.evaluate('(d) => d.open'), 'More credentials closes')
            test.layout(page, f'logos / {width}')
            if width == 390:
                page.locator('#certifications').scroll_into_view_if_needed()
                test.capture(page, 'credentials-mobile')
    with browser.new_context(java_script_enabled=False) as context:
        fallback = test.page(context)
        test.visit(fallback)
        fallback.locator('#certifications details summary').click()
        test.check(fallback.locator('#certifications article:visible').count() == 15,
                   'All courses remain available without JavaScript')
        test.check(fallback.locator('#experience details').count() == 3 and
                   fallback.locator('#education img[src*="/logos/"]').count() == 4, 'Career and education entries retained')
