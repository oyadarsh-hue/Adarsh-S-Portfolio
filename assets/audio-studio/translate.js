import {translationCode,equivalentTag} from './languages.js?v=6';
const encoder=new TextEncoder();
// The provider caps each query at 500 UTF-8 bytes. Cut on whitespace when possible.
export function chunks(text,limit=470){
  const result=[];let words='',bytes=0;
  for(const part of text.match(/\S+|\s+/gu)||[]){
    const size=encoder.encode(part).length;
    if(size<=limit){
      if(bytes+size>limit){result.push(words);words='';bytes=0;}
      words+=part;bytes+=size;
    }else{
      if(words){result.push(words);words='';bytes=0;}
      for(const ch of part){
        const n=encoder.encode(ch).length;
        if(bytes+n>limit){result.push(words);words='';bytes=0;}
        words+=ch;bytes+=n;
      }
    }
  }
  if(words) result.push(words);return result;
}
function decodeEntities(text){
  const named={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
  return text.replace(/&(#(?:x[\da-f]+|\d+)|amp|lt|gt|quot|apos|nbsp);/gi,(all,entity)=>{
    if(entity[0]!=='#') return named[entity.toLowerCase()] || all;
    const hex=entity[1].toLowerCase()==='x';
    const n=parseInt(entity.slice(hex?2:1),hex?16:10);return n>0 && n<=0x10ffff ? String.fromCodePoint(n) : all;
  });
}
export async function translateText(text,from,to,{engine,consent,onProgress,signal}){
  const sourceLanguage=translationCode(from),targetLanguage=translationCode(to);
  if(equivalentTag(from)===equivalentTag(to)) return {text,language:to,method:'Source and output languages match. The original text is ready.'};
  if(sourceLanguage===targetLanguage) throw Error('The translation engine uses the same language for both dialects. Enter the intended regional wording in Translated text.');
  if(engine==='local'){
    if(!globalThis.Translator) throw Error('On-device translation is unavailable in this browser. Select the online text service or enter the translation yourself.');
    const options={sourceLanguage,targetLanguage};
    let translator;
    try{
      translator=await Translator.create({...options,signal,monitor(m){m.addEventListener('downloadprogress',event=>onProgress('Downloading the browser language pack · '+Math.round(event.loaded*100)+'%'));}});
    }catch(error){
      if(error.name==='AbortError')throw error;
      throw Error('The local language pair could not start. Choose MyMemory or enter the translation yourself. '+error.message);
    }
    try {onProgress('Translating on this device…'); return {text:await translator.translate(text,{signal}),language:targetLanguage,method:'Translated on this device.'};}
    finally{translator.destroy();}
  }
  if(!consent) throw Error('Give permission to send the transcript text and language pair to MyMemory.');
  const segments=chunks(text);const output=[];
  for(let i=0;i<segments.length;i++){
    signal.throwIfAborted();
    const segment=segments[i], query=segment.trim();
    if(!query){output.push(segment);continue;}
    onProgress('Translating passage '+(i+1)+' of '+segments.length+'…');
    const url=new URL('https://api.mymemory.translated.net/get');
    url.search=new URLSearchParams({q:query,langpair:sourceLanguage+'|'+targetLanguage,mt:'1'}).toString();
    const response=await fetch(url,{signal,credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store'});
    if(!response.ok) throw Error('MyMemory returned HTTP '+response.status+'. Try again later or edit the translation below.');
    const data=await response.json();
    if(Number(data.responseStatus)!==200 || data.quotaFinished || !data.responseData?.translatedText?.trim()) throw Error('MyMemory could not translate this language pair. '+(data.responseDetails || 'Its free quota or language coverage may limit this request.'));
    const leading=segment.match(/^\s*/u)[0], trailing=segment.match(/\s*$/u)[0];
    output.push(leading+decodeEntities(data.responseData.translatedText.trim())+trailing);
  }
  return {text:output.join(''),language:targetLanguage,method:'Translated by MyMemory. Review the wording before exporting.'};
}
