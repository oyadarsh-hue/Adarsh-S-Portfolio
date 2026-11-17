"""Check photography, geometry, motion preferences, and actual UHD playback."""
from playwright.sync_api import expect
from browser_fixture import run_suite


def scroll(page, y):
    page.evaluate("y => window.scrollTo({top:y,behavior:'instant'})", y)
    page.evaluate("() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))")


def hero_bounds(page):
    return page.locator('.hero').evaluate('e => [e.offsetTop, e.offsetHeight]')


with run_suite('backgrounds') as (browser, test):
    with browser.new_context(viewport={'width': 1440, 'height': 900}) as context:
        page = test.page(context)
        videos = []
        page.on('request', lambda request: videos.append(request.url) if '.mp4' in request.url else None)
        test.visit(page)
        test.check(not videos, 'No video is downloaded for the first screen')
        scenes = page.locator('.hero-image[data-scene]')
        test.check(scenes.count() == 2, 'Two photographic hero scenes')
        active = page.locator('.hero-image[data-active="true"]')
        expect(active).to_have_count(1)
        active.evaluate('i => i.decode()')
        first = active.get_attribute('data-scene')
        forward = page.locator('[data-scene-step]').last
        forward.click()
        expect(active).not_to_have_attribute('data-scene', first)
        active.evaluate('i => i.decode()')
        forward.click()
        expect(active).to_have_attribute('data-scene', first)
        test.check(True, 'Frame switcher cycles through both photographs and back')
        def motion_values():
            return page.locator('.hero').evaluate("""e => ['--scene-shift','--scene-turn','--title-slide']
                .map(name => parseFloat(getComputedStyle(e).getPropertyValue(name)))""")

        bounds = hero_bounds(page)
        positions = []
        for position in (80, 220, 80, 0):
            scroll(page, position)
            test.check(hero_bounds(page) == bounds, 'Reversible scrolling preserves hero geometry')
            positions.append(motion_values())
        test.check(positions[0] == positions[2] and all(b > a for a, b in zip(positions[0], positions[1])),
                   'Scrolling moves the photo, angle and title and restores them on reverse')
        motion = page.locator('#motionToggle')
        motion.click()
        scroll(page, 180)
        expect(motion).to_have_attribute('aria-pressed', 'true')
        test.check(motion_values() == [0, 0, 0], 'Pause freezes parallax, rotation and text motion')
        motion.click()
        scroll(page, 0)
        expect(motion).to_have_attribute('aria-pressed', 'false')
        test.capture(page, 'photographic-hero')

        video = page.locator('#portfolioFilm')
        quality = page.locator('#filmQuality')
        test.check(video.get_attribute('preload') == 'none', 'Film only loads on demand')
        page.locator('[data-play-film]').first.click()
        video.scroll_into_view_if_needed()
        page.wait_for_function("document.querySelector('#portfolioFilm').videoWidth === 1280")
        page.wait_for_function("document.querySelector('#portfolioFilm').currentTime > 0.05")
        test.check(video.evaluate('v => v.videoHeight === 720 && v.playsInline'), 'Default 720p film decodes inline')
        # Switch from a known playback position, allowing a small decode-time delta.
        video.evaluate("v => { v.currentTime = 4 }")
        page.wait_for_function("!document.querySelector('#portfolioFilm').seeking")
        quality.select_option('4k')
        page.wait_for_function("document.querySelector('#portfolioFilm').videoWidth === 3840")
        test.check(video.evaluate('v => v.videoHeight === 2160 && v.duration > 0'), 'UHD film decodes at 3840 × 2160')
        page.wait_for_function("(v => !v.paused && v.currentTime >= 3.9)(document.querySelector('#portfolioFilm'))")
        test.check(True, 'Switching to 4K retains playback and position')
        video.evaluate('v => v.pause()')
        quality.select_option('web')
        page.wait_for_function("document.querySelector('#portfolioFilm').videoWidth === 1280")
        test.check(video.evaluate('v => v.paused && v.currentTime >= 3.9'), 'Switching to HD preserves pause and position')
        project_poster = video.get_attribute('poster')
        download = page.locator('#filmDownload')
        expect(download).to_have_attribute('href', 'assets/field/film.mp4')
        page.locator('[data-film="landscape"]').click()
        expect(page.locator('[data-film="landscape"]')).to_have_attribute('aria-pressed', 'true')
        expect(download).to_have_attribute('href', 'assets/field/landscape.mp4')
        expect(video).to_have_attribute('poster', 'assets/field/landscape-poster.webp')
        test.check(video.evaluate('''async v => {
            const image = new Image();
            image.src = v.poster;
            await image.decode();
            return image.naturalWidth >= 800;
        }'''), 'Landscape title loads its own photographic poster')
        video.evaluate('v => v.play()')
        page.wait_for_function("""(v => v.currentSrc.endsWith('/landscape-720.mp4') &&
            v.videoWidth === 1280 && v.videoHeight === 720 && v.currentTime > 0)
            (document.querySelector('#portfolioFilm'))""")
        test.check(video.evaluate("v => v.duration >= 8.9 && v.duration <= 9.1"),
                   'The second title plays a distinct nine-second landscape film in HD')
        quality.select_option('4k')
        page.wait_for_function("""(v => v.currentSrc.endsWith('/landscape.mp4') &&
            v.videoWidth === 3840 && v.videoHeight === 2160 && !v.paused)
            (document.querySelector('#portfolioFilm'))""")
        test.check(True, 'The landscape film decodes at 3840 × 2160')
        page.locator('[data-film="projects"]').click()
        expect(page.locator('[data-film="projects"]')).to_have_attribute('aria-pressed', 'true')
        expect(download).to_have_attribute('href', 'assets/field/film.mp4')
        expect(video).to_have_attribute('poster', project_poster)
        video.evaluate('v => v.play()')
        page.wait_for_function("""(v => v.currentSrc.endsWith('/film.mp4') &&
            v.videoWidth === 3840 && v.currentTime > 0)(document.querySelector('#portfolioFilm'))""")
        test.check(video.evaluate("v => v.duration >= 14.9 && v.duration <= 15.1"),
                   'Returning to the project reel restores its own UHD source and duration')
    with browser.new_context(reduced_motion='reduce', viewport={'width': 390, 'height': 844}) as context:
        page = test.page(context)
        test.visit(page)
        test.check(page.evaluate("getComputedStyle(document.documentElement).scrollBehavior !== 'smooth'"),
                   'System reduced motion disables smooth scrolling')
        expect(page.locator('#motionToggle')).to_be_disabled()
        test.check(page.locator('.hero-image[data-active="true"]').evaluate("e => getComputedStyle(e).transform === 'none'"),
                   'System reduced motion leaves the photograph still')
        page.locator('#showreel').scroll_into_view_if_needed()
        test.check(page.locator('#portfolioFilm').evaluate('v => v.paused && v.currentTime === 0'),
                   'Reduced-motion mode never autoplays the film')
        test.layout(page, 'film / mobile')
