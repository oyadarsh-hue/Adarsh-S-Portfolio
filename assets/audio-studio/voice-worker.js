import {wavBlob} from './audio.js?v=6';
const progress=message=>self.postMessage({status:'progress',message});
async function unpack(n){
  const response=await fetch(new URL('./vendor/voice-'+n+'.gz',import.meta.url));
  if(!response.ok) throw Error('The local voice pack could not load. Reconnect and retry.');
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(bytes[0]!==31 || bytes[1]!==139) return bytes;
  if(!globalThis.DecompressionStream) throw Error('This browser cannot open the voice pack. Try a recent browser.');
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
}
self.onmessage=async ({data:{text,voice}})=>{
  try{
    progress('Opening the multilingual voice pack…');
    const [{default:init},...parts]=await Promise.all([import('./vendor/espeak-ng.mjs'),...[1,2,3].map(unpack)]);
    const raw=new Uint8Array(parts.reduce((s,p)=>s+p.length,0));
    let offset=0; for(const part of parts){raw.set(part,offset);offset+=part.length;}
    if(raw.length!==24014553) throw Error('The voice download was incomplete. Please retry.');
    const engine=await init({getPreloadedPackage:()=>raw.buffer});
    const synth=new engine.eSpeakNGWorker();
    const available=synth.list_voices().some(v=>v.languages.some(l=>l.name.toLowerCase()===voice));
    if(!available) throw Error('This voice is unavailable in the installed pack.');
    synth.set_voice(voice,'');
    progress('Rendering speech on this device…');
    const chunks=[];
    synth.synthesize(text,samples=>{if(samples?.length) chunks.push(samples.slice());return false;});
    const pcm=new Int16Array(chunks.reduce((n,c)=>n+c.length,0));
    let at=0;for(const chunk of chunks){pcm.set(chunk,at);at+=chunk.length;}
    if(!pcm.some(s=>Math.abs(s)>24)) throw Error('The voice returned no audible speech. Check the language and text.');
    self.postMessage({status:'done',result:wavBlob([pcm],synth.get_samplerate(),false)});
  }catch(err){self.postMessage({status:'error',message:err.message});}
};
