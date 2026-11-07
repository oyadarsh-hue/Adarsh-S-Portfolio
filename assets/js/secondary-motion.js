/* Shared choreography for recruiter, case studies and working tools. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover:hover) and (pointer:fine)');
  const allowed = () => !root.classList.contains('paused') && !reduced.matches;
  const clamp = (n,a=0,b=1) => Math.max(a,Math.min(b,n));
  const headingNodes = [...document.querySelectorAll('main h1, main h2')];
  headingNodes.forEach(heading => {
    const texts = [], walker = document.createTreeWalker(heading,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()) if(walker.currentNode.textContent.trim()) texts.push(walker.currentNode);
    let order = 0;
    texts.forEach(text => {
      const fragment = document.createDocumentFragment();
      text.textContent.split(/(\s+)/).forEach(part => {
        if(!part.trim()) fragment.append(document.createTextNode(part));
        else {
          const span = document.createElement('span');
          span.className = 'secondary-word';span.textContent = part;
          span.style.setProperty('--word-order',order++);
          fragment.append(span);
        }
      });
      text.replaceWith(fragment);
    });
    heading.classList.add('secondary-heading');
  });
  const revealNodes = [...document.querySelectorAll('.role-card, .proof-item, .case-grid>section, .evidence-grid>div, .tool-section')];
  revealNodes.forEach(el=>el.classList.add('secondary-reveal'));
  if('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry=>{
      if(!entry.isIntersecting)return;
      entry.target.classList.add('secondary-visible');observer.unobserve(entry.target);
    }),{threshold:.08});
    [...headingNodes,...revealNodes].forEach(el=>observer.observe(el));
    root.classList.add('secondary-motion-ready');
  }
  const progress = document.createElement('div');progress.className='secondary-progress';progress.setAttribute('aria-hidden','true');document.body.append(progress);
  const scenes = [...document.querySelectorAll('.summary-hero,.case-intro,.tool-hero')];
  let frame=0;
  function render(){
    frame=0;
    progress.style.setProperty('--page-progress',clamp(scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight)));
    if(!allowed())return;
    scenes.forEach(el=>{
      const rect=el.getBoundingClientRect();
      if(rect.bottom<0||rect.top>innerHeight)return;
      el.style.setProperty('--secondary-progress',clamp((innerHeight*.25-rect.top)/Math.max(1,rect.height)));
    });
  }
  function queue(){if(!frame)frame=requestAnimationFrame(render);}
  addEventListener('scroll',queue,{passive:true});addEventListener('resize',queue,{passive:true});
  const portraits = document.querySelectorAll('.summary-art,.case-art,.tool-intro-note');
  portraits.forEach(el=>{
    let pointerFrame=0;
    el.addEventListener('pointermove',event=>{
      if(!allowed()||!fine.matches||pointerFrame)return;
      const x=event.clientX,y=event.clientY;
      pointerFrame=requestAnimationFrame(()=>{
        pointerFrame=0;const rect=el.getBoundingClientRect();
        el.style.setProperty('--secondary-rx',`${clamp((.5-(y-rect.top)/rect.height)*8,-4,4)}deg`);
        el.style.setProperty('--secondary-ry',`${clamp(((x-rect.left)/rect.width-.5)*10,-5,5)}deg`);
      });
    },{passive:true});
    el.addEventListener('pointerleave',()=>{el.style.setProperty('--secondary-rx','0deg');el.style.setProperty('--secondary-ry','0deg');});
  });
  new MutationObserver(queue).observe(root,{attributes:true,attributeFilter:['class']});reduced.addEventListener('change',queue);render();
})();
