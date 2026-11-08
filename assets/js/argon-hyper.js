/* ==========================================================================
   GEMINI 4 ARGON — ULTRAREALISTIC 4K MOTION VIDEO & SPATIAL CHOREOGRAPHY
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
  const videoReelSrc = `${assetPrefix}assets/video/adarsh-project-reel.mp4`;
  const logo3dSrc = `${assetPrefix}assets/images/adarsh-logo-3d.svg`;
  const imgHolo = `${assetPrefix}assets/images/adarsh-holo-frame.webp`;
  const imgVision = `${assetPrefix}assets/images/frame-ai-vision.webp`;
  const imgCloud = `${assetPrefix}assets/images/frame-fullstack-cloud.webp`;

  // -------------------------------------------------------------------------
  // 0. 3D PRISMATIC BRAND EMBLEM IN HEADER (.brand, .tool-brand)
  // -------------------------------------------------------------------------
  document.querySelectorAll('.brand, .tool-brand').forEach((brandEl) => {
    if (!brandEl.querySelector('.argon-brand-logo')) {
      const logoImg = document.createElement('img');
      logoImg.className = 'argon-brand-logo';
      logoImg.src = logo3dSrc;
      logoImg.alt = '';
      logoImg.width = 36;
      logoImg.height = 36;
      logoImg.setAttribute('aria-hidden', 'true');
      brandEl.prepend(logoImg);
    }
  });

  // -------------------------------------------------------------------------
  // 1. FULL-VIEWPORT 4K MOTION VIDEO + VOLUMETRIC AURORA & PARTICLE CANVAS
  // -------------------------------------------------------------------------
  let bgVideo = null;
  let bgCanvas = null;
  let bgCtx = null;
  let bgRaf = 0;

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

  const nodes = Array.from({ length: 42 }, (_, i) => ({
    x: ((i * 73) % 100) / 100,
    y: ((i * 41) % 100) / 100,
    vx: (i % 2 === 0 ? 1 : -1) * (0.00018 + (i % 5) * 0.00005),
    vy: (i % 3 === 0 ? 1 : -1) * (0.00015 + (i % 4) * 0.00004),
    r: 1.8 + (i % 4) * 1.2,
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

  // -------------------------------------------------------------------------
  // 2. SCROLL-REACTIVE 4K VIDEO CINEMA BANNERS & FLOATING 4K VIDEO POD
  // -------------------------------------------------------------------------
  const scrollBanners = [];

  function createScrollVideoBanner(kicker, title, badgeLabel, videoSrc) {
    const banner = document.createElement('div');
    banner.className = 'argon-scroll-video-banner';
    banner.setAttribute('aria-hidden', 'true');
    banner.innerHTML = `
      <div class="argon-scroll-video-inner">
        <video src="${videoSrc}" muted loop playsinline preload="metadata"></video>
        <canvas class="argon-scroll-video-canvas" width="640" height="220"></canvas>
        <div class="argon-scroll-video-overlay">
          <div class="argon-sv-copy">
            <span class="argon-sv-kicker">${kicker} · <b data-sv-pct>ULTRAREALISTIC 4K STREAM</b></span>
            <strong class="argon-sv-title">${title}</strong>
            <div class="argon-sv-progress"><div class="argon-sv-bar" data-sv-bar></div></div>
          </div>
          <span class="argon-sv-num">${badgeLabel}</span>
        </div>
      </div>
    `;
    const vid = banner.querySelector('video');
    const cvs = banner.querySelector('canvas');
    const ctx = cvs ? cvs.getContext('2d') : null;
    const bar = banner.querySelector('[data-sv-bar]');
    const pct = banner.querySelector('[data-sv-pct]');
    scrollBanners.push({ banner, vid, cvs, ctx, bar, pct });
    return banner;
  }

  const projectsSec = document.getElementById('projects');
  const skillsSec = document.getElementById('skills');
  const expSec = document.getElementById('experience');
  const proofSec = document.querySelector('.recruiter-page [aria-labelledby="proofHeading"]');
  const caseEvidenceSec = document.querySelector('.case-spatial .case-evidence, .case-page .case-evidence');
  const toolSecs = document.querySelectorAll('.tool-page .tool-section');

  if (projectsSec && projectsSec.parentNode) {
    projectsSec.parentNode.insertBefore(
      createScrollVideoBanner(
        '4K SPATIAL MOTION STREAM',
        'SPATIAL ARCHITECTURE & ATOMIC SYSTEMS',
        '4K CORE',
        videoLoopSrc
      ),
      projectsSec
    );
  }
  if (skillsSec && skillsSec.parentNode) {
    skillsSec.parentNode.insertBefore(
      createScrollVideoBanner(
        '4K NEURAL VISION STREAM',
        'COMPUTER VISION, DLIB & SAUVOLA OCR ENGINE',
        'AI VISION',
        videoReelSrc
      ),
      skillsSec
    );
  }
  if (expSec && expSec.parentNode) {
    expSec.parentNode.insertBefore(
      createScrollVideoBanner(
        '4K CLOUD & SECURITY STREAM',
        'ZERO-TRUST AST SECURITY & CLOUD MATRIX',
        'ZERO-TRUST',
        videoLoopSrc
      ),
      expSec
    );
  }
  if (proofSec && proofSec.parentNode) {
    proofSec.parentNode.insertBefore(
      createScrollVideoBanner(
        '4K ENGINEERING STREAM',
        'VERIFIED ENGINEERING PROOF & SPATIAL TELEMETRY',
        'VERIFIED',
        videoLoopSrc
      ),
      proofSec
    );
  }
  if (caseEvidenceSec && caseEvidenceSec.parentNode) {
    caseEvidenceSec.parentNode.insertBefore(
      createScrollVideoBanner(
        '4K CASE ARCHITECTURE STREAM',
        'SPATIAL CASE ARCHITECTURE & VERIFIED EVIDENCE',
        '4K HDR',
        videoLoopSrc
      ),
      caseEvidenceSec
    );
  }
  if (toolSecs.length > 1 && toolSecs[1].parentNode) {
    toolSecs[1].parentNode.insertBefore(
      createScrollVideoBanner(
        '4K DIAGNOSTIC STREAM',
        'LIVE INTERACTIVE SPATIAL DIAGNOSTIC ENGINE',
        'LIVE 4K',
        videoLoopSrc
      ),
      toolSecs[1]
    );
  }

  // Floating 3D Scroll-Synced 4K Video Pod (#argonScrollVideoPod) — ZERO NUMBERING
  let scrollPod = document.getElementById('argonScrollVideoPod');
  let podVideo = null;
  let podFrameEl = null;
  let podPctEl = null;
  if (document.body && !scrollPod) {
    scrollPod = document.createElement('div');
    scrollPod.id = 'argonScrollVideoPod';
    scrollPod.className = 'argon-scroll-video-pod';
    scrollPod.setAttribute('aria-hidden', 'true');
    scrollPod.setAttribute('data-open-motion-portal', 'true');
    scrollPod.innerHTML = `
      <div class="argon-pod-inner">
        <div class="argon-pod-video-wrap">
          <video src="${videoLoopSrc}" muted loop playsinline preload="metadata"></video>
          <span class="argon-pod-frame-tag" data-pod-frame>4K HDR STREAM</span>
        </div>
        <div class="argon-pod-foot">
          <span>SPATIAL MOTION</span>
          <b data-pod-pct>ACTIVE</b>
        </div>
      </div>
    `;
    document.body.append(scrollPod);
    podVideo = scrollPod.querySelector('video');
    podFrameEl = scrollPod.querySelector('[data-pod-frame]');
    podPctEl = scrollPod.querySelector('[data-pod-pct]');
  }

  let currentScrollRatio = 0;

  function drawBgFrame(now) {
    bgRaf = 0;
    const t = now * 0.001;

    if (bgCtx && bgCanvas) {
      const w = bgCanvas.width;
      const h = bgCanvas.height;
      bgCtx.clearRect(0, 0, w, h);

      const ribbonColors = [
        'rgba(56, 239, 255, 0.15)',
        'rgba(168, 85, 247, 0.15)',
        'rgba(244, 63, 94, 0.12)'
      ];
      for (let r = 0; r < ribbonColors.length; r++) {
        bgCtx.beginPath();
        const baseY = h * (0.26 + r * 0.24);
        bgCtx.moveTo(0, baseY);
        for (let x = 0; x <= w; x += Math.max(24, w / 28)) {
          const nx = x / w;
          const wave =
            Math.sin(nx * 4.2 + t * (1.1 + r * 0.3) + r + currentScrollRatio * 6.5) * (h * 0.075) +
            Math.cos(nx * 2.4 - t * 0.8) * (h * 0.04);
          bgCtx.lineTo(x, baseY + wave);
        }
        bgCtx.strokeStyle = ribbonColors[r];
        bgCtx.lineWidth = Math.max(2, h * 0.048);
        bgCtx.stroke();
      }

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (allowed()) {
          n.x = (n.x + n.vx + 1) % 1;
          n.y = (n.y + n.vy + 1) % 1;
        }
        const px = n.x * w;
        const py = n.y * h;

        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j];
          const dx = (n.x - m.x) * w;
          const dy = (n.y - m.y) * h;
          const distSq = dx * dx + dy * dy;
          const maxDist = Math.min(w, h) * 0.18;
          if (distSq < maxDist * maxDist) {
            const alpha = (1 - Math.sqrt(distSq) / maxDist) * 0.24;
            bgCtx.strokeStyle = `hsla(${n.hue}, 95%, 68%, ${alpha.toFixed(3)})`;
            bgCtx.lineWidth = 1;
            bgCtx.beginPath();
            bgCtx.moveTo(px, py);
            bgCtx.lineTo(m.x * w, m.y * h);
            bgCtx.stroke();
          }
        }

        bgCtx.fillStyle = `hsla(${n.hue}, 98%, 70%, 0.82)`;
        bgCtx.beginPath();
        bgCtx.arc(px, py, n.r, 0, Math.PI * 2);
        bgCtx.fill();
      }
    }

    for (let b = 0; b < scrollBanners.length; b++) {
      const item = scrollBanners[b];
      if (!item.ctx || !item.cvs) continue;
      const cw = item.cvs.width;
      const ch = item.cvs.height;
      item.ctx.clearRect(0, 0, cw, ch);
      const cx = cw * 0.52;
      const cy = ch * 0.5;
      for (let ring = 0; ring < 5; ring++) {
        const phase = (t * 0.85 + currentScrollRatio * 3.5 + ring * 0.2) % 1;
        const rx = phase * cw * 0.46;
        const ry = phase * ch * 0.44;
        const hue = (188 + ring * 38 + currentScrollRatio * 140) % 360;
        item.ctx.strokeStyle = `hsla(${hue}, 98%, 68%, ${(1 - phase) * 0.72})`;
        item.ctx.lineWidth = 2 + phase * 2.5;
        item.ctx.beginPath();
        item.ctx.ellipse(cx, cy, Math.max(4, rx), Math.max(4, ry), 0, 0, Math.PI * 2);
        item.ctx.stroke();
      }
    }

    if (allowed() && !document.hidden) {
      bgRaf = requestAnimationFrame(drawBgFrame);
    }
  }

  function syncBackgroundMedia() {
    const canPlay = allowed() && !document.hidden;
    if (bgVideo) {
      if (canPlay) bgVideo.play().catch(() => {});
      else bgVideo.pause();
    }
    if (podVideo) {
      if (canPlay) podVideo.play().catch(() => {});
      else podVideo.pause();
    }
    scrollBanners.forEach((item) => {
      if (!item.vid) return;
      if (canPlay) item.vid.play().catch(() => {});
      else item.vid.pause();
    });

    if (canPlay) {
      if (!bgRaf) bgRaf = requestAnimationFrame(drawBgFrame);
    } else if (bgRaf) {
      cancelAnimationFrame(bgRaf);
      bgRaf = 0;
    }
  }

  // -------------------------------------------------------------------------
  // 3. OPENING CURTAIN 3D WARP PORTAL + REPLAYABLE FULL-SCREEN 4K VIDEO MODAL
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
        const progress = (t + k / 7) % 1;
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
            <span class="argon-intro-badge">ULTRAREALISTIC 4K // SPATIAL MOTION PORTAL</span>
            <button type="button" class="argon-intro-close" data-close-intro>CLOSE PORTAL ✕</button>
          </div>
          <div class="argon-intro-bottom">
            <div>
              <p class="argon-intro-title">ADARSH S — IDEAS IN 3D MOTION.</p>
            </div>
            <span class="argon-intro-badge">4K SPATIAL STREAM · ACTIVE</span>
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
    if (e.target.closest('[data-close-intro]') || e.target === introModal) {
      closeIntroPortal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && introModal && introModal.classList.contains('is-open')) {
      closeIntroPortal();
    }
  });

  const heroLinksHost = document.querySelector(
    '.hero-minor-links, .summary-explore, .case-links, .tool-actions'
  );
  if (heroLinksHost && !document.getElementById('argonReplayIntroBtn')) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'argonReplayIntroBtn';
    btn.className = 'argon-replay-btn';
    btn.setAttribute('data-open-motion-portal', 'true');
    btn.innerHTML = '<span aria-hidden="true">▶</span> 4K Motion Portal';
    heroLinksHost.append(btn);
  }

  // -------------------------------------------------------------------------
  // 4. MULTI-RING 3D COLOR FRAME MOTION & FLOATING SATELLITE PHOTO FRAMES
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
      satTop.innerHTML = `<img src="${imgVision}" alt="" width="148" height="86" loading="lazy" /><span>AI VISION · 4K CORE</span>`;

      const satBottom = document.createElement('div');
      satBottom.className = 'argon-satellite-frame argon-satellite-bottom';
      satBottom.setAttribute('aria-hidden', 'true');
      satBottom.innerHTML = `<img src="${imgHolo}" alt="" width="148" height="86" loading="lazy" /><span>HOLO STUDIO · 4K</span>`;

      stage.append(satTop, satBottom);
    }
  });

  // -------------------------------------------------------------------------
  // 5. 4K MULTI-FRAME VISUAL SHOWCASE GALLERY IN #about / RECRUITER / SUBPAGES
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
            <span class="argon-frame-badge">HOLOGRAPHIC STUDIO</span>
          </div>
          <div class="argon-frame-meta">
            <strong>Adarsh S · Spatial Command Studio</strong>
            <span>ULTRAREALISTIC 4K HOLOGRAPHIC CORE</span>
          </div>
        </div>
      </div>
      <div class="argon-frame-card">
        <div class="argon-frame-card-inner">
          <div class="argon-frame-media">
            <img src="${imgVision}" alt="" width="960" height="600" loading="lazy" />
            <span class="argon-frame-badge">NEURAL VISION CORE</span>
          </div>
          <div class="argon-frame-meta">
            <strong>Computer Vision &amp; AI Core</strong>
            <span>OPENCV · DLIB · SAUVOLA OCR PIPELINES</span>
          </div>
        </div>
      </div>
      <div class="argon-frame-card">
        <div class="argon-frame-card-inner">
          <div class="argon-frame-media">
            <img src="${imgCloud}" alt="" width="960" height="600" loading="lazy" />
            <span class="argon-frame-badge">CLOUD &amp; ZERO-TRUST</span>
          </div>
          <div class="argon-frame-meta">
            <strong>Full-Stack &amp; Zero-Trust Matrix</strong>
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

  // -------------------------------------------------------------------------
  // 6. 3D INTERACTIVE CARD SPOTLIGHT & TILT (EXCLUDING #project-assenttag)
  // -------------------------------------------------------------------------
  const tiltCards = document.querySelectorAll(
    '.argon-frame-card, .argon-org-showcase, .argon-edu-showcase, .role-card, .summary-paper, .feature-launchpad > a, #education .timeline-item, #publication .publication-card, .case-spatial .case-grid > section, .case-spatial .evidence-grid > div'
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
  // 7. SCROLL-DRIVEN 4K VIDEO CHOREOGRAPHY & HUE SHIFT (ZERO NUMBERING)
  // -------------------------------------------------------------------------
  const streamStages = [
    '4K STUDIO STREAM',
    '4K VISION STREAM',
    '4K CLOUD STREAM',
    '4K CRYPTO STREAM',
    '4K SPATIAL CORE'
  ];

  let scrollRaf = 0;
  function onScroll() {
    scrollRaf = 0;
    const vh = Math.max(1, window.innerHeight);
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
    const ratio = clamp(window.scrollY / maxScroll, 0, 1);
    currentScrollRatio = ratio;

    if (allowed()) {
      root.style.setProperty('--argon-scroll-hue', `${Math.round(ratio * 140)}deg`);
    }

    const stageIdx = Math.min(streamStages.length - 1, Math.floor(ratio * streamStages.length));
    if (podFrameEl) {
      podFrameEl.textContent = streamStages[stageIdx];
    }
    if (podPctEl) {
      podPctEl.textContent = 'LIVE 4K';
    }
    if (scrollPod && allowed()) {
      const rx = ((0.5 - ratio) * 16).toFixed(2);
      const ry = (Math.sin(ratio * Math.PI * 2) * 14).toFixed(2);
      scrollPod.style.setProperty('--pod-rx', `${rx}deg`);
      scrollPod.style.setProperty('--pod-ry', `${ry}deg`);
    }

    for (let i = 0; i < scrollBanners.length; i++) {
      const item = scrollBanners[i];
      const rect = item.banner.getBoundingClientRect();
      const centerDist = (rect.top + rect.height * 0.5 - vh * 0.5) / (vh * 0.65);
      const clampedDist = clamp(centerDist, -1, 1);
      const progress = clamp(1 - Math.abs(clampedDist), 0.15, 1);
      if (allowed()) {
        item.banner.style.setProperty('--sv-rx', `${(clampedDist * 14).toFixed(2)}deg`);
        item.banner.style.setProperty('--sv-scale', (0.94 + progress * 0.06).toFixed(3));
      }
      if (item.bar) {
        item.bar.style.width = `${Math.round(progress * 100)}%`;
      }
      if (item.pct) {
        item.pct.textContent = 'ULTRAREALISTIC 4K STREAM · ACTIVE';
      }
    }
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

  onScroll();
  syncBackgroundMedia();
})();
