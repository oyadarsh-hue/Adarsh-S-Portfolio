/* Scroll choreographs the film chamber; the native reel retains playback control. */
(() => {
  'use strict';
  const section = document.getElementById('showreel');
  const video = document.getElementById('projectReel');
  const stage = section?.querySelector('.reel-stage');
  if (!section || !video || !stage) return;
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const allowed = () => !root.classList.contains('paused') && !root.classList.contains('motion-paused') && !reduced.matches;
  const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
  const field = document.createElement('div');
  field.className = 'cinema-letterfield';
  field.setAttribute('aria-hidden','true');
  field.innerHTML = '<span class="cinema-word cinema-word--ideas">IMAGINE</span><span class="cinema-word cinema-word--motion">IN MOTION</span><span class="cinema-coordinate">VISUAL STORIES / HUMAN PURPOSE</span>';
  section.prepend(field);

  const chamber = document.createElement('div');
  chamber.className = 'cinema-chamber';
  stage.before(chamber);
  chamber.innerHTML = '<div class="cinema-architecture" aria-hidden="true"><div class="cinema-floor"></div><div class="cinema-frame cinema-frame--back"></div><div class="cinema-frame cinema-frame--front"></div></div><div class="cinema-index" aria-hidden="true"><i></i><span>THE MOTION GALLERY</span><b>01—05</b></div>';
  chamber.append(stage);

  // This UI mirrors actual media time. It does not start, seek, or pause the reel.
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
    // Stable document geometry keeps transformations from feeding their own measurements.
    const enter = clamp((vh*.9 - box.top)/(vh*.8),0,1);
    const travel = clamp((vh-box.top)/(box.height+vh),0,1);
    const tilt = 1-enter;
    const mobile = innerWidth < 700;
    section.style.setProperty('--cinema-scale',(.8 + enter*.2).toFixed(4));
    section.style.setProperty('--cinema-cut',`${(tilt*2).toFixed(3)}%`);
    section.style.setProperty('--cinema-tilt',`${(tilt*(mobile?13:24)).toFixed(3)}deg`);
    section.style.setProperty('--cinema-yaw',`${(tilt*(mobile?-6:-15)).toFixed(3)}deg`);
    section.style.setProperty('--cinema-roll',`${(tilt*-3).toFixed(3)}deg`);
    section.style.setProperty('--cinema-left',`${(6-travel*34).toFixed(3)}vw`);
    section.style.setProperty('--cinema-right',`${(-12+travel*40).toFixed(3)}vw`);
    section.style.setProperty('--cinema-travel',travel.toFixed(4));
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
