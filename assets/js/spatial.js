/* One-shot dimensional word reveals and a document chapter indicator. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const allowed = () => !reduced.matches && !root.classList.contains('paused');
  const clamp = n => Math.max(0, Math.min(1, n));
  const headings = [...document.querySelectorAll('.section-heading h2, .rail-titlebar h2, #contact h2')];
  headings.forEach(heading => {
    let index = 0;
    const walk = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
    const texts = [];
    while (walk.nextNode()) if (walk.currentNode.textContent.trim()) texts.push(walk.currentNode);
    texts.forEach(node => {
      const fragment = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(part => {
        if (!part.trim()) fragment.append(document.createTextNode(part));
        else {
          const word = document.createElement('span');
          word.className = 'depth-word';
          word.style.setProperty('--word-index', index++);
          word.textContent = part;
          fragment.append(word);
        }
      });
      node.replaceWith(fragment);
    });
    heading.classList.add('depth-heading');
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('depth-visible');
        observer.unobserve(entry.target);
      }
    }), { threshold: .1, rootMargin: '0px 0px -25px 0px' });
    headings.forEach(heading => observer.observe(heading));
    root.classList.add('depth-ready');
  }
  const chapter = document.createElement('div');
  chapter.className = 'spatial-chapter';
  chapter.setAttribute('aria-hidden', 'true');
  chapter.innerHTML = '<span class="chapter-number">01</span><span class="chapter-label">INTRODUCTION</span><i></i>';
  document.body.append(chapter);
  const chapters = [
    ['home', 'INTRODUCTION'], ['doors', 'SELECTED WORK'], ['showreel', 'PROJECT FILM'],
    ['about', 'THE PERSON'], ['projects', 'PROJECT ARCHIVE'], ['experience', 'THE JOURNEY'],
    ['publication', 'RESEARCH'], ['skills', 'CAPABILITIES'], ['certifications', 'LEARNING'],
    ['education', 'FOUNDATIONS'], ['contact', 'LET’S CONNECT']
  ].map(([id, label]) => ({element:document.getElementById(id), label})).filter(c => c.element);
  const number = chapter.querySelector('.chapter-number');
  const label = chapter.querySelector('.chapter-label');
  const hero = document.querySelector('.studio-hero');
  let frame = 0, active = -1;
  function render() {
    frame = 0;
    let selected = 0;
    chapters.forEach((entry, i) => { if (entry.element.getBoundingClientRect().top <= innerHeight * .4) selected = i; });
    if (selected !== active) {
      active = selected;
      number.textContent = String(selected + 1).padStart(2, '0');
      label.textContent = chapters[selected].label;
    }
    chapter.style.setProperty('--chapter-progress', `${clamp(scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)) * 100}%`);
    if (hero && allowed()) {
      const box = hero.getBoundingClientRect();
      if (box.bottom > 0) hero.style.setProperty('--spatial-exit', clamp(-box.top / box.height));
    }
  }
  function queue() { if (!frame) frame = requestAnimationFrame(render); }
  addEventListener('scroll', queue, {passive:true});
  addEventListener('resize', queue, {passive:true});
  reduced.addEventListener('change', queue);
  new MutationObserver(queue).observe(root, {attributes:true, attributeFilter:['class']});
  render();
})();
