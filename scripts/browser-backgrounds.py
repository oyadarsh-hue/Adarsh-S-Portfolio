"""Verify independent films, their actual media streams, photography and scroll effects."""

import hashlib
from pathlib import Path

from playwright.sync_api import expect
from browser_fixture import run_suite

PROJECTS = ("assenttag", "epigraphix-ai", "aegisforge-x", "deciphera", "quietnote")
SCHOOLS = {"mca": "Thrissur", "bsc": "Thamarassery", "hse": "Thamarassery", "sslc": "Engapuzha"}
COMPANIES = {"bluegen": "Bluegen", "skybrisk": "Skybrisk", "codtech": "CODTECH"}
CLIPS = (*PROJECTS, *SCHOOLS, *COMPANIES, "publication")
LONG = {"projects": "project-film", "journey": "journey-film"}
ARCHIVE = {
    "original-project": ("adarsh-project-reel.mp4", 16),
    "original-loop": ("dimensional-loop.mp4", 8),
}
REELS = {"orbit": ("orbit-reel", "film", 15), "landscape": ("landscape-reel", "landscape", 9)}


def frame_for(page, slug):
    return page.locator(f'.screen-card[data-clip="{slug}"]')


def quality(frame):
    return frame.locator(".screen-quality select")


def until_video(frame, expression, argument=None):
    slug = frame.get_attribute("data-clip")
    frame.page.wait_for_function(
        f"""([slug, arg]) => {{
        const v = document.querySelector('.screen-card[data-clip="' + slug + '"] video');
        return v && ({expression});
    }}""",
        arg=[slug, argument],
        timeout=25000,
    )


def scroll(page, y):
    page.evaluate("y => window.scrollTo({top:y,behavior:'instant'})", y)
    page.evaluate("() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))")


def verify_scroll_text(page, test, reduced=False):
    anchor = page.locator(".type-anchor:has(.scroll-type .word-unit)").first
    anchor.scroll_into_view_if_needed()
    page.evaluate("document.fonts.ready")
    top = anchor.evaluate("e => e.getBoundingClientRect().top + scrollY")
    height = page.viewport_size["height"]
    start, finish = max(0, round(top - height * 0.72)), max(0, round(top - height * 0.32))
    states = []
    for y in (start, finish, start):
        scroll(page, y)
        states.append(
            anchor.evaluate("""e => {
            const group = e.querySelector('.scroll-type');
            const nodes = [group,...group.querySelectorAll('.word-unit')];
            const paint = nodes.map(n => {
                const css = getComputedStyle(n);
                return [css.transform,css.translate,css.rotate,css.scale];
            });
            return {top: e.getBoundingClientRect().top+window.scrollY, height:e.offsetHeight,
                progress:getComputedStyle(group).getPropertyValue('--type-progress').trim(), paint};
        }""")
        )
    test.check(
        abs(states[0]["top"] - states[1]["top"]) < 1
        and states[0]["height"] == states[1]["height"]
        and abs(states[0]["top"] - states[2]["top"]) < 1,
        "Text animation leaves its layout anchor stable and jitter-free",
    )
    if reduced:
        test.check(
            states[0]["paint"] == states[1]["paint"],
            "Reduced motion freezes scroll-driven text transforms",
        )
    else:
        test.check(
            states[0]["progress"] != states[1]["progress"] and states[0]["paint"] != states[1]["paint"],
            "Actual word transforms change with scrolling",
        )
        test.check(
            states[0]["progress"] == states[2]["progress"] and states[0]["paint"] == states[2]["paint"],
            "Reversing scroll restores the same word position and angle",
        )


def verify_stream(frame, hd, source, test):
    width, height = (1280, 720) if hd else (3840, 2160)
    until_video(
        frame,
        """v.readyState >= 2 && v.videoWidth === arg.width && v.videoHeight === arg.height &&
        (arg.source === 'blob:' ? v.currentSrc.startsWith('blob:') : v.currentSrc.endsWith('/' + arg.source))""",
        {"width": width, "height": height, "source": source},
    )
    test.check(
        frame.locator("video").evaluate("v => v.playsInline && v.controls && v.duration > 0"),
        f"{frame.get_attribute('data-clip')}: native inline {width}×{height} playback",
    )


def play(frame):
    frame.locator("video").evaluate("v => v.play()")


def verify_audio_and_captions(frame, slug, test):
    video = frame.locator("video")
    track = video.locator('track[kind="captions"]')
    expected = f"assets/field/{slug}-v2.vtt" if slug in LONG else f"assets/clips/{slug}.vtt"
    expect(track).to_have_attribute("src", expected)
    expect(track).to_have_attribute("srclang", "en")
    track.evaluate("t => t.track.mode = 'showing'")
    until_video(
        frame,
        "v.querySelector('track[kind=\"captions\"]').readyState === 2 && v.textTracks[0].cues?.length > 0",
    )
    timeline = track.evaluate("""t => [...t.track.cues].map(c => [c.startTime,c.endTime,c.text])""")
    duration = video.evaluate("v => v.duration")
    test.check(
        0 <= timeline[0][0] < 1.5
        and all(
            cue[2].strip()
            and 0 <= cue[0] < cue[1] <= duration + 0.25
            and (not i or cue[0] >= timeline[i - 1][0])
            for i, cue in enumerate(timeline)
        ),
        f"{slug}: captions are local to this film’s timeline",
    )

    # An audio track can contain silence. Measure browser-decoded PCM during the first spoken cue.
    stats = video.evaluate("""async v => {
        const t = v.querySelector('track[kind="captions"]').track;
        v.currentTime = t.cues[0].startTime + .12;
        const ctx = window.portfolioAudioTest ||= new AudioContext();
        if (!v._testAnalyser) {
            v._testAnalyser = ctx.createAnalyser();
            v._testAnalyser.fftSize = 2048;
            ctx.createMediaElementSource(v).connect(v._testAnalyser);
            v._testAnalyser.connect(ctx.destination);
        }
        await ctx.resume(); await v.play();
        const data = new Float32Array(v._testAnalyser.fftSize);
        let rms = 0;
        for (let i=0; i<50 && rms<.009; i++) {
            await new Promise(r => setTimeout(r, 65));
            v._testAnalyser.getFloatTimeDomainData(data);
            rms = Math.max(rms, Math.sqrt(data.reduce((sum,x) => sum+x*x,0) / data.length));
        }
        v.pause();
        return {rms, muted:v.muted, volume:v.volume};
    }""")
    test.check(
        stats["rms"] > 0.003 and not stats["muted"] and stats["volume"] > 0,
        f"{slug}: decoded narration is audible (sample RMS {stats['rms']:.4f})",
    )
    cue = timeline[len(timeline) // 2]
    video.evaluate("(v, n) => {v.currentTime = n}", (cue[0] + cue[1]) / 2)
    until_video(frame, "Array.from(v.textTracks[0].activeCues || []).some(c => c.text === arg)", cue[2])
    test.check(True, f"{slug}: seeking displays the matching spoken caption")


def verify_master(frame, slug, test):
    video = frame.locator("video")
    download = frame.locator("[data-uhd]")
    expect(download).to_have_attribute("href", video.evaluate("v => v.currentSrc"))
    name = download.get_attribute("download")
    test.check(
        bool(name and name.lower().endswith(".mp4")), f"{slug}: master has a downloadable MP4 filename"
    )
    digest = video.evaluate("""async v => {
      const bytes = await (await fetch(v.currentSrc)).arrayBuffer();
      const hash = await crypto.subtle.digest('SHA-256',bytes);
      return [...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('');
    }""")
    expected = frame.page.locator("#filmInfo").evaluate(
        "(node,name) => JSON.parse(node.textContent)[name].masterSha256", slug
    )
    test.check(digest == expected, f"{slug}: the playing 4K Blob matches the master")
    with frame.page.expect_download() as result:
        download.click()
    saved = result.value
    test.check(saved.suggested_filename == name, f"{slug}: downloaded filename matches")
    with Path(saved.path()).open("rb") as stream:
        test.check(
            hashlib.file_digest(stream, "sha256").hexdigest() == expected,
            f"{slug}: saved UHD download exactly matches the master bytes",
        )


def verify_program(frame, slug, test):
    program = frame.locator("[data-chapters]").locator("xpath=ancestor::details[1]")
    if program.count() and not program.evaluate("e => e.open"):
        program.locator(":scope > summary").click()
    chapters = frame.locator("[data-chapters] button")
    starts = chapters.evaluate_all("buttons => buttons.map(b => Number(b.dataset.start))")
    duration = frame.locator("video").evaluate("v => v.duration")
    test.check(
        len(starts) > 1 and starts == sorted(set(starts)) and all(0 <= n < duration for n in starts),
        f"{slug}: ordered chapters fit within this program",
    )
    for i, start in enumerate(starts):
        btn = chapters.nth(i)
        test.check(bool(btn.inner_text().strip()), f"{slug}: chapter {i + 1} has a name")
        if i == len(starts) - 1:
            btn.focus()
            frame.page.keyboard.press("Enter")
        else:
            btn.click()
        until_video(frame, "!v.seeking && Math.abs(v.currentTime - arg) < 1.75", start)
    test.check(True, f"{slug}: all chapters seek in their own video, including from keyboard")
    transcript = frame.locator("[data-transcript]")
    details = transcript.locator("xpath=ancestor-or-self::details[1]")
    if not details.evaluate("e => e.open"):
        details.locator("summary").click()
    test.check(len(transcript.inner_text().strip()) > 60, f"{slug}: complete transcript is readable")
    details.locator("summary").click()


def check_placement(page, test):
    test.check(
        page.locator(".screen-card[data-clip]").count() == 19,
        "Nineteen independent frames on the homepage",
    )
    for slug in CLIPS:
        frame = frame_for(page, slug)
        expect(frame).to_have_count(1)
        expect(frame.locator("video")).to_have_count(1)
        if slug in PROJECTS:
            test.check(
                frame.evaluate('(e,id) => !!e.closest("#project-"+id)', slug),
                f"{slug}: film is in the matching case-study card",
            )
        elif slug == "publication":
            test.check(
                frame.evaluate('e => !!e.closest("#publication")'), "Research film belongs to the paper"
            )
        else:
            parent = ".lo-school" if slug in SCHOOLS else ".lo-employer"
            expected = (SCHOOLS | COMPANIES)[slug]
            test.check(
                expected.lower()
                in frame.locator('xpath=ancestor::*[contains(@class,"' + parent[1:] + '")][1]')
                .inner_text()
                .lower(),
                f"{slug}: film belongs to the correct institution or employer",
            )
    for slug, target in {**LONG, **{s: v[0] for s, v in REELS.items()}}.items():
        frame = frame_for(page, slug)
        test.check(
            frame.get_attribute("id") == target and frame.evaluate('e => !!e.closest("#showreel")'),
            f"{slug}: own visible frame and direct anchor in the theatre",
        )
    test.check(
        page.locator("#showreel .screen-card").count() == 6,
        "The theatre contains both narrated films, two 4K silent reels, and both archive originals",
    )
    for width in (1440, 768, 390, 320):
        page.set_viewport_size({"width": width, "height": 900})
        sizes = page.locator(".screen-card").evaluate_all("""nodes => nodes.map(n => {
            const b=n.getBoundingClientRect();return [b.left,b.right,b.width];
        })""")
        test.check(
            all(a >= -2 and b <= width + 2 and c > 140 for a, b, c in sizes),
            f"All nineteen film frames fit at {width}px",
        )
        test.layout(page, f"theatre and inline players / {width}")
    page.set_viewport_size({"width": 1440, "height": 900})


with run_suite("backgrounds") as (browser, test):
    with browser.new_context(viewport={"width": 1440, "height": 900}) as context:
        page = test.page(context)
        requests = []
        page.on(
            "request",
            lambda req: requests.append(req.url) if req.url.endswith((".mp4", ".part")) else None,
        )
        test.visit(page)
        test.check(not requests, "Video and master parts wait for a play or quality action")
        scenes = page.locator(".hero-image[data-scene]")
        active = page.locator('.hero-image[data-active="true"]')
        expect(active).to_have_count(1)
        expect(scenes).to_have_count(3)
        test.check(
            "monsoon-v3.webp" in active.get_attribute("src"),
            "New monsoon photograph opens the three-scene hero",
        )
        active.evaluate("img => img.decode()")
        first = active.get_attribute("data-scene")
        steps = page.locator("[data-scene-step]").last
        steps.click()
        expect(active).not_to_have_attribute("data-scene", first)
        active.evaluate("img => img.decode()")
        for _ in range(scenes.count() - 1):
            steps.click()
        expect(active).to_have_attribute("data-scene", first)
        test.check(True, "Landscape switcher cycles and decodes the photographs")
        hero = page.locator(".hero")
        bounds = hero.evaluate("e => [e.offsetTop,e.offsetHeight]")
        positions = []
        for pos in (80, 220, 80, 0):
            scroll(page, pos)
            test.check(
                hero.evaluate("e => [e.offsetTop,e.offsetHeight]") == bounds,
                "Reversing scroll preserves hero geometry",
            )
            positions.append(
                hero.evaluate(
                    """e => ['--scene-shift','--scene-turn','--title-slide'].map(k=>parseFloat(getComputedStyle(e).getPropertyValue(k)))"""
                )
            )
        test.check(
            positions[0] == positions[2] and all(b > a for a, b in zip(positions[0], positions[1])),
            "Scrolling moves and restores the background, title and angle",
        )
        motion = page.locator("#motionToggle")
        motion.click()
        page.reload()
        scroll(page, 180)
        expect(motion).to_have_attribute("aria-pressed", "true")
        test.check(
            hero.evaluate(
                """e => ['--scene-shift','--scene-turn','--title-slide'].every(k=>!parseFloat(getComputedStyle(e).getPropertyValue(k)))"""
            ),
            "Manual pause persists and freezes scene motion",
        )
        motion.click()
        scroll(page, 0)
        test.capture(page, "photographic-hero")
        verify_scroll_text(page, test)
        check_placement(page, test)

        # The hero opens the original overview and starts it only after this gesture.
        page.locator("[data-play-film]").first.click()
        until_video(frame_for(page, "projects"), "!v.paused && v.currentTime > .05")
        for slug in LONG:
            frame = frame_for(page, slug)
            video = frame.locator("video")
            direct = f"assets/field/{slug}-v2.mp4"
            expect(frame.locator("[data-uhd]")).to_have_attribute("href", direct)
            play(frame)
            verify_stream(frame, True, f"{slug}-hd-v2.mp4", test)
            verify_audio_and_captions(frame, slug, test)
            verify_program(frame, slug, test)
            video.evaluate("async v => { v.currentTime = 4; await v.play() }")
            until_video(frame, "!v.seeking")
            quality(frame).select_option("uhd")
            verify_stream(frame, False, "blob:", test)
            until_video(frame, "!v.paused && v.currentTime >= 3.85 && v.currentTime < 9")
            video.evaluate("v => v.pause()")
            verify_master(frame, slug, test)
            quality(frame).select_option("hd")
            verify_stream(frame, True, f"{slug}-hd-v2.mp4", test)
            test.check(
                video.evaluate("v => v.paused && v.currentTime >= 3.85 && v.currentTime < 9"),
                f"{slug}: returning to HD preserves pause and position",
            )

        for slug, (_, stem, length) in REELS.items():
            frame = frame_for(page, slug)
            play(frame)
            verify_stream(frame, True, stem + "-720.mp4", test)
            quality(frame).select_option("uhd")
            verify_stream(frame, False, stem + ".mp4", test)
            test.check(
                abs(frame.locator("video").evaluate("v=>v.duration") - length) < 0.2,
                f"{slug}: original visual reel duration",
            )
            frame.locator("video").evaluate("v=>v.pause()")

        for slug, (filename, length) in ARCHIVE.items():
            frame = frame_for(page, slug)
            test.check(
                frame.evaluate('e=>!!e.closest("#showreel")'),
                f"{slug}: original occupies its own theatre frame",
            )
            video = frame.locator("video")
            expect(video.locator("source")).to_have_attribute("src", "assets/video/" + filename)
            expect(frame.locator(f'a[href="assets/video/{filename}"]')).to_be_visible()
            play(frame)
            until_video(
                frame, "v.readyState>=2 && v.videoWidth===960 && v.videoHeight===540 && v.currentTime>0"
            )
            test.check(
                abs(video.evaluate("v=>v.duration") - length) < 0.1,
                f"{slug}: the original 960×540 film decodes for its original duration",
            )
            video.evaluate("v=>v.pause()")
        for slug in CLIPS:
            frame = frame_for(page, slug)
            video = frame.locator("video")
            expect(video.locator("source")).to_have_attribute("src", f"assets/clips/{slug}-hd.mp4")
            expect(video).to_have_attribute("poster", f"assets/clips/{slug}.webp")
            expect(frame.locator("[data-uhd]")).to_have_attribute("href", f"assets/clips/{slug}.mp4")
            play(frame)
            verify_stream(frame, True, f"{slug}-hd.mp4", test)
            verify_audio_and_captions(frame, slug, test)
            quality(frame).select_option("uhd")
            play(frame)
            verify_stream(frame, False, f"{slug}.mp4", test)
            until_video(frame, "!v.paused")
            video.evaluate("v=>v.pause()")

        a, b = frame_for(page, "assenttag"), frame_for(page, "quietnote")
        play(a)
        play(b)
        test.check(
            a.locator("video").evaluate("v=>v.paused")
            and not b.locator("video").evaluate("v=>v.paused"),
            "Starting another clip pauses the first narration",
        )
        b.locator("video").evaluate("v => v.pause()")

    with browser.new_context(viewport={"width": 390, "height": 844}, reduced_motion="reduce") as context:
        page = test.page(context)
        test.visit(page, "?film=journey#showreel")
        journey = frame_for(page, "journey")
        test.check(
            journey.evaluate(
                "e=>{const b=e.getBoundingClientRect();return b.top<innerHeight && b.bottom>0}"
            ),
            "Direct journey link brings its independent frame into view",
        )
        expect(page.locator("#motionToggle")).to_be_disabled()
        test.check(
            page.evaluate("getComputedStyle(document.documentElement).scrollBehavior !== 'smooth'"),
            "System reduced motion disables smooth scrolling",
        )
        test.check(
            page.locator('.hero-image[data-active="true"]').evaluate(
                "e=>getComputedStyle(e).transform === 'none'"
            ),
            "Reduced-motion photograph is static",
        )
        verify_scroll_text(page, test, reduced=True)
        test.check(
            page.locator("video").evaluate_all("videos=>videos.every(v=>v.paused&&v.currentTime===0)"),
            "Scrolling to a film never starts narration automatically",
        )
        missing = []

        def missing_part(route):
            missing.append(route.request.url)
            route.abort("failed")

        page.route("**/*.part", missing_part)
        for slug in LONG:
            frame = frame_for(page, slug)
            direct = f"assets/field/{slug}-v2.mp4"
            quality(frame).select_option("uhd")
            expect(frame.locator("video")).to_have_attribute("src", direct)
            play(frame)
            verify_stream(frame, False, slug + "-v2.mp4", test)
            expect(frame.locator("[data-uhd]")).to_have_attribute("href", direct)
            quality(frame).select_option("hd")
            verify_stream(frame, True, slug + "-hd-v2.mp4", test)
        test.check(bool(missing), "An unavailable master part falls back to both compact UHD files")

    # Delay one real network request and change the quality before it returns.
    with browser.new_context() as context:
        context.add_init_script("""{
          const fetcher=window.fetch;let go;
          const gate=new Promise(r=>go=r);
          window.releaseParts=go;window.waitingParts=0;
          window.fetch=async(...args)=>{
            const q=args[0];
            if((q instanceof Request?q.url:String(q)).endsWith('.part')){window.waitingParts++;await gate;}
            return fetcher(...args);
          };
        }""")
        page = test.page(context)
        test.visit(page)
        frame = frame_for(page, "projects")
        quality(frame).select_option("uhd")
        page.wait_for_function("window.waitingParts > 0")
        quality(frame).select_option("hd")
        page.evaluate("window.releaseParts()")
        play(frame)
        verify_stream(frame, True, "projects-hd-v2.mp4", test)
        until_video(frame, "v.currentTime>1")
        test.check(
            frame.locator("video").evaluate("v=>v.currentSrc.endsWith('/projects-hd-v2.mp4')"),
            "A late UHD request cannot replace the selected HD source",
        )
