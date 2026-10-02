/* Stable content planes; text colour and underline reveals follow viewport entry. */
(() => {
  'use strict';
  const headings = [...document.querySelectorAll('.section-heading h2, .hero-introduction h2, .contact-section h2')];
  const cards = [...document.querySelectorAll('.project-card, .publication-card, .skill-card, .cert-card')];
  headings.forEach(el => el.classList.add('enhanced-heading'));
  cards.forEach(el => el.classList.add('depth-card'));
  document.querySelectorAll('.section[id]').forEach(el => {
    const field = document.createElement('div');
    field.className = 'section-aura';
    field.setAttribute('aria-hidden', 'true');
    el.append(field);
  });
  if (!('IntersectionObserver' in window)) return;
  // No scroll/resize loop, container transforms or viewport-height scrubbing.
  const observer = new IntersectionObserver(entries => {
    entries.forEach(({target, isIntersecting}) => target.classList.toggle('vivid-in-view', isIntersecting));
  }, {rootMargin:'0px 0px -6% 0px'});
  [...headings, ...cards].forEach(el => observer.observe(el));
})();
