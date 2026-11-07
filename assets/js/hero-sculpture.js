/* Original folded-ribbon sculpture. Canvas projection, no 3D dependency. */
(() => {
  'use strict';
  const canvas = document.getElementById('heroSculpture');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', {alpha:true});
  if (!ctx) { canvas.hidden = true; return; }
  const root = document.documentElement;
  const host = canvas.closest('.studio-person') || canvas.parentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  let width = 0, height = 0, scale = 1, inView = false, raf = 0;
  let previous = 0, phase = 0, pointerX = 0, pointerY = 0, targetX = 0, targetY = 0;
  const colors = [[51,83,235],[122,150,255],[229,255,111],[255,109,83]];
  const light = [-.45,-.7,1];
  const allowed = () => inView && !document.hidden && !root.classList.contains('paused') && !reduced.matches;
  const subtract = (a,b) => a.map((v,i)=>v-b[i]);
  const add = (a,b) => a.map((v,i)=>v+b[i]);
  const multiply = (a,s) => a.map(v=>v*s);
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const unit = a => multiply(a,1/(Math.hypot(...a)||1));
  const dot = (a,b) => a.reduce((sum,n,i)=>sum+n*b[i],0);

  // Eight planar folds leave the centre open for the portrait. Uneven depth
  // and a slowly changing camera make the facets read as a solid object.
  const path = [
    [-.86,-.52,-.05],[-.44,-.91,.12],[.46,-.89,-.12],
    [.97,-.28,.08],[.83,.58,.15],[.36,.90,-.10],
    [-.67,.77,.05],[-.96,.11,-.13]
  ];
  const faces = [];
  function ribbon(points, breadth, thickness, palette, twist) {
    const sections = points.map((point,i) => {
      const before = points[(i+points.length-1)%points.length];
      const after = points[(i+1)%points.length];
      const tangent = unit(subtract(after,before));
      const lateral = unit([-tangent[1],tangent[0],0]);
      const binormal = unit(cross(tangent,lateral));
      const angle = twist + (i%2 ? .25 : -.2);
      const wide = add(multiply(lateral,Math.cos(angle)*breadth),multiply(binormal,Math.sin(angle)*breadth));
      const deep = add(multiply(binormal,Math.cos(angle)*thickness),multiply(lateral,-Math.sin(angle)*thickness));
      return [[1,1],[-1,1],[-1,-1],[1,-1]].map(([a,b])=>add(point,add(multiply(wide,a),multiply(deep,b))));
    });
    sections.forEach((section,i) => {
      const next = sections[(i+1)%sections.length];
      for(let edge=0;edge<4;edge++) faces.push({
        points:[section[edge],next[edge],next[(edge+1)%4],section[(edge+1)%4]],
        color:palette[i%palette.length],edge
      });
    });
  }
  ribbon(path,.065,.026,[0,0,1,0,1,0,0,1],.24);
  // A coral folded bracket and lime counterweight give the sculpture an
  // asymmetrical silhouette, unlike a decorative ring around a photo.
  const bracket = [[.25,-.98,.15],[.79,-.91,.06],[1.01,-.58,.12],[.77,-.44,.18],[.56,-.73,.08]];
  ribbon(bracket,.045,.024,[3,3,3,3,3],-.38);
  const wedge = [[-.99,.36,.08],[-.71,.43,.23],[-.61,.90,.14],[-.86,.95,-.02],[-1.07,.63,.04]];
  ribbon(wedge,.046,.023,[2,2,2,2,2],.5);

  function rotate(point) {
    const ax = -.12 + Math.sin(phase*.52)*.085 + pointerY*.10;
    const ay = -.18 + Math.sin(phase*.38)*.17 + pointerX*.15;
    const az = -.06 + Math.sin(phase*.27)*.035;
    let [x,y,z] = point;
    [y,z] = [y*Math.cos(ax)-z*Math.sin(ax),y*Math.sin(ax)+z*Math.cos(ax)];
    [x,z] = [x*Math.cos(ay)+z*Math.sin(ay),-x*Math.sin(ay)+z*Math.cos(ay)];
    [x,y] = [x*Math.cos(az)-y*Math.sin(az),x*Math.sin(az)+y*Math.cos(az)];
    return [x,y,z];
  }
  function project([x,y,z]) {
    const perspective = 3.6/(3.6-z);
    return [width*.5+x*scale*perspective,height*.5+y*scale*perspective];
  }
  function render() {
    if (!width || !height) return;
    ctx.clearRect(0,0,width,height);
    const transformed = faces.map(face => {
      const points = face.points.map(rotate);
      return {...face,points,z:points.reduce((sum,p)=>sum+p[2],0)/points.length};
    }).sort((a,b)=>a.z-b.z);
    for (const face of transformed) {
      const normal = unit(cross(subtract(face.points[1],face.points[0]),subtract(face.points[2],face.points[0])));
      const lit = .65 + .35*Math.abs(dot(normal,unit(light)));
      const tint = face.edge===0 ? 1.12 : face.edge===2 ? .74 : .94;
      const rgb = colors[face.color].map(v=>Math.round(clamp(v*lit*tint,0,255)));
      const points = face.points.map(project);
      const gradient = ctx.createLinearGradient(points[0][0],points[0][1],points[2][0],points[2][1]);
      gradient.addColorStop(0,`rgb(${rgb.map(v=>Math.min(255,v+24)).join(',')})`);
      gradient.addColorStop(1,`rgb(${rgb.join(',')})`);
      ctx.beginPath();
      points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
      ctx.closePath();
      ctx.fillStyle=gradient;
      ctx.fill();
      ctx.lineWidth=.65;
      ctx.strokeStyle=face.edge===0?'rgba(255,255,255,.46)':'rgba(24,32,65,.12)';
      ctx.stroke();
    }
  }
  function tick(now) {
    raf=0;
    if (!allowed()) {sync();return;}
    if (!previous || now-previous>=1000/30) {
      const elapsed=previous?Math.min(now-previous,80):0;
      phase+=elapsed*.00055;
      previous=now;
      pointerX+=(targetX-pointerX)*.065;
      pointerY+=(targetY-pointerY)*.065;
      render();
    }
    raf=requestAnimationFrame(tick);
  }
  function sync() {
    const animate=allowed();
    canvas.dataset.motion=animate?'running':'still';
    if (animate) {
      if (!raf) {previous=0;raf=requestAnimationFrame(tick);}
    } else {
      cancelAnimationFrame(raf);raf=0;previous=0;
      // Keep the last composition when paused; the layout never shifts.
      if (inView && !document.hidden) render();
    }
  }
  function resize() {
    const box=canvas.getBoundingClientRect();
    width=Math.max(1,box.width);height=Math.max(1,box.height);
    const dpr=Math.min(devicePixelRatio||1,1.75);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    scale=Math.min(width,height)*.44;
    render();sync();
  }
  host?.addEventListener('pointermove',event=>{
    if (!allowed() || !fine.matches) return;
    const b=host.getBoundingClientRect();
    targetX=clamp((event.clientX-b.left)/b.width-.5,-.5,.5);
    targetY=clamp((event.clientY-b.top)/b.height-.5,-.5,.5);
  },{passive:true});
  host?.addEventListener('pointerleave',()=>{targetX=0;targetY=0;});
  if ('IntersectionObserver' in window) new IntersectionObserver(entries=>{
    inView=entries[0].isIntersecting;sync();
  },{rootMargin:'60px',threshold:0}).observe(canvas);
  else inView=true;
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
  else addEventListener('resize',resize,{passive:true});
  new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:['class']});
  reduced.addEventListener('change',sync);
  document.addEventListener('visibilitychange',sync);
  resize();
})();
