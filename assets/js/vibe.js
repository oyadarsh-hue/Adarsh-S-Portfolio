/* Only the new project artwork moves; existing typing/drag/reveals stay intact. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const artwork = [...document.querySelectorAll('.project-artwork')];
  const visible = new Set();
  let frame = 0;
  const allowed = () => !reduced.matches && !root.classList.contains('paused') && !document.hidden;
  const reset = () => artwork.forEach(el => el.style.setProperty('--art-shift', '0px'));
  function paint() {
    frame = 0;
    if (!allowed()) { reset(); return; }
    const positions = [...visible].map(el => ({el, rect: el.getBoundingClientRect()}));
    const strength = innerWidth < 701 ? .014 : .025;
    for (const {el, rect} of positions) {
      const shift = Math.max(-7, Math.min(7, (rect.top + rect.height / 2 - innerHeight / 2) * strength));
      el.style.setProperty('--art-shift', `${shift.toFixed(2)}px`);
    }
  }
  const schedule = () => { if (!frame && allowed()) frame = requestAnimationFrame(paint); };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const e of entries) { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); }
      schedule();
    }, { rootMargin: '60px' });
    artwork.forEach(el => observer.observe(el));
    addEventListener('scroll', schedule, {passive:true});
    addEventListener('resize', schedule, {passive:true});
  }
  const sync = () => { if (!allowed()) { cancelAnimationFrame(frame); frame=0; reset(); } else schedule(); };
  new MutationObserver(sync).observe(root, {attributes:true, attributeFilter:['class']});
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
})();
