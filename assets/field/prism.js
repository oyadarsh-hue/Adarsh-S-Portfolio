(() => {
  const hero = document.querySelector('.motion-hero');
  const rail = document.querySelector('.chapter-rail');
  if (!hero || !rail) return;
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const select = rail.querySelector('select');
  const buttons = [...rail.querySelectorAll('[data-chapter-step]')];
  const chapters = [...select.options].map(option => document.getElementById(option.value));
  const panels = [...document.querySelectorAll('.lo-profile-panorama,.lo-skills-panorama,.lo-cert-heading,.project-plates,#contact')];
  const activePanels = new Set();
  const clamp = value => Math.max(0,Math.min(1,value));
  let tops = [];
  let markDirty = true;
  let queued = false;
  let chapter = 0;

  function paint() {
    queued = false;
    const y = window.scrollY;
    const viewport = document.documentElement.clientHeight;
    if (markDirty) {
      tops = chapters.map(section => section.getBoundingClientRect().top + y);
      markDirty = false;
    }
    let current = 0;
    const readingLine = y + Math.min(viewport * .3,190);
    for (let i = 1; i < tops.length; i++) if (readingLine >= tops[i]) current = i;

    if (y + viewport >= document.documentElement.scrollHeight - 2) current = chapters.length - 1;
    if (current !== chapter || select.selectedIndex !== current) {
      chapter = current;
      if (document.activeElement !== select) select.selectedIndex = current;
    }
    const next = tops[current + 1] ?? document.documentElement.scrollHeight;
    const fraction = clamp((readingLine - tops[current]) / Math.max(1,next - tops[current]));
    const show = y >= hero.offsetTop + hero.offsetHeight - 46;
    if (show !== !rail.hidden) rail.hidden = !show;
    buttons[0].disabled = current === 0;
    buttons[1].disabled = current === chapters.length - 1;
    rail.style.setProperty('--chapter-progress',fraction.toFixed(4));

    if (root.classList.contains('paused') || reduced.matches) return;
    if (y < hero.offsetHeight + 100) {
      hero.style.setProperty('--hero-scrub',clamp(y / Math.max(250,hero.offsetHeight*.8)).toFixed(4));
    }
    for (const panel of activePanels) {
      const rect = panel.getBoundingClientRect();
      const progress = clamp((viewport - rect.top) / (viewport + rect.height));
      const shift = .5 - progress;
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
  function refresh() { markDirty = true; schedule(); }

  function jump(index) {
    const target = chapters[index];
    if (!target) return;
    // Let the browser record section changes, so Back also restores each location.
    if (location.hash !== '#'+target.id) location.hash = target.id;
    else target.scrollIntoView({block:'start',behavior:'instant'});
    select.blur();
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex','-1');
    target.focus({preventScroll:true});
    refresh();
  }
  select.addEventListener('change',() => jump(select.selectedIndex));
  select.addEventListener('blur',schedule);
  buttons.forEach(button => button.addEventListener('click',() => jump(chapter + Number(button.dataset.chapterStep))));

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
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(refresh);
    chapters.forEach(section => observer.observe(section));
    observer.observe(document.body);
  }
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',refresh);
  window.addEventListener('pageshow',refresh);
  document.addEventListener('toggle',refresh,true);
  document.fonts?.ready.then(refresh);
  reduced.addEventListener('change',schedule);
  new MutationObserver(schedule).observe(root,{attributes:true,attributeFilter:['class']});
  refresh();
})();
