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
  const frames = [...document.querySelectorAll('.lo-scene-frame, .lo-title, .lo-panorama, .lo-chapter .lo-head')];
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
      } else if (frame.matches('.lo-panorama, .lo-head')) {
        // Use the fixed chapter box: moving its children never feeds back into scroll geometry.
        const travel = (innerHeight - bounds.top) / (innerHeight + bounds.height);
        const phase = still ? .5 : Math.min(1, Math.max(0, (travel - .15) / .7));
        frame.style.setProperty('--lo-motion', phase.toFixed(4));
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


// The downloaded print carries a credited campus detail for offline viewing.
(() => {
  let printDetail;
  function readCampusPanel() {
    if (printDetail) return printDetail;
    printDetail = (async () => {
      const poster = new Image();
      poster.src = 'assets/field/education-four-v8.jpg';
      await poster.decode();
      const panel = document.createElement('canvas');
      panel.width = 1798;
      panel.height = 536;
      const graphics = panel.getContext('2d');
      graphics.drawImage(poster, 104, 1134, panel.width, panel.height, 0, 0, panel.width, panel.height);
      return panel.toDataURL('image/jpeg', .89);
    })();
    return printDetail;
  }
  document.querySelectorAll('img[data-lo-campus-fallback]').forEach((image) => {
    async function showLocalPhotograph() {
      const town = image.dataset.loCampusFallback;
      if (!town) return;
      delete image.dataset.loCampusFallback;
      try {
        image.src = await readCampusPanel();
        image.width = 1798;
        image.height = 536;
      } catch {
        image.src = town;
        image.width = 1080;
        image.height = 613;
        const tile = image.closest('.lo-atlas-tile');
        if (tile) tile.querySelector('.lo-tile-id small').textContent = 'Thamarassery town view';
        const record = image.closest('.lo-school-hero');
        if (record) {
          const credit = record.querySelector('.lo-card-photo-credit');
          credit.href = 'assets/field/education-photo-credits-v8.html#bsc-town';
          credit.textContent = 'Thamarassery town view · Sapsree97 ©';
        }
      }
    }
    image.addEventListener('error', showLocalPhotograph, { once: true });
    if (image.complete && image.naturalWidth === 0) showLocalPhotograph();
  });
})();
