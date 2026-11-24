(() => {
  'use strict';
  const root = document.documentElement;
  const byId = id => document.getElementById(id);
  const systemTheme = matchMedia('(prefers-color-scheme: dark)');
  const systemMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const mobileMenu = matchMedia('(max-width:850px)');
  const themeKey = 'adarsh-theme-v2';
  const motionKey = 'adarsh-motion';
  function read(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, value); } catch { /* This tab still keeps the selection. */ }
  }
  let chosenTheme = read(themeKey);
  let paused = read(motionKey) === 'paused';
  const theme = byId('themeToggle');
  function applyTheme() {
    const mode = ['light','dark'].includes(chosenTheme) ? chosenTheme : (systemTheme.matches ? 'dark' : 'light');
    root.dataset.theme = mode;
    theme.setAttribute('aria-pressed', String(mode === 'dark'));
    theme.title = mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    document.querySelector('meta[name="theme-color"]').content = mode === 'dark' ? '#121217' : '#f5f2eb';
  }
  theme.addEventListener('click', () => {
    chosenTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    save(themeKey, chosenTheme);
    applyTheme();
  });
  systemTheme.addEventListener('change', applyTheme);
  applyTheme();

  const menu = byId('menuButton');
  const nav = byId('nav');
  function setMenu(open) {
    nav.classList.toggle('open', open);
    menu.setAttribute('aria-expanded', String(open));
  }
  menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
  document.addEventListener('click', event => {
    if (!nav.contains(event.target) && !menu.contains(event.target)) setMenu(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menu.focus();
    }
  });
  mobileMenu.addEventListener('change', () => setMenu(false));

  const scenes = [...document.querySelectorAll('.hero-image')];
  const sceneNames = ['MUNNAR TEA GARDENS','THAMARASSERY CHURAM','KOZHIKODE BEACH'];
  let activeScene = 0;
  document.querySelectorAll('[data-scene-step]').forEach(button => {
    button.addEventListener('click', () => {
      activeScene = (activeScene + Number(button.dataset.sceneStep) + scenes.length) % scenes.length;
      scenes.forEach((image, i) => { image.dataset.active = String(activeScene === i); });
      byId('sceneName').textContent = '0' + (activeScene + 1) + ' / 0' + scenes.length + '   ' + sceneNames[activeScene];
    });
  });

  const hero = document.querySelector('.hero');
  const watches = new Set();
  const frames = [...document.querySelectorAll('.card-image,.scene-window')];
  const typeFrames = new Set();
  const headings = document.querySelectorAll('.work-cover h2, .reel-section h2, .archive-head h3');
  for (const heading of headings) {
    heading.classList.add('type-anchor','scroll-type');
    const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) if (walker.currentNode.textContent.trim()) nodes.push(walker.currentNode);
    let count = 0;
    for (const text of nodes) {
      const words = text.textContent.split(/(\s+)/);
      text.replaceWith(...words.map(word => {
        if (!word.trim()) return document.createTextNode(word);
        const span = document.createElement('span');
        span.className = 'word-unit';
        span.style.setProperty('--factor',String(.78 + .12 * (count++ % 4)));
        span.textContent = word;
        return span;
      }));
    }
  }
  let scheduled = false;
  function paint() {
    scheduled = false;
    const still = paused || systemMotion.matches;
    const offset = still ? 0 : Math.min(window.scrollY, hero.offsetHeight);
    hero.style.setProperty('--scene-shift', Math.min(22, offset * .055).toFixed(2) + 'px');
    hero.style.setProperty('--scene-turn', (offset * .14).toFixed(2) + 'deg');
    hero.style.setProperty('--print-turn', (-5 + Math.min(8, offset * .025)).toFixed(2) + 'deg');
    hero.style.setProperty('--title-slide', Math.min(18, offset * .06).toFixed(2) + 'px');
    for (const anchor of typeFrames) {
      const box = anchor.getBoundingClientRect();
      const progress = Math.max(0,Math.min(1,(innerHeight - box.top) / (innerHeight + box.height)));
      const movement = still ? 0 : Math.max(-1,Math.min(1,(.54-progress)*2));
      anchor.style.setProperty('--type-progress', progress.toFixed(4));
      anchor.style.setProperty('--type-rise', (movement * 39).toFixed(2)+'px');
      anchor.style.setProperty('--type-turn', (movement * -7).toFixed(2)+'deg');
      if (anchor.classList.contains('type-ribbon')) {
        const strip = anchor.querySelector('.scroll-type');
        const travel = Math.max(0, strip.scrollWidth - anchor.clientWidth + 32);
        anchor.style.setProperty('--strip-x', (still ? 0 : -travel * progress).toFixed(2)+'px');
      }
    }
    watches.forEach(frame => {
      // The frame stays in normal flow. Only its child photograph is translated.
      const box = frame.getBoundingClientRect();
      const drift = still ? 0 : Math.max(-1, Math.min(1, (innerHeight - 2 * box.top - box.height) / (innerHeight + box.height))) * box.height * .045;
      if (frame.classList.contains('scene-window')) {
        const progress = (innerHeight / 2 - box.top - box.height / 2) / (innerHeight + box.height);
        const dy = still ? 0 : Math.max(-1, Math.min(1, progress * 2)) * box.height * .065;
        frame.style.setProperty('--window-y', dy.toFixed(2) + 'px');
      } else {
        frame.style.setProperty('--drift', drift.toFixed(2) + 'px');
      }
    });
  }
  function queuePaint() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(paint); }
  }
  if ('IntersectionObserver' in window) {
    const enters = new IntersectionObserver(entries => {
      entries.filter(entry => entry.isIntersecting).forEach(entry => {
        entry.target.classList.add('is-entered');
        enters.unobserve(entry.target);
      });
    }, {threshold:.06});
    document.querySelectorAll('.section-head,.card-copy,.reveal').forEach(el => enters.observe(el));
    const images = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) watches.add(entry.target);
        else watches.delete(entry.target);
      });
      queuePaint();
    });
    const visibleType = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) typeFrames.add(entry.target);
        else typeFrames.delete(entry.target);
      });
      queuePaint();
    },{rootMargin:'100px 0px'});
    document.querySelectorAll('.type-anchor').forEach(el=>visibleType.observe(el));
    frames.forEach(frame => images.observe(frame));
  }
  const pointerPortrait = matchMedia('(hover: hover) and (pointer: fine)');
  hero.addEventListener('pointermove', event => {
    if (!pointerPortrait.matches || paused || systemMotion.matches) return;
    const bounds = hero.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - .5;
    const y = (event.clientY - bounds.top) / bounds.height - .5;
    hero.style.setProperty('--print-y', (x * 22 - 6).toFixed(1) + 'deg');
    hero.style.setProperty('--print-x', (-y * 12).toFixed(1) + 'deg');
  }, {passive:true});
  hero.addEventListener('pointerleave', () => {
    hero.style.removeProperty('--print-y');
    hero.style.removeProperty('--print-x');
  });
  const motion = byId('motionToggle');
  function applyMotion() {
    const still = paused || systemMotion.matches;
    root.classList.toggle('paused', still);
    motion.disabled = systemMotion.matches;
    motion.setAttribute('aria-pressed', String(still));
    motion.title = systemMotion.matches ? 'System reduced motion is on' : (paused ? 'Enable animations' : 'Pause animations');
    motion.setAttribute('aria-label', motion.title);
    motion.querySelector('path').setAttribute('d', still ? 'm7 4 9 6-9 6z' : 'M7 5v10m6-10v10');
    queuePaint();
  }
  motion.addEventListener('click', () => { paused = !paused; save(motionKey, paused ? 'paused' : 'enabled'); applyMotion(); });
  systemMotion.addEventListener('change', applyMotion);
  window.addEventListener('storage', event => {
    if (event.key === themeKey || !event.key) { chosenTheme = read(themeKey); applyTheme(); }
    if (event.key === motionKey || !event.key) { paused = read(motionKey) === 'paused'; applyMotion(); }
  });
  window.addEventListener('scroll', () => { if (!paused && !systemMotion.matches) queuePaint(); }, {passive:true});
  window.addEventListener('resize', queuePaint);
  applyMotion();

  const tools = document.querySelector('[data-project-tools]');
  const search = byId('projectSearch');
  function updateGrid() {
    byId('projectList').classList.toggle('filtered', tools.querySelector('[aria-pressed="true"]')?.dataset.projectFilter !== 'all' || Boolean(search.value.trim()));
  }
  tools.addEventListener('click', updateGrid);
  search.addEventListener('input', updateGrid);
  byId('clearProjects').addEventListener('click', () => {
    search.value = '';
    tools.querySelector('[data-project-filter="all"]').click();
    search.focus();
  });
  updateGrid();

})();
