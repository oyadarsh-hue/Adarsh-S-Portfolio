import {catalog,language,languageName,voiceFor,voiceLabel,whisperFor,deviceVoice,translationCode,equivalentTag,writingHint} from './languages.js?v=6';
import {decode,whisperSamples,wavBlob} from './audio.js?v=6';
import {synthesizeWav,workerJob} from './speech.js?v=6';
import {translateText} from './translate.js?v=7';
import {filmTrack} from './film-track.js?v=7';
import {photoDescription} from './photo-descriptions.js?v=9';
const $=id=>document.getElementById(id);
const source=()=>$('sourceText').value.trim(), output=()=>$('output').value.trim();
const from=()=>language($('from').value), to=()=>language($('to').value);
let decoded=null,fileToken=0,originalURL='',resultURL='',busy=null,speaking=false,speakEpoch=0;
let sourceRevision=0,languageEpoch=0,film=null,autoOutput=null,shownRecording='';
const site=new URL('../../',import.meta.url);
const drafts=new Map();
const originalClips=new Set('assenttag epigraphix-ai quietnote aegisforge-x deciphera publication bluegen skybrisk codtech mca bsc hse sslc'.split(' '));
function originalFilmAudio(slug){
  if(originalClips.has(slug))return 'assets/clips/'+slug+'-hd.mp4';
  return ({projects:'assets/field/projects-hd-v2.mp4',journey:'assets/field/journey-hd-v2.mp4'})[slug] || '';
}
let activeTag='',resultLang='',origin='',engineState='unavailable';
let machineSource=null;
const localeChecks=new Map();
function authored(tag=to()){
  if(!film || from()!=='en' || source()!==film.original.trim())return null;
  return filmTrack(film.info,film.dubs,film.mode,tag,site);
}
function effectiveEngine(){
  return $('engine').value==='auto' ? (engineState==='unavailable'?'online':'local') : $('engine').value;
}
function setOutput(text,code,description,automatic=false){
  $('output').value=text || '';
  resultLang=code || to();origin=description || '';autoOutput=automatic ? text : null;
  machineSource=null;
}
function repaintOrigin(){
  $('output').lang=resultLang || to();
  $('sourceText').lang=from() || '';
  const bundle=authored();
  const hint=bundle?.src && bundle.text.trim()===output() ? '' : writingHint(output(),resultLang || to());
  $('outputOrigin').textContent=output() ? [origin,hint].filter(Boolean).join(' ') : '';
  $('compare').hidden=!source() || !output();
  if(!$('compare').hidden){
    $('compareFrom').textContent=languageName(from())+' original';
    $('compareTo').textContent=languageName(resultLang || to())+' translation';
    $('compareSource').textContent=source();$('compareSource').lang=from();
    $('compareTarget').textContent=output();$('compareTarget').lang=resultLang || to();
  }
}
function changeTarget(){
  cancel();stopSpeaking();resetRender();
  const tag=to();
  if(activeTag!==tag){
    if(activeTag && output() && autoOutput===null){
      drafts.set(activeTag,{text:$('output').value,lang:resultLang,origin,source:machineSource});
    }
    activeTag=tag;const saved=drafts.get(tag);
    if(saved && (!saved.source || (saved.source.text===source() && saved.source.tag===from()))){
      setOutput(saved.text,saved.lang,saved.origin);machineSource=saved.source;
    }else setOutput('',tag,'');
  }
  applyAuthored();refresh();engineDescription();
}
function sourceChanged(){
  cancel();stopSpeaking();resetRender();
  if(machineSource && (machineSource.text!==source() || machineSource.tag!==from()))setOutput('',to(),'');
  applyAuthored();refresh();engineDescription();
}
function sourceChangedAfterRecognition(){
  if(machineSource)setOutput('',to(),'');
  applyAuthored();engineDescription();
}
function bundleLabel(entry){
  const name=languageName(entry.textCode);
  return name+' · bundled '+film.mode+(entry.textCode!==to()?' (regional wording unavailable).':'.');
}
function displayRecording(){
  const entry=authored();
  const src=entry?.text.trim()===output() && entry.end===null ? entry.src : '';
  if(!src || shownRecording===src || resultURL)return;
  shownRecording=src;$('resultAudio').src=src;
  $('saveWav').href=src;$('saveWav').download=film.slug+'-'+entry.textCode+'.'+(new URL(src).pathname.split('.').pop() || 'm4a');
  $('saveWav').textContent=entry.native?'Download original film (MP4) ↓':'Download recorded narration ↓';$('result').hidden=false;
}
function applyAuthored(){
  const entry=authored();
  const safeToFill=!output() || (autoOutput!==null && $('output').value===autoOutput);
  if(!safeToFill)return;
  resetRender();setOutput(entry?.text,entry?.textCode,entry ? bundleLabel(entry):'',!!entry);
  if(entry){displayRecording();report('Portfolio '+film.mode+' available in '+languageName(entry.textCode)+'.');}
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
  const a=from(),b=to(),spoken=resultLang || b,voice=voiceFor(spoken),local=deviceVoice(spoken),bundle=authored(b);
  const recorded=bundle?.src && bundle.text.trim()===output();
  const same=a && b && equivalentTag(a)===equivalentTag(b), service=effectiveEngine();
  const dialectRewrite=!same && a && b && translationCode(a)===translationCode(b);
  const canTranslate=same || bundle || (!dialectRewrite && (service==='online' ? $('consent').checked : engineState!=='unavailable' && engineState!=='checking'));
  $('sourceWav').disabled=!!busy || !decoded;
  $('transcribe').disabled=!!busy || !decoded || !whisperFor(a);
  $('translate').disabled=!!busy || !a || !b || !source() || !canTranslate;
  $('saveText').disabled=!!busy || !b || !output();
  $('render').disabled=!!busy || (!voice && !recorded) || !output();
  $('speak').disabled=!!busy || !local || !output();
  $('speak').textContent=speaking?'Stop voice':'Play device voice';
  $('cancel').hidden=!busy;document.querySelector('.activity').classList.toggle('working',!!busy);
  const model=whisperFor(a);
  $('sourceCap').textContent=a ? languageName(a)+' · '+(model?'Speech recognition uses '+(model==='ar'?'Arabic':languageName(language(model)))+'.':'Enter the transcript manually. Whisper has no matching recognition setting.'):'Enter a valid source language.';
  $('targetName').textContent=b ? languageName(b)+(equivalentTag(b)==='ar-KW' ? (bundle?.textCode==='ar-KW'?' · Kuwaiti wording is included for this film.':' · Automatic translation uses standard Arabic. Enter your own wording for Kuwaiti Arabic.'):''):'Enter a valid output language.';
  $('render').textContent=recorded ? 'Export original track as WAV' : 'Create synthetic WAV';
  $('qualityNote').textContent=recorded ? 'This exports the existing film track without replacing its voice. Text and regional pronunciation have not been independently certified.' : 'New WAV speech uses the bundled eSpeak NG voice, not the original film narrator. A language in the picker does not guarantee recognition, translation or a matching accent. Review the text and listen before sharing.';
  $('voiceCap').textContent=recorded ? 'Recorded '+film.mode+' · '+(bundle.voice || languageName(bundle.textCode))+'.' : voice ? 'Downloadable WAV · '+voiceLabel(voice)+' · eSpeak NG synthetic voice.' : 'No matching WAV voice. You can enter and export a translation as text.';
  $('deviceCap').textContent=local ? 'Device playback uses '+local.name+' ('+local.lang+').' : 'No matching local playback voice on this device.';
  repaintOrigin();
}
function checkBrowserPair(a,b){
  const sourceLanguage=translationCode(a),targetLanguage=translationCode(b),key=sourceLanguage+'|'+targetLanguage;
  if(!localeChecks.has(key)){
    // Some browsers expose this API before first-run services can answer.
    const probe=new Promise(resolve=>{
      const timeout=setTimeout(()=>resolve('unknown'),1600);
      Promise.resolve().then(()=>Translator.availability({sourceLanguage,targetLanguage})).then(state=>{
        clearTimeout(timeout);localeChecks.set(key,Promise.resolve(state));resolve(state);
      }).catch(()=>{
        clearTimeout(timeout);localeChecks.delete(key);resolve('unavailable');
      });
    });
    localeChecks.set(key,probe);
  }
  return localeChecks.get(key);
}
async function engineDescription(){
  const version=++languageEpoch,a=from(),b=to();engineState='unavailable';
  function describe(message,online=false){$('engineInfo').textContent=message;$('onlineBox').hidden=!online;refresh();}
  if(authored()){describe('The portfolio includes this translation. No online service is needed.');return;}
  if(a && b && equivalentTag(a)===equivalentTag(b)){describe('Both selections use the same language. You can copy the source to the output.');return;}
  if(!a || !b){describe('Enter source and output languages.');return;}
  if(translationCode(a)===translationCode(b)){describe('These engines cannot rewrite between these dialects. Enter the regional wording in Translated text.');return;}
  const cloud=$('engine').value==='online',auto=$('engine').value==='auto';
  if(cloud){describe('MyMemory checks coverage when you submit this pair. Its free daily quota applies.',true);return;}
  const unavailable=auto?'On-device translation is unavailable for this pair. MyMemory can translate after you allow text sharing.':'This browser cannot translate this pair locally. Select MyMemory or enter the translation yourself.';
  if(!globalThis.Translator){describe(unavailable,auto);return;}
  engineState='checking';describe('Checking this device for the selected language pair…');
  try{
    const state=await checkBrowserPair(a,b);
    if(version!==languageEpoch)return;
    if(state==='unknown'){
      engineState=auto?'unavailable':'unknown';
      describe(auto?'This device could not confirm a local translator. You can approve online text translation or select the local engine explicitly.':'This device has not confirmed the language pair. You can try a local translation.',auto);return;
    }
    engineState=state;
    describe(({available:'This language pair is ready on your device.',downloadable:'Your browser can download this language pair.',downloading:'Your browser is downloading the language pack.'})[state] || unavailable,state==='unavailable' && auto);
  }catch{if(version===languageEpoch){engineState='unavailable';describe(unavailable,auto);}}
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
$('from').addEventListener('input',sourceChanged);
$('to').addEventListener('input',changeTarget);
$('sourceText').addEventListener('input',()=>{sourceRevision++;sourceChanged();});
$('output').addEventListener('input',()=>{autoOutput=null;machineSource=null;resultLang=to();origin='Manually edited · '+languageName(to())+'.';if(!output())drafts.delete(to());cancel();stopSpeaking();resetRender();displayRecording();refresh();});
$('engine').addEventListener('change',()=>{cancel();$('consent').checked=false;engineDescription();refresh();});
$('consent').addEventListener('change',()=>{cancel();refresh();});
$('cancel').addEventListener('click',()=>cancel());
$('file').addEventListener('change',async()=>{
  const token=++fileToken,file=$('file').files[0];
  cancel();decoded=null;$('originalAudio').pause();$('originalAudio').removeAttribute('src');$('originalAudio').load();
  $('originalAudio').hidden=true;if(originalURL){URL.revokeObjectURL(originalURL);originalURL='';}
  $('fileInfo').textContent='';refresh();
  if(!file)return;
  // A new recording is a new source, never a continuation of the selected film.
  film=null;sourceRevision++;drafts.clear();machineSource=null;autoOutput=null;
  $('sourceText').value='';setOutput('',to(),'');resetRender();
  $('filmNotice').hidden=true;$('filmNotice').textContent='';engineDescription();refresh();
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
  signal.throwIfAborted();$('sourceText').value=text;sourceRevision++;sourceChangedAfterRecognition();onProgress('Transcription ready. Review the words before translating.');
}));
$('translate').addEventListener('click',()=>work(async({signal,onProgress})=>{
  const bundled=authored();
  if(bundled){
    resetRender();setOutput(bundled.text,bundled.textCode,bundleLabel(bundled),true);displayRecording();
    onProgress('Loaded the bundled '+languageName(bundled.textCode)+' text for this film.');return;
  }
  const result=await translateText(source(),from(),to(),{signal,onProgress,engine:effectiveEngine(),consent:$('consent').checked});
  signal.throwIfAborted();resetRender();
  const provider=equivalentTag(from())===equivalentTag(to())?'Source copy':effectiveEngine()==='online'?'MyMemory':'On-device translator';
  const identical=source()===result.text.trim() && from()!==to()?' The wording matches the source. Check it before exporting.':'';
  setOutput(result.text,result.language || to(),provider+' · '+languageName(result.language || to())+'.'+identical);
  machineSource={text:source(),tag:from()};onProgress(result.method+identical);
}));
$('saveText').addEventListener('click',()=>{
  download(new Blob([$('output').value],{type:'text/plain;charset=utf-8'}),'translation-'+(resultLang || to())+'.txt');report('Translation exported as UTF-8 text.');
});
$('render').addEventListener('click',()=>work(async({signal,onProgress})=>{
  const tag=resultLang || to(),entry=authored();
  let blob;
  if(entry?.src && entry.text.trim()===output()){
    onProgress('Converting the existing film audio to PCM WAV without changing its voice…');
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
  const voice=deviceVoice(resultLang || to());if(!voice)return;
  const epoch=++speakEpoch;
  const utterance=new SpeechSynthesisUtterance(output());utterance.voice=voice;utterance.lang=voice.lang;
  utterance.onend=()=>{if(epoch!==speakEpoch)return;speaking=false;refresh();report('Device playback finished.');};
  utterance.onerror=event=>{if(epoch!==speakEpoch)return;speaking=false;refresh();report('This device could not play the selected voice. '+event.error);};
  $('originalAudio').pause();$('resultAudio').pause();
  speaking=true;refresh();window.speechSynthesis.speak(utterance);report('Playing the selected local device voice.');
});
for(const [playing,other] of [['originalAudio','resultAudio'],['resultAudio','originalAudio']]){
  $(playing).addEventListener('play',()=>{$(other).pause();stopSpeaking();refresh();});
}
window.speechSynthesis?.addEventListener('voiceschanged',refresh);
window.addEventListener('pagehide',()=>{cancel();stopSpeaking();});
const params=new URLSearchParams(location.search);
if(params.get('lang') && language(params.get('lang'))) $('to').value=language(params.get('lang'));
activeTag=to();refresh();engineDescription();
if(params.get('film')){
  const revision=sourceRevision,mode=params.get('mode')==='narration'?'narration':'description';
  try{
    const loadJSON=async path=>{const response=await fetch(new URL(path,import.meta.url));if(!response.ok)throw Error();return response.json();};
    const [catalog,dubs]=await Promise.all([loadJSON('../field/film-text-v5.json?v=6'),mode==='narration'?loadJSON('../dubs-v5/manifest.json?v=6').catch(()=>({})):{}]);
    const slug=params.get('film'),base=catalog[slug];
    const selected=base && mode==='description' ? photoDescription(base,slug,params.get('edition')) : base;
    if(!selected || typeof selected[mode]!=='string' || !selected[mode].trim())throw Error();
    if(revision===sourceRevision){
      film={mode,slug,info:{...selected,originalAudio:originalFilmAudio(slug)},dubs:dubs[slug] || {},original:selected[mode]};
      $('sourceText').value=film.original;$('from').value='en';applyAuthored();
      $('filmNotice').textContent=selected.title+(selected!==base?' · Photo edition':'')+' · English '+mode+' loaded for translation.';refresh();engineDescription();
    }
  }catch{$('filmNotice').textContent='The selected film text is unavailable. You can still open audio or paste a transcript.';}
  if($('filmNotice').textContent)$('filmNotice').hidden=false;
}
