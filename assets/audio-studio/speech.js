import {language,voiceFor} from './languages.js?v=6';
export {voiceFor} from './languages.js?v=6';
// The synthesis worker is created on demand. No text leaves the page.
export function synthesizeWav(text, languageCode, {onProgress=()=>{},signal}={}){
  const voice=voiceFor(language(languageCode));
  if(!voice) return Promise.reject(Error('There is no bundled WAV voice for this language.'));
  if(!text.trim()) return Promise.reject(Error('Enter the words you want to render.'));
  return workerJob('voice-worker.js',{text,voice},{onProgress,signal});
}
export function workerJob(name,payload,{onProgress,signal,transfer=[]}){
  return new Promise((resolve,reject)=>{
    if(signal?.aborted){reject(new DOMException('Cancelled','AbortError'));return;}
    const workerURL=new URL(name,import.meta.url);workerURL.searchParams.set('v','6');
    const worker=new Worker(workerURL,{type:'module'});
    const done=()=>{worker.terminate();signal?.removeEventListener('abort',abort);};
    const abort=()=>{done();reject(new DOMException('Cancelled','AbortError'));};
    signal?.addEventListener('abort',abort,{once:true});
    worker.onmessage=({data})=>{
      if(data.status==='progress') {onProgress?.(data.message);return;}
      done(); if(data.status==='done') resolve(data.result); else reject(Error(data.message || 'The operation could not complete.'));
    };
    worker.onerror=event=>{done();reject(Error(event.message || 'The browser could not start the local engine.'));};
    worker.postMessage(payload,transfer);
  });
}
