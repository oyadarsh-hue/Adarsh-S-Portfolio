/* Native scrolling, bounded transforms, and a single shared motion preference. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const allowed = () => !root.classList.contains('paused') && !reduced.matches;
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const story = document.querySelector('.motion-story');
  const words = [...document.querySelectorAll('.story-words > span')];
  const reelStage = document.querySelector('.reel-stage');
  const artwork = [...document.querySelectorAll('.project-artwork img')];
  let queued = false;

  function renderScroll() {
    queued = false;
    if (!allowed()) return;
    const vh = innerHeight;
    if (story) {
      const box = story.getBoundingClientRect();
      if (box.top < vh && box.bottom > 0) {
        const progress = clamp((vh * .12 - box.top) / Math.max(1, box.height - vh * .9));
        story.style.setProperty('--story-progress', progress);
        story.style.setProperty('--story-turn', `${progress * 190}deg`);
        story.style.setProperty('--orbit-y', `${(progress - .5) * 90}px`);
        words.forEach((word, i) => word.style.setProperty('--word-fill', `${clamp(progress * (words.length + 1) - i) * 100}%`));
      }
    }
    if (reelStage) {
      const box = reelStage.getBoundingClientRect();
      if (box.top < vh && box.bottom > 0) {
        reelStage.style.setProperty('--reel-scale', .94 + .06 * clamp((vh - box.top) / (vh * .8)));
      }
    }
    artwork.forEach(img => {
      const box = img.parentElement.getBoundingClientRect();
      if (box.top < vh && box.bottom > 0) img.style.setProperty('--art-y', `${clamp((vh / 2 - box.top - box.height / 2) / vh, -.5, .5) * 22}px`);
    });
  }
  function queueScroll() {
    if (queued || !allowed()) return;
    queued = true;
    requestAnimationFrame(renderScroll);
  }
  addEventListener('scroll', queueScroll, {passive:true});
  addEventListener('resize', queueScroll, {passive:true});

  const collage = document.querySelector('.prism-collage');
  let pointerFrame = 0;
  collage?.addEventListener('pointermove', event => {
    if (!allowed() || !fine.matches || pointerFrame) return;
    const x = event.clientX, y = event.clientY;
    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = 0;
      const box = collage.getBoundingClientRect();
      collage.style.setProperty('--tilt-x', `${clamp((.5 - (y - box.top) / box.height) * 7, -4, 4)}deg`);
      collage.style.setProperty('--tilt-y', `${clamp(((x - box.left) / box.width - .5) * 9, -5, 5)}deg`);
    });
  }, {passive:true});
  collage?.addEventListener('pointerleave', () => {
    collage.style.setProperty('--tilt-x', '0deg');
    collage.style.setProperty('--tilt-y', '0deg');
  });

  if ('IntersectionObserver' in window) {
    const reveal = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('motion-entered');
      reveal.unobserve(entry.target);
    }), {threshold:.18});
    document.querySelectorAll('.section-heading h2, .reel-heading, .prism-playground>div, .timeline-content, .publication-copy, .contact-section h2').forEach(el => {
      el.classList.add('motion-reveal');
      reveal.observe(el);
    });
  }

  const video = document.getElementById('projectReel');
  const toggle = document.getElementById('reelToggle');
  let inView = false, userPaused = false, loaded = false;
  const saveData = navigator.connection?.saveData === true;
  function loadVideo() {
    if (!video || loaded) return;
    const source = video.querySelector('source[data-src]');
    if (!source) return;
    source.src = source.dataset.src;
    video.load();
    loaded = true;
  }
  function showPlayback() {
    if (!toggle || !video) return;
    const playing = !video.paused;
    toggle.querySelector('.reel-control-icon').textContent = playing ? 'Ⅱ' : '▶';
    toggle.querySelector('.reel-control-label').textContent = playing ? 'Pause reel' : 'Play reel';
    toggle.setAttribute('aria-label', playing ? 'Pause project reel' : 'Play project reel');
  }
  async function startVideo() {
    loadVideo();
    try { await video.play(); } catch { /* iOS low-power and autoplay policies retain the poster and play control. */ }
    showPlayback();
  }
  function syncVideo() {
    if (!video) return;
    if (inView && allowed() && !document.hidden && !userPaused && !saveData) void startVideo();
    else video.pause();
  }
  if (video && toggle) {
    video.muted = true;
    video.controls = false;
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
      if (video.paused) { userPaused = false; void startVideo(); }
      else { userPaused = true; video.pause(); }
    });
    video.addEventListener('play', showPlayback);
    video.addEventListener('pause', showPlayback);
    video.addEventListener('timeupdate', () => {
      if (Number.isFinite(video.duration) && video.duration > 0) reelStage.style.setProperty('--reel-progress', video.currentTime / video.duration);
    });
    video.addEventListener('error', () => {
      video.controls = true;
      toggle.querySelector('.reel-control-label').textContent = 'Retry reel';
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        inView = entries[0].isIntersecting;
        syncVideo();
      }, {threshold:.2}).observe(video);
    }
  }
  document.addEventListener('visibilitychange', syncVideo);
  new MutationObserver(() => { syncVideo(); queueScroll(); }).observe(root, {attributes:true,attributeFilter:['class']});
  reduced.addEventListener('change', () => { syncVideo(); queueScroll(); });
  root.classList.add('motion-ready');
  queueScroll();
})();
