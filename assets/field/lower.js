(() => {
  const skillSection = document.getElementById('skills');
  const filters = skillSection?.querySelector('.lo-filters');
  if (!filters) return;
  const buttons = [...filters.querySelectorAll('[data-lo-filter]')];
  const groups = [...skillSection.querySelectorAll('[data-lo-category]')];
  filters.addEventListener('click', (event) => {
    const selected = event.target.closest('[data-lo-filter]');
    if (!selected || !filters.contains(selected)) return;
    buttons.forEach((button) => button.setAttribute('aria-pressed', String(button === selected)));
    const category = selected.dataset.loFilter;
    groups.forEach((group) => {
      group.hidden = category !== 'all' && group.dataset.loCategory !== category;
    });
  });
  filters.hidden = false;
})();

(() => {
  const frames = [...document.querySelectorAll('.lo-scene-frame, .lo-title')];
  if (!frames.length || !('IntersectionObserver' in window)) return;

  const visible = new Set();
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let pendingFrame = 0;
  function updatePhotos() {
    pendingFrame = 0;
    const still = reduceMotion.matches || document.documentElement.classList.contains('paused');
    for (const frame of visible) {
      const bounds = frame.getBoundingClientRect();
      const progress = Math.max(-1, Math.min(1,
        (innerHeight - bounds.height - 2 * bounds.top) / (innerHeight + bounds.height)
      ));
      if (frame.classList.contains('lo-title')) {
        const drift = still ? 0 : (progress + 1) * Math.min(7, innerWidth * .009);
        frame.style.setProperty('--lo-type-drift', drift.toFixed(1) + 'px');
      } else {
        const distance = Math.min(42, bounds.height * .065);
        frame.style.setProperty('--lo-pan', (still ? 0 : progress * distance).toFixed(1) + 'px');
      }
    }
  }
  function schedulePhotoUpdate() {
    if (visible.size && !pendingFrame) pendingFrame = requestAnimationFrame(updatePhotos);
  }
  const viewport = new IntersectionObserver(entries => {
    for (const {target, isIntersecting} of entries) {
      if (target.classList.contains('lo-title')) target.classList.toggle('lo-type-run', isIntersecting);
      if (isIntersecting) visible.add(target);
      else visible.delete(target);
    }
    schedulePhotoUpdate();
  });
  frames.forEach(frame => viewport.observe(frame));
  new MutationObserver(schedulePhotoUpdate).observe(document.documentElement, {attributes: true, attributeFilter: ['class']});
  addEventListener('scroll', schedulePhotoUpdate, {passive:true});
  addEventListener('resize', schedulePhotoUpdate, {passive:true});
})();
