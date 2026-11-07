/* A lit, twisted ribbon sculpture, rendered locally without a 3D dependency. */
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
  const add = (a,b) => a.map((v,i)=>v+b[i]);
  const sub = (a,b) => a.map((v,i)=>v-b[i]);
  const mul = (a,s) => a.map(v=>v*s);
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const unit = a => mul(a,1/(Math.hypot(...a)||1));
  const dot = (a,b) => a.reduce((sum,n,i)=>sum+n*b[i],0);
  const mix = (a,b,t) => a.map((v,i)=>v*(1-t)+b[i]*t);
  const tau = Math.PI*2;
  const palette = [[255,116,89],[255,153,219],[171,139,255],[215,255,96],[255,116,89]];
  let width=0,height=0,scale=1,inView=false,raf=0,previous=0,phase=0;
  let pointerX=0,pointerY=0,targetX=0,targetY=0;
  const allowed = () => inView && !document.hidden && !root.classList.contains('paused') && !reduced.matches;

  // A three-lobed centreline and a flattened, twisting cross-section form a
  // continuous solid ribbon. The open centre leaves room for the portrait.
  function centre(t) {
    const radius=.91+.12*Math.sin(t*3+.4)+.035*Math.cos(t*5);
    return [Math.cos(t)*radius,Math.sin(t)*radius*1.06,.24*Math.sin(t*3-.65)];
  }
  function material(t) {
    const index=((t/tau+.12)%1)*4;
    const i=Math.floor(index),f=index-i;
    return mix(palette[i],palette[i+1],f*f*(3-2*f));
  }
  const mesh=[];
  const rings=80,sides=10;
  const sections=Array.from({length:rings},(_,i)=>{
    const t=i/rings*tau,p=centre(t);
    const tangent=unit(sub(centre(t+.008),centre(t-.008)));
    const outward=unit([Math.cos(t),Math.sin(t),0]);
    const side=unit(cross(tangent,outward));
    const across=unit(cross(side,tangent));
    const twist=t*2+.8;
    const a=add(mul(across,Math.cos(twist)),mul(side,Math.sin(twist)));
    const b=add(mul(side,Math.cos(twist)),mul(across,-Math.sin(twist)));
    const breadth=.135+.025*Math.sin(t*2-.4);
    return Array.from({length:sides},(_,j)=>{
      const angle=j/sides*tau;
      return add(p,add(mul(a,Math.cos(angle)*breadth),mul(b,Math.sin(angle)*.055)));
    });
  });
  for(let i=0;i<rings;i++) {
    for(let j=0;j<sides;j++) {
      mesh.push({points:[sections[i][j],sections[(i+1)%rings][j],sections[(i+1)%rings][(j+1)%sides],sections[i][(j+1)%sides]],color:material(i/rings*tau)});
    }
  }

  // Two small sculptural shards add asymmetry outside the main ribbon.
  function shard(center,size,rotation,color) {
    const points=[[-1,0,0],[0,-.85,.22],[1,0,0],[0,.85,.22],[0,0,-.4],[0,0,.58]].map(([x,y,z])=>[
      center[0]+(x*Math.cos(rotation)-y*Math.sin(rotation))*size,
      center[1]+(x*Math.sin(rotation)+y*Math.cos(rotation))*size,
      center[2]+z*size
    ]);
    for(let i=0;i<4;i++) {
      mesh.push({points:[points[i],points[(i+1)%4],points[5]],color});
      mesh.push({points:[points[(i+1)%4],points[i],points[4]],color});
    }
  }
  shard([.76,-.86,.15],.24,.35,[222,255,116]);
  shard([-.92,.63,.06],.20,-.4,[255,148,215]);

  function rotation() {
    const ax=-.10+Math.sin(phase*.43)*.18+pointerY*.22;
    const ay=.08+Math.sin(phase*.36)*.22+pointerX*.25;
    const az=-.16+phase*.065;
    return [Math.cos(ax),Math.sin(ax),Math.cos(ay),Math.sin(ay),Math.cos(az),Math.sin(az)];
  }
  function rotate(point,m) {
    let [x,y,z]=point;
    [y,z]=[y*m[0]-z*m[1],y*m[1]+z*m[0]];
    [x,z]=[x*m[2]+z*m[3],-x*m[3]+z*m[2]];
    return [x*m[4]-y*m[5],x*m[5]+y*m[4],z];
  }
  function project([x,y,z]) {
    const perspective=4.2/(4.2-z);
    return [width*.5+x*scale*perspective,height*.5+y*scale*perspective];
  }
  function render() {
    if (!width || !height) return;
    ctx.clearRect(0,0,width,height);
    const matrix=rotation();
    const light=unit([-.48,-.7,1]);
    const half=unit(add(light,[0,0,1]));
    const faces=mesh.map(face=>{
      const points=face.points.map(p=>rotate(p,matrix));
      const normal=unit(cross(sub(points[1],points[0]),sub(points[2],points[0])));
      return {points,color:face.color,normal,z:points.reduce((n,p)=>n+p[2],0)/points.length};
    }).sort((a,b)=>a.z-b.z);
    for(const face of faces) {
      // Double-sided lighting keeps the ribbon readable through its twists.
      const n=face.normal[2]<0?mul(face.normal,-1):face.normal;
      const diffuse=Math.max(0,dot(n,light));
      const specular=Math.pow(Math.max(0,dot(n,half)),24)*.78;
      const rim=Math.pow(1-Math.abs(n[2]),3)*.30;
      const amount=.28+diffuse*.72;
      const rgb=face.color.map(v=>Math.round(clamp(v*amount+(specular+rim)*225,0,255)));
      const points=face.points.map(project);
      const gradient=ctx.createLinearGradient(points[0][0],points[0][1],points[2][0],points[2][1]);
      gradient.addColorStop(0,`rgb(${rgb.map(v=>Math.min(255,v+8)).join(',')})`);
      gradient.addColorStop(1,`rgb(${rgb.map(v=>Math.max(0,v-6)).join(',')})`);
      ctx.beginPath();
      points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
      ctx.closePath();
      ctx.fillStyle=gradient;
      ctx.fill();
      // Identical edge colour closes antialiasing seams without wireframe lines.
      ctx.strokeStyle=`rgb(${rgb.join(',')})`;
      ctx.lineWidth=.55;
      ctx.stroke();
    }
  }
  function tick(now) {
    raf=0;
    if(!allowed()){sync();return;}
    const frameInterval=1000/(width<500?24:30);
    if(!previous || now-previous>=frameInterval) {
      const elapsed=previous?Math.min(now-previous,80):0;
      phase+=elapsed*.00065;
      previous=now;
      pointerX+=(targetX-pointerX)*.08;
      pointerY+=(targetY-pointerY)*.08;
      render();
    }
    raf=requestAnimationFrame(tick);
  }
  function sync() {
    const animate=allowed();
    canvas.dataset.motion=animate?'running':'still';
    if(animate) {
      if(!raf){previous=0;raf=requestAnimationFrame(tick);}
    } else {
      cancelAnimationFrame(raf);raf=0;previous=0;
      if(inView&&!document.hidden)render();
    }
  }
  function resize() {
    const box=canvas.getBoundingClientRect();
    width=Math.max(1,box.width);height=Math.max(1,box.height);
    const dpr=Math.min(devicePixelRatio||1,width<500?1.5:1.75);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    scale=Math.min(width,height)*.395;
    render();sync();
  }
  host?.addEventListener('pointermove',event=>{
    if(!allowed()||!fine.matches)return;
    const b=host.getBoundingClientRect();
    targetX=clamp((event.clientX-b.left)/b.width-.5,-.5,.5);
    targetY=clamp((event.clientY-b.top)/b.height-.5,-.5,.5);
  },{passive:true});
  host?.addEventListener('pointerleave',()=>{targetX=0;targetY=0;});
  if('IntersectionObserver'in window)new IntersectionObserver(entries=>{
    inView=entries[0].isIntersecting;sync();
  },{rootMargin:'60px',threshold:0}).observe(canvas);
  else inView=true;
  if('ResizeObserver'in window)new ResizeObserver(resize).observe(canvas);
  else addEventListener('resize',resize,{passive:true});
  new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:['class']});
  reduced.addEventListener('change',sync);
  document.addEventListener('visibilitychange',sync);
  resize();
})();
