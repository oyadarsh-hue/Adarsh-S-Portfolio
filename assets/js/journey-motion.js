/* Scroll position selects a real internship. All geometry stays in normal flow. */
(() => {
  'use strict';
  const section = document.getElementById('experience');
  if (!section) return;
  const items = [...section.querySelectorAll('.timeline > .timeline-item')];
  const counter = section.querySelector('[data-journey-counter]');
  const date = section.querySelector('[data-journey-date]');
  if (!items.length || !counter || !date) return;
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const dates = items.map(item => item.querySelector('.time')?.textContent.trim() || '2026');
  let queued = false;
  let active = -1;
  let observing = true;
  const allowed = () => !root.classList.contains('paused') && !reduced.matches;
  const clamp = value => Math.max(0, Math.min(1, value));

  function render() {
    queued = false;
    const bounds = section.getBoundingClientRect();
    if (bounds.top > innerHeight || bounds.bottom < 0) return;
    const header = document.querySelector('.topbar');
    const focusY = Math.max((header?.getBoundingClientRect().height || 88) + 90, innerHeight * .4);
    let closest = 0;
    let distance = Infinity;
    items.forEach((item, i) => {
      const box = item.getBoundingClientRect();
      const d = Math.abs(box.top + Math.min(100, box.height / 3) - focusY);
      if (d < distance) { closest = i; distance = d; }
    });
    if (closest !== active) {
      active = closest;
      items.forEach((item, i) => item.classList.toggle('journey-active', i === active));
      counter.textContent = String(active + 1).padStart(2, '0');
      date.textContent = dates[active];
      section.dataset.journeyStep = String(active + 1);
      section.style.setProperty('--dial-progress', (active + 1) / items.length);
    }
    const progress = clamp((innerHeight * .4 - bounds.top) / Math.max(1, bounds.height - innerHeight * .3));
    section.style.setProperty('--dial-turn', allowed() ? `${progress * 110}deg` : '0deg');
  }
  function schedule() {
    if (queued || !observing) return;
    queued = true;
    requestAnimationFrame(render);
  }
  addEventListener('scroll', schedule, {passive: true});
  addEventListener('resize', schedule, {passive: true});
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      observing = entries[0].isIntersecting;
      if (observing) schedule();
    }, {rootMargin:'100px'}).observe(section);
  }
  new MutationObserver(schedule).observe(root, {attributes:true, attributeFilter:['class']});
  reduced.addEventListener('change', schedule);
  section.classList.add('journey-enhanced');
  items[0].classList.add('journey-active');
  section.dataset.journeyStep = '1';
  schedule();
})();
