(() => {
  'use strict';

  const section = document.querySelector('#experience');
  if (!section) return;
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const dwell = 5400;
  const galleries = new Map();

  function permitsMotion() {
    return !reduced.matches && !root.classList.contains('paused') && root.dataset.motion !== 'paused';
  }

  function makeGallery(gallery) {
    const track = gallery.querySelector('.employer-gallery-track');
    const slides = Array.from(track.children);
    const sources = slides.map(slide => slide.querySelector('a'));
    const controls = gallery.querySelector('.employer-gallery-controls');
    const previous = controls.querySelector('[data-step="-1"]');
    const next = controls.querySelector('[data-step="1"]');
    const count = controls.querySelector('output');
    const playhead = gallery.querySelector('.industry-playhead i');
    let index = -1;
    let inView = false;
    let manual = false;
    let hovering = false;
    let advancing = false;
    let timer = 0;
    let paint = 0;
    let meter;
    let drift;

    function update() {
      paint = 0;
      if (!track.clientWidth) return;
      const active = Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / track.clientWidth)));
      if (active === index) return;
      index = active;
      count.textContent = (index + 1) + ' / ' + slides.length;
      previous.setAttribute('aria-disabled', String(index === 0));
      next.setAttribute('aria-disabled', String(index === slides.length - 1));
      sources.forEach((link, position) => { link.tabIndex = position === index ? 0 : -1; });
    }

    function move(destination, animate = true) {
      if (destination < 0 || destination >= slides.length) return;
      track.scrollTo({
        left: track.clientWidth * destination,
        behavior: animate && permitsMotion() ? 'smooth' : 'instant'
      });
    }

    function cancel() {
      window.clearTimeout(timer);
      timer = 0;
      if (advancing && track.clientWidth) {
        advancing = false;
        move(Math.round(track.scrollLeft / track.clientWidth), false);
        update();
      }
      meter?.cancel();
      drift?.cancel();
      gallery.removeAttribute('data-playing');
    }

    function sync() {
      if (manual || !inView || hovering || document.hidden || !permitsMotion()) {
        cancel();
        return;
      }
      if (timer) return;
      gallery.setAttribute('data-playing', '');
      meter = playhead?.animate?.([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], dwell);
      const picture = slides[Math.max(0, index)].querySelector('img');
      drift = picture.animate?.(
        [{ scale: '1' }, { scale: '1.045' }],
        { duration: dwell, easing: 'ease-out', fill: 'forwards' }
      );
      timer = window.setTimeout(() => {
        const destination = (index + 1) % slides.length;
        advancing = destination !== 0;
        move(destination, destination !== 0);
        // Let the native snap finish so the next image holds for its full reading time.
        timer = window.setTimeout(() => { cancel(); update(); sync(); }, 700);
      }, dwell);
    }

    function takeControl() {
      manual = true;
      count.setAttribute('aria-live', 'polite');
      cancel();
    }

    const card = gallery.closest('.lo-employer');
    card.addEventListener('pointerdown', takeControl, { passive: true });
    card.addEventListener('focusin', takeControl);
    gallery.addEventListener('wheel', event => {
      if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) takeControl();
    }, { passive: true });
    gallery.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse') { hovering = true; sync(); }
    });
    gallery.addEventListener('pointerleave', event => {
      if (event.pointerType === 'mouse') { hovering = false; sync(); }
    });
    card.querySelector('video')?.addEventListener('play', takeControl);
    previous.addEventListener('click', () => { takeControl(); move(index - 1); });
    next.addEventListener('click', () => { takeControl(); move(index + 1); });
    track.addEventListener('keydown', event => {
      if (event.target !== track || event.altKey || event.metaKey || event.ctrlKey) return;
      const keys = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: slides.length - 1 };
      if (!(event.key in keys)) return;
      event.preventDefault();
      takeControl();
      move(keys[event.key]);
    });
    track.addEventListener('scroll', () => {
      if (!paint) paint = requestAnimationFrame(update);
    }, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(update).observe(track);
    count.setAttribute('aria-live', 'off');
    controls.hidden = false;
    update();
    return {
      sync,
      visible(value) { inView = value; sync(); }
    };
  }

  for (const gallery of section.querySelectorAll('[data-employer-gallery]')) {
    galleries.set(gallery, makeGallery(gallery));
  }
  if ('IntersectionObserver' in window) {
    const visible = new IntersectionObserver(entries => {
      for (const entry of entries) {
        galleries.get(entry.target).visible(entry.isIntersecting && entry.intersectionRatio >= .45);
      }
    }, { threshold: [0, .45] });
    galleries.forEach((controller, gallery) => visible.observe(gallery));
  }
  const syncAll = () => galleries.forEach(controller => controller.sync());
  document.addEventListener('visibilitychange', syncAll);
  reduced.addEventListener('change', syncAll);
  new MutationObserver(syncAll).observe(root, { attributes: true, attributeFilter: ['class', 'data-motion'] });
})();
