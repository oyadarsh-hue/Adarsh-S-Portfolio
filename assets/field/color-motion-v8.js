(() => {
  'use strict';
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const frames = Array.from(document.querySelectorAll('[data-motion-title], [data-motion-frame]'));
  const rotator = document.querySelector('[data-discipline]');
  const names = ['Computer vision', 'Privacy engineering', 'Full-stack development'];
  const seen = new WeakSet();
  const active = new Set();
  let delay;
  let current = 0;
  let visible = false;
  function enabled() {
    return !reduce.matches && !root.classList.contains('paused') && root.dataset.motion !== 'paused';
  }
  function animate(node, keyframes, options) {
    if (!enabled() || !node.animate) return;
    const effect = node.animate(keyframes, options);
    active.add(effect);
    effect.finished.then(() => active.delete(effect), () => active.delete(effect));
  }
  function schedule() {
    clearTimeout(delay);
    if (!rotator || !enabled() || !visible || document.hidden) return;
    delay = setTimeout(() => {
      current = (current + 1) % names.length;
      rotator.textContent = names[current];
      animate(rotator, [
        { transform: 'perspective(480px) rotateX(-52deg) translateY(.28em)', opacity: .45 },
        { transform: 'perspective(480px) rotateX(0deg) translateY(0)', opacity: 1 }
      ], {duration: 560, easing: 'cubic-bezier(.2,.75,.2,1)'});
      schedule();
    }, 3800);
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const node = entry.target;
        if (node === rotator) {visible = entry.isIntersecting; schedule();continue;}
        if (!entry.isIntersecting || !enabled() || seen.has(node)) continue;
        seen.add(node); observer.unobserve(node);
        const title = node.hasAttribute('data-motion-title');
        animate(node, title
          ? [{clipPath:'inset(0 0 60% 0)',translate:'0 12px',rotate:'-.9deg'}, {clipPath:'inset(-15% -3% -15% -3%)',translate:'0 0',rotate:'0deg'}]
          : [{translate:'0 14px',opacity:.78},{translate:'0 0',opacity:1}],
          {duration:title?730:550,easing:'cubic-bezier(.16,.84,.24,1)'});
      }
    },{threshold:0});
    for (const frame of frames) observer.observe(frame);
    if(rotator) observer.observe(rotator);
  }
  function sync() {
    if (!enabled()) {
      for (const effect of active) effect.cancel();
      active.clear();
    }
    schedule();
  }
  new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:['class','data-motion']});
  reduce.addEventListener('change',sync);
  document.addEventListener('visibilitychange',schedule);
  window.addEventListener('pagehide',()=>clearTimeout(delay));
  window.addEventListener('pageshow',schedule);
})();
