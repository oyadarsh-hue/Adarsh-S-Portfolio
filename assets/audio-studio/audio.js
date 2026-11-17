export function wavBlob(channels, rate, floating = true){
  const frames=channels[0]?.length || 0, count=channels.length, size=frames*count*2;
  if(!frames || !count || !rate) throw Error('No audio samples were available.');
  if(size+44>0xffffffff) throw Error('This recording is too large for a standard WAV file.');
  const result=new ArrayBuffer(44+size), view=new DataView(result);
  const tag=(at, str)=>{for(let i=0;i<str.length;i++) view.setUint8(at+i,str.charCodeAt(i));};
  tag(0,'RIFF'); view.setUint32(4,36+size,true); tag(8,'WAVE'); tag(12,'fmt ');
  view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,count,true);
  view.setUint32(24,rate,true); view.setUint32(28,rate*count*2,true); view.setUint16(32,count*2,true);
  view.setUint16(34,16,true); tag(36,'data'); view.setUint32(40,size,true);
  let at=44;
  for(let i=0;i<frames;i++) for(let ch=0;ch<count;ch++){
    let sample=channels[ch][i];
    if(floating) {sample=Math.max(-1,Math.min(1,sample)); sample=Math.round(sample*(sample<0?32768:32767));}
    view.setInt16(at,sample,true); at+=2;
  }
  return new Blob([result],{type:'audio/wav'});
}
export async function decode(file){
  const Context=window.AudioContext || window.webkitAudioContext;
  if(!Context) throw Error('This browser cannot decode local audio. You can paste a transcript below.');
  const ctx=new Context();
  try {return await ctx.decodeAudioData(await file.arrayBuffer());} finally {await ctx.close().catch(()=>{});}
}
export async function whisperSamples(buffer){
  const Context=window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if(!Context) throw Error('Local resampling is unavailable in this browser.');
  const ctx=new Context(1,Math.ceil(buffer.duration*16000),16000), source=ctx.createBufferSource();
  source.buffer=buffer; source.connect(ctx.destination); source.start();
  return (await ctx.startRendering()).getChannelData(0).slice();
}
