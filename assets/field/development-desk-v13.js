(() => {
  'use strict';
  const desk = document.getElementById('development-in-focus');
  const hero = document.querySelector('.motion-hero');
  if (!desk || !hero) return;

  const caption = desk.querySelector('#sceneName');
  const note = desk.querySelector('#deskDescription');
  const heroLabel = hero.querySelector('.hero-photo-label');
  const frames = [...hero.querySelectorAll('.hero-image[data-scene]')].map(backdrop => ({
    backdrop,
    print: desk.querySelector('[data-desk-image="' + backdrop.dataset.scene + '"]')
  }));
  if (frames.length < 2 || frames.some(frame => !frame.print)) return;

  // Measure all captions in the same grid cell. Font scaling and narrow screens
  // then reserve the longest caption's space without guessing a fixed height.
  for (const [slot, key] of [[caption.parentElement, 'label'], [note.parentElement, 'note']]) {
    for (const { backdrop } of frames) {
      const measure = document.createElement('span');
      measure.className = 'desk-measure';
      measure.setAttribute('aria-hidden', 'true');
      measure.textContent = backdrop.dataset[key];
      slot.append(measure);
    }
  }

  const dwell = 4800;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const surfaces = [hero, desk];
  const visible = new Set();
  const failed = new Set();
  let current = 0;
  let timer;
  let running = false;
  let generation = 0;
  let pageActive = true;
  let ready = false;
  let openingPending = false;

  function expose(index) {
    const old = frames[current];
    const next = frames[index];
    old.backdrop.dataset.active = old.print.dataset.active = 'false';
    old.print.setAttribute('aria-hidden', 'true');
    next.backdrop.dataset.active = next.print.dataset.active = 'true';
    next.print.setAttribute('aria-hidden', 'false');
    current = index;
    caption.textContent = heroLabel.textContent = next.backdrop.dataset.label;
    note.textContent = next.backdrop.dataset.note;
    if (visible.has(desk) && !reduced.matches) {
      for (const element of [caption, note]) element.animate?.(
        [{ opacity: .65, transform: 'translateY(4px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 380, easing: 'ease-out' }
      );
    }
  }

  async function loadFrame(index) {
    const { backdrop, print } = frames[index];
    const src = backdrop.dataset.src || backdrop.getAttribute('src');
    for (const image of [backdrop, print]) {
      if (!image.hasAttribute('src') || (image.complete && !image.naturalWidth)) image.src = src;
    }
    try {
      await Promise.all([backdrop.decode(), print.decode()]);
      return true;
    } catch {
      failed.add(index);
      return false;
    }
  }

  async function open() {
    if (openingPending) return;
    openingPending = true;
    for (let index = 0; index < frames.length; index++) {
      if (failed.has(index) || !await loadFrame(index)) continue;
      // Also recover a failed first photograph for visitors who prefer a still.
      if (index !== current) expose(index);
      ready = true;
      break;
    }
    openingPending = false;
    sync();
  }

  async function advance(token) {
    for (let offset = 1; offset < frames.length; offset++) {
      if (token !== generation) return;
      const index = (current + offset) % frames.length;
      if (failed.has(index) || !await loadFrame(index)) continue;
      if (token !== generation) return;
      expose(index);
      timer = setTimeout(() => advance(token), dwell);
      return;
    }
  }

  function sync() {
    const allowed = ready && pageActive && !document.hidden && !reduced.matches && visible.size > 0;
    if (allowed === running) return;
    running = allowed;
    const token = ++generation;
    clearTimeout(timer);
    if (running) timer = setTimeout(() => advance(token), dwell);
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > 0) visible.add(entry.target);
        else visible.delete(entry.target);
      });
      sync();
    });
    surfaces.forEach(surface => observer.observe(surface));
  } else {
    const measure = () => {
      for (const surface of surfaces) {
        const box = surface.getBoundingClientRect();
        if (box.top < innerHeight && box.bottom > 0) visible.add(surface);
        else visible.delete(surface);
      }
      sync();
    };
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    measure();
  }
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  window.addEventListener('pagehide', () => { pageActive = false; sync(); });
  window.addEventListener('pageshow', () => { pageActive = true; sync(); });
  window.addEventListener('online', () => {
    if (!failed.size) return;
    failed.clear();
    if (!ready) { open(); return; }
    clearTimeout(timer);
    running = false;
    sync();
  });
  open();
})();
