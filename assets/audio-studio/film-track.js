import {educationTerm,projectTerm} from './education-terms-v8.js?v=8';
import {baseFallback,equivalentTag,languageName} from './languages.js?v=6';
const recordedLocales={en:'en-US',ml:'ml-IN',hi:'hi-IN',ur:'ur-PK',bn:'bn-BD',es:'es-ES',ar:'ar-JO','ar-KW':'ar-JO',fa:'fa-IR'};
function audioURL(path,site){
  const url=new URL(path,site),assets=new URL('assets/',site);
  if(url.origin!==assets.origin || !url.pathname.startsWith(assets.pathname))return null;
  url.searchParams.set('v','6');
  return url.href;
}
export function filmTrack(film,dubs,mode,tag,site){
  if(!tag)return null;
  const description=mode==='description';
  const translations=description ? film.translations : dubs;
  const base=baseFallback(tag);
  const textCode=[tag,equivalentTag(tag),base].find(code=>code && (translations?.[code] || code==='en'));
  if(!textCode)return null;
  const entry=translations?.[textCode];
  const text=description ? entry || film.description : entry?.text || (textCode==='en' ? film.narration : '');
  if(!text)return null;
  const track={text,textCode,native:!description && textCode==='en',src:null,start:0,end:null,voice:''};
  if(track.native && film.originalAudio){
    track.src=audioURL(film.originalAudio,site);
    track.voice='Original film soundtrack · English';
  }
  if(description){
    const sprite=film.audio?.[textCode];
    if(sprite?.src && Number.isFinite(sprite.start) && sprite.end>sprite.start){
      Object.assign(track,{src:audioURL(sprite.src,site),start:sprite.start,end:sprite.end,
        voice:recordedVoice(sprite,textCode)});
    }
  }else if(entry?.src){
    Object.assign(track,{src:audioURL('assets/dubs-v5/'+entry.src,site),voice:recordedVoice(entry,textCode)});
  }
  return track;
}
function recordedVoice(record,code){
  if(record.voice==='eSpeak NG')return 'eSpeak NG · '+languageName(record.voiceLanguage || code);
  const voice=record.voice?.split(' (')[0]?.split(' · ')[0] || (code==='ml'?'Meera':'');
  const kareem=(code==='ar' || code==='ar-KW') && voice==='Kareem';
  const actual=record.voiceLanguage || (kareem?'ar-JO':'') || record.language || recordedLocales[code] || code;
  if((code==='ar-KW' || code==='ar') && actual==='ar-JO')return 'Jordanian Arabic voice'+(voice?' · '+voice:'');
  return [voice,languageName(actual)].filter(Boolean).join(' · ');
}

export function showFilmNote(container,slug,code){
  const education=educationTerm(slug,code);
  const note=education || projectTerm(slug,code);
  container.hidden=!note;
  if(!note){container.replaceChildren();return;}
  const label=document.createElement('strong');label.textContent=education?'Education note':'Project note';
  const text=document.createElement('span');text.textContent=note;text.lang=code;text.dir='auto';
  container.dataset.noteKind=education?'education':'project';
  container.replaceChildren(label,document.createElement('br'),text);
}
