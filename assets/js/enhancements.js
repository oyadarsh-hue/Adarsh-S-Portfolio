/* Visible elements follow scrolling; original typing, dragging and filters remain. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const records = new Map();
  const visible = new Set();
  let frame = 0;
  const clamp = value => Math.max(0, Math.min(1, value));
  const allowed = () => !root.classList.contains('paused') && !reduced.matches && !document.hidden;

  for (const el of document.querySelectorAll('.section-heading h2, .hero-introduction h2, .contact-section h2')) {
    el.classList.add('enhanced-heading');
    records.set(el, {el, kind:'heading', shift:0});
  }
  for (const el of document.querySelectorAll('.project-card, .publication-card, .skill-card, .cert-card')) {
    el.classList.add('depth-card');
    records.set(el, {el, kind:'card', shift:0, scale:1});
  }
  for (const el of document.querySelectorAll('.section[id]')) {
    const field = document.createElement('div');
    field.className = 'section-aura';
    field.setAttribute('aria-hidden', 'true');
    el.append(field);
    records.set(el, {el, kind:'section'});
  }
  if (!('IntersectionObserver' in window)) return;

  function reset() {
    for (const record of records.values()) {
      const {el, kind} = record;
      if (kind === 'heading') {
        el.style.setProperty('--head-shift', '0px');
        el.style.setProperty('--line-progress', '1');
        el.style.setProperty('--title-position', '50%');
        record.shift = 0;
      } else if (kind === 'card') {
        el.style.setProperty('--depth-shift', '0px');
        el.style.setProperty('--depth-scale', '1');
        record.shift = 0;
        record.scale = 1;
      } else el.style.setProperty('--field-shift', '0px');
    }
  }

  function paint() {
    frame = 0;
    if (!allowed()) { reset(); return; }
    const viewport = innerHeight;
    const mobile = innerWidth < 701;
    // All geometry reads finish before style writes. Remove our own previous
    // translation/scale from the measurement to avoid motion feeding itself.
    const geometry = [...visible].map(record => {
      const rect = record.el.getBoundingClientRect();
      let top = rect.top - (record.shift || 0);
      if (record.kind === 'card') top -= rect.height / record.scale * (1 - record.scale);
      return {record, top, height:rect.height};
    });
    for (const {record, top, height} of geometry) {
      const {el, kind} = record;
      if (kind === 'heading') {
        const progress = clamp((viewport * .9 - top) / (viewport * .65));
        record.shift = (1 - progress) * (mobile ? 10 : 18);
        el.style.setProperty('--head-shift', `${record.shift.toFixed(2)}px`);
        el.style.setProperty('--line-progress', (.18 + .82 * progress).toFixed(3));
        el.style.setProperty('--title-position', `${(progress * 100).toFixed(1)}%`);
      } else if (kind === 'card') {
        const progress = clamp((viewport * .94 - top) / (viewport * .72));
        record.shift = (1 - progress) * (mobile ? 16 : 28);
        record.scale = .978 + .022 * progress;
        el.style.setProperty('--depth-shift', `${record.shift.toFixed(2)}px`);
        el.style.setProperty('--depth-scale', record.scale.toFixed(4));
      } else {
        const progress = clamp((viewport - top) / (viewport + height));
        el.style.setProperty('--field-shift', `${((.5 - progress) * (mobile ? 45 : 90)).toFixed(2)}px`);
      }
    }
  }
  const schedule = () => { if (!frame && allowed()) frame = requestAnimationFrame(paint); };
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const record = records.get(entry.target);
      if (entry.isIntersecting) visible.add(record);
      else visible.delete(record);
      entry.target.classList.toggle('vivid-in-view', entry.isIntersecting);
    }
    schedule();
  }, {rootMargin:'100px 0px'});
  records.forEach(({el}) => observer.observe(el));
  addEventListener('scroll', schedule, {passive:true});
  addEventListener('resize', schedule, {passive:true});
  const sync = () => {
    if (!allowed()) { cancelAnimationFrame(frame); frame = 0; reset(); }
    else schedule();
  };
  new MutationObserver(sync).observe(root, {attributes:true, attributeFilter:['class']});
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  sync();
})();
