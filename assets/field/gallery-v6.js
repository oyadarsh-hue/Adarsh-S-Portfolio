(() => {
  'use strict';
  const base=new URL('../frames-v6/',document.currentScript.src);
  const strip=document.querySelector('.plate-grid');
  if (strip) {
    const nav=document.querySelector('.plate-controls');
    const [prev,next]=nav.querySelectorAll('button');
    function update() {
      prev.disabled=strip.scrollLeft<2;
      next.disabled=strip.scrollLeft+strip.clientWidth>=strip.scrollWidth-2;
    }
    [prev,next].forEach((b,i)=>b.addEventListener('click',()=>{
      const step=strip.firstElementChild.getBoundingClientRect().width+parseFloat(getComputedStyle(strip).columnGap);
      const still=document.documentElement.classList.contains('paused')||matchMedia('(prefers-reduced-motion: reduce)').matches;
      strip.scrollBy({left:(i?1:-1)*step,behavior:still?'instant':'smooth'});
    }));
    strip.addEventListener('click',event=>{
      const link=event.target.closest('.plate-link');
      if(!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)return;
      const card=document.getElementById(link.hash.slice(1));
      if(!card || card.getClientRects().length)return;
      const input=document.getElementById('projectSearch');
      if(input?.value){input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));}
      if(!card.getClientRects().length)document.querySelector('[data-project-filter="all"]')?.click();
    });
    strip.addEventListener('scroll',update,{passive:true});window.addEventListener('resize',update);update();
  }
  const cards=Array.from(document.querySelectorAll('figure.screen-card[data-clip]'));
  if (!cards.length) return;
  function showSheet(row) {
    const url = row.dataset.documentarySheet ? new URL(row.dataset.documentarySheet, document.baseURI) : new URL(row.dataset.sheet+'.webp',base);
    if (row.dataset.sheet === 'journey') url.searchParams.set('v', '8');
    row.style.setProperty('--sheet','url("'+url.href+'")');
  }
  const near='IntersectionObserver' in window ? new IntersectionObserver(entries=>{
    for(const e of entries) if(e.isIntersecting){showSheet(e.target);near.unobserve(e.target);}
  },{rootMargin:'500px 0px'}) : null;
  fetch(new URL('frames.json',base)).then(r=>r.ok?r.json():{}).then(data=>{
    for (const card of cards) {
      const slug=card.dataset.clip;
      const starts=data[slug];
      if (!starts) continue;
      const video=card.querySelector('video');
      const group=document.createElement('div');group.className='film-stills';
      const title=document.createElement('p');title.textContent='Play from a frame';
      const options=document.createElement('div');options.className='still-options';
      group.append(title,options);options.dataset.sheet=slug;
      if(card.dataset.documentarySheet)options.dataset.documentarySheet=card.dataset.documentarySheet;
      let requested=null;
      const buttons=starts.map((time,i)=>{
        const button=document.createElement('button');
        button.type='button';
        const stamp=Math.floor(time/60)+':'+String(Math.floor(time)%60).padStart(2,'0');
        button.setAttribute('aria-label','Play '+video.getAttribute('aria-label')+' from '+stamp);
        button.dataset.frameTime=time;
        button.style.backgroundPosition=(i*50)+'% center';
        const label=document.createElement('span');label.textContent=stamp;button.append(label);
        button.addEventListener('click',()=>{
          requested=time;
          if (video.readyState>=1){video.currentTime=time;requested=null;}
          video.play().catch(()=>{});
        });
        options.append(button);
        return button;
      });
      video.addEventListener('loadedmetadata',()=>{if(requested!==null){video.currentTime=requested;requested=null;}});
      video.addEventListener('timeupdate',()=>{
        const i=starts.findLastIndex(t=>t<=video.currentTime+.05);
        buttons.forEach((b,j)=>j===i?b.setAttribute('aria-current','true'):b.removeAttribute('aria-current'));
      });
      card.querySelector('figcaption').after(group);
      const edition=card.querySelector('.screen-quality select');
      if(edition?.querySelector('option[value="photo"]')) {
        const updateStills=()=>{group.hidden=edition.value==='photo';};
        edition.addEventListener('change',updateStills);
        updateStills();
      }
      if(near)near.observe(options);else showSheet(options);
    }
  }).catch(()=>{ /* The native video controls still provide seeking. */ });
})();
