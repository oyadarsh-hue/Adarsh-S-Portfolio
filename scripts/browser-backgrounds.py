"""Check photography, geometry, motion preferences, and actual UHD playback."""
import hashlib
from pathlib import Path

from playwright.sync_api import expect
from browser_fixture import run_suite


def scroll(page, y):
    page.evaluate("y => window.scrollTo({top:y,behavior:'instant'})", y)
    page.evaluate("() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))")


def hero_bounds(page):
    return page.locator('.hero').evaluate('e => [e.offsetTop, e.offsetHeight]')


def verify_stream(page, video, film_name, quality, test, compact=False):
    hd = quality == 'web'
    name = film_name + ('-hd' if hd else '') + '-v2.mp4'
    width, height = (1280, 720) if hd else (3840, 2160)
    page.wait_for_function("""expected => {
        const v = document.querySelector('#portfolioFilm');
        const info = JSON.parse(document.querySelector('#filmInfo').textContent)[expected.film];
        const urlMatches = expected.blob ? v.currentSrc.startsWith('blob:') : v.currentSrc.endsWith('/' + expected.name);
        return urlMatches && Math.abs(v.duration - info.duration) < 1 && v.readyState >= 2
            && v.videoWidth === expected.width && v.videoHeight === expected.height;
    }""", arg={'film': film_name, 'name': name, 'blob': not hd and not compact,
               'width': width, 'height': height}, timeout=30000)
    test.check(video.evaluate('v => v.duration >= 60 && v.duration <= 120.1 && v.playsInline'),
               f'{name} decodes inline at {width} × {height} for one to two minutes')


def verify_master_download(page, video, film_name, test):
    download = page.locator('#filmDownload')
    blob_url = video.evaluate('v => v.currentSrc')
    expect(download).to_have_attribute('href', blob_url)
    filename = download.get_attribute('download')
    test.check(filename and filename.lower().endswith('.mp4'), f'{film_name}: full master has an MP4 download name')
    measured = video.evaluate("""async v => {
        const bytes = await (await fetch(v.currentSrc)).arrayBuffer();
        const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
        return Array.from(digest, b => b.toString(16).padStart(2, '0')).join('');
    }""")
    expected = page.locator('#filmInfo').evaluate('(e, key) => JSON.parse(e.textContent)[key].masterSha256', film_name)
    test.check(measured == expected, f'{film_name}: the playing Blob matches the master SHA-256')
    with page.expect_download() as event:
        download.click()
    actual = event.value
    test.check(actual.suggested_filename == filename, f'{film_name}: browser saves the selected download name')
    with Path(actual.path()).open('rb') as stream:
        test.check(hashlib.file_digest(stream, 'sha256').hexdigest() == expected,
                   f'{film_name}: saved 4K download matches the original master byte for byte')


def verify_film(page, video, name, test):
    caption = video.locator('track[kind="captions"]')
    expect(caption).to_have_attribute('src', f'assets/field/{name}-v2.vtt')
    expect(caption).to_have_attribute('srclang', 'en')
    caption.evaluate("t => t.track.mode = 'showing'")
    page.wait_for_function("""() => {
        const t = document.querySelector('#portfolioFilm track[kind="captions"]');
        return t.readyState === 2 && t.track.cues?.length > 1;
    }""")
    test.check(video.evaluate("""v => {
        const cues = [...v.querySelector('track[kind="captions"]').track.cues];
        return cues.every((cue, i) => cue.text.trim() && cue.endTime <= v.duration + .25
            && cue.endTime > cue.startTime && (!i || cue.startTime >= cues[i-1].startTime));
    }"""), f'{name}: the English captions load, have text and fit the duration')
    test.check(video.evaluate("""async v => {
        const image = new Image();
        image.src = v.poster;
        await image.decode();
        return image.naturalWidth >= 800;
    }"""), f'{name}: photographic poster decodes')

    # Listen to actual browser-decoded PCM during a captioned interval. An AAC
    # track with silent samples would pass container inspection alone.
    stats = video.evaluate("""async v => {
        const cue = v.querySelector('track[kind="captions"]').track.cues[0];
        v.currentTime = cue.startTime + .15;
        if (!window.filmAudioTest) {
            const context = new AudioContext();
            const analyser = context.createAnalyser();
            analyser.fftSize = 2048;
            context.createMediaElementSource(v).connect(analyser);
            analyser.connect(context.destination);
            window.filmAudioTest = {context, analyser};
        }
        const {context, analyser} = window.filmAudioTest;
        await context.resume();
        await v.play();
        const data = new Float32Array(analyser.fftSize);
        let maxRms = 0;
        for (let i = 0; i < 50 && maxRms < .009; i++) {
            await new Promise(resolve => setTimeout(resolve, 65));
            analyser.getFloatTimeDomainData(data);
            const rms = Math.sqrt(data.reduce((sum, x) => sum + x*x, 0) / data.length);
            maxRms = Math.max(maxRms, rms);
        }
        v.pause();
        return {maxRms, audible: v.volume > 0 && !v.muted, context: context.state};
    }""")
    test.check(stats['audible'] and stats['context'] == 'running' and stats['maxRms'] > .003,
               f"{name}: decoded narration is audible (sample RMS {stats['maxRms']:.4f})")

    expected_caption = caption.evaluate("""t => {
        const cue = t.track.cues[Math.floor(t.track.cues.length / 2)];
        t.parentElement.currentTime = (cue.startTime + cue.endTime) / 2;
        return cue.text;
    }""")
    page.wait_for_function("""expected => {
        const track = document.querySelector('#filmCaptions').track;
        return [...(track.activeCues || [])].some(cue => cue.text === expected);
    }""", arg=expected_caption)
    test.check(True, f'{name}: seeking halfway activates the matching caption')
    transcript = page.locator('#filmTranscript')
    transcript.locator('summary').click()
    test.check(bool(page.locator('#filmTranscriptText').inner_text().strip()),
               f'{name}: text narration opens alongside the film')
    transcript.locator('summary').click()
    buttons = page.locator('#filmChapters button')
    starts = buttons.evaluate_all('buttons => buttons.map(b => Number(b.dataset.start))')
    duration = video.evaluate('v => v.duration')
    test.check(len(starts) > 1 and starts == sorted(set(starts)) and all(0 <= n < duration for n in starts),
               f'{name}: chronological chapters have unique valid seek targets')
    for index, start in enumerate(starts):
        button = buttons.nth(index)
        test.check(bool(button.inner_text().strip()), f'{name}: chapter {index + 1} has a label')
        if index == len(starts) - 1:
            button.focus()
            page.keyboard.press('Enter')
        else:
            button.click()
        page.wait_for_function("""target => {
            const v = document.querySelector('#portfolioFilm');
            return !v.seeking && Math.abs(v.currentTime - target) < 1.75;
        }""", arg=start)
    test.check(True, f'{name}: every chapter seeks; the last also works from the keyboard')
    expect(page.locator('#filmDownload')).to_have_attribute('href', f'assets/field/{name}-v2.mp4')


with run_suite('backgrounds') as (browser, test):
    with browser.new_context(viewport={'width': 1440, 'height': 900}) as context:
        page = test.page(context)
        videos = []
        page.on('request', lambda request: videos.append(request.url) if '.mp4' in request.url else None)
        test.visit(page)
        test.check(not videos, 'No video is downloaded for the first screen')
        test.check(not page.evaluate("performance.getEntriesByType('resource').some(e => e.name.endsWith('.part'))"),
                   'Large UHD parts wait for a deliberate quality selection')
        scenes = page.locator('.hero-image[data-scene]')
        test.check(scenes.count() >= 2, 'Multiple photographic hero scenes')
        active = page.locator('.hero-image[data-active="true"]')
        expect(active).to_have_count(1)
        active.evaluate('i => i.decode()')
        first = active.get_attribute('data-scene')
        forward = page.locator('[data-scene-step]').last
        forward.click()
        expect(active).not_to_have_attribute('data-scene', first)
        active.evaluate('i => i.decode()')
        for _ in range(scenes.count() - 1):
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
        page.reload()
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
        verify_stream(page, video, 'projects', 'web', test)
        page.wait_for_function("document.querySelector('#portfolioFilm').currentTime > .05")
        verify_film(page, video, 'projects', test)
        # Replacing a source should keep a deliberately chosen viewing position.
        video.evaluate("async v => { v.currentTime = 4; await v.play() }")
        page.wait_for_function("!document.querySelector('#portfolioFilm').seeking")
        quality.select_option('4k')
        verify_stream(page, video, 'projects', '4k', test)
        page.wait_for_function("(v => !v.paused && v.currentTime >= 3.85 && v.currentTime < 9)(document.querySelector('#portfolioFilm'))")
        test.check(True, 'Switching to UHD retains position and playback')
        video.evaluate('v => v.pause()')
        verify_master_download(page, video, 'projects', test)
        quality.select_option('web')
        verify_stream(page, video, 'projects', 'web', test)
        test.check(video.evaluate('v => v.paused && v.currentTime >= 3.85 && v.currentTime < 8'),
                   'Switching to HD preserves pause and position')
        for name in ('journey', 'projects'):
            page.locator(f'[data-film="{name}"]').click()
            expect(page.locator(f'[data-film="{name}"]')).to_have_attribute('aria-pressed', 'true')
            expect(video).to_have_attribute('poster', f'assets/field/{name}-v2.webp')
            requested_quality = quality.input_value()
            video.evaluate('v => v.play().catch(() => {})')
            verify_stream(page, video, name, requested_quality, test)
            if name == 'journey':
                verify_film(page, video, name, test)
                quality.select_option('4k')
                video.evaluate('v => v.play().catch(() => {})')
                verify_stream(page, video, name, '4k', test)
                verify_master_download(page, video, 'journey', test)
            else:
                expect(video.locator('track[kind="captions"]')).to_have_attribute('src','assets/field/projects-v2.vtt')
                expect(page.locator('#filmDownload')).to_have_attribute('href', video.evaluate('v => v.currentSrc'))
        test.check(True, 'Returning to the first title restores its captions, poster, download and selected quality')
    # Simulate an unavailable part with a fresh browser cache. Both static
    # UHD encodes must still be navigable, downloadable and playable.
    with browser.new_context(viewport={'width': 390, 'height': 844}) as context:
        page = test.page(context)
        failed_parts = []
        def missing_part(route):
            failed_parts.append(route.request.url)
            route.abort('failed')
        page.route('**/*.part', missing_part)
        test.visit(page)
        video = page.locator('#portfolioFilm')
        quality = page.locator('#filmQuality')
        for film_name in ('projects', 'journey'):
            if film_name == 'journey':
                page.locator('[data-film="journey"]').click()
            direct = 'assets/field/' + film_name + '-v2.mp4'
            expect(page.locator('#filmDownload')).to_have_attribute('href', direct)
            quality.select_option('4k')
            expect(video).to_have_attribute('src', direct)
            video.evaluate('v => v.play()')
            verify_stream(page, video, film_name, '4k', test, compact=True)
            expect(page.locator('#filmDownload')).to_have_attribute('href', direct)
            video.evaluate('v => v.play()')
            page.wait_for_function("document.querySelector('#portfolioFilm').currentTime > .05")
            quality.select_option('web')
            verify_stream(page, video, film_name, 'web', test)
        test.check(bool(failed_parts), 'An unavailable master part falls back to each playable compact UHD file')

    # Change the film and quality while a previous request is outstanding.
    # Only delay simulated network delivery. The response data is unchanged.
    with browser.new_context() as context:
        context.add_init_script("""{
            const originalFetch = window.fetch;
            let resume;
            const wait = new Promise(resolve => { resume = resolve; });
            window.gatedPartCount = 0;
            window.releaseParts = resume;
            window.fetch = async (...args) => {
                const input = args[0];
                if ((input instanceof Request ? input.url : String(input)).endsWith('.part')) {
                    window.gatedPartCount++;
                    await wait;
                }
                return originalFetch(...args);
            };
        }""")
        page = test.page(context)
        test.visit(page)
        video = page.locator('#portfolioFilm')
        quality = page.locator('#filmQuality')
        quality.select_option('4k')
        page.wait_for_function('window.gatedPartCount > 0')
        page.locator('[data-film="journey"]').click()
        quality.select_option('web')
        page.evaluate('window.releaseParts()')
        video.evaluate('v => v.play()')
        verify_stream(page, video, 'journey', 'web', test)
        page.wait_for_function("document.querySelector('#portfolioFilm').currentTime > 1")
        expect(page.locator('[data-film="journey"]')).to_have_attribute('aria-pressed', 'true')
        expect(page.locator('#filmDownload')).to_have_attribute('href','assets/field/journey-v2.mp4')
        test.check(video.evaluate("v => v.currentSrc.endsWith('/journey-hd-v2.mp4')"),
                   'Late master requests preserve the most recent film and resolution')
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
