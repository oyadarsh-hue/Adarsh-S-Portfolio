/* A dependency-free WebGL sculpture: polished ribbon, orbital wire and optical crystals. */
(() => {
  'use strict';
  let canvas = document.getElementById('heroSculpture');
  if (!canvas) return;
  const root = document.documentElement;
  const host = canvas.closest('.studio-person') || canvas.parentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const tau = Math.PI * 2;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const add = (a, b) => a.map((v, i) => v + b[i]);
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const mul = (a, n) => a.map(v => v * n);
  const cross = (a, b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const normal = a => mul(a, 1 / (Math.hypot(...a) || 1));
  let width = 1, height = 1, inView = false, raf = 0, previous = 0;
  let phase = .4, age = 0, pointerX = 0, pointerY = 0, targetX = 0, targetY = 0, scroll = 0, targetScroll = 0;
  let contextLost = false;
  const allowed = () => inView && !document.hidden && !contextLost && !root.classList.contains('paused') && !root.classList.contains('motion-paused') && !reduced.matches;

  // Smooth normals are sampled from the actual swept surface, so its flattened
  // edges catch softbox reflections continuously rather than exposing facets.
  function surface(t, a, kind) {
    if (kind === 1) return [Math.cos(t) * (1.22 + Math.cos(a)*.014), Math.sin(t) * (1.37 + Math.cos(a)*.014), .32 * Math.cos(t + .6) + Math.sin(a)*.014];
    const centre = u => {
      const radius = 1.04 + .135 * Math.sin(u*3+.7) + .035 * Math.sin(u*5);
      return [Math.cos(u) * radius, Math.sin(u) * radius * 1.15, .26 * Math.sin(u*3-.35)];
    };
    const p = centre(t), tangent = normal(sub(centre(t+.001), centre(t-.001)));
    const binormal = normal(cross(tangent, [Math.cos(t), Math.sin(t), 0]));
    const side = normal(cross(binormal, tangent));
    const twist = t * 2 + .4;
    const aAxis = add(mul(side, Math.cos(twist)), mul(binormal, Math.sin(twist)));
    const bAxis = add(mul(binormal, Math.cos(twist)), mul(side, -Math.sin(twist)));
    return add(p, add(mul(aAxis, Math.cos(a)*(.115+.026*Math.sin(t*2))), mul(bAxis, Math.sin(a)*.042)));
  }
  function makeRibbon(kind) {
    const vertices = [], indices = [], segments = kind ? 144 : 192, sides = kind ? 8 : 20;
    for (let i = 0; i <= segments; i++) {
      for (let j = 0; j <= sides; j++) {
        const t = i/segments*tau, a = j/sides*tau, p = surface(t,a,kind);
        const n = normal(cross(sub(surface(t+.001,a,kind),surface(t-.001,a,kind)), sub(surface(t,a+.001,kind),surface(t,a-.001,kind))));
        vertices.push(...p, ...n, t/tau, kind);
        if (i<segments && j<sides) {
          const k=i*(sides+1)+j;
          indices.push(k,k+sides+1,k+1,k+1,k+sides+1,k+sides+2);
        }
      }
    }
    return {vertices, indices};
  }
  function makeCrystals() {
    const vertices = [], indices = [];
    const points = [[0,.29,0],[.17,.06,.15],[-.17,.06,.15],[-.17,.06,-.15],[.17,.06,-.15],[0,-.23,0]];
    const faces = [[0,1,2],[0,2,3],[0,3,4],[0,4,1],[5,2,1],[5,3,2],[5,4,3],[5,1,4]];
    const locations = [[1.1,.88,.25,.9],[-1.06,-.95,.15,.8],[-1.16,.61,-.15,.42]];
    for (const [cx,cy,cz,s] of locations) {
      for (const face of faces) {
        const p = face.map(i => add(mul(points[i],s),[cx,cy,cz]));
        const n = normal(cross(sub(p[1],p[0]),sub(p[2],p[0])));
        const start = vertices.length/8;
        p.forEach(v => vertices.push(...v,...n,(cx+1.2)/2.4,2));
        indices.push(start,start+1,start+2);
      }
    }
    return {vertices,indices};
  }

  const vertexSource = `
    precision highp float;
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    attribute vec2 aMaterial;
    uniform mat3 uRotation;
    uniform float uAspect;
    uniform float uTime;
    uniform float uScale;
    uniform float uScroll;
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec2 vMaterial;
    void main() {
      vec3 p=aPosition;
      float motion=sin(uTime*.55+aMaterial.x*6.283185);
      if (aMaterial.y<.5) {
        p.xy*=1.0+motion*.016+uScroll*.05;
        p.z+=sin(aMaterial.x*18.84955+uTime*.35)*.022;
      } else if(aMaterial.y>1.5) {
        p.y+=sin(uTime*.8+aMaterial.x*7.0)*.055;
      }
      p=uRotation*p*uScale;
      vPosition=p;
      vNormal=normalize(uRotation*aNormal);
      vMaterial=aMaterial;
      float camera=4.8-p.z;
      gl_Position=vec4(p.x*3.12/uAspect,p.y*3.12,((camera-1.0)/7.0)*2.0-1.0,camera);
    }
  `;
  const fragmentSource = `
    precision mediump float;
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec2 vMaterial;
    uniform float uTime;
    vec3 environment(vec3 r) {
      vec3 midnight=vec3(.024,.03,.065);
      vec3 violet=vec3(.40,.20,.86);
      vec3 cyan=vec3(.20,.80,.88);
      vec3 coral=vec3(1.0,.46,.33);
      vec3 light=mix(midnight,vec3(.23,.28,.40),smoothstep(-.35,.8,r.y));
      light+=violet*pow(max(0.0,dot(r,normalize(vec3(-.8,.3,.5)))),4.0)*1.6;
      light+=cyan*pow(max(0.0,dot(r,normalize(vec3(.85,.3,.25)))),7.0)*1.5;
      light+=coral*pow(max(0.0,dot(r,normalize(vec3(-.2,-.8,.35)))),8.0)*1.1;
      // Broad photographic light strips create the unmistakable chrome finish.
      float softbox=pow(max(0.0,dot(r,normalize(vec3(-.32,.88,1.0)))),26.0);
      float edge=pow(max(0.0,dot(r,normalize(vec3(.85,-.15,.7)))),58.0);
      light+=vec3(1.15,1.19,1.3)*softbox*2.0+vec3(.7,1.2,1.35)*edge*2.4;
      float band=pow(max(0.0,1.0-abs(r.y-.25)*4.0),18.0);
      light+=vec3(.72,.7,.95)*band*.25;
      return light;
    }
    void main() {
      vec3 N=normalize(vNormal);
      vec3 V=normalize(vec3(0.0,0.0,4.8)-vPosition);
      if(dot(N,V)<0.0)N=-N;
      vec3 R=reflect(-V,N);
      float facing=max(dot(N,V),0.0);
      float fresnel=pow(1.0-facing,3.0);
      vec3 colour=environment(R);
      vec3 film=.55+.45*cos(vec3(.0,2.1,4.2)+facing*8.0+vMaterial.x*5.0+uTime*.08);
      colour=mix(colour,colour*film*1.65,.23+fresnel*.22);
      colour+=vec3(.16,.09,.25)*max(dot(N,normalize(vec3(-.5,.9,1.0))),0.0);
      colour+=vec3(.26,.65,.8)*fresnel*.19;
      if(vMaterial.y>.5&&vMaterial.y<1.5)colour=mix(colour,vec3(.42,.55,.9),.2)*.82;
      if(vMaterial.y>1.5){
        colour=environment(R)*.75+film*.13+vec3(.18,.25,.4)*fresnel;
        colour+=vec3(.8,.94,1.0)*pow(max(dot(N,normalize(vec3(-.4,.8,1.0))),0.0),45.0)*1.4;
      }
      colour=colour/(colour+vec3(.78));
      colour=pow(colour,vec3(.4545));
      gl_FragColor=vec4(colour,1.0);
    }
  `;

  function webglRenderer() {
    const gl = canvas.getContext('webgl', {alpha:true,antialias:true,premultipliedAlpha:false,preserveDrawingBuffer:true,powerPreference:'low-power'});
    if (!gl) return null;
    function shader(type,source) {
      const s=gl.createShader(type); gl.shaderSource(s,source); gl.compileShader(s);
      if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) {gl.deleteShader(s);throw new Error('Shader unavailable');}
      return s;
    }
    const program=gl.createProgram();
    gl.attachShader(program,shader(gl.VERTEX_SHADER,vertexSource));
    gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragmentSource));
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Renderer unavailable');
    gl.useProgram(program);
    const aPosition=gl.getAttribLocation(program,'aPosition'), aNormal=gl.getAttribLocation(program,'aNormal'), aMaterial=gl.getAttribLocation(program,'aMaterial');
    const uniforms=Object.fromEntries(['uRotation','uAspect','uTime','uScale','uScroll'].map(n=>[n,gl.getUniformLocation(program,n)]));
    const meshes=[makeRibbon(0),makeRibbon(1),makeCrystals()].map(data=>{
      const vertex=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vertex);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data.vertices),gl.STATIC_DRAW);
      const index=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(data.indices),gl.STATIC_DRAW);
      return {vertex,index,count:data.indices.length};
    });
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(0,0,0,0);
    canvas.dataset.renderer='webgl';
    return {
      resize(){gl.viewport(0,0,canvas.width,canvas.height);},
      draw(){
        gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
        const ax=.06+Math.sin(phase*.19)*.14+pointerY*.18-scroll*.26;
        const ay=-.12+Math.cos(phase*.16)*.18+pointerX*.24+scroll*.34;
        const az=-.12+Math.sin(phase*.13)*.13+scroll*.15;
        const cx=Math.cos(ax),sx=Math.sin(ax),cy=Math.cos(ay),sy=Math.sin(ay),cz=Math.cos(az),sz=Math.sin(az);
        gl.uniformMatrix3fv(uniforms.uRotation,false,new Float32Array([cy*cz,cy*sz,-sy,sx*sy*cz-cx*sz,sx*sy*sz+cx*cz,sx*cy,cx*sy*cz+sx*sz,cx*sy*sz-sx*cz,cx*cy]));
        gl.uniform1f(uniforms.uAspect,width/height);
        gl.uniform1f(uniforms.uTime,phase);
        gl.uniform1f(uniforms.uScroll,scroll);
        gl.uniform1f(uniforms.uScale,Math.min(1,width/height*.98)*(.94+.06*(1-Math.pow(1-clamp(age/1800,0,1),3))));
        for(const mesh of meshes){
          gl.bindBuffer(gl.ARRAY_BUFFER,mesh.vertex);
          gl.enableVertexAttribArray(aPosition);gl.vertexAttribPointer(aPosition,3,gl.FLOAT,false,32,0);
          gl.enableVertexAttribArray(aNormal);gl.vertexAttribPointer(aNormal,3,gl.FLOAT,false,32,12);
          gl.enableVertexAttribArray(aMaterial);gl.vertexAttribPointer(aMaterial,2,gl.FLOAT,false,32,24);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.index);gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0);
        }
      }
    };
  }

  // Context-free fallback retains the same composition and motion controls on
  // older devices or browsers whose graphics acceleration has been disabled.
  function flatRenderer() {
    const ctx=canvas.getContext('2d',{alpha:true});
    if(!ctx)return null;
    canvas.dataset.renderer='canvas';
    return {
      resize(){ctx.setTransform(canvas.width/width,0,0,canvas.height/height,0,0);},
      draw(){
        ctx.clearRect(0,0,width,height);
        const s=Math.min(width,height)*.32,turn=phase*.04+scroll*.2;
        ctx.save();ctx.translate(width*.5,height*.5);ctx.rotate(turn);
        const grad=ctx.createLinearGradient(-s,-s,s,s);
        grad.addColorStop(0,'#c4bcff');grad.addColorStop(.25,'#6553bb');grad.addColorStop(.48,'#d4fcff');grad.addColorStop(.72,'#486fa7');grad.addColorStop(1,'#ffb29a');
        ctx.strokeStyle=grad;ctx.lineWidth=s*.13;ctx.lineCap='round';ctx.beginPath();
        for(let i=0;i<=160;i++){
          const t=i/160*tau,r=1.04+.135*Math.sin(t*3+.7);
          const x=Math.cos(t)*r*s,y=Math.sin(t)*r*s*1.15;
          i?ctx.lineTo(x,y):ctx.moveTo(x,y);
        }
        ctx.closePath();ctx.stroke();ctx.lineWidth=1.1;ctx.strokeStyle='#b3e8f08c';ctx.beginPath();ctx.ellipse(0,0,s*1.22,s*1.37,-.2,0,tau);ctx.stroke();ctx.restore();
      }
    };
  }
  let renderer;
  try { renderer=webglRenderer(); } catch { renderer=null; }
  if(!renderer){
    // A canvas cannot switch context type after creation.
    const fresh=canvas.cloneNode(false);canvas.replaceWith(fresh);canvas=fresh;
    renderer=flatRenderer();
  }
  if(!renderer){canvas.hidden=true;return;}

  function render(){if(!contextLost)renderer.draw();}
  function tick(now){
    raf=0;
    if(!allowed()){sync();return;}
    const interval=1000/(width<500?24:30);
    if(!previous||now-previous>=interval){
      const elapsed=previous?Math.min(now-previous,80):0;
      phase+=elapsed*.0006;age+=elapsed;previous=now;
      pointerX+=(targetX-pointerX)*.08;pointerY+=(targetY-pointerY)*.08;scroll+=(targetScroll-scroll)*.075;
      render();
    }
    raf=requestAnimationFrame(tick);
  }
  function sync(){
    const animate=allowed();canvas.dataset.motion=animate?'running':'still';
    if(animate){if(!raf){previous=0;raf=requestAnimationFrame(tick);}}
    else{cancelAnimationFrame(raf);raf=0;previous=0;if(inView&&!document.hidden)render();}
  }
  function resize(){
    const box=canvas.getBoundingClientRect();width=Math.max(1,box.width);height=Math.max(1,box.height);
    const dpr=Math.min(devicePixelRatio||1,width<500?1.4:1.65);
    canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    renderer.resize();render();sync();
  }
  host?.addEventListener('pointermove',event=>{
    if(!allowed()||!fine.matches)return;
    const b=host.getBoundingClientRect();targetX=clamp((event.clientX-b.left)/b.width-.5,-.5,.5);targetY=clamp((event.clientY-b.top)/b.height-.5,-.5,.5);
  },{passive:true});
  host?.addEventListener('pointerleave',()=>{targetX=0;targetY=0;});
  addEventListener('scroll',()=>{
    if(!inView||!allowed())return;
    const hero=host.closest('.studio-hero');
    targetScroll=hero?clamp(-hero.getBoundingClientRect().top/Math.max(1,hero.offsetHeight),0,1):0;
  },{passive:true});
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();contextLost=true;sync();});
  canvas.addEventListener('webglcontextrestored',()=>{try{renderer=webglRenderer();contextLost=false;resize();}catch{canvas.hidden=true;}});
  if('IntersectionObserver'in window)new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;sync();},{rootMargin:'60px',threshold:0}).observe(canvas);
  else inView=true;
  if('ResizeObserver'in window)new ResizeObserver(resize).observe(canvas);else addEventListener('resize',resize,{passive:true});
  new MutationObserver(sync).observe(root,{attributes:true,attributeFilter:['class']});
  reduced.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);
  resize();
})();
