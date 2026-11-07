/* A little opening gesture on touch screens; navigation is always a native link. */
(() => {
  'use strict';
  if (!('IntersectionObserver' in window)) return;
  const touch = matchMedia('(hover: none), (pointer: coarse)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const doors = [...document.querySelectorAll('.portal-link')];
  const visible = new Set();
  function sync() {
    const animate = touch.matches && !reduced.matches && !root.classList.contains('paused');
    doors.forEach(door => door.classList.toggle('is-door-visible', animate && visible.has(door)));
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target));
    sync();
  }, {threshold:.55});
  doors.forEach(door => observer.observe(door));
  new MutationObserver(sync).observe(root, {attributes:true,attributeFilter:['class']});
  touch.addEventListener('change', sync);
  reduced.addEventListener('change', sync);
})();
