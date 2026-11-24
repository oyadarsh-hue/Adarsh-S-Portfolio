(() => {
  'use strict';
  const scenes = [...document.querySelectorAll('[data-folio-scene]')];
  if (!scenes.length || !('IntersectionObserver' in window)) return;

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const cards = [...document.querySelectorAll('#skills .lo-tool-group, #certifications .lo-cert')];
  const visible = new Set();
  const last = new WeakMap();
  let frame = 0;
  function paint() {
    frame = 0;
    if (motion.matches) return;
    const height = document.documentElement.clientHeight || innerHeight;
    const distances = [];
    visible.forEach(scene => {
      const rect = scene.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (height - rect.top) / (height + rect.height)));
      const step = Math.round(progress * 100);
      if (last.get(scene) !== step) distances.push([scene, step]);
    });
    const reach = Math.min(43, Math.max(18, innerWidth * .045));
    for (const [scene, step] of distances) {
      last.set(scene, step);
      const centre = step / 50 - 1;
      scene.style.setProperty('--folio-drift', (centre * reach).toFixed(1) + 'px');
      scene.style.setProperty('--folio-angle', (centre * 5).toFixed(2) + 'deg');
      if (scene.dataset.folioScene === 'profile') {
        scene.style.setProperty('--folio-turn', (-3 + centre * 7).toFixed(2) + 'deg');
      } else if (scene.dataset.folioScene === 'tools') {
        scene.style.setProperty('--folio-corner', Math.round(25 + step * .68) + 'px');
      }
    }
  }
  function requestPaint() {
    if (!frame && !motion.matches && visible.size) frame = requestAnimationFrame(paint);
  }
  const watcher = new IntersectionObserver(entries => {
    for (const {target, isIntersecting} of entries) {
      if (isIntersecting) visible.add(target);
      else visible.delete(target);
    }
    requestPaint();
  }, {rootMargin:'48px'});
  const cardWatcher = new IntersectionObserver(entries => {
    for (const {target, isIntersecting} of entries) {
      target.classList.toggle('folio-in-frame', isIntersecting);
    }
  }, {threshold:.08});
  function sync() {
    watcher.disconnect();
    cardWatcher.disconnect();
    visible.clear();
    for (const scene of scenes) {
      scene.classList.toggle('folio-scroll', !motion.matches);
      last.delete(scene);
      if (!motion.matches) watcher.observe(scene);
    }
    for (const card of cards) {
      card.classList.toggle('folio-revealing', !motion.matches);
      if (!motion.matches) cardWatcher.observe(card);
    }
  }
  window.addEventListener('scroll', requestPaint, {passive:true});
  window.addEventListener('resize', requestPaint, {passive:true});
  if (motion.addEventListener) motion.addEventListener('change', sync);
  else motion.addListener(sync);
  sync();
})();
