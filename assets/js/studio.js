(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const motion = () => !root.classList.contains('paused') && !reduced.matches;
  const book = document.querySelector('.role-notebook');
  const front = document.getElementById('prismRole');
  const under = document.getElementById('nextRole');
  const counter = document.getElementById('notebookCount');
  const roles = ['software.', 'intelligence.', 'purpose.'];
  let active = 0, turning = false, turnTimer;
  function finishTurn() {
    clearTimeout(turnTimer);
    if (!turning) return;
    active = (active + 1) % roles.length;
    front.textContent = roles[active];
    book.dataset.role = String(active);
    counter.textContent = `${String(active+1).padStart(2,'0')} / 03`;
    book.classList.remove('is-flipping');
    under.textContent = roles[(active+1)%roles.length];
    turning = false;
  }
  setInterval(() => {
    if (!book || !motion() || document.hidden || turning) return;
    const bounds = book.getBoundingClientRect();
    if (bounds.bottom < 0 || bounds.top > innerHeight) return;
    turning = true;
    book.classList.add('is-flipping');
    turnTimer = setTimeout(finishTurn, 920);
  }, 4200);
  const clock = document.getElementById('localClock');
  const time = () => { if (clock) clock.textContent = new Intl.DateTimeFormat('en-IN',{timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit'}).format(new Date()); };
  time(); setInterval(time,60000);
  const dialog = document.getElementById('abilityDialog');
  const opener = document.getElementById('abilityOpen');
  opener?.addEventListener('click', () => dialog.showModal());
  document.getElementById('abilityClose')?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('close', () => opener.focus({preventScroll:true}));
  dialog?.addEventListener('click', event => { if(event.target === dialog) { const b=dialog.getBoundingClientRect(); if(event.clientX<b.left || event.clientX>b.right || event.clientY<b.top || event.clientY>b.bottom) dialog.close(); } });
  const cord = document.getElementById('themeCord');
  cord?.addEventListener('click', () => {
    document.getElementById('themeButton').click();
    cord.classList.remove('pulled');
    requestAnimationFrame(() => cord.classList.add('pulled'));
  });
  cord?.addEventListener('animationend', () => cord.classList.remove('pulled'));
  const person = document.querySelector('.studio-person');
  const hero = document.querySelector('.studio-hero');
  let frame = 0;
  function scroll() {
    frame = 0;
    if(!motion() || !person) return;
    const box = hero.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, -box.top / box.height));
    person.style.setProperty('--person-shift',`${-p*45}px`);
  }
  addEventListener('scroll', () => {if(!frame) frame=requestAnimationFrame(scroll);},{passive:true});
  new MutationObserver(() => {if(!motion()) finishTurn();}).observe(root,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange', () => {if(document.hidden)finishTurn();});
})();
