(() => {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;

  for (const gallery of document.querySelectorAll('[data-employer-gallery]')) {
    const track = gallery.querySelector('.employer-gallery-track');
    const slides = Array.from(track.children);
    const controls = gallery.querySelector('.employer-gallery-controls');
    const previous = controls.querySelector('[data-step="-1"]');
    const next = controls.querySelector('[data-step="1"]');
    const count = controls.querySelector('output');
    let current = -1;
    let frame = 0;

    function update() {
      frame = 0;
      if (!track.clientWidth) return;
      const index = Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / track.clientWidth)));
      if (current === index) return;
      current = index;
      count.textContent = (index + 1) + ' / ' + slides.length;
      previous.setAttribute('aria-disabled', String(index === 0));
      next.setAttribute('aria-disabled', String(index === slides.length - 1));
    }

    function move(index) {
      if (index < 0 || index >= slides.length) return;
      const still = reduced.matches || root.classList.contains('paused') || root.dataset.motion === 'paused';
      track.scrollTo({ left: track.clientWidth * index, behavior: still ? 'instant' : 'smooth' });
    }

    previous.addEventListener('click', () => move(current - 1));
    next.addEventListener('click', () => move(current + 1));
    track.addEventListener('keydown', event => {
      if (event.target !== track || event.altKey || event.metaKey || event.ctrlKey) return;
      const destinations = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: slides.length - 1 };
      if (!(event.key in destinations)) return;
      event.preventDefault();
      move(destinations[event.key]);
    });
    track.addEventListener('scroll', () => {
      if (!frame) frame = requestAnimationFrame(update);
    }, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(update).observe(track);
    controls.hidden = false;
    update();
  }
})();
