/* Publication words reveal inside a fixed card; original content is preserved. */
(() => {
  'use strict';
  const research = document.querySelector('.publication-card');
  const title = research?.querySelector('.publication-copy h3');
  if (!research || !title || !('IntersectionObserver' in window)) return;
  const fragment = document.createDocumentFragment();
  let index = 0;
  for (const token of title.textContent.split(/(\s+)/)) {
    if (!token.trim()) fragment.append(document.createTextNode(token));
    else {
      const word = document.createElement('span');
      word.className = 'research-word';
      word.textContent = token;
      word.style.setProperty('--word-delay', `${Math.min(index++ * 35, 650)}ms`);
      fragment.append(word);
    }
  }
  title.replaceChildren(fragment);
  research.querySelectorAll('.paper-meta > div').forEach((el, i) => el.style.setProperty('--row-delay', `${i * 90}ms`));
  new IntersectionObserver(([entry]) => {
    research.classList.toggle('research-in-view', entry.isIntersecting);
  }, {threshold:0, rootMargin:'0px 0px -8% 0px'}).observe(research);
})();
