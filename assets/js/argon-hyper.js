/* Gemini 4 Argon — 3D Motion Video, Color Frame Choreography & Spatial Scroll Engine */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const allowed = () => !root.classList.contains('paused') && !root.classList.contains('motion-paused') && !reduced.matches;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  // 1. Inject 3D Prism Frame Ring around Portrait / Case Art
  document.querySelectorAll('.studio-person, .summary-art, .case-art-stage').forEach(stage => {
    if (stage.querySelector('.argon-prism-ring')) return;
    const ring = document.createElement('div');
    ring.className = 'argon-prism-ring';
    ring.setAttribute('aria-hidden', 'true');
    stage.prepend(ring);
  });

  // 2. Ambient Motion Video Stage in Hero Sections (Homepage, Recruiter, Lab, Workbench, Case Studies)
  const isSubpage = location.pathname.includes('/projects/');
  const videoPath = isSubpage ? '../assets/video/dimensional-loop.mp4' : 'assets/video/dimensional-loop.mp4';
  const heroHost = document.querySelector('.studio-hero, .summary-hero, .tool-hero, .case-intro');
  let ambientVideo = null;
  let heroInView = true;

  if (heroHost && !heroHost.querySelector('.argon-ambient-video-stage')) {
    const stage = document.createElement('div');
    stage.className = 'argon-ambient-video-stage';
    stage.setAttribute('aria-hidden', 'true');
    const vid = document.createElement('video');
    vid.className = 'argon-ambient-video';
    vid.src = videoPath;
    vid.muted = true;
    vid.loop = true;
    vid.playsInline = true;
    vid.preload = 'metadata';
    vid.setAttribute('aria-hidden', 'true');
    stage.append(vid);
    heroHost.prepend(stage);
    ambientVideo = vid;
  }

  function syncAmbientVideo() {
    if (!ambientVideo) return;
    if (allowed() && heroInView && !document.hidden) {
      ambientVideo.play().catch(() => {});
    } else {
      ambientVideo.pause();
    }
  }

  if (ambientVideo && 'IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      heroInView = entries[0].isIntersecting;
      syncAmbientVideo();
    }, { threshold: 0.05 }).observe(heroHost);
  }

  // 3. 3D Interactive Card Perspective & Chromatic Spotlight
  const cardSelectors = [
    '.role-card',
    '.summary-paper',
    '.case-grid > section',
    '.case-architecture',
    '.evidence-grid > div',
    '.feature-launchpad > a',
    '#education .timeline-item'
  ];
  const cards = [...document.querySelectorAll(cardSelectors.join(','))];
  cards.forEach(card => {
    card.classList.add('argon-3d-card');
    let raf = 0;
    card.addEventListener('pointermove', event => {
      if (!allowed() || !fine.matches || raf) return;
      const x = event.clientX;
      const y = event.clientY;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const rect = card.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const px = ((x - rect.left) / rect.width) * 100;
        const py = ((y - rect.top) / rect.height) * 100;
        const rx = clamp((0.5 - (y - rect.top) / rect.height) * 6, -4, 4);
        const ry = clamp(((x - rect.left) / rect.width - 0.5) * 7, -4.5, 4.5);
        card.style.setProperty('--argon-px', `${px.toFixed(1)}%`);
        card.style.setProperty('--argon-py', `${py.toFixed(1)}%`);
        card.style.setProperty('--argon-rx', `${rx.toFixed(2)}deg`);
        card.style.setProperty('--argon-ry', `${ry.toFixed(2)}deg`);
      });
    }, { passive: true });
    const reset = () => {
      card.style.setProperty('--argon-rx', '0deg');
      card.style.setProperty('--argon-ry', '0deg');
    };
    card.addEventListener('pointerleave', reset);
  });

  // 4. Scroll-Linked 3D Telemetry & Velocity
  let scrollFrame = 0;
  let lastY = window.scrollY;
  function updateScroll() {
    scrollFrame = 0;
    if (!allowed()) return;
    const max = Math.max(1, root.scrollHeight - window.innerHeight);
    const ratio = clamp(window.scrollY / max, 0, 1);
    const velocity = clamp((window.scrollY - lastY) * 0.04, -1, 1);
    lastY = window.scrollY;
    root.style.setProperty('--argon-scroll', ratio.toFixed(4));
    root.style.setProperty('--argon-velocity', velocity.toFixed(3));
  }
  addEventListener('scroll', () => {
    if (!scrollFrame && allowed()) scrollFrame = requestAnimationFrame(updateScroll);
  }, { passive: true });

  function syncAll() {
    syncAmbientVideo();
    if (!allowed()) {
      cards.forEach(c => {
        c.style.setProperty('--argon-rx', '0deg');
        c.style.setProperty('--argon-ry', '0deg');
      });
    }
  }

  new MutationObserver(syncAll).observe(root, { attributes: true, attributeFilter: ['class'] });
  reduced.addEventListener('change', syncAll);
  document.addEventListener('visibilitychange', syncAll);
  syncAll();
})();
