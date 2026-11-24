(() => {
  const page = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const accent = document.querySelector('[data-discipline]');
  const drum = accent?.closest('.role-drum');
  const portraits = document.querySelectorAll('[data-atelier-depth]');
  const roles = ['Computer vision', 'Privacy engineering', 'Full-stack development'];
  let index = 0;
  let visible = true;
  let timer;
  const motion = () => !reduced.matches && !page.classList.contains('paused') && page.dataset.motion !== 'paused';

  function clearFlip() {
    accent?.classList.remove('role-incoming');
    drum?.querySelector('.role-outgoing')?.remove();
  }
  function rotateRole() {
    clearFlip();
    if (drum) {
      const old = document.createElement('span');
      old.className = 'role-outgoing';
      old.textContent = accent.textContent;
      drum.append(old);
    }
    index = (index + 1) % roles.length;
    accent.textContent = roles[index];
    accent.classList.add('role-incoming');
    schedule();
  }
  function schedule() {
    clearTimeout(timer);
    if (accent && visible && motion() && !document.hidden) timer = setTimeout(rotateRole,3650);
  }
  accent?.addEventListener('animationend', clearFlip);
  document.addEventListener('animationend', event => {
    if (event.animationName === 'chapter-title-in') event.target.classList.remove('prism-title-in');
  });

  if ('IntersectionObserver' in window) {
    const titles = new IntersectionObserver(entries => {
      for (const {target,isIntersecting} of entries) {
        if (target === accent) {
          visible = isIntersecting;
          if (!visible) clearFlip();
          schedule();
          continue;
        }
        if (isIntersecting && motion()) {
          target.classList.add('prism-title-in');
          titles.unobserve(target);
        }
      }
    });
    // The photographic frames have their own scroll choreography. Animate text alone here.
    document.querySelectorAll('h2[data-atelier-title], h2[data-motion-title], h3[data-motion-title]').forEach(title => titles.observe(title));
    if (accent) titles.observe(accent);
  }

  function sync() {
    if (!motion()) {
      clearFlip();
      document.querySelectorAll('.prism-title-in').forEach(title => title.classList.remove('prism-title-in'));
      portraits.forEach(element => {
        element.style.removeProperty('--depth-x');
        element.style.removeProperty('--depth-y');
      });
    }
    schedule();
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
  reduced.addEventListener('change',sync);
  document.addEventListener('visibilitychange',schedule);
  window.addEventListener('pagehide',()=>clearTimeout(timer));
  window.addEventListener('pageshow',schedule);
  schedule();
})();
