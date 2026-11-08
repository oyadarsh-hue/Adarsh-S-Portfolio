/* ==========================================================================
   GEMINI 4 ARGON — 3D MOTION VIDEO, COLOR FRAME CHOREOGRAPHY & SPATIAL ENGINE
   ========================================================================== */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const allowed = () =>
    !root.classList.contains('paused') &&
    !root.classList.contains('motion-paused') &&
    !reduced.matches;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

  const isSubpage = location.pathname.includes('/projects/');
  const assetPrefix = isSubpage ? '../' : '';
  const videoLoopSrc = `${assetPrefix}assets/video/dimensional-loop.mp4`;
  const imgHolo = `${assetPrefix}assets/images/adarsh-holo-frame.webp`;
  const imgVision = `${assetPrefix}assets/images/frame-ai-vision.webp`;
  const imgCloud = `${assetPrefix}assets/images/frame-fullstack-cloud.webp`;
  const imgCyber = `${assetPrefix}assets/images/frame-cyber-sec.webp`;

  // -------------------------------------------------------------------------
  // 1. FULL-VIEWPORT 3D MOTION VIDEO + INTERACTIVE AURORA & PARTICLE CANVAS
  // -------------------------------------------------------------------------
  let bgVideo = null;
  let bgCanvas = null;
  let bgCtx = null;
  let bgRaf = 0;
  let pointerX = 0.5;
  let pointerY = 0.35;

  if (document.body && !document.getElementById('argonGlobalBackdrop')) {
    const backdrop = document.createElement('div');
    backdrop.id = 'argonGlobalBackdrop';
    backdrop.setAttribute('aria-hidden', 'true');

    const aurora = document.createElement('div');
    aurora.className = 'argon-global-aurora';

    bgVideo = document.createElement('video');
    bgVideo.className = 'argon-global-bg-video';
    bgVideo.src = videoLoopSrc;
    bgVideo.muted = true;
    bgVideo.loop = true;
    bgVideo.playsInline = true;
    bgVideo.preload = 'metadata';
    bgVideo.setAttribute('aria-hidden', 'true');

    bgCanvas = document.createElement('canvas');
    bgCanvas.className = 'argon-global-bg-canvas';
    bgCtx = bgCanvas.getContext('2d');

    backdrop.append(aurora, bgVideo, bgCanvas);
    document.body.prepend(backdrop);
  }

  const nodes = Array.from({ length: 36 }, (_, i) => ({
    x: ((i * 73) % 100) / 100,
    y: ((i * 41) % 100) / 100,
    vx: ((i % 2 === 0 ? 1 : -1) * (0.00018 + (i % 5) * 0.00005)),
    vy: ((i % 3 === 0 ? 1 : -1) * (0.00015 + (i % 4) * 0.00004)),
    r: 1.8 + (i % 4) * 1.1,
    hue: [188, 275, 342, 43, 158][i % 5]
  }));

  function resizeBgCanvas() {
    if (!bgCanvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    bgCanvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
    bgCanvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
  }
  resizeBgCanvas();
  window.addEventListener('resize', resizeBgCanvas, { passive: true });

  function drawBgFrame(now) {
    bgRaf = 0;
    if (!bgCtx || !bgCanvas) return;
    const w = bgCanvas.width;
    const h = bgCanvas.height;
    const t = now * 0.001;

    bgCtx.clearRect(0, 0, w, h);

    // Draw 2 flowing 3D cyber-aurora energy ribbons
    const ribbonColors = [
      'rgba(56, 239, 255, 0.14)',
      'rgba(168, 85, 247, 0.14)',
      'rgba(244, 63, 94, 0.11)'
    ];
    for (let r = 0; r < ribbonColors.length; r++) {
      bgCtx.beginPath();
      const baseY = h * (0.28 + r * 0.24);
      bgCtx.moveTo(0, baseY);
      for (let x = 0; x <= w; x += Math.max(24, w / 28)) {
        const nx = x / w;
        const wave =
          Math.sin(nx * 4.2 + t * (1.1 + r * 0.3) + r) * (h * 0.07) +
          Math.cos(nx * 2.4 - t * 0.8) * (h * 0.04);
        bgCtx.lineTo(x, baseY + wave);
      }
      bgCtx.strokeStyle = ribbonColors[r];
      bgCtx.lineWidth = Math.max(2, h * 0.045);
      bgCtx.stroke();
    }

    // Draw interactive 3D neon constellation nodes
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (allowed()) {
        n.x = (n.x + n.vx + 1) % 1;
        n.y = (n.y + n.vy + 1) % 1;
      }
      const px = n.x * w;
      const py = n.y * h;

      // Connect nearby nodes
      for (let j = i + 1; j < nodes.length; j++) {
        const m = nodes[j];
        const dx = (n.x - m.x) * w;
        const dy = (n.y - m.y) * h;
        const distSq = dx * dx + dy * dy;
        const maxDist = Math.min(w, h) * 0.18;
        if (distSq < maxDist * maxDist) {
          const alpha = (1 - Math.sqrt(distSq) / maxDist) * 0.22;
          bgCtx.strokeStyle = `hsla(${n.hue}, 95%, 68%, ${alpha.toFixed(3)})`;
          bgCtx.lineWidth = 1;
          bgCtx.beginPath();
          bgCtx.moveTo(px, py);
          bgCtx.lineTo(m.x * w, m.y * h);
          bgCtx.stroke();
        }
      }

      bgCtx.fillStyle = `hsla(${n.hue}, 98%, 70%, 0.78)`;
      bgCtx.beginPath();
      bgCtx.arc(px, py, n.r, 0, Math.PI * 2);
      bgCtx.fill();
    }

    if (allowed() && !document.hidden) {
      bgRaf = requestAnimationFrame(drawBgFrame);
    }
  }

  function syncBackgroundMedia() {
    if (bgVideo) {
      if (allowed() && !document.hidden) {
        bgVideo.play().catch(() => {});
      } else {
        bgVideo.pause();
      }
    }
    if (allowed() && !document.hidden) {
      if (!bgRaf) bgRaf = requestAnimationFrame(drawBgFrame);
    } else if (bgRaf) {
      cancelAnimationFrame(bgRaf);
      bgRaf = 0;
    }
  }

  // -------------------------------------------------------------------------
  // 2. OPENING CURTAIN 3D WARP PORTAL + REPLAYABLE FULL-SCREEN VIDEO MODAL
  // -------------------------------------------------------------------------
  const curtain = document.querySelector('.studio-curtain');
  if (curtain && !curtain.querySelector('.curtain-canvas')) {
    const cCanvas = document.createElement('canvas');
    cCanvas.className = 'curtain-canvas';
    cCanvas.setAttribute('aria-hidden', 'true');
    curtain.prepend(cCanvas);
    const cCtx = cCanvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    cCanvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
    cCanvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));

    let cFrames = 0;
    const renderCurtain = (now) => {
      if (
        root.classList.contains('studio-entered') ||
        !allowed() ||
        cFrames++ > 130
      ) {
        return;
      }
      const cw = cCanvas.width;
      const ch = cCanvas.height;
      const cx = cw / 2;
      const cy = ch / 2;
      const t = now * 0.003;
      cCtx.clearRect(0, 0, cw, ch);
      for (let k = 0; k < 7; k++) {
        const progress = ((t + k / 7) % 1);
        const rad = progress * Math.hypot(cx, cy) * 0.9;
        const hue = (k * 52 + now * 0.08) % 360;
        cCtx.strokeStyle = `hsla(${hue}, 96%, 65%, ${(1 - progress) * 0.85})`;
        cCtx.lineWidth = 3 + progress * 4;
        cCtx.beginPath();
        cCtx.roundRect(cx - rad, cy - rad * 0.65, rad * 2, rad * 1.3, 28);
        cCtx.stroke();
      }
      requestAnimationFrame(renderCurtain);
    };
    if (allowed()) requestAnimationFrame(renderCurtain);
  }

  // Full-Screen Replayable Opening Motion Video Portal (#argonIntroModal)
  let introModal = document.getElementById('argonIntroModal');
  let introVideo = null;
  if (document.body && !introModal) {
    introModal = document.createElement('div');
    introModal.id = 'argonIntroModal';
    introModal.className = 'argon-intro-modal';
    introModal.setAttribute('aria-hidden', 'true');
    introModal.innerHTML = `
      <div class="argon-intro-stage">
        <video src="${videoLoopSrc}" muted loop playsinline preload="metadata"></video>
        <div class="argon-intro-hud">
          <div class="argon-intro-top">
            <span class="argon-intro-badge">GEMINI 4 ARGON // 3D MOTION PORTAL</span>
            <button type="button" class="argon-intro-close" data-close-intro>CLOSE PORTAL ✕</button>
          </div>
          <div class="argon-intro-bottom">
            <div>
              <p class="argon-intro-title">ADARSH S — IDEAS IN 3D MOTION.</p>
            </div>
            <span class="argon-intro-badge">60FPS SPATIAL STREAM · ACTIVE</span>
          </div>
        </div>
      </div>
    `;
    document.body.append(introModal);
    introVideo = introModal.querySelector('video');
  }

  function openIntroPortal() {
    if (!introModal) return;
    introModal.classList.add('is-open');
    introModal.setAttribute('aria-hidden', 'false');
    if (introVideo && allowed()) {
      introVideo.currentTime = 0;
      introVideo.play().catch(() => {});
    }
  }

  function closeIntroPortal() {
    if (!introModal) return;
    introModal.classList.remove('is-open');
    introModal.setAttribute('aria-hidden', 'true');
    if (introVideo) introVideo.pause();
  }

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-open-motion-portal], #argonReplayIntroBtn');
    if (trigger) {
      e.preventDefault();
      openIntroPortal();
      return;
    }
    if (
      e.target.closest('[data-close-intro]') ||
      e.target === introModal
    ) {
      closeIntroPortal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && introModal && introModal.classList.contains('is-open')) {
      closeIntroPortal();
    }
  });

  // Add "Opening Motion 3D" trigger button to Hero minor links / explore bars if not present
  const heroLinksHost = document.querySelector(
    '.hero-minor-links, .summary-explore, .case-links, .tool-actions'
  );
  if (heroLinksHost && !document.getElementById('argonReplayIntroBtn')) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'argonReplayIntroBtn';
    btn.className = 'argon-replay-btn';
    btn.setAttribute('data-open-motion-portal', 'true');
    btn.innerHTML = '<span aria-hidden="true">▶</span> Opening motion 3D';
    heroLinksHost.append(btn);
  }

  // -------------------------------------------------------------------------
  // 3. MULTI-RING 3D COLOR FRAME MOTION & FLOATING SATELLITE PHOTO FRAMES
  // -------------------------------------------------------------------------
  document.querySelectorAll('.studio-person, .summary-art, .case-art-stage').forEach((stage) => {
    if (!stage.querySelector('.argon-color-frame-outer')) {
      const outer = document.createElement('div');
      outer.className = 'argon-color-frame-outer';
      outer.setAttribute('aria-hidden', 'true');
      stage.prepend(outer);
    }

    if (
      (stage.classList.contains('studio-person') || stage.classList.contains('summary-art')) &&
      !stage.querySelector('.argon-satellite-frame')
    ) {
      const satTop = document.createElement('div');
      satTop.className = 'argon-satellite-frame argon-satellite-top';
      satTop.setAttribute('aria-hidden', 'true');
      satTop.innerHTML = `<img src="${imgVision}" alt="" width="148" height="86" loading="lazy" /><span>AI VISION · 3D FRAME</span>`;

      const satBottom = document.createElement('div');
      satBottom.className = 'argon-satellite-frame argon-satellite-bottom';
      satBottom.setAttribute('aria-hidden', 'true');
      satBottom.innerHTML = `<img src="${imgHolo}" alt="" width="148" height="86" loading="lazy" /><span>HOLO PORTRAIT · 01</span>`;

      stage.append(satTop, satBottom);
    }
  });

  // -------------------------------------------------------------------------
  // 4. 3D MULTI-FRAME VISUAL SHOWCASE GALLERY IN #about / RECRUITER / SUBPAGES
  // -------------------------------------------------------------------------
  const galleryHost =
    document.querySelector('#about .about-grid') ||
    document.querySelector('.recruiter-page [aria-labelledby="proofHeading"]') ||
    document.querySelector('.case-spatial .case-evidence, .case-page .case-evidence') ||
    document.querySelector('.tool-page .tool-main');

  if (galleryHost && !document.querySelector('.argon-frame-gallery')) {
    const gallery = document.createElement('div');
    gallery.className = 'argon-frame-gallery';
    gallery.setAttribute('aria-hidden', 'true');
    gallery.innerHTML = `
      <div class="argon-frame-card">
        <div class="argon-frame-card-inner">
          <div class="argon-frame-media">
            <img src="${imgHolo}" alt="" width="960" height="640" loading="lazy" />
            <span class="argon-frame-badge">FRAME 01 // HOLO STUDIO</span>
          </div>
          <div class="argon-frame-meta">
            <strong>Adarsh S · Holographic Frame</strong>
            <span>PRISMATIC 3D PORTRAIT & CYBER TELEMETRY</span>
          </div>
        </div>
      </div>
      <div class="argon-frame-card">
        <div class="argon-frame-card-inner">
          <div class="argon-frame-media">
            <img src="${imgVision}" alt="" width="960" height="600" loading="lazy" />
            <span class="argon-frame-badge">FRAME 02 // NEURAL VISION</span>
          </div>
          <div class="argon-frame-meta">
            <strong>Computer Vision & AI Core</strong>
            <span>OPENCV · DLIB · SAUVOLA OCR PIPELINES</span>
          </div>
        </div>
      </div>
      <div class="argon-frame-card">
        <div class="argon-frame-card-inner">
          <div class="argon-frame-media">
            <img src="${imgCloud}" alt="" width="960" height="600" loading="lazy" />
            <span class="argon-frame-badge">FRAME 03 // CLOUD & SECURITY</span>
          </div>
          <div class="argon-frame-meta">
            <strong>Full-Stack & Zero-Trust Matrix</strong>
            <span>DJANGO · NEXT.JS · POSTGRESQL · SHA-256</span>
          </div>
        </div>
      </div>
    `;
    const factsRow = galleryHost.querySelector('.profile-facts');
    if (factsRow) {
      galleryHost.insertBefore(gallery, factsRow);
    } else {
      galleryHost.append(gallery);
    }
  }

  // Experience Internship Framed Visual Previews
  const expImages = [imgCloud, imgVision, imgCyber];
  document.querySelectorAll('#experience .timeline-content').forEach((content, idx) => {
    if (content.querySelector('.argon-exp-frame')) return;
    const frame = document.createElement('div');
    frame.className = 'argon-exp-frame';
    frame.setAttribute('aria-hidden', 'true');
    frame.innerHTML = `<img src="${expImages[idx % expImages.length]}" alt="" width="440" height="115" loading="lazy" />`;
    content.append(frame);
  });

  // -------------------------------------------------------------------------
  // 5. 3D INTERACTIVE CARD SPOTLIGHT & TILT (EXCLUDING #project-assenttag)
  // -------------------------------------------------------------------------
  const tiltCards = document.querySelectorAll(
    '.argon-frame-card, .role-card, .summary-paper, .feature-launchpad > a, #education .timeline-item, #publication .publication-card, .case-spatial .case-grid > section, .case-spatial .evidence-grid > div'
  );

  if (fine.matches) {
    tiltCards.forEach((card) => {
      card.addEventListener(
        'pointermove',
        (e) => {
          if (!allowed()) return;
          const r = card.getBoundingClientRect();
          if (!r.width || !r.height) return;
          const x = clamp((e.clientX - r.left) / r.width, 0, 1);
          const y = clamp((e.clientY - r.top) / r.height, 0, 1);
          card.style.setProperty('--spot-x', `${(x * 100).toFixed(1)}%`);
          card.style.setProperty('--spot-y', `${(y * 100).toFixed(1)}%`);
          card.style.setProperty('--card-rx', `${((0.5 - y) * 7).toFixed(2)}deg`);
          card.style.setProperty('--card-ry', `${((x - 0.5) * 9).toFixed(2)}deg`);
        },
        { passive: true }
      );

      card.addEventListener(
        'pointerleave',
        () => {
          card.style.setProperty('--card-rx', '0deg');
          card.style.setProperty('--card-ry', '0deg');
        },
        { passive: true }
      );
    });
  }

  // -------------------------------------------------------------------------
  // 6. SCROLL-DRIVEN HUE SHIFT & MOTION STATE SYNCHRONIZATION
  // -------------------------------------------------------------------------
  let scrollRaf = 0;
  function onScroll() {
    scrollRaf = 0;
    if (!allowed()) return;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const ratio = clamp(window.scrollY / maxScroll, 0, 1);
    root.style.setProperty('--argon-scroll-hue', `${Math.round(ratio * 140)}deg`);
  }

  window.addEventListener(
    'scroll',
    () => {
      if (!scrollRaf) scrollRaf = requestAnimationFrame(onScroll);
    },
    { passive: true }
  );

  document.addEventListener('visibilitychange', syncBackgroundMedia);
  new MutationObserver(syncBackgroundMedia).observe(root, {
    attributes: true,
    attributeFilter: ['class', 'data-theme']
  });

  syncBackgroundMedia();
})();
