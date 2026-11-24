(() => {
  const root = document.documentElement;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const scenes = Array.from(document.querySelectorAll('[data-cinema-scene], #projects .pf-lead, .premiere-grid .premiere-card, #visual-reels'));
  const visible = new Set('IntersectionObserver' in window ? [] : scenes);
  const comparison = document.querySelector('.cinema-comparison');
  const slider = comparison?.querySelector('input[type="range"]');
  let manual = false;
  let frame = 0;
  let enabled = false;

  function wipe(value) {
    const percent = Math.round(value);
    if (slider.value !== String(percent)) slider.value = percent;
    comparison.style.setProperty('--cinema-split', percent + '%');
    slider.setAttribute('aria-valuetext', percent + '% original, ' + (100 - percent) + '% filtered');
  }
  if (slider) {
    slider.closest('label').hidden = false;
    wipe(50);
    slider.addEventListener('input', () => {
      manual = true;
      wipe(Number(slider.value));
    });
    slider.addEventListener('pointerdown', () => { manual = true; });
  }

  function update() {
    frame = 0;
    if (!enabled || document.hidden) return;
    const height = window.innerHeight;
    for (const scene of visible) {
      const rect = scene.getBoundingClientRect();
      if (!rect.height) continue;
      const phase = Math.max(0, Math.min(1, (height - rect.top) / (height + rect.height)));
      scene.style.setProperty('--cinema-phase', phase.toFixed(3));
      if (scene === comparison && !manual && !comparison.contains(document.activeElement)) {
        wipe(88 - phase * 76);
      }
    }
  }
  function requestUpdate() {
    if (enabled && !frame && !document.hidden) frame = requestAnimationFrame(update);
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      requestUpdate();
    }, {rootMargin:'120px 0px'});
    scenes.forEach(scene => observer.observe(scene));
  }
  function sync() {
    enabled = !preference.matches && !root.classList.contains('paused') && root.dataset.motion !== 'paused';
    for (const scene of scenes) {
      if (!enabled) scene.style.removeProperty('--cinema-phase');
    }
    if (!enabled && slider && !manual) wipe(50);
    requestUpdate();
  }
  window.addEventListener('scroll', requestUpdate, {passive:true});
  window.addEventListener('resize', requestUpdate, {passive:true});
  window.addEventListener('pageshow', sync);
  document.addEventListener('visibilitychange', requestUpdate);
  preference.addEventListener('change', sync);
  new MutationObserver(sync).observe(root, {attributes:true, attributeFilter:['class', 'data-motion']});
  sync();
})();
