/* Additive artwork and publication motion; existing typing/drag/reveals stay intact. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const artwork = [...document.querySelectorAll('.project-artwork, .publication-artwork')];
  const research = document.querySelector('.publication-card');
  const researchTitle = research?.querySelector('.publication-copy h3');
  const words = [];
  const metadata = [...(research?.querySelectorAll('.paper-meta > div') || [])];
  // Preserve every original character; only wrap words for scroll-linked motion.
  if (researchTitle && 'IntersectionObserver' in window) {
    const fragment = document.createDocumentFragment();
    for (const token of researchTitle.textContent.split(/(\s+)/)) {
      if (!token.trim()) fragment.append(document.createTextNode(token));
      else {
        const word = document.createElement('span');
        word.className = 'research-word';
        word.textContent = token;
        fragment.append(word);
        words.push(word);
      }
    }
    researchTitle.replaceChildren(fragment);
  }
  const visible = new Set();
  let researchVisible = false;
  let frame = 0;
  const allowed = () => !reduced.matches && !root.classList.contains('paused') && !document.hidden;
  const reset = () => {
    artwork.forEach(el => el.style.setProperty('--art-shift', '0px'));
    words.forEach(el => el.style.setProperty('--word-progress', '1'));
    metadata.forEach(el => el.style.setProperty('--row-progress', '1'));
  };
  const clamp = value => Math.max(0, Math.min(1, value));
  function paint() {
    frame = 0;
    if (!allowed()) { reset(); return; }
    const positions = [...visible].map(el => ({el, rect: el.getBoundingClientRect()}));
    const researchTop = researchVisible ? research.getBoundingClientRect().top : null;
    const strength = innerWidth < 701 ? .014 : .025;
    for (const {el, rect} of positions) {
      const range = el.classList.contains('publication-artwork') ? 16 : 7;
      const shift = Math.max(-range, Math.min(range, (rect.top + rect.height / 2 - innerHeight / 2) * strength));
      el.style.setProperty('--art-shift', `${shift.toFixed(2)}px`);
    }
    if (researchTop !== null) {
      const progress = clamp((innerHeight * .95 - researchTop) / (innerHeight * .72));
      words.forEach((el, i) => el.style.setProperty('--word-progress', clamp(progress * 1.6 - i / Math.max(1, words.length) * .4).toFixed(3)));
      metadata.forEach((el, i) => el.style.setProperty('--row-progress', clamp(progress * 1.5 - i * .12).toFixed(3)));
    }
  }
  const schedule = () => { if (!frame && allowed()) frame = requestAnimationFrame(paint); };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const e of entries) { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); }
      schedule();
    }, { rootMargin: '60px' });
    artwork.forEach(el => observer.observe(el));
    if (research) new IntersectionObserver(([entry]) => {
      researchVisible = entry.isIntersecting;
      research.classList.toggle('research-in-view', researchVisible);
      schedule();
    }, {rootMargin:'80px'}).observe(research);
    addEventListener('scroll', schedule, {passive:true});
    addEventListener('resize', schedule, {passive:true});
  }
  const sync = () => { if (!allowed()) { cancelAnimationFrame(frame); frame=0; reset(); } else schedule(); };
  new MutationObserver(sync).observe(root, {attributes:true, attributeFilter:['class']});
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
})();
