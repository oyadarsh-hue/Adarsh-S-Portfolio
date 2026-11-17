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
  const modules={speech:()=>import(new URL('../audio-studio/speech.js',path).href), audio:()=>import(new URL('../audio-studio/audio.js',path).href)};
  for (const card of document.querySelectorAll('.screen-card[data-clip]')) {
    const video=card.querySelector('video');
    const slug=card.dataset.clip;
    const panel=element('details');panel.className='film-language';
    panel.append(element('summary','Language & audio description'));
    const body=element('div');body.className='film-language-body';
    panel.append(body);card.append(panel);
    let busy=false,loaded=false;
    panel.addEventListener('toggle',async()=>{
      if (!panel.open || loaded || busy) return;
      busy=true;body.textContent='Loading audio options…';
      try {
        const [catalog,dubs]=await Promise.all([json('assets/field/film-text-v5.json'),json('assets/dubs-v5/manifest.json')]);
        if (!catalog[slug]) throw Error('The audio catalog has no entry for this film.');
        build(catalog[slug],dubs[slug]||{});
        loaded=true;
      } catch(error) { body.textContent=error.message; }
      finally {busy=false;}
    });
    function build(film,dubs) {
      body.replaceChildren();
      const hasNarration=Boolean(film.narration);
      const modes=hasNarration?[['narration','Film narration'],['description','Visual description']]:[['description','Visual description']];
      const fields=element('div');fields.className='film-language-fields';
      const [modeField,mode]=select('Track',modes);
      const [langField,lang]=select('Language',languages);
      fields.append(modeField,langField);
      const availability=element('p');
      const controls=element('div');controls.className='film-audio-actions';
      const note=element('p');note.setAttribute('role','status');
      const copy=element('details');copy.append(element('summary','Read this track'));
      const transcript=element('p');copy.append(transcript);
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
      const makeURL=src=>new URL(src,site).href;
      function release() {
        request?.abort();
        if (active?.panel===panel) stop();
        if (ownUrl) URL.revokeObjectURL(ownUrl);
        if (exportUrl) URL.revokeObjectURL(exportUrl);
        ownUrl=exportUrl=null;
      }
      function display() {
        release();revision++;note.textContent='';upload.value='';
        const code=lang.value;
        const desc=mode.value==='description';
        const dub=dubs[code];
        const sprite=film.audio?.[code];
        const words=desc ? (film.translations?.[code]||(code==='en'?film.description:'')) : (dub?.text||(code==='en'?film.narration:''));
        const native=!desc&&code==='en';
        record={words,native,src:null,start:0,end:null};
        if (desc&&sprite) Object.assign(record,{src:makeURL(sprite.src),start:sprite.start,end:sprite.end});
        if (!desc&&dub?.src) record.src=new URL(dub.src,new URL('assets/dubs-v5/',site)).href;
        const mapped=(code==='ar-KW')?' The local voice uses Standard Arabic pronunciation.':'';
        availability.textContent=record.src ? ((desc?'Recorded visual overview.':'Recorded narration.')+mapped) : native ? 'The film includes its original English narration.' : words ? 'Generate a local voice for this translation.'+mapped : 'A bundled version of this track is unavailable in this language. Audio Studio shows the available translation and voice options.';
        transcript.lang=code;transcript.dir=rtl.has(code)?'rtl':'auto';transcript.textContent=words||'';
        copy.hidden=!words;
        prepare.hidden=Boolean(record.src||native||!words);
        listen.hidden=!record.src;
        together.hidden=desc||(!native&&!record.src);
        exportBtn.hidden=!sprite||!desc;
        download.hidden=!(record.src&&record.end===null);
        if (!download.hidden) {download.href=record.src;download.download=slug+'-'+code+(/\.m4a(?:$|\?)/.test(record.src)?'.m4a':'.mp3');}
        halt.hidden=true;
        const target=new URL('audio-studio.html',site);
        target.search=new URLSearchParams({film:slug,mode:mode.value,lang:code});
        studio.href=target.href;
      }
      async function generate() {
        const version=revision;
        request=new AbortController();prepare.disabled=true;note.textContent='Preparing the local voice…';
        try {
          const speech=await modules.speech();
          const blob=await speech.synthesizeWav(record.words,lang.value,{signal:request.signal,onProgress:text=>{if(version===revision)note.textContent=text;}});
          if(version!==revision)return;
          ownUrl=URL.createObjectURL(blob);record.src=ownUrl;
          listen.hidden=false;together.hidden=mode.value==='description';prepare.hidden=true;
          download.hidden=false;download.href=ownUrl;download.download=slug+'-'+lang.value+'.wav';note.textContent='Voice ready to play or download.';
        } catch(error) { if(version===revision) note.textContent=error.message; }
        finally {prepare.disabled=false;}
      }
      async function excerpt() {
        const version=revision;exportBtn.disabled=true;note.textContent='Preparing this description as a WAV…';
        try {
          const {decode,wavBlob}=await modules.audio();
          const response=await fetch(record.src);
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
        finally {exportBtn.disabled=false;}
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
