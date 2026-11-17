(() => {
  'use strict';
  const section = document.querySelector('#photo-story');
  const scrollArea = section.querySelector('.story-scroll');
  const stage = section.querySelector('.story-stage');
  const slides = Array.from(stage.querySelectorAll('.story-slide'));
  const controls = Array.from(stage.querySelectorAll('[data-story-to]'));
  const hero = document.querySelector('.hero-edition');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const letters = hero.querySelectorAll('.name-segment b');
  letters.forEach((letter,index) => letter.style.setProperty('--letter',index));
  let scheduled = false;
  let active = -1;
  let running = false;
  function select(index) {
    if (active === index) return;
    active = index;
    slides.forEach((slide,i) => {
      slide.classList.toggle('current',i===index);
      slide.inert = i !== index;
      if (i !== index) slide.setAttribute('aria-hidden','true');
      else slide.removeAttribute('aria-hidden');
      controls[i].setAttribute('aria-current',String(i===index));
    });
  }
  function update() {
    scheduled = false;
    if (!running) return;
    const rect = scrollArea.getBoundingClientRect();
    const distance = Math.max(1,rect.height-stage.offsetHeight);
    const p = Math.min(1,Math.max(0,-rect.top/distance));
    const index = Math.min(slides.length-1,Math.floor(p*slides.length));
    select(index);
    const within = Math.min(1,p*slides.length-index);
    const slide = slides[index];
    slide.style.setProperty('--story-y',((within-.5)*34).toFixed(2)+'px');
    slide.style.setProperty('--story-x',((.5-within)*32).toFixed(2)+'px');
    if (scrollY < hero.offsetHeight + 80) {
      const move = Math.min(1, scrollY/Math.max(210,hero.offsetHeight*.6));
      hero.style.setProperty('--name-y',(move*-14).toFixed(2)+'px');
      hero.style.setProperty('--role-shift',(move*36).toFixed(2)+'px');
      hero.style.setProperty('--portrait-drift',(move*-5).toFixed(2)+'deg');
    }
  }
  function queue() {
    if (!running || scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  }
  function mode() {
    const enabled = !reduced.matches && !document.documentElement.classList.contains('paused');
    if (enabled===running && section.dataset.initialized) return;
    section.dataset.initialized = 'true';
    running=enabled;
    section.classList.toggle('story-running',running);
    active=-1;
    if (running) queue();
    else {
      slides.forEach(slide => {slide.inert=false;slide.classList.remove('current');slide.removeAttribute('aria-hidden');});
      ['--name-y','--portrait-drift','--role-shift'].forEach(key=>hero.style.removeProperty(key));
    }
  }
  controls.forEach((button,i) => button.addEventListener('click',() => {
    const length = scrollArea.offsetHeight-stage.offsetHeight;
    const origin = scrollArea.getBoundingClientRect().top + scrollY;
    window.scrollTo({top:origin+(i+.38)/slides.length*length,behavior:'instant'});
    update();
  }));
  window.addEventListener('scroll',queue,{passive:true});
  window.addEventListener('resize',queue);
  new MutationObserver(mode).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  reduced.addEventListener('change',mode);
  mode();
})();
