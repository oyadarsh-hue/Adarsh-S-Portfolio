(() => {
  'use strict';
  const scenes = Array.from(document.querySelectorAll('[data-folio-scene]'));
  if (!scenes.length || !window.IntersectionObserver) return;
  const raised = Array.from(document.querySelectorAll('#skills .lo-tool-group, #certifications .lo-cert'));
  const system = window.matchMedia('(prefers-reduced-motion: reduce)');
  const visible = new Set();
  const steps = new WeakMap();
  let paintId = 0;

  function draw() {
    paintId = 0;
    if (system.matches) return;
    const height = document.documentElement.clientHeight || innerHeight;
    const width = document.documentElement.clientWidth || innerWidth;
    const results = [];
    for (const scene of visible) {
      const box = scene.getBoundingClientRect();
      const progress = Math.min(1,Math.max(0,(height - box.top) / (height + box.height)));
      const step = Math.round(progress * 100);
      if (steps.get(scene) !== step) results.push([scene, step]);
    }
    for (const [scene,step] of results) {
      steps.set(scene,step);
      const centred = (step - 50) / 50;
      scene.style.setProperty('--folio-angle',(centred * 5).toFixed(2) + 'deg');
      scene.style.setProperty('--folio-drift',(centred * Math.min(42,width * .045)).toFixed(1) + 'px');
    }
  }
  function schedule() {
    if (!system.matches && visible.size && !paintId) paintId = requestAnimationFrame(draw);
  }
  const viewport = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    }
    schedule();
  },{rootMargin:'45px'});
  const mount = new IntersectionObserver(entries => {
    for (const entry of entries) entry.target.classList.toggle('folio-in-frame',entry.isIntersecting);
  },{threshold:.08});
  function configure() {
    viewport.disconnect();
    mount.disconnect();
    visible.clear();
    for (const scene of scenes) {
      steps.delete(scene);
      scene.classList.toggle('folio-scroll',!system.matches);
      if (!system.matches) viewport.observe(scene);
    }
    for (const item of raised) {
      item.classList.toggle('folio-revealing',!system.matches);
      if (!system.matches) mount.observe(item);
    }
  }
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule,{passive:true});
  if (system.addEventListener) system.addEventListener('change',configure);
  else system.addListener(configure);
  configure();
})();
