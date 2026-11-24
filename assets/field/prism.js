(() => {
  const hero = document.querySelector('.motion-hero');
  if (!hero) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const panels = [...document.querySelectorAll('.lo-profile-panorama,.lo-skills-panorama,.lo-cert-heading,.project-plates,.folio-shortcuts,#contact')];
  const activePanels = new Set();
  const clamp = value => Math.max(0,Math.min(1,value));
  let queued = false;
  function paint() {
    queued = false;
    if (reduced.matches) return;
    const y = window.scrollY;
    const viewport = document.documentElement.clientHeight;
    if (y < hero.offsetHeight + 100) {
      hero.style.setProperty('--hero-scrub',clamp(y / Math.max(250,hero.offsetHeight*.8)).toFixed(4));
    }
    for (const panel of activePanels) {
      const rect = panel.getBoundingClientRect();
      const progress = clamp((viewport - rect.top) / (viewport + rect.height));
      const shift = .5 - progress;
      if (panel.classList.contains('folio-shortcuts')) {
        panel.style.setProperty('--folio-contents-pos',progress.toFixed(3));
        continue;
      }
      if (panel.classList.contains('project-plates')) {
        panel.style.setProperty('--fan',(1-clamp((viewport-rect.top)/Math.max(180, viewport*.53))).toFixed(3));
      }
      panel.style.setProperty('--panel-angle',(shift * -9).toFixed(2));
      panel.style.setProperty('--panel-offset',(shift * 76).toFixed(2));
      panel.style.setProperty('--panel-scale',(shift * .1).toFixed(3));
      panel.style.setProperty('--panel-photo-x',(shift * -36).toFixed(2)+'px');
    }
  }
  function schedule() {
    if (!queued) { queued = true; requestAnimationFrame(paint); }
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) activePanels.add(entry.target);
        else activePanels.delete(entry.target);
      }
      schedule();
    });
    document.querySelectorAll('.plate-grid .plate-link').forEach((card,index) => {
      card.style.setProperty('--card-turn',(index - 2)*12 + 'deg');
      card.style.setProperty('--card-lift',Math.abs(index - 2)*16 + 'px');
    });
    panels.forEach(panel => { panel.classList.add('prism-panel'); observer.observe(panel); });
  }
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule);
  window.addEventListener('pageshow',schedule);
  document.fonts?.ready.then(schedule);
  reduced.addEventListener('change',schedule);
  schedule();
})();
