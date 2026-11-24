/* The document's scroll position drives each composition. Only the artwork
   and individual title words move; all controls retain their layout boxes. */
(() => {
  'use strict';
  const body = document.body;
  if (!body.classList.contains('motion-edition')) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const selector = '[data-ed-stage], main .chapter, main .summary-section, main .tool-section, [data-motion-scene]';
  const stages = Array.from(document.querySelectorAll(selector));
  const visible = new Set();
  const seen = new WeakSet();
  const playing = new Map();
  const bounds = new Map();
  const template = document.createElement('template');
  template.innerHTML = '<div class="im-optics" aria-hidden="true"><i class="im-ticks"></i><i class="im-dial"></i><i class="im-guide"></i><i class="im-light-sweep"></i></div>';
  let frame = 0;
  let measure = true;

  function prepareTitle(title) {
    const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
    const original = title.innerText.trim().replace(/\s+/g, ' ');
    const textNodes = [];
    while (walker.nextNode()) if (walker.currentNode.textContent.trim()) textNodes.push(walker.currentNode);
    let order = 0;
    for (const node of textNodes) {
      const fragment = document.createDocumentFragment();
      for (const token of node.textContent.split(/(\s+)/u)) {
        if (!token || !token.trim()) {
          fragment.append(token);
          continue;
        }
        const word = document.createElement('span');
        word.className = 'im-word';
        word.style.setProperty('--im-direction', order % 2 ? '-1' : '1');
        word.style.setProperty('--im-order', Math.min(order, 4));
        word.setAttribute('aria-hidden', 'true');
        word.textContent = token;
        fragment.append(word);
        order++;
      }
      node.replaceWith(fragment);
    }
    if (!title.hasAttribute('aria-label')) title.setAttribute('aria-label', original);
    title.classList.add('im-title');
  }

  for (const stage of stages) {
    stage.classList.add('im-stage');
    const hero = stage.matches('[data-ed-stage], .lost-cover');
    if (hero) stage.classList.add('im-hero');
    for (const title of stage.querySelectorAll(hero ? 'h1' : 'h2')) {
      if (title.closest(selector) === stage && !title.closest('figure, details, .tool-interactive')) prepareTitle(title);
    }
    const art = stage.querySelector(hero ? '.plate-artwork, .interior-scene, .lost-image' : '.edition-banner, .stack-aperture');
    if (art) {
      art.classList.add('im-media');
      art.append(template.content.cloneNode(true));
    }
  }

  const clamp = value => Math.min(1, Math.max(0, value));
  function readBounds() {
    for (const stage of stages) {
      let top = 0;
      for (let node = stage; node; node = node.offsetParent) top += node.offsetTop;
      bounds.set(stage, {top, height: stage.offsetHeight});
    }
    measure = false;
  }

  function paint() {
    frame = 0;
    if (!body.classList.contains('im-running')) return;
    if (measure) readBounds();
    const viewport = window.innerHeight;
    const scroll = window.scrollY;
    for (const stage of visible) {
      const {top, height} = bounds.get(stage);
      const relativeTop = top - scroll;
      const hero = stage.classList.contains('im-hero');
      const progress = hero ? clamp(-relativeTop / Math.max(1, Math.min(height, viewport) * .92))
        : clamp((viewport - relativeTop) / (viewport + height));
      const entrance = hero ? 0 : 1 - clamp((viewport - relativeTop) / (viewport * .54));
      stage.style.setProperty('--im-progress', progress.toFixed(4));
      stage.style.setProperty('--im-entry', entrance.toFixed(4));
    }
  }
  function schedule() {
    if (!frame && body.classList.contains('im-running')) frame = requestAnimationFrame(paint);
  }
  function relayout() { measure = true; schedule(); }

  function introduce(stage) {
    if (reduced.matches || seen.has(stage) || document.hidden) return;
    seen.add(stage);
    stage.classList.add('im-playing');
    const timer = setTimeout(() => {
      stage.classList.remove('im-playing');
      playing.delete(stage);
    }, 3600);
    playing.set(stage, timer);
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      schedule();
    }, {rootMargin:'30% 0px'});
    for (const stage of stages) observer.observe(stage);
    const entering = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) introduce(entry.target);
      }
    }, {threshold:.035});
    for (const stage of stages) entering.observe(stage);
  } else {
    for (const stage of stages) visible.add(stage);
  }
  if ('ResizeObserver' in window) {
    const sizes = new ResizeObserver(relayout);
    sizes.observe(body);
    for (const stage of stages) sizes.observe(stage);
  }
  function sync() {
    const run = !reduced.matches;
    body.classList.toggle('im-running', run);
    if (!run) {
      for (const [stage, timer] of playing) {
        clearTimeout(timer);
        stage.classList.remove('im-playing');
      }
      playing.clear();
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    } else {
      for (const stage of visible) {
        const rect = stage.getBoundingClientRect();
        if (rect.top < innerHeight && rect.bottom > 0) introduce(stage);
      }
      relayout();
    }
  }
  sync();
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', relayout);
  window.addEventListener('pageshow', relayout);
  document.fonts?.ready.then(relayout);
})();
