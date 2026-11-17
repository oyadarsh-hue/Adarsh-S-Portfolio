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
  const sceneNames = ['WESTERN GHATS', 'MALABAR COAST'];
  let activeScene = 0;
  document.querySelectorAll('[data-scene-step]').forEach(button => {
    button.addEventListener('click', () => {
      activeScene = (activeScene + Number(button.dataset.sceneStep) + scenes.length) % scenes.length;
      scenes.forEach((image, i) => { image.dataset.active = String(activeScene === i); });
      byId('sceneName').textContent = '0' + (activeScene + 1) + ' / 02   ' + sceneNames[activeScene];
    });
  });

  const hero = document.querySelector('.hero');
  const watches = new Set();
  const frames = [...document.querySelectorAll('.card-image,.scene-window')];
  let scheduled = false;
  function paint() {
    scheduled = false;
    const still = paused || systemMotion.matches;
    const offset = still ? 0 : Math.min(window.scrollY, hero.offsetHeight);
    hero.style.setProperty('--scene-shift', Math.min(22, offset * .055).toFixed(2) + 'px');
    hero.style.setProperty('--scene-turn', (offset * .14).toFixed(2) + 'deg');
    hero.style.setProperty('--print-turn', (-5 + Math.min(8, offset * .025)).toFixed(2) + 'deg');
    hero.style.setProperty('--title-slide', Math.min(18, offset * .06).toFixed(2) + 'px');
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

  const film = byId('portfolioFilm');
  const quality = byId('filmQuality');
  const filmStatus = byId('filmStatus');
  const films = JSON.parse(byId('filmInfo').textContent);
  const base = 'assets/field/';
  const choices = [...document.querySelectorAll('[data-film]')];
  const chapters = byId('filmChapters');
  const captionTrack = byId('filmCaptions');
  let current = 'projects';
  let pendingTime = null;
  let captionMode = captionTrack.track.mode;
  const stamp = seconds => Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2,'0');
  function highlight() {
    const position = pendingTime ?? film.currentTime;
    const items = films[current].chapters;
    const index = items.findLastIndex(item => position + .04 >= item.start);
    Array.from(chapters.children).forEach((button,i) => {
      if (i === index) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
  }
  function writeProgram() {
    const entry = films[current];
    byId('programTitle').textContent = entry.title;
    byId('filmTime').textContent = stamp(Math.round(entry.duration));
    byId('filmDownload').setAttribute('href',base + entry['4k']);
    film.setAttribute('aria-label',entry.title + ', with English narration');
    choices.forEach(button => button.setAttribute('aria-pressed',String(button.dataset.film === current)));
    chapters.replaceChildren(...entry.chapters.map(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.start = item.start;
      const time = document.createElement('time');
      time.textContent = stamp(item.start);
      button.append(time,document.createTextNode(item.title));
      return button;
    }));
    byId('filmTranscriptText').replaceChildren(...entry.transcript.map(text => {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      return paragraph;
    }));
    highlight();
  }
  function start() {
    film.play().catch(() => { /* Native controls remain available if playback needs another gesture. */ });
  }
  let masterRequest = null;
  let cachedMaster = null;
  const download = byId('filmDownload');

  function loadVideo(src, position, playing, preload) {
    pendingTime = position;
    film.src = src;
    film.preload = preload;
    film.load();
    if (playing) start();
  }

  async function prepareMaster(id, request) {
    const entry = films[id];
    try {
      const pieces = await Promise.all(entry.parts.map(async name => {
        const response = await fetch(base + name, {signal:request.signal});
        if (!response.ok) throw new Error('Film part unavailable');
        return response.blob();
      }));
      if (request.signal.aborted) return;
      const movie = new Blob(pieces, {type:'video/mp4'});
      if (movie.size !== entry.masterBytes) throw new Error('Incomplete film');
      const old = cachedMaster;
      cachedMaster = {id,url:URL.createObjectURL(movie)};
      download.href = cachedMaster.url;
      loadVideo(cachedMaster.url, pendingTime ?? film.currentTime, !film.paused && !film.ended, 'metadata');
      filmStatus.textContent = '';
      if (old) URL.revokeObjectURL(old.url);
    } catch {
      if (request.signal.aborted) return;
      request.abort();
      loadVideo(base + entry['4k'], pendingTime ?? film.currentTime, !film.paused && !film.ended, 'metadata');
      filmStatus.textContent = 'Using the smaller 4K edition.';
    }
  }

  function setSource(id, reset) {
    masterRequest?.abort();
    masterRequest = null;
    const playing = !film.paused && !film.ended;
    const position = reset ? 0 : (pendingTime ?? film.currentTime);
    const changingFilm = id !== current;
    if (changingFilm) captionMode = captionTrack.track.mode;
    current = id;
    const entry = films[id];
    filmStatus.textContent = '';
    film.poster = base + entry.poster;
    if (changingFilm) {
      captionTrack.src = base + entry.captions;
      captionTrack.track.mode = captionMode;
      byId('filmTranscript').open = false;
    }
    writeProgram();
    download.download = id + '-4k.mp4';
    if (quality.value === '4k' && cachedMaster?.id === id) {
      download.href = cachedMaster.url;
      loadVideo(cachedMaster.url,position,playing,'metadata');
      return;
    }
    if (changingFilm || quality.value === 'web') {
      loadVideo(base + entry.web,position,playing,position > 0 ? 'metadata' : 'none');
    }
    if (quality.value === '4k') {
      filmStatus.textContent = 'Preparing full-detail 4K…';
      masterRequest = new AbortController();
      prepareMaster(id,masterRequest);
    }
  }
  film.addEventListener('loadedmetadata', () => {
    if (pendingTime !== null && pendingTime > 0) film.currentTime = Math.min(pendingTime, film.duration);
    pendingTime = null;
    highlight();
  });
  film.addEventListener('timeupdate', highlight);
  film.addEventListener('error', () => { filmStatus.textContent = 'Playback failed. Try HD or download the selected film.'; });
  chapters.addEventListener('click', event => {
    const button = event.target.closest('button[data-start]');
    if (!button) return;
    const seek = Number(button.dataset.start);
    if (film.readyState >= 1) film.currentTime = seek;
    else pendingTime = seek;
    highlight();
    start();
  });
  quality.addEventListener('change', () => setSource(current,false));
  choices.forEach(button => button.addEventListener('click', () => {
    if (button.dataset.film !== current) setSource(button.dataset.film,true);
  }));
  document.querySelectorAll('[data-play-film]').forEach(link => {
    link.addEventListener('click', () => {
      if (current !== 'projects') setSource('projects',true);
      start();
    });
  });
  const linkedFilm = new URLSearchParams(location.search).get('film');
  if (linkedFilm === 'journey') setSource('journey',true);
  else writeProgram();
})();
