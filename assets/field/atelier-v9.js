(() => {
  const page = document.documentElement;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const accent = document.querySelector('[data-discipline]');
  const portraits = document.querySelectorAll('[data-atelier-depth]');
  const effects = new Set();
  const entered = new WeakSet();
  let rotation = 0;
  let visible = false;
  let timer;

  const motion = () => !preference.matches && !page.classList.contains('paused') && page.dataset.motion !== 'paused';
  function run(element, frames, options) {
    if (!motion() || !element.animate) return;
    const effect = element.animate(frames, options);
    effects.add(effect);
    effect.finished.then(() => effects.delete(effect), () => effects.delete(effect));
  }

  function cycle() {
    clearTimeout(timer);
    if (!accent || !visible || !motion() || document.hidden) return;
    timer = setTimeout(() => {
      const words = ['Computer vision', 'Privacy engineering', 'Full-stack development'];
      rotation = (rotation + 1) % words.length;
      accent.textContent = words[rotation];
      run(accent, [
        {transform:'perspective(360px) rotateX(-64deg) translateY(13px)',opacity:.24},
        {transform:'perspective(360px) rotateX(10deg)',opacity:1,offset:.78},
        {transform:'perspective(360px) rotateX(0deg)',opacity:1}
      ], {duration:690,easing:'cubic-bezier(.16,.82,.25,1)'});
      cycle();
    }, 3650);
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(records => {
      for (const {target, isIntersecting} of records) {
        if (target === accent) {
          visible = isIntersecting;
          cycle();
          continue;
        }
        if (!isIntersecting || entered.has(target) || !motion()) continue;
        entered.add(target);
        observer.unobserve(target);
        const title = target.matches('[data-atelier-title], [data-motion-title]');
        run(target, title ? [
          {clipPath:'inset(0 -5% 48% -5%)', translate:'0 .32em', rotate:'-2deg'},
          {clipPath:'inset(-16% -5% -18% -5%)', translate:'0 0', rotate:'0deg'}
        ] : [
          {transform:'perspective(850px) rotateX(3deg) translateY(20px)', opacity:.82},
          {transform:'perspective(850px) rotateX(0deg) translateY(0)', opacity:1}
        ], {duration:title ? 795 : 625, easing:'cubic-bezier(.19,1,.28,1)'});
      }
    }, {threshold:0});
    document.querySelectorAll('[data-atelier-title], [data-atelier-reveal], [data-motion-title], [data-motion-frame]').forEach(element => observer.observe(element));
    if (accent) observer.observe(accent);
  }

  function sync() {
    if (!motion()) {
      for (const effect of effects) effect.cancel();
      effects.clear();
      portraits.forEach(element => {
        element.style.removeProperty('--depth-x');
        element.style.removeProperty('--depth-y');
      });
    }
    cycle();
  }
  for (const panel of portraits) {
    panel.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || !motion()) return;
      const bounds = panel.getBoundingClientRect();
      panel.style.setProperty('--depth-x', ((event.clientX-bounds.left)/bounds.width-.5)*7+'deg');
      panel.style.setProperty('--depth-y', ((event.clientY-bounds.top)/bounds.height-.5)*-6+'deg');
    }, {passive:true});
    panel.addEventListener('pointerleave', () => {
      panel.style.removeProperty('--depth-x');
      panel.style.removeProperty('--depth-y');
    });
  }
  new MutationObserver(sync).observe(page,{attributes:true,attributeFilter:['class','data-motion']});
  preference.addEventListener('change',sync);
  document.addEventListener('visibilitychange',cycle);
  window.addEventListener('pagehide',()=>clearTimeout(timer));
  window.addEventListener('pageshow',sync);
})();
