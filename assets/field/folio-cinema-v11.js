(() => {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const gallery = document.querySelector('.folio-gallery');
  const paper = document.querySelector('#publication .lo-paper-panorama');
  const journal = document.querySelector('#photo-story .story-scroll');
  const proofs = Array.from(document.querySelectorAll('[data-folio-proof]'));
  const manual = new WeakSet();
  const observed = [gallery, paper, journal, ...proofs].filter(Boolean);
  const visible = new Set('IntersectionObserver' in window ? [] : observed);
  let frame = 0;

  function updatePressed(buttons, selected) {
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(button === selected));
    }
  }
  if (gallery) {
    const editions = gallery.querySelector('.folio-edition');
    const buttons = Array.from(editions.querySelectorAll('[data-gallery-view]'));
    for (const button of buttons) {
      button.addEventListener('click', () => {
        gallery.dataset.edition = button.dataset.galleryView;
        updatePressed(buttons, button);
      });
    }
    editions.hidden = false;
  }

  function showProof(proof, value) {
    if (proof.dataset.view === value) return;
    proof.dataset.view = value;
    const workflow = value === 'workflow';
    proof.querySelector('.folio-concept-caption').hidden = workflow;
    proof.querySelector('.folio-workflow-caption').hidden = !workflow;
    proof.querySelector('.folio-concept').setAttribute('aria-hidden', String(workflow));
    proof.querySelector('.folio-workflow').setAttribute('aria-hidden', String(!workflow));
    const buttons = proof.querySelectorAll('[data-proof-view]');
    updatePressed(buttons, proof.querySelector('[data-proof-view="' + value + '"]'));
  }
  for (const proof of proofs) {
    showProof(proof, 'artwork');
    const controls = proof.querySelector('.folio-proof-controls');
    controls.hidden = false;
    controls.addEventListener('click', event => {
      const button = event.target.closest('[data-proof-view]');
      if (!button) return;
      manual.add(proof);
      showProof(proof, button.dataset.proofView);
    });
  }

  function draw() {
    frame = 0;
    if (preference.matches || document.hidden) return;
    const height = window.innerHeight;
    for (const node of visible) {
      const rect = node.getBoundingClientRect();
      if (!rect.height) continue;
      const progress = Math.max(0, Math.min(1, (height - rect.top) / (height + rect.height)));
      if (node.hasAttribute('data-folio-proof')) {
        if (!manual.has(node) && !node.contains(document.activeElement)) {
          showProof(node, progress > .53 ? 'workflow' : 'artwork');
        }
      } else {
        node.style.setProperty('--folio-travel', progress.toFixed(3));
      }
    }
  }
  function queue() {
    if (!frame && !preference.matches && !document.hidden && visible.size) {
      frame = requestAnimationFrame(draw);
    }
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      queue();
    }, {rootMargin:'40px 0px'});
    observed.forEach(node => observer.observe(node));
  }
  function changed() {
    if (preference.matches) {
      for (const proof of proofs) if (!manual.has(proof)) showProof(proof, 'artwork');
      for (const node of observed) node.style.removeProperty('--folio-travel');
    }
    queue();
  }
  window.addEventListener('scroll', queue, {passive:true});
  window.addEventListener('resize', queue, {passive:true});
  window.addEventListener('pageshow', changed);
  document.addEventListener('visibilitychange', queue);
  preference.addEventListener('change', changed);
  changed();
})();
