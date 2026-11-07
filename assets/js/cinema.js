/* Scroll direction controls composition, never the user's media playback. */
(() => {
  'use strict';
  const section = document.getElementById('showreel');
  const video = document.getElementById('projectReel');
  if (!section || !video) return;
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const allowed = () => !root.classList.contains('paused') && !reduced.matches;
  const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
  const field = document.createElement('div');
  field.className = 'cinema-letterfield';
  field.setAttribute('aria-hidden','true');
  field.innerHTML = '<span class="cinema-word cinema-word--ideas">IDEAS</span><span class="cinema-word cinema-word--motion">IN MOTION</span><span class="cinema-sunburst"><svg viewBox="0 0 100 100" focusable="false"><path d="M50 0 56 33 75 7 67 38 93 25 73 45 100 50 73 56 93 75 66 64 75 93 56 73 50 100 44 73 25 93 35 65 7 75 27 56 0 50 27 44 7 25 35 36 25 7 44 33Z"/></svg></span>';
  section.prepend(field);

  // The display mirrors the video's real time; it is not a separate animation.
  const timecode = section.querySelector('.reel-controls>span');
  let clock, total, state;
  if (timecode) {
    timecode.className = 'cinema-timecode';
    timecode.setAttribute('aria-hidden','true');
    timecode.innerHTML = '<span><span class="cinema-clock">00:00</span> <span class="cinema-total">/ 00:16</span></span><span class="cinema-state">READY</span>';
    clock = timecode.querySelector('.cinema-clock');
    total = timecode.querySelector('.cinema-total');
    state = timecode.querySelector('.cinema-state');
  }
  const format = value => {
    const seconds = Math.max(0,Math.floor(Number.isFinite(value)?value:0));
    return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
  };
  function updateTime() {
    if (!clock) return;
    clock.textContent = format(video.currentTime);
    if (Number.isFinite(video.duration) && video.duration>0) total.textContent = `/ ${format(video.duration)}`;
    state.textContent = video.paused ? 'PAUSED' : 'PLAYING';
  }
  ['timeupdate','loadedmetadata','play','pause','ended'].forEach(event => video.addEventListener(event,updateTime));

  let frame = 0;
  let onScreen = true;
  function render() {
    frame = 0;
    if (!allowed() || document.hidden || !onScreen) return;
    const box = section.getBoundingClientRect();
    const vh = innerHeight;
    // Measure the fixed document section, never the transformed video stage.
    const enter = clamp((vh*.9 - box.top)/(vh*.8),0,1);
    const travel = clamp((vh-box.top)/(box.height+vh),0,1);
    section.style.setProperty('--cinema-scale',(.8 + enter*.2).toFixed(4));
    section.style.setProperty('--cinema-cut',`${((1-enter)*5).toFixed(3)}%`);
    section.style.setProperty('--cinema-tilt',`${((1-enter)*8).toFixed(3)}deg`);
    section.style.setProperty('--cinema-left',`${(-4-travel*23).toFixed(3)}vw`);
    section.style.setProperty('--cinema-right',`${(-7+travel*31).toFixed(3)}vw`);
    section.style.setProperty('--cinema-rotation',`${(-18+travel*95).toFixed(3)}deg`);
  }
  function schedule() {
    if (!frame && allowed() && !document.hidden && onScreen) frame=requestAnimationFrame(render);
  }
  addEventListener('scroll',schedule,{passive:true});
  addEventListener('resize',schedule,{passive:true});
  document.addEventListener('visibilitychange',schedule);
  new MutationObserver(schedule).observe(root,{attributes:true,attributeFilter:['class']});
  reduced.addEventListener('change',schedule);
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    onScreen=entries[0].isIntersecting;
    if (onScreen) schedule();
  },{rootMargin:'120px',threshold:0}).observe(section);
  schedule();
})();
