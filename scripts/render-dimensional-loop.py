#!/usr/bin/env python3
"""Render an original, seamless chrome-sculpture film with Mesa EGL and FFmpeg.

Requires Linux libEGL, an OpenGL ES 2 implementation, numpy, Pillow and ffmpeg.
Uses the site's own shader source and procedural geometry; no external imagery.
Run from any directory: python scripts/render-dimensional-loop.py
"""
from pathlib import Path
import ctypes as C
import math
import re
import subprocess
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
WIDTH, HEIGHT, FPS, SECONDS = 960, 540, 24, 8
DEST = ROOT / 'assets/video/dimensional-loop.mp4'
PREVIEW = ROOT.parent / 'dimensional-loop-preview.png'
TAU = math.tau
E = C.CDLL('libEGL.so.1')
E.eglGetProcAddress.argtypes = [C.c_char_p]
E.eglGetProcAddress.restype = C.c_void_p

def egl(name, result, *args):
    f = getattr(E, name)
    f.restype, f.argtypes = result, list(args)
    return f

def gl(name, result, *args):
    address = E.eglGetProcAddress(name.encode())
    if not address:
        raise RuntimeError(f'Missing OpenGL ES function: {name}')
    return C.CFUNCTYPE(result, *args)(address)

platform = C.CFUNCTYPE(C.c_void_p,C.c_uint,C.c_void_p,C.POINTER(C.c_int))(E.eglGetProcAddress(b'eglGetPlatformDisplayEXT'))
display = platform(0x31DD,None,None)
major,minor = C.c_int(),C.c_int()
assert egl('eglInitialize',C.c_uint,C.c_void_p,C.POINTER(C.c_int),C.POINTER(C.c_int))(display,C.byref(major),C.byref(minor)), 'EGL initialization failed'
assert egl('eglBindAPI',C.c_uint,C.c_uint)(0x30A0), 'OpenGL ES API unavailable'
attrs = (C.c_int*15)(0x3033,1,0x3040,4,0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3025,24,0x3038)
config,count = C.c_void_p(),C.c_int()
assert egl('eglChooseConfig',C.c_uint,C.c_void_p,C.POINTER(C.c_int),C.POINTER(C.c_void_p),C.c_int,C.POINTER(C.c_int))(display,attrs,C.byref(config),1,C.byref(count)) and count.value
surface = egl('eglCreatePbufferSurface',C.c_void_p,C.c_void_p,C.c_void_p,C.POINTER(C.c_int))(display,config,(C.c_int*5)(0x3057,WIDTH,0x3056,HEIGHT,0x3038))
context = egl('eglCreateContext',C.c_void_p,C.c_void_p,C.c_void_p,C.c_void_p,C.POINTER(C.c_int))(display,config,None,(C.c_int*3)(0x3098,2,0x3038))
assert context and surface
assert egl('eglMakeCurrent',C.c_uint,C.c_void_p,C.c_void_p,C.c_void_p,C.c_void_p)(display,surface,surface,context)

create_shader=gl('glCreateShader',C.c_uint,C.c_uint)
shader_source=gl('glShaderSource',None,C.c_uint,C.c_int,C.POINTER(C.c_char_p),C.POINTER(C.c_int))
compile_shader=gl('glCompileShader',None,C.c_uint)
shader_iv=gl('glGetShaderiv',None,C.c_uint,C.c_uint,C.POINTER(C.c_int))
shader_log=gl('glGetShaderInfoLog',None,C.c_uint,C.c_int,C.POINTER(C.c_int),C.c_char_p)
create_program=gl('glCreateProgram',C.c_uint)
attach=gl('glAttachShader',None,C.c_uint,C.c_uint)
link=gl('glLinkProgram',None,C.c_uint)
program_iv=gl('glGetProgramiv',None,C.c_uint,C.c_uint,C.POINTER(C.c_int))
program_log=gl('glGetProgramInfoLog',None,C.c_uint,C.c_int,C.POINTER(C.c_int),C.c_char_p)
use=gl('glUseProgram',None,C.c_uint)
get_attribute=gl('glGetAttribLocation',C.c_int,C.c_uint,C.c_char_p)
get_uniform=gl('glGetUniformLocation',C.c_int,C.c_uint,C.c_char_p)
u1=gl('glUniform1f',None,C.c_int,C.c_float)
umatrix=gl('glUniformMatrix3fv',None,C.c_int,C.c_int,C.c_ubyte,C.POINTER(C.c_float))
gen_buffers=gl('glGenBuffers',None,C.c_int,C.POINTER(C.c_uint))
bind=gl('glBindBuffer',None,C.c_uint,C.c_uint)
buffer_data=gl('glBufferData',None,C.c_uint,C.c_ssize_t,C.c_void_p,C.c_uint)
enable_attribute=gl('glEnableVertexAttribArray',None,C.c_uint)
attribute_pointer=gl('glVertexAttribPointer',None,C.c_uint,C.c_int,C.c_uint,C.c_ubyte,C.c_int,C.c_void_p)
draw=gl('glDrawElements',None,C.c_uint,C.c_int,C.c_uint,C.c_void_p)
enable=gl('glEnable',None,C.c_uint)
disable=gl('glDisable',None,C.c_uint)
clear=gl('glClear',None,C.c_uint)
read=gl('glReadPixels',None,C.c_int,C.c_int,C.c_int,C.c_int,C.c_uint,C.c_uint,C.c_void_p)
viewport=gl('glViewport',None,C.c_int,C.c_int,C.c_int,C.c_int)
viewport(0,0,WIDTH,HEIGHT)

def program(vs,fs):
    p=create_program()
    for kind,text in [(0x8B31,vs),(0x8B30,fs)]:
        s=create_shader(kind); data=C.c_char_p(text.encode());shader_source(s,1,C.byref(data),None);compile_shader(s)
        okay=C.c_int();shader_iv(s,0x8B81,C.byref(okay))
        if not okay.value:
            msg=C.create_string_buffer(4096);shader_log(s,4096,None,msg);raise RuntimeError(msg.value.decode())
        attach(p,s)
    link(p);okay=C.c_int();program_iv(p,0x8B82,C.byref(okay))
    if not okay.value:
        msg=C.create_string_buffer(4096);program_log(p,4096,None,msg);raise RuntimeError(msg.value.decode())
    return p

def mesh(vertices,indices):
    values=np.asarray(vertices,dtype=np.float32);order=np.asarray(indices,dtype=np.uint16)
    ids=(C.c_uint*2)();gen_buffers(2,ids)
    bind(0x8892,ids[0]);buffer_data(0x8892,values.nbytes,values.ctypes.data,0x88E4)
    bind(0x8893,ids[1]);buffer_data(0x8893,order.nbytes,order.ctypes.data,0x88E4)
    return ids[0],ids[1],len(indices)

def unit(v):
    return v/(np.linalg.norm(v) or 1)

def centre(t):
    r=1.04+.135*math.sin(t*3+.7)+.035*math.sin(t*5)
    return np.array([math.cos(t)*r,math.sin(t)*r*1.15,.26*math.sin(t*3-.35)])

def sweep(t,a,kind):
    if kind:
        return np.array([math.cos(t)*(1.22+math.cos(a)*.014),math.sin(t)*(1.37+math.cos(a)*.014),.32*math.cos(t+.6)+math.sin(a)*.014])
    tangent=unit(centre(t+.001)-centre(t-.001));binormal=unit(np.cross(tangent,[math.cos(t),math.sin(t),0]));side=unit(np.cross(binormal,tangent));twist=t*2+.4
    aa=side*math.cos(twist)+binormal*math.sin(twist);bb=binormal*math.cos(twist)-side*math.sin(twist)
    return centre(t)+aa*math.cos(a)*(.115+.026*math.sin(t*2))+bb*math.sin(a)*.042

def ribbon(kind):
    vertices,indices=[],[];segments,sides=(144,8) if kind else (192,20)
    for i in range(segments+1):
        for j in range(sides+1):
            t,a=i/segments*TAU,j/sides*TAU;p=sweep(t,a,kind)
            n=unit(np.cross(sweep(t+.001,a,kind)-sweep(t-.001,a,kind),sweep(t,a+.001,kind)-sweep(t,a-.001,kind)))
            vertices.extend([*p,*n,t/TAU,kind])
            if i<segments and j<sides:
                k=i*(sides+1)+j;indices.extend([k,k+sides+1,k+1,k+1,k+sides+1,k+sides+2])
    return mesh(vertices,indices)

def crystals():
    vertices,indices=[],[]
    points=np.array([[0,.29,0],[.17,.06,.15],[-.17,.06,.15],[-.17,.06,-.15],[.17,.06,-.15],[0,-.23,0]])
    faces=[[0,1,2],[0,2,3],[0,3,4],[0,4,1],[5,2,1],[5,3,2],[5,4,3],[5,1,4]]
    for cx,cy,cz,s in [[1.1,.88,.25,.9],[-1.06,-.95,.15,.8],[-1.16,.61,-.15,.42]]:
        for face in faces:
            p=points[face]*s+[cx,cy,cz];n=unit(np.cross(p[1]-p[0],p[2]-p[0]));start=len(vertices)//8
            for v in p:vertices.extend([*v,*n,(cx+1.2)/2.4,2])
            indices.extend([start,start+1,start+2])
    return mesh(vertices,indices)

source=(ROOT/'assets/js/hero-sculpture.js').read_text()
vertex=re.search(r'const vertexSource = `([\s\S]*?)`;',source)[1]
fragment=re.search(r'const fragmentSource = `([\s\S]*?)`;',source)[1]
# Make every temporal term periodic over precisely one eight-second cycle.
for term in ['uTime*.55','uTime*.35','uTime*.8']:
    vertex=vertex.replace(term,'uTime')
fragment=fragment.replace('uTime*.08','sin(uTime)*.08')
sculpture=program(vertex,fragment)
attributes=[get_attribute(sculpture,n.encode()) for n in ['aPosition','aNormal','aMaterial']]
uniforms={n:get_uniform(sculpture,n.encode()) for n in ['uRotation','uAspect','uTime','uScale','uScroll']}
meshes=[ribbon(0),ribbon(1),crystals()]
background=program('''attribute vec2 aPosition;varying mediump vec2 vUv;void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}''','''
precision mediump float;varying mediump vec2 vUv;uniform float uTime;
void main(){vec2 uv=vUv;vec2 p=(uv-.5)*vec2(1.77778,1.);vec3 c=vec3(.018,.025,.055);
float violet=exp(-length(p-vec2(-.32+.03*sin(uTime),.18))*4.);float cyan=exp(-length(p-vec2(.42,-.17))*5.);
c+=vec3(.11,.035,.22)*violet+vec3(.018,.13,.16)*cyan;
float halo=exp(-pow((length(p)-.31)*13.,2.))*.05;c+=vec3(.16,.22,.39)*halo;
float vignette=smoothstep(.85,.22,length(p));c*=.65+.35*vignette;gl_FragColor=vec4(c,1.);}
''')
bg_attribute=get_attribute(background,b'aPosition');bg_time=get_uniform(background,b'uTime')
quad=mesh([-1,-1,1,-1,1,1,-1,1],[0,1,2,0,2,3])
DEST.parent.mkdir(exist_ok=True)
encoder=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{WIDTH}x{HEIGHT}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-preset','slow','-crf','27','-pix_fmt','yuv420p','-movflags','+faststart',str(DEST)],stdin=subprocess.PIPE,stderr=subprocess.PIPE)
pixels=np.empty((HEIGHT,WIDTH,4),dtype=np.uint8)
try:
    for frame in range(FPS*SECONDS):
        phase=frame/(FPS*SECONDS)*TAU
        clear(0x4000|0x0100);disable(0x0B71);use(background);u1(bg_time,phase)
        bind(0x8892,quad[0]);enable_attribute(bg_attribute);attribute_pointer(bg_attribute,2,0x1406,0,8,None)
        bind(0x8893,quad[1]);draw(4,quad[2],0x1403,None)
        enable(0x0B71);use(sculpture)
        ax=.16+.12*math.sin(phase);ay=phase+.1;az=-.1+.08*math.sin(phase*2)
        cx,sx,cy,sy,cz,sz=math.cos(ax),math.sin(ax),math.cos(ay),math.sin(ay),math.cos(az),math.sin(az)
        matrix=np.array([cy*cz,cy*sz,-sy,sx*sy*cz-cx*sz,sx*sy*sz+cx*cz,sx*cy,cx*sy*cz+sx*sz,cx*sy*sz-sx*cz,cx*cy],dtype=np.float32)
        umatrix(uniforms['uRotation'],1,0,matrix.ctypes.data_as(C.POINTER(C.c_float)))
        for n,value in [('uAspect',WIDTH/HEIGHT),('uTime',phase),('uScale',1.03),('uScroll',0)]:u1(uniforms[n],value)
        for vertex_buffer,index_buffer,count in meshes:
            bind(0x8892,vertex_buffer)
            for location,size,offset in zip(attributes,[3,3,2],[0,12,24]):
                enable_attribute(location);attribute_pointer(location,size,0x1406,0,32,C.c_void_p(offset))
            bind(0x8893,index_buffer);draw(4,count,0x1403,None)
        read(0,0,WIDTH,HEIGHT,0x1908,0x1401,pixels.ctypes.data)
        corrected=np.ascontiguousarray(pixels[::-1,:,:3])
        if frame==8:Image.fromarray(corrected).save(PREVIEW)
        encoder.stdin.write(corrected.tobytes())
    encoder.stdin.close();error=encoder.stderr.read().decode();result=encoder.wait()
    if result:raise RuntimeError(error)
finally:
    if encoder.poll() is None:encoder.kill()
    egl('eglDestroyContext',C.c_uint,C.c_void_p,C.c_void_p)(display,context)
    egl('eglDestroySurface',C.c_uint,C.c_void_p,C.c_void_p)(display,surface)
    egl('eglTerminate',C.c_uint,C.c_void_p)(display)
print(f'{DEST}: {DEST.stat().st_size:,} bytes; {FPS*SECONDS} frames; {SECONDS}s')
print(f'Preview: {PREVIEW}')
