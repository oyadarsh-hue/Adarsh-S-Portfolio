/* Native scroll drives the project rail. No wheel interception or scroll traps. */
(() => {
  'use strict';
  const section = document.querySelector('.project-rail-section');
  if (!section) return;
  const root = document.documentElement;
  const viewport = section.querySelector('.rail-viewport');
  const track = section.querySelector('.rail-track');
  const panels = [...section.querySelectorAll('.rail-panel')];
  const buttons = [...section.querySelectorAll('[data-rail-go]')];
  const nav = section.querySelector('.rail-nav');
  const count = section.querySelector('.rail-position');
  const desktop = matchMedia('(min-width:1001px) and (min-height:760px)');
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  let distance = 0, step = 0, frame = 0, active = 0;
  const enabled = () => desktop.matches && !reduced.matches;
  const paused = () => root.classList.contains('paused');
  const headerHeight = () => document.querySelector('.topbar')?.getBoundingClientRect().height || 88;
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  function render() {
    frame = 0;
    if (!enabled() || paused()) return;
    const top = section.getBoundingClientRect().top;
    const travel = clamp(headerHeight() - top, 0, distance);
    track.style.setProperty('--rail-x', `${-travel}px`);
    active = clamp(Math.round(travel / Math.max(1, step)), 0, panels.length - 1);
    buttons.forEach((button, i) => button.setAttribute('aria-current', String(i === active)));
    if (count) count.textContent = `${String(active + 1).padStart(2,'0')} / ${String(panels.length).padStart(2,'0')}`;
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(render);
  }
  function configure() {
    const enhanced = enabled();
    section.classList.toggle('rail-enhanced', enhanced);
    section.classList.toggle('rail-is-paused', paused());
    if (nav) nav.hidden = !enhanced || paused();
    if (enhanced) {
      // Always measure the untransformed viewport; pausing never changes this height.
      step = viewport.clientWidth + 24;
      distance = step * (panels.length - 1);
      section.style.setProperty('--rail-height', `${innerHeight - headerHeight() + distance}px`);
    } else {
      section.style.removeProperty('--rail-height');
      track.style.removeProperty('--rail-x');
    }
    schedule();
  }
  function go(index) {
    if (!enabled() || paused()) return;
    const target = scrollY + section.getBoundingClientRect().top - headerHeight() + step * index;
    window.scrollTo({top:target,behavior:'instant'});
    schedule();
  }
  buttons.forEach(button => button.addEventListener('click', () => go(Number(button.dataset.railGo))));
  // A keyboard user can tab to any case study without landing outside the viewport.
  panels.forEach((panel, i) => panel.addEventListener('focusin', () => {
    if (enabled() && !paused()) {
      viewport.scrollLeft = 0;
      go(i);
    }
  }));
  addEventListener('scroll', schedule, {passive:true});
  addEventListener('resize', configure, {passive:true});
  desktop.addEventListener('change', configure);
  reduced.addEventListener('change', configure);
  new MutationObserver(configure).observe(root, {attributes:true,attributeFilter:['class']});
  configure();
})();
