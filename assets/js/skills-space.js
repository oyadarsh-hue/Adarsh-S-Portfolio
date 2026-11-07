/* Spatial toolkit: native links and complete static content remain available. */
(() => {
  'use strict';
  const section = document.getElementById('skills');
  const originalGrid = section?.querySelector('.skill-grid');
  if (!section || !originalGrid) return;
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(pointer: fine)');
  const canMove = () => !reduced.matches && !root.classList.contains('paused') && !root.classList.contains('motion-paused');
  const groups = [
    { id:'build', label:'Engineering', title:'From an idea<br>to an interface.', mark:'&lt;/&gt;', color:'#9b88ff', label2:'BUILD / CONNECT', number:'01', subtitle:'FULL-STACK ENGINEERING', description:'Interfaces, application logic and APIs. Connecting the pieces that turn an idea into usable software.', tools:['Python','JavaScript','SQL','React','Django','Flask','Node.js','REST APIs','HTML / CSS'], project:'QuietNote', note:'An expiring, revocable note-sharing application.', href:'projects/quietnote.html', secondary:'AssentTag', href2:'projects/assenttag.html' },
    { id:'vision', label:'Intelligence', title:'Teach software<br>to see.', mark:'◉', color:'#62e7f0', label2:'SEE / UNDERSTAND', number:'02', subtitle:'AI & COMPUTER VISION', description:'Recognition, image processing and OCR. Exploring how visual information can become useful, human-centred applications.', tools:['OpenCV','Dlib','CNN','PyTorch','TensorFlow','Keras','Scikit-learn','OCR'], project:'AssentTag', note:'Face recognition and selective blurring for photo privacy.', href:'projects/assenttag.html', secondary:'EpigraphiX-AI', href2:'projects/epigraphix-ai.html' },
    { id:'data', label:'Data', title:'Find the signal.<br>Make it useful.', mark:'∷', color:'#ff9e87', label2:'EXPLORE / EXPLAIN', number:'03', subtitle:'DATA & ANALYTICS', description:'Preparation, exploration, visualisation and storage. A practical toolkit for working with data and understanding patterns.', tools:['NumPy','SciPy','Pandas','Matplotlib','Seaborn','MySQL','MongoDB','Python'], project:'EpigraphiX-AI', note:'Explore the image processing and manuscript research system.', href:'projects/epigraphix-ai.html', secondary:'Deciphera', href2:'projects/deciphera.html' },
    { id:'systems', label:'Systems', title:'Build with care.<br>Ship with confidence.', mark:'⌘', color:'#b9e99b', label2:'PROTECT / DELIVER', number:'04', subtitle:'SECURITY & DELIVERY', description:'Source review, identity verification and reproducible delivery. Thinking about the systems around the code, too.', tools:['Git / GitHub','Docker','CI/CD','Linux','Postman','GitHub Actions','OWASP','SHA-256','Merkle trees'], project:'AegisForge-X', note:'Source-security review with traceable evidence.', href:'projects/aegisforge-x.html', secondary:'Deciphera', href2:'projects/deciphera.html' }
  ];
  const space = document.createElement('div');
  space.className = 'skills-space';
  space.innerHTML = `
    <div class="space-tabs" role="tablist" aria-label="Explore capabilities">${groups.map((g,i)=>`<button class="space-tab" type="button" role="tab" id="skill-tab-${g.id}" aria-controls="skill-panel-${g.id}" aria-selected="${i===0}" tabindex="${i===0?0:-1}" data-space-index="${i}" style="--skill-color:${g.color}"><span class="space-tab-index">${g.number}</span>${g.label}<span class="space-tab-arrow" aria-hidden="true">↗</span></button>`).join('')}</div>
    <div class="space-interior">
      <div class="space-visual" aria-hidden="true">
        <div class="space-coordinate"><span>CAPABILITY ARRAY</span><span>4 CONNECTED DISCIPLINES</span></div>
        <div class="space-orbit space-orbit-a"></div><div class="space-orbit space-orbit-b"></div>
        <div class="space-deck">${groups.map((g,i)=>`<div class="space-slab ${i===0?'is-active':''}" data-slab="${i}" style="--skill-color:${g.color};--slab-order:${i}"><div class="space-slab-top"><span>ADARSH / ${g.number}</span><i></i></div><div class="space-emblem"><span>${g.mark}</span><i></i><i></i><i></i></div><div class="space-slab-base"><span>${g.label2}</span><strong>${g.label}</strong><div class="space-slab-line"><span>${g.subtitle}</span><span>↗</span></div></div></div>`).join('')}</div>
        <div class="space-visual-foot"><span class="space-status-dot"></span><span>SELECT A DISCIPLINE TO EXPLORE</span><span class="space-counter">01 / 04</span></div>
      </div>
      <div class="space-panel-stack">${groups.map((g,i)=>`<div class="space-panel" id="skill-panel-${g.id}" role="tabpanel" tabindex="0" aria-labelledby="skill-tab-${g.id}" ${i===0?'':'hidden'} style="--skill-color:${g.color}"><p class="space-panel-label">${g.subtitle}</p><h3>${g.title}</h3><p class="space-description">${g.description}</p><div class="space-tools" aria-label="${g.label} tools">${g.tools.map(t=>`<span>${t}</span>`).join('')}</div><div class="space-proof"><span>EXPLORE THE WORK</span><a href="${g.href}">${g.project}<span aria-hidden="true">↗</span></a><p>${g.note}</p><a class="space-secondary-link" href="${g.href2}">Also explore ${g.secondary} <span aria-hidden="true">→</span></a></div></div>`).join('')}</div>
    </div>`;
  const filters = section.querySelector('.skill-filters');
  const full = document.createElement('details');
  full.className = 'space-complete';
  const summary = document.createElement('summary');
  summary.innerHTML = '<span>Explore the complete toolkit</span><span aria-hidden="true">＋</span>';
  full.append(summary);
  originalGrid.before(space);
  if(filters)full.append(filters);
  full.append(originalGrid);
  space.after(full);
  section.classList.add('skills-spatial');
  const heading = section.querySelector('.section-heading h2');
  if(heading)heading.innerHTML = 'Different tools.<br><span>One connected mind.</span>';
  const headingCopy = section.querySelector('.heading-split > p');
  if(headingCopy)headingCopy.textContent = 'Explore the stack. Follow the work. See how the pieces connect.';
  const tabs = [...space.querySelectorAll('.space-tab')];
  const panels = [...space.querySelectorAll('.space-panel')];
  const slabs = [...space.querySelectorAll('.space-slab')];
  const visual = space.querySelector('.space-visual');
  const counter = space.querySelector('.space-counter');
  let selected = 0;
  function activate(index, focus) {
    selected = (index + groups.length) % groups.length;
    tabs.forEach((tab,i)=>{ tab.setAttribute('aria-selected',String(i===selected));tab.tabIndex=i===selected?0:-1; });
    panels.forEach((panel,i)=>{panel.hidden=i!==selected;});
    slabs.forEach((slab,i)=>{
      slab.classList.toggle('is-active',i===selected);
      slab.style.setProperty('--relative-order',String((i-selected+groups.length)%groups.length));
    });
    space.dataset.selected=groups[selected].id;
    visual.style.setProperty('--active-color',groups[selected].color);
    counter.textContent=`0${selected+1} / 04`;
    if(focus)tabs[selected].focus();
  }
  tabs.forEach((tab,i)=>{
    tab.addEventListener('click',()=>activate(i,false));
    tab.addEventListener('keydown',event=>{
      let next;
      if(event.key==='ArrowRight')next=selected+1;
      else if(event.key==='ArrowLeft')next=selected-1;
      else if(event.key==='Home')next=0;
      else if(event.key==='End')next=groups.length-1;
      else return;
      event.preventDefault();activate(next,true);
    });
  });
  let raf=0,latestX=0,latestY=0;
  function resetTilt(){cancelAnimationFrame(raf);raf=0;visual.style.setProperty('--deck-x','0deg');visual.style.setProperty('--deck-y','0deg');}
  visual.addEventListener('pointermove',event=>{
    if(!canMove()||!fine.matches)return;
    const rect=visual.getBoundingClientRect();
    latestX=((event.clientX-rect.left)/rect.width-.5)*12;
    latestY=(.5-(event.clientY-rect.top)/rect.height)*8;
    if(!raf)raf=requestAnimationFrame(()=>{raf=0;visual.style.setProperty('--deck-x',`${latestY.toFixed(2)}deg`);visual.style.setProperty('--deck-y',`${latestX.toFixed(2)}deg`);});
  },{passive:true});
  visual.addEventListener('pointerleave',resetTilt);
  function syncMotion(){if(!canMove())resetTilt();space.classList.toggle('space-motion-off',!canMove());}
  new MutationObserver(syncMotion).observe(root,{attributes:true,attributeFilter:['class']});
  reduced.addEventListener('change',syncMotion);
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{
    space.classList.toggle('space-inview',entries[0].isIntersecting);
    if(!entries[0].isIntersecting)resetTilt();
  },{threshold:.12}).observe(space);
  else space.classList.add('space-inview');
  activate(0,false);syncMotion();
})();
