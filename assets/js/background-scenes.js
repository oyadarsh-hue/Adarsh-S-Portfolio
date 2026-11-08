/* Event-driven depth for four decorative scenes. No scroll hijacking or loop. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 700px)');
  const connection = navigator.connection;
  const scenes = [...document.querySelectorAll('[data-background-scene]')];
  const visible = new Set();
  let frame = 0;
  const allowed = () => !reduced.matches && !root.classList.contains('paused') &&
    !document.hidden && !connection?.saveData;
  const clamp = value => Math.max(-1, Math.min(1, value));

  function render() {
    frame = 0;
    if (!allowed()) return;
    const height = innerHeight;
    // Read geometry together, then write only composited transforms.
    const positions = [...visible].map(scene => {
      const track = scene.dataset.backgroundTrack === 'parent' ? scene.parentElement : scene;
      const box = track.getBoundingClientRect();
      const progress = clamp((height - box.top * 2 - box.height) / (height + box.height));
      return [scene, (progress * (compact.matches ? 20 : 42)).toFixed(2)];
    });
    positions.forEach(([scene, offset]) => scene.style.setProperty('--scene-y', `${offset}px`));
  }
  function queue() {
    if (!frame && visible.size && allowed()) frame = requestAnimationFrame(render);
  }
  function sync() {
    const moving = allowed();
    root.dataset.sceneMotion = moving ? 'scroll' : 'still';
    if (!moving && frame) { cancelAnimationFrame(frame); frame = 0; }
    scenes.forEach(scene => {
      scene.dataset.sceneActive = String(moving && visible.has(scene));
      if (!moving) scene.style.removeProperty('--scene-y');
    });
    queue();
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(({target, isIntersecting}) => {
        if (isIntersecting) visible.add(target);
        else visible.delete(target);
        target.dataset.sceneActive = String(isIntersecting && allowed());
      });
      queue();
    });
    scenes.forEach(scene => observer.observe(scene));
  } else {
    // Keep static images on older browsers; all content works without enhancement.
    root.dataset.sceneMotion = 'still';
    return;
  }
  addEventListener('scroll', queue, {passive: true});
  addEventListener('resize', queue, {passive: true});
  addEventListener('pageshow', sync);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  connection?.addEventListener?.('change', sync);
  new MutationObserver(sync).observe(root, {attributes: true, attributeFilter: ['class']});
  sync();
})();
