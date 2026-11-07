(() => {
  'use strict';
  const root=document.documentElement,hero=document.querySelector('.studio-hero'),divider=document.querySelector('.creative-divider');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(hover:hover) and (pointer:fine)');
  let frame=0,pointerFrame=0;
  const allowed=()=>!reduced.matches&&!root.classList.contains('paused');
  function draw(){frame=0;if(!allowed()||!divider)return;const b=divider.getBoundingClientRect();if(b.bottom<0||b.top>innerHeight)return;const p=Math.max(0,Math.min(1,(innerHeight-b.top)/(innerHeight+b.height)));divider.style.setProperty('--divider-x',`${-p*320}px`);divider.style.setProperty('--divider-turn',`${p*120}deg`);}
  function queue(){if(!frame&&allowed())frame=requestAnimationFrame(draw);}
  addEventListener('scroll',queue,{passive:true});addEventListener('resize',queue,{passive:true});
  hero?.addEventListener('pointermove',e=>{if(!allowed()||!fine.matches||pointerFrame)return;const x=e.clientX,y=e.clientY;pointerFrame=requestAnimationFrame(()=>{pointerFrame=0;const b=hero.getBoundingClientRect();hero.style.setProperty('--pointer-x',`${(x-b.left)/b.width*100}%`);hero.style.setProperty('--pointer-y',`${(y-b.top)/b.height*100}%`);});},{passive:true});
  new MutationObserver(queue).observe(root,{attributes:true,attributeFilter:['class']});reduced.addEventListener('change',queue);queue();
})();
