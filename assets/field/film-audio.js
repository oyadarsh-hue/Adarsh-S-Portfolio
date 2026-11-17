// Each film owns its language selection. Only one alternative soundtrack plays at a time.
(() => {
  'use strict';
  const path = new URL('.',document.currentScript.src);
  const site = new URL('../../',path);
  const languages = [
    ['en','English'],['ml','Malayalam · മലയാളം'],['ta','Tamil · தமிழ்'],['hi','Hindi · हिन्दी'],
    ['ur','Urdu · اردو'],['es','Spanish · Español'],['si','Sinhala · සිංහල'],['bn','Bangla · বাংলা'],
    ['ar-KW','Kuwaiti Arabic · كويتي'],['ar','Standard Arabic · العربية'],['am','Amharic · አማርኛ'],
    ['arc','Aramaic'],['fa','Persian · فارسی']
  ];
  const rtl = new Set(['ur','ar','ar-KW','fa','arc']);
  const resources = new Map();
  const deepLink = new URLSearchParams(location.search);
  let active = null;
  function json(url) {
    if (!resources.has(url)) resources.set(url,fetch(new URL(url,site)).then(reply=>{
      if (!reply.ok) throw Error('Unable to load this audio catalog. Close and reopen to retry.');
      return reply.json();
    }).catch(error=>{resources.delete(url);throw error;}));
    return resources.get(url);
  }
  function element(tag,text) {
    const node = document.createElement(tag);
    if (text) node.textContent=text;
    return node;
  }
  function select(label,values) {
    const holder=element('label',label);
    const control=element('select');
    values.forEach(([code,name])=>control.add(new Option(name,code)));
    holder.append(control);
    return [holder,control];
  }
  function button(label,fn) {
    const btn=element('button',label);btn.type='button';btn.addEventListener('click',fn);return btn;
  }
  function stop() {
    if (!active) return;
    const state=active;
    active=null;
    state.controller.abort();
    state.audio.pause();
    if (state.synced) {
      state.video.pause();
      state.video.muted=state.muted;
      state.video.playbackRate=state.rate;
    }
    state.finished();
  }
  document.addEventListener('play',e=>{
    if (active && e.target instanceof HTMLVideoElement && (!active.synced||e.target!==active.video)) stop();
  },true);
  window.addEventListener('pagehide',stop);
  const modules={speech:()=>import(new URL('../audio-studio/speech.js?v=6',path).href), audio:()=>import(new URL('../audio-studio/audio.js?v=6',path).href)};
  for (const card of document.querySelectorAll('.screen-card[data-clip]')) {
    const video=card.querySelector('video');
    const slug=card.dataset.clip;
    const linked=deepLink.get('film')===slug && (deepLink.has('lang') || deepLink.has('track'));
    const panel=element('details');panel.className='film-language';
    panel.append(element('summary','Language & audio description'));
    const body=element('div');body.className='film-language-body';
    panel.append(body);card.append(panel);
    let busy=false,loaded=false;
    panel.addEventListener('toggle',async()=>{
      if (!panel.open || loaded || busy) return;
      busy=true;body.textContent='Loading audio options…';
      try {
        const [catalog,dubs,tracks,locales]=await Promise.all([
          json('assets/field/film-text-v5.json?v=6'),json('assets/dubs-v5/manifest.json?v=6'),
          import(new URL('../audio-studio/film-track.js?v=6',path).href),import(new URL('../audio-studio/languages.js?v=6',path).href)
        ]);
        if (!catalog[slug]) throw Error('The audio catalog has no entry for this film.');
        build(catalog[slug],dubs[slug] || {},tracks.filmTrack,locales);
        loaded=true;
      } catch(error) { body.textContent=error.message; }
      finally {busy=false;}
    });
    if(linked) panel.open=true;
    const targetsFrame=deepLink.get('film')===slug && (!location.hash || location.hash==='#showreel' || location.hash==='#'+card.id);
    if(targetsFrame){
      // Image and font metrics can settle after the browser applies an old #showreel fragment.
      let interacted=false;
      const watch=new AbortController();
      const userMoved=()=>{interacted=true;watch.abort();};
      for(const event of ['wheel','touchstart','pointerdown','keydown']){
        window.addEventListener(event,userMoved,{once:true,passive:true,signal:watch.signal});
      }
      const loaded=document.readyState==='complete' ? Promise.resolve() : new Promise(resolve=>window.addEventListener('load',resolve,{once:true}));
      loaded.then(()=>document.fonts?.ready).then(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{
        if(!interacted)(linked?panel:card).scrollIntoView({behavior:'instant',block:linked?'center':'start'});
        watch.abort();
      })));
    }
    function build(film,dubs,filmTrack,{language,languageName,voiceFor,voiceLabel,writingHint}) {
      body.replaceChildren();
      const hasNarration=Boolean(film.narration);
      const modes=hasNarration?[['narration','Film narration'],['description','Visual description']]:[['description','Visual description']];
      const fields=element('div');fields.className='film-language-fields';
      const [modeField,mode]=select('Track',modes);
      const [langField,lang]=select('Language',languages);
      if(linked){
        const preference=language(deepLink.get('lang') || '');
        if(preference){
          if(![...lang.options].some(o=>o.value===preference))lang.add(new Option(languageName(preference),preference));
          lang.value=preference;
        }
        const track=deepLink.get('track');
        if(modes.some(([value])=>value===track))mode.value=track;
      }
      fields.append(modeField,langField);
      const availability=element('p');
      const controls=element('div');controls.className='film-audio-actions';
      const note=element('p');note.setAttribute('role','status');
      const copy=element('details'),copyTitle=element('summary','Read this track');
      const pair=element('div');pair.className='film-text-pair';
      const originalBlock=element('div'),original=element('p');
      original.lang='en';originalBlock.append(element('strong','English original'),original);
      const targetBlock=element('div'),targetTitle=element('strong'),transcript=element('p');
      targetBlock.append(targetTitle,transcript);pair.append(originalBlock,targetBlock);copy.append(copyTitle,pair);
      const studio=element('a','Open in Audio Studio · more languages ↗');
      const listen=button('Listen',()=>play(false));
      const together=button('Play with film',()=>play(true));
      const prepare=button('Generate voice',generate);
      const halt=button('Stop audio',stop);
      const exportBtn=button('Prepare WAV',excerpt);
      const download=element('a','Download audio ↓');
      controls.append(prepare,listen,together,halt,exportBtn,download);
      const personal=element('details');
      personal.append(element('summary','Use my own voice recording'));
      const uploadLabel=element('label','Choose a recording for this language and track. It stays in this tab.');
      const upload=element('input');upload.type='file';upload.accept='audio/*,.mp3,.wav,.m4a,.ogg,.opus,.flac,.aac,.aiff';
      upload.setAttribute('aria-label','Local recording for the selected language and track');
      uploadLabel.append(upload);personal.append(uploadLabel);
      body.append(fields,availability,controls,copy,personal,studio,note);
      let record,request,ownUrl,exportUrl,revision=0;
      function release() {
        request?.abort();
        if (active?.panel===panel) stop();
        if (ownUrl) URL.revokeObjectURL(ownUrl);
        if (exportUrl) URL.revokeObjectURL(exportUrl);
        ownUrl=exportUrl=null;
      }
      function display() {
        release();revision++;note.textContent='';upload.value='';prepare.disabled=false;exportBtn.disabled=false;
        const code=lang.value;
        const desc=mode.value==='description';
        record=filmTrack(film,dubs,mode.value,code,site) || {text:'',textCode:code,src:null,start:0,end:null,native:false};
        const {text,src,native,textCode,voice}=record;
        const synth=voiceFor(textCode),name=languageName(textCode);
        const dialect=code==='ar-KW' ? 'Kuwaiti wording. ' : '';
        availability.textContent=src ? (desc?'Recorded visual overview':'Recorded narration')+' · '+dialect+voice+'.'
          : native ? 'Original English narration in the film.'
          : text && synth ? dialect+'Generate a synthetic '+voiceLabel(synth)+' voice for the '+name+' text. '+writingHint(text,textCode)
          : text ? 'Read the translation or add your own voice recording.'
          : 'No portfolio translation or voice for '+languageName(code)+'. Read the English original, add your own recording, or enter a translation in Audio Studio.';
        original.textContent=desc?film.description:film.narration;
        targetTitle.textContent=name+' translation';
        transcript.lang=textCode;transcript.dir=rtl.has(textCode)?'rtl':'auto';transcript.textContent=text;
        targetBlock.hidden=!text || textCode==='en';
        copyTitle.textContent=targetBlock.hidden?'Read the English original':'Compare original and translation';
        prepare.hidden=Boolean(src || native || !text || !synth);
        listen.hidden=!src;together.hidden=desc || (!native && !src);
        exportBtn.hidden=!src || record.end===null;
        download.hidden=!(record.src&&record.end===null);
        if (!download.hidden) {download.href=record.src;download.download=slug+'-'+code+(/\.m4a(?:$|\?)/.test(record.src)?'.m4a':'.mp3');}
        halt.hidden=true;
        const target=new URL('audio-studio.html',site);
        target.search=new URLSearchParams({film:slug,mode:mode.value,lang:code,v:'6'});
        studio.href=target.href;
      }
      async function generate() {
        const version=revision;
        const controller=new AbortController();request=controller;prepare.disabled=true;note.textContent='Preparing the local voice…';
        try {
          const speech=await modules.speech();
          const blob=await speech.synthesizeWav(record.text,record.textCode,{signal:controller.signal,onProgress:text=>{if(version===revision)note.textContent=text;}});
          if(version!==revision)return;
          ownUrl=URL.createObjectURL(blob);record.src=ownUrl;
          listen.hidden=false;together.hidden=mode.value==='description';prepare.hidden=true;
          download.hidden=false;download.href=ownUrl;download.download=slug+'-'+lang.value+'.wav';note.textContent='Voice ready to play or download.';
        } catch(error) { if(version===revision) note.textContent=error.message; }
        finally {if(version===revision)prepare.disabled=false;}
      }
      async function excerpt() {
        const version=revision,controller=new AbortController();request=controller;exportBtn.disabled=true;note.textContent='Preparing this description as a WAV…';
        try {
          const {decode,wavBlob}=await modules.audio();
          const response=await fetch(record.src,{signal:controller.signal});
          if(!response.ok)throw Error('Audio could not be downloaded. Try again.');
          const buffer=await decode(await response.blob());
          if(version!==revision)return;
          const first=Math.max(0,Math.round(record.start*buffer.sampleRate));
          const last=Math.min(buffer.length,Math.round(record.end*buffer.sampleRate));
          const channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i).subarray(first,last));
          exportUrl=URL.createObjectURL(wavBlob(channels,buffer.sampleRate));
          download.href=exportUrl;download.download=slug+'-description-'+lang.value+'.wav';
          download.hidden=false;exportBtn.hidden=true;note.textContent='Your description is ready to download.';
        } catch(error) {if(version===revision)note.textContent=error.message;}
        finally {if(version===revision)exportBtn.disabled=false;}
      }
      async function play(synced) {
        stop();
        if (record.native && !record.src) {
          try {await video.play();note.textContent='Playing the original English track.';}
          catch {note.textContent='Press Play on the video to start.';}
          return;
        }
        document.querySelectorAll('video').forEach(v=>v.pause());
        const audio=new Audio(record.src);
        const controller=new AbortController();
        const options={signal:controller.signal};
        const state={panel,audio,video,synced,controller,rate:video.playbackRate,muted:video.muted,finished:()=>{halt.hidden=true;note.textContent='';}};
        active=state;
        halt.hidden=false;
        audio.preload='auto';
        audio.currentTime=record.start||0;
        if(record.end!==null) audio.addEventListener('timeupdate',()=>{if(audio.currentTime>=record.end)stop();},options);
        audio.addEventListener('ended',stop,options);
        audio.addEventListener('error',()=>{stop();note.textContent='Audio could not play. Reopen the track and try again.';},options);
        try {
          if (synced) {
            video.muted=true;
            // Spread the translated narration across the same film, preserving the speaker's natural pace.
            function align(fromVideo=false) {
              if (!(video.duration>0 && audio.duration>0)) return;
              video.playbackRate=Math.max(.25,Math.min(4,video.duration/audio.duration));
              if (fromVideo) audio.currentTime=Math.min(audio.duration-.025,Math.max(0,video.currentTime/video.duration*audio.duration));
            }
            video.currentTime=0;
            audio.addEventListener('loadedmetadata',()=>align(),options);
            video.addEventListener('loadedmetadata',()=>align(),options);
            video.addEventListener('seeked',()=>align(true),options);
            video.addEventListener('pause',()=>{if(active===state)audio.pause();},options);
            video.addEventListener('play',()=>{if(active===state&&audio.paused)audio.play().catch(()=>{});},options);
            video.addEventListener('ended',stop,options);
            await Promise.all([audio.play(),video.play()]);
            align();
          } else await audio.play();
          if (active===state) note.textContent=synced?'Playing translated narration with the film.':'Playing this audio track.';
        } catch {
          if(active===state){stop();note.textContent='Playback could not start. Tap the playback button again.';}
        }
      }
      upload.addEventListener('change',() => {
        const file=upload.files[0];
        if (!file) return;
        if (!file.size) {note.textContent='Choose a recording with audio.';return;}
        release();revision++;
        ownUrl=URL.createObjectURL(file);
        record={...record,native:false,src:ownUrl,start:0,end:null};
        prepare.hidden=true;exportBtn.hidden=true;listen.hidden=false;
        together.hidden=mode.value==='description';
        download.download=file.name;download.href=ownUrl;download.hidden=false;
        availability.textContent='Your recording · '+file.name;
        note.textContent='Ready to play. Choose another language or track to return to the portfolio audio.';
      });
      mode.addEventListener('change',display);lang.addEventListener('change',display);
      display();
    }
  }
})();
