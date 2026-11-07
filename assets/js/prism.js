/* Lightweight accents. All page content and navigation work without this file. */
(() => {
  'use strict';
  const root = document.documentElement;
  const role = document.getElementById('prismRole');
  const counter = document.querySelector('.role-count');
  const roles = ['Software developer', 'Full-stack builder', 'Vision enthusiast'];
  let index = 0;
  const motion = () => !root.classList.contains('paused') && !document.hidden;
  if (role) window.setInterval(() => {
    if (!motion()) return;
    index = (index + 1) % roles.length;
    role.classList.remove('changing');
    role.textContent = roles[index];
    counter.textContent = `${String(index + 1).padStart(2, '0')} / 03`;
    requestAnimationFrame(() => role.classList.add('changing'));
  }, 4200);
  const clock = document.getElementById('localClock');
  function updateClock() {
    if (clock) clock.textContent = new Intl.DateTimeFormat('en-IN', {timeZone:'Asia/Kolkata', hour:'2-digit', minute:'2-digit'}).format(new Date()).toUpperCase();
  }
  updateClock();
  window.setInterval(updateClock, 60000);
})();
