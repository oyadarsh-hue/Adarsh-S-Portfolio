(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const motion = () => !root.classList.contains('paused') && !reduced.matches;
  const finishEntrance = () => root.classList.add('studio-entered');
  if (!motion()) finishEntrance();
  else setTimeout(finishEntrance, 1800);

  const word = document.getElementById('kineticWord');
  const roles = ['software.', 'solutions.', 'possibility.'];
  let role = 0, turning = false, wordTimer = 0, settleTimer = 0;
  function settleWord() {
    clearTimeout(wordTimer); clearTimeout(settleTimer);
    if (!word) return;
    if (turning) role = (role + 1) % roles.length;
    word.textContent = roles[role];
    word.parentElement.dataset.word = String(role);
    word.classList.remove('is-leaving', 'is-arriving');
    turning = false;
  }
  setInterval(() => {
    if (!word || !motion() || document.hidden || turning) return;
    const box = word.getBoundingClientRect();
    if (box.bottom < 0 || box.top > innerHeight) return;
    turning = true;
    word.classList.add('is-leaving');
    wordTimer = setTimeout(() => {
      role = (role + 1) % roles.length;
      word.textContent = roles[role];
      word.parentElement.dataset.word = String(role);
      turning = false;
      word.classList.remove('is-leaving');
      word.classList.add('is-arriving');
      settleTimer = setTimeout(() => word.classList.remove('is-arriving'), 800);
    }, 300);
  }, 4300);

  const clock = document.getElementById('localClock');
  const time = () => { if (clock) clock.textContent = new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit'}).format(new Date()); };
  time(); setInterval(time,60000);
  const dialog = document.getElementById('abilityDialog');
  const opener = document.getElementById('abilityOpen');
  opener?.addEventListener('click', () => dialog.showModal());
  document.getElementById('abilityClose')?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('close', () => opener.focus({preventScroll:true}));
  dialog?.addEventListener('click', event => {
    if(event.target !== dialog) return;
    const b=dialog.getBoundingClientRect();
    if(event.clientX<b.left || event.clientX>b.right || event.clientY<b.top || event.clientY>b.bottom) dialog.close();
  });
  const person = document.querySelector('.studio-person');
  let pointerFrame = 0;
  person?.addEventListener('pointermove', event => {
    if (!motion() || !fine.matches || pointerFrame) return;
    const x = event.clientX, y = event.clientY;
    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = 0;
      const b = person.getBoundingClientRect();
      person.style.setProperty('--portrait-x', `${(.5-(y-b.top)/b.height)*5}deg`);
      person.style.setProperty('--portrait-y', `${((x-b.left)/b.width-.5)*7}deg`);
    });
  }, {passive:true});
  person?.addEventListener('pointerleave', () => {
    person.style.setProperty('--portrait-x', '0deg');
    person.style.setProperty('--portrait-y', '0deg');
  });
  let scrollFrame = 0;
  const hero = document.querySelector('.studio-hero');
  function scroll() {
    scrollFrame = 0;
    if (!motion() || !hero) return;
    const b = hero.getBoundingClientRect();
    hero.style.setProperty('--hero-progress', Math.min(1, Math.max(.35, .72 - b.top / b.height * .3)));
  }
  addEventListener('scroll', () => { if (!scrollFrame && motion()) scrollFrame=requestAnimationFrame(scroll); }, {passive:true});
  function settleMotion() {
    if (!motion()) {
      settleWord();
      if (!root.classList.contains('studio-entered')) finishEntrance();
    }
  }
  new MutationObserver(settleMotion).observe(root,{attributes:true,attributeFilter:['class']});
  reduced.addEventListener('change',settleMotion);
  document.addEventListener('visibilitychange', () => {if(document.hidden)settleWord();});
})();
