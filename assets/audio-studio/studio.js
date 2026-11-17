import {catalog,language,languageName,voiceFor,whisperFor,deviceVoice,translationCode} from './languages.js';
import {decode,whisperSamples,wavBlob} from './audio.js';
import {synthesizeWav,workerJob} from './speech.js';
import {translateText} from './translate.js';
const $=id=>document.getElementById(id);
const source=()=>$('sourceText').value.trim(), output=()=>$('output').value.trim();
const from=()=>language($('from').value), to=()=>language($('to').value);
let decoded=null,fileToken=0,originalURL='',resultURL='',busy=null,speaking=false,speakEpoch=0;
let sourceRevision=0,languageEpoch=0,film=null,autoOutput=null,shownRecording='';
function authored(tag=to()){
  if(!film || from()!=='en' || source()!==film.original.trim())return null;
  const base=tag.split('-')[0];
  const translations=film.mode==='description'?film.info.translations:film.dubs;
  const record=translations?.[tag] ?? translations?.[base];
  if(film.mode==='description'){
    const text=record || (tag==='en'?film.original:'');
    if(!text)return null;
    const sprite=film.info.audio?.[tag] ?? film.info.audio?.[base];
    if(sprite?.src && Number.isFinite(sprite.start) && Number.isFinite(sprite.end) && sprite.end>sprite.start){
      return {text,src:new URL('../../'+sprite.src,import.meta.url).href,start:sprite.start,end:sprite.end};
    }
    return {text};
  }
  if(tag==='en')return {text:film.original};
  if(!record)return null;
  const src=record.src ? new URL('../dubs-v5/'+record.src,import.meta.url).href : '';
  return record.text ? {text:record.text,src} : null;
}
function displayRecording(){
  const entry=authored();
  const src=entry?.text.trim()===output() && entry.end===undefined ? entry.src : '';
  if(!src || shownRecording===src || resultURL)return;
  shownRecording=src;$('resultAudio').src=src;
  $('saveWav').href=src;$('saveWav').download=film.slug+'-'+to()+'.'+(new URL(src).pathname.split('.').pop() || 'm4a');
  $('saveWav').textContent='Download recorded narration ↓';$('result').hidden=false;
}
function applyAuthored(){
  const entry=authored();
  const safeToFill=!output() || (autoOutput!==null && $('output').value===autoOutput);
  if(!safeToFill)return;
  resetRender();autoOutput=entry?.text ?? null;$('output').value=autoOutput ?? '';
  if(entry){displayRecording();report('Portfolio '+film.mode+' available in '+languageName(to())+'.');}
}
function report(message){$('status').textContent=message;}
function nameForFile(){return ($('file').files[0]?.name || 'recording').replace(/\.[^.]*$/,'') || 'recording';}
function download(blob,name){
  const link=document.createElement('a'),url=URL.createObjectURL(blob);
  link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function resetRender(){
  if(resultURL || shownRecording){$('resultAudio').pause();$('resultAudio').removeAttribute('src');$('resultAudio').load();}
  if(resultURL){URL.revokeObjectURL(resultURL);resultURL='';}
  shownRecording='';$('result').hidden=true;$('saveWav').removeAttribute('href');$('saveWav').textContent='Download spoken WAV ↓';
}
function stopSpeaking(){
  speakEpoch++;
  if(speaking) window.speechSynthesis?.cancel();
  speaking=false;
}
function refresh(){
  const a=from(),b=to(),voice=voiceFor(b),local=deviceVoice(b),bundle=authored(b);
  $('sourceWav').disabled=!!busy || !decoded;
  $('transcribe').disabled=!!busy || !decoded || !whisperFor(a);
  $('translate').disabled=!!busy || !a || !b || !source() || ($('engine').value==='online' && a!==b && !bundle && !$('consent').checked);
  $('saveText').disabled=!!busy || !b || !output();
  $('render').disabled=!!busy || (!voice && !(bundle?.src && bundle.text.trim()===output())) || !output();
  $('speak').disabled=!!busy || !local || !output();
  $('speak').textContent=speaking?'Stop voice':'Play device voice';
  $('cancel').hidden=!busy;document.querySelector('.activity').classList.toggle('working',!!busy);
  $('sourceCap').textContent=a ? languageName(a)+' · '+(whisperFor(a)?'Whisper transcription available'+(a.includes('-')?' using '+languageName(language(whisperFor(a))):'')+'.':'Transcript input only. Whisper has no trained language token for this selection.'):'Enter a valid source language tag.';
  $('targetName').textContent=b ? languageName(b)+(b==='ar-KW'?' · Translation and WAV use standard Arabic. A Kuwaiti dialect voice depends on your device.':''):'Enter a valid output language tag.';
  const recorded=bundle?.src && bundle.text.trim()===output();
  $('voiceCap').textContent=recorded ? 'A recorded '+languageName(b)+' track is available. Create a WAV from its original audio.' : voice ? 'Downloadable WAV · '+languageName(language(voice))+' voice from eSpeak NG.' : 'Downloadable speech is unavailable for this language. You can export its text.';
  $('deviceCap').textContent=local ? 'Device playback uses '+local.name+' ('+local.lang+').' : 'This device currently offers no matching local playback voice.';
}
async function engineDescription(){
  const version=++languageEpoch,selection=$('engine').value,a=from(),b=to();$('onlineBox').hidden=selection!=='online';
  if(authored()){
    $('onlineBox').hidden=true;$('engineInfo').textContent='A translated portfolio track is bundled with this film and works offline.';return;
  }
  if(selection==='online'){
    $('engineInfo').textContent='An online service with variable language coverage and a daily free quota.';return;
  }
  if(a && b && translationCode(a)===translationCode(b)){$('engineInfo').textContent='These language selections share the same output language.';return;}
  if(!globalThis.Translator){$('engineInfo').textContent='This browser does not offer the on-device Translator API. Choose MyMemory above to translate online.';return;}
  if(!a || !b){$('engineInfo').textContent='Enter two valid languages to check this device.';return;}
  $('engineInfo').textContent='Checking language support on this device…';
  try{
    const state=await Translator.availability({sourceLanguage:translationCode(a),targetLanguage:translationCode(b)});
    if(version!==languageEpoch)return;
    $('engineInfo').textContent=({available:'Ready for this language pair.',downloadable:'Your browser can download the required language pack.',downloading:'Your browser is downloading the language pack.',unavailable:'This device does not offer this pair. You can select MyMemory above.'})[state] || 'Availability is determined when you translate.';
  }catch{if(version===languageEpoch)$('engineInfo').textContent='This device cannot verify this pair. Try translating or select MyMemory.';}
}
function cancel(reason='Cancelled. Your text is available for editing.'){
  if(!busy)return;
  const old=busy;busy=null;old.abort();report(reason);refresh();
}
async function work(operation){
  if(busy)return;
  const owner=new AbortController();busy=owner;stopSpeaking();refresh();
  const onProgress=message=>{if(busy===owner)report(message);};
  try{await operation({signal:owner.signal,onProgress});}
  catch(error){if(busy===owner) report(error.name==='AbortError'?'Cancelled.':error.message || String(error));}
  finally{if(busy===owner){busy=null;refresh();}}
}
for(const tag of catalog){
  const option=document.createElement('option');option.value=tag;option.label=languageName(tag);$('languages').append(option);
}
function setTheme(theme,save=false){
  document.documentElement.dataset.theme=theme;$('theme').setAttribute('aria-pressed',String(theme==='dark'));
  if(save){try{localStorage.setItem('adarsh-theme-v2',theme);}catch{}}
}
const media=matchMedia('(prefers-color-scheme: dark)');
setTheme(document.documentElement.dataset.theme || (media.matches?'dark':'light'));
$('theme').addEventListener('click',()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark',true));
media.addEventListener?.('change',e=>{try{if(!localStorage.getItem('adarsh-theme-v2'))setTheme(e.matches?'dark':'light');}catch{}});
$('from').addEventListener('input',()=>{cancel();applyAuthored();refresh();engineDescription();});
$('to').addEventListener('input',()=>{cancel();stopSpeaking();resetRender();applyAuthored();refresh();engineDescription();});
$('sourceText').addEventListener('input',()=>{sourceRevision++;cancel();applyAuthored();refresh();engineDescription();});
$('output').addEventListener('input',()=>{autoOutput=null;cancel();stopSpeaking();resetRender();displayRecording();refresh();});
$('engine').addEventListener('change',()=>{cancel();$('consent').checked=false;engineDescription();refresh();});
$('consent').addEventListener('change',()=>{cancel();refresh();});
$('cancel').addEventListener('click',()=>cancel());
$('file').addEventListener('change',async()=>{
  const token=++fileToken,file=$('file').files[0];
  cancel();decoded=null;$('originalAudio').pause();$('originalAudio').removeAttribute('src');$('originalAudio').load();
  $('originalAudio').hidden=true;if(originalURL){URL.revokeObjectURL(originalURL);originalURL='';}
  $('fileInfo').textContent='';refresh();
  if(!file)return;
  if(!file.size){$('fileInfo').textContent='This file is empty. Choose another recording.';return;}
  originalURL=URL.createObjectURL(file);$('originalAudio').src=originalURL;$('originalAudio').hidden=false;
  $('fileInfo').textContent='Opening the recording locally…';
  try{
    const buffer=await decode(file);if(token!==fileToken)return;
    decoded=buffer;
    $('fileInfo').textContent=file.name+' · '+buffer.duration.toFixed(1)+' s · '+buffer.numberOfChannels+' channel'+(buffer.numberOfChannels===1?'':'s')+' · '+(buffer.sampleRate/1000)+' kHz decoded';
    report('Recording ready. You can transcribe it or export its WAV.');
  }catch{if(token===fileToken){$('fileInfo').textContent='This browser could not decode the recording. Try a WAV or MP3, or paste a transcript.';}}
  finally{if(token===fileToken)refresh();}
});
$('sourceWav').addEventListener('click',()=>work(async({onProgress})=>{
  onProgress('Converting the recording to 16-bit PCM WAV…');
  const channels=Array.from({length:decoded.numberOfChannels},(_,i)=>decoded.getChannelData(i));
  download(wavBlob(channels,decoded.sampleRate),nameForFile()+'-source.wav');onProgress('Original recording exported as a PCM WAV.');
}));
$('transcribe').addEventListener('click',()=>work(async({signal,onProgress})=>{
  onProgress('Preparing mono 16 kHz audio on this device…');
  const samples=await whisperSamples(decoded);signal.throwIfAborted();
  const text=await workerJob('asr-worker.js',{samples,language:whisperFor(from())},{signal,onProgress,transfer:[samples.buffer]});
  signal.throwIfAborted();$('sourceText').value=text;sourceRevision++;applyAuthored();engineDescription();onProgress('Transcription ready. Review the words before translating.');
}));
$('translate').addEventListener('click',()=>work(async({signal,onProgress})=>{
  const bundled=authored();
  if(bundled){
    resetRender();$('output').value=bundled.text;autoOutput=bundled.text;displayRecording();
    onProgress('Loaded the bundled '+languageName(to())+' text for this film.');return;
  }
  const result=await translateText(source(),from(),to(),{signal,onProgress,engine:$('engine').value,consent:$('consent').checked});
  signal.throwIfAborted();resetRender();autoOutput=null;$('output').value=result.text;onProgress(result.method);
}));
$('saveText').addEventListener('click',()=>{
  download(new Blob([$('output').value],{type:'text/plain;charset=utf-8'}),'translation-'+to()+'.txt');report('Translation exported as UTF-8 text.');
});
$('render').addEventListener('click',()=>work(async({signal,onProgress})=>{
  const tag=to(),entry=authored();
  let blob;
  if(entry?.src && entry.text.trim()===output()){
    onProgress('Converting the recorded narration to PCM WAV…');
    const response=await fetch(entry.src,{signal});if(!response.ok)throw Error('The recording could not load. Please retry.');
    const audio=await decode(await response.blob());signal.throwIfAborted();
    const start=Math.max(0,Math.floor((entry.start || 0)*audio.sampleRate));
    const end=Math.min(audio.length,Math.ceil((entry.end ?? audio.duration)*audio.sampleRate));
    if(end<=start)throw Error('The recorded excerpt has no audio samples.');
    blob=wavBlob(Array.from({length:audio.numberOfChannels},(_,i)=>audio.getChannelData(i).subarray(start,end)),audio.sampleRate);
  }else{blob=await synthesizeWav(output(),tag,{signal,onProgress});}
  signal.throwIfAborted();resetRender();resultURL=URL.createObjectURL(blob);
  $('resultAudio').src=resultURL;$('saveWav').href=resultURL;$('saveWav').download='speech-'+tag+'.wav';$('result').hidden=false;
  onProgress('Spoken WAV ready. Listen to it or download the file.');
}));
$('speak').addEventListener('click',()=>{
  if(speaking){stopSpeaking();refresh();report('Device playback stopped.');return;}
  const voice=deviceVoice(to());if(!voice)return;
  const epoch=++speakEpoch;
  const utterance=new SpeechSynthesisUtterance(output());utterance.voice=voice;utterance.lang=voice.lang;
  utterance.onend=()=>{if(epoch!==speakEpoch)return;speaking=false;refresh();report('Device playback finished.');};
  utterance.onerror=event=>{if(epoch!==speakEpoch)return;speaking=false;refresh();report('This device could not play the selected voice. '+event.error);};
  speaking=true;refresh();window.speechSynthesis.speak(utterance);report('Playing the selected local device voice.');
});
window.speechSynthesis?.addEventListener('voiceschanged',refresh);
window.addEventListener('pagehide',()=>{cancel();stopSpeaking();});
const params=new URLSearchParams(location.search);
if(params.get('lang') && language(params.get('lang'))) $('to').value=language(params.get('lang'));
refresh();engineDescription();
if(params.get('film')){
  const revision=sourceRevision,mode=params.get('mode')==='narration'?'narration':'description';
  try{
    const loadJSON=async path=>{const response=await fetch(new URL(path,import.meta.url));if(!response.ok)throw Error();return response.json();};
    const [catalog,dubs]=await Promise.all([loadJSON('../field/film-text-v5.json'),mode==='narration'?loadJSON('../dubs-v5/manifest.json').catch(()=>({})):{}]);
    const slug=params.get('film'),selected=catalog[slug];
    if(!selected || typeof selected[mode]!=='string' || !selected[mode].trim())throw Error();
    if(revision===sourceRevision){
      film={mode,slug,info:selected,dubs:dubs[slug] || {},original:selected[mode]};
      $('sourceText').value=film.original;$('from').value='en';applyAuthored();
      $('filmNotice').textContent=selected.title+' · English '+mode+' loaded for translation.';refresh();engineDescription();
    }
  }catch{$('filmNotice').textContent='The selected film text is unavailable. You can still open audio or paste a transcript.';}
  if($('filmNotice').textContent)$('filmNotice').hidden=false;
}
