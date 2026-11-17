import {voiceList} from './voice-list.js?v=6';
// Primary language tags that the bundled multilingual Whisper tiny checkpoint recognizes.
const whisper = new Set('en zh de es ru ko fr ja pt tr pl ca nl ar sv it id hi fi vi he uk el ms cs ro da hu ta no th ur hr bg lt la mi ml cy sk te fa lv bn sr az sl kn et mk br eu is hy ne mn bs kk sq sw gl mr pa si km sn yo so af oc ka be tg sd gu am yi lo uz fo ht ps tk nn mt sa lb my bo tl mg as tt haw ln ha ba jw su'.split(' '));
const extra = 'hak-Latn uz-Cyrl hr-Cyrl ja-Hira ja-Kana arc syr syc tru aii cld ar-KW ar-AE ar-SA ar-EG ar-IQ ar-QA ar-LB ar-MA fa-IR fa-AF ml-IN ta-IN ta-LK en-IN en-US en-GB en-AU en-CA es-ES es-MX es-US bn-BD bn-IN ur-PK ur-IN si-LK pt-BR pt-PT zh-CN zh-TW zh-HK yue zh-Latn-pinyin pa-PK pa-IN sr-Latn sr-Cyrl fil jv ak av ay bm ce ch co cr dv dz ee ff fj fy gv ho hz ig ii ik iu kg ki kj kr ks kv kw lg li lu mh na nd ng nr nv ny oj os rn rw sc se sg sm ss st to ts tw ty ve vo wa wo xh za zu ckb haw ceb lus bho doi mai mni sat nso tsn gaa chr tet ace'.split(' ');
let names;try{names=new Intl.DisplayNames(['en'],{type:'language'});}catch{}
const overrides = {
  ar:'Standard Arabic','ar-KW':'Kuwaiti Arabic',arc:'Aramaic',syr:'Syriac',syc:'Classical Syriac',
  tru:'Turoyo',aii:'Assyrian Neo-Aramaic',cld:'Chaldean Neo-Aramaic',am:'Amharic',
  bn:'Bangla (Bengali)',si:'Sinhala',ml:'Malayalam',fa:'Persian','fa-AF':'Dari (Afghanistan)',
  yue:'Cantonese', 'zh-HK':'Chinese (Hong Kong)', fil:'Filipino',jv:'Javanese'
};
const normalizeName = value=>value.trim().normalize('NFKC').toLocaleLowerCase();
function canonical(value){
  try{return Intl.getCanonicalLocales(value.trim().replaceAll('_','-'))[0] || '';}catch{return '';}
}
export function languageName(code){
  if(!code)return '';
  try{return overrides[code] || names?.of(code) || code;}catch{return code;}
}
const voiceByCode=new Map(voiceList.map(([key,label])=>[key,label]));
export const catalog=[...new Set([...extra,...whisper,...voiceByCode.keys()].map(canonical).filter(Boolean))]
  .sort((a,b)=>languageName(a).localeCompare(languageName(b)));
const named=new Map(catalog.map(code=>[normalizeName(languageName(code)),code]));
for(const [name,tag] of Object.entries({arabic:'ar',bengali:'bn',bangla:'bn',farsi:'fa',persian:'fa',malayalam:'ml',sinhalese:'si',tamil:'ta',kwaiti:'ar-KW', 'kuwaiti arabic':'ar-KW','mandarin':'zh', 'mandarin chinese':'zh',dari:'fa-AF',syriac:'syr','മലയാളം':'ml','தமிழ்':'ta','हिन्दी':'hi','বাংলা':'bn','සිංහල':'si','اردو':'ur','العربية':'ar','فارسی':'fa','አማርኛ':'am','español':'es'}))named.set(normalizeName(name),tag);
export function language(value){
  if(!value)return '';
  return named.get(normalizeName(value)) || canonical(value);
}
function locale(code){try{return new Intl.Locale(code);}catch{return null;}}
function script(code){return locale(code)?.maximize().script || '';}
function privateOrVariant(code){
  const tag=locale(code);
  return !tag || code.split('-').length > [tag.language,tag.script,tag.region].filter(Boolean).length;
}
export function equivalentTag(code){
  const tag=locale(code);
  if(!tag || !tag.script || privateOrVariant(code))return code;
  const regional=tag.language+(tag.region?'-'+tag.region:'');
  return script(regional)===tag.script ? regional : code;
}
function ambiguousSpokenLanguage(tag){
  return (tag.language==='fa' && tag.region==='AF') || (tag.language==='zh' && ['HK','MO'].includes(tag.region));
}
export function baseFallback(code){
  const tag=locale(code);
  if(!tag || privateOrVariant(code) || ambiguousSpokenLanguage(tag)) return '';
  return script(code)===script(tag.language) ? tag.language : '';
}
const aliases = new Map();
for(const [key,,codes] of voiceList){
  for(const code of codes){
    if(!aliases.has(code))aliases.set(code,key);
  }
}
const defaultVoice={en:'en-us',fr:'fr-fr',zh:'cmn',no:'nb',pt:'pt'};
const latinAmerica=new Set('AR BO BR BZ CL CO CR CU DO EC GT HN MX NI PA PE PR PY SV UY VE US 419'.split(' '));
export function voiceFor(code){
  const tag=locale(code);
  if(!tag)return '';
  const raw=equivalentTag(code).toLowerCase();
  if(tag.language==='hak')return tag.script==='Latn' && !privateOrVariant(code) ? 'hak' : '';
  if(['bs','hr','lfn','mk','sr','uz'].includes(tag.language) && ['Latn','Cyrl'].includes(tag.script) && !privateOrVariant(code))return tag.language;
  if(tag.language==='ja' && ['Hira','Kana','Hrkt'].includes(tag.script) && !privateOrVariant(code))return 'ja';
  if(voiceByCode.has(raw))return raw;
  if(raw==='zh-latn-pinyin')return 'cmn-latn-pinyin';
  if(ambiguousSpokenLanguage(tag))return '';
  if(tag.language==='zh' && !privateOrVariant(code) && ['Hans','Hant'].includes(script(code)))return 'cmn';
  if(aliases.has(raw) && !defaultVoice[raw])return aliases.get(raw);
  const base=baseFallback(code);
  if(!base)return '';
  if(base==='es' && latinAmerica.has(tag.region))return 'es-419';
  const fallback=defaultVoice[base] || base;
  return voiceByCode.has(fallback) ? fallback : '';
}
export function voiceLabel(code){return ({ar:'Standard Arabic',cmn:'Mandarin Chinese','cmn-latn-pinyin':'Mandarin Chinese (Pinyin)'})[code] || voiceByCode.get(code) || languageName(code);}
export function whisperFor(code){
  const tag=locale(code);
  if(!tag || privateOrVariant(code) || ambiguousSpokenLanguage(tag))return '';
  // Whisper predicts its native writing system; it cannot produce an arbitrary requested transliteration.
  if(script(code)!==script(tag.language) && !(tag.language==='zh' && ['Hans','Hant'].includes(script(code))))return '';
  const mapped=({nb:'no',fil:'tl',jv:'jw'})[tag.language] || tag.language;
  return whisper.has(mapped) ? mapped : '';
}
export function translationCode(code){const plain=equivalentTag(code);return plain==='ar-KW' ? 'ar' : plain;}
export function deviceVoices(code, list=globalThis.speechSynthesis?.getVoices() || []){
  if(!code)return [];
  const candidates=list.filter(v=>v.localService).map(v=>({voice:v,tag:canonical(v.lang)})).filter(v=>v.tag);
  const exact=candidates.filter(v=>equivalentTag(v.tag)===equivalentTag(code));
  const base=baseFallback(code);
  const compatible=base ? candidates.filter(v=>!exact.includes(v) && (v.tag===base || (code===base && baseFallback(v.tag)===base))) : [];
  return [...exact,...compatible].map(v=>v.voice);
}
export function deviceVoice(code){return deviceVoices(code)[0] || null;}
// Detect clear writing-system mismatches without guessing a language from names, digits or acronyms.
const supportedScripts={
  Arab:'Arabic',Armn:'Armenian',Beng:'Bengali',Cyrl:'Cyrillic',Deva:'Devanagari',Ethi:'Ethiopic',Grek:'Greek',
  Gujr:'Gujarati',Guru:'Gurmukhi',Hebr:'Hebrew',Knda:'Kannada',Latn:'Latin',Mlym:'Malayalam',Orya:'Oriya',
  Sinh:'Sinhala',Taml:'Tamil',Telu:'Telugu',Thai:'Thai'
};
const scriptPatterns=new Map(Object.entries(supportedScripts).map(([code,name])=>[code,new RegExp('\\p{Script='+name+'}','u')]));
export function writingHint(text,code){
  if(!text || !voiceFor(code))return '';
  const voice=voiceFor(code);
  if(voice==='ar' && /[ء-ي]/u.test(text) && !/[ً-ْ]/u.test(text))return 'eSpeak NG expects fully vowelled Arabic. Add tashkīl for more reliable pronunciation.';
  if(voice==='ja' && /\p{Script=Han}/u.test(text))return 'The bundled Japanese voice reads kana. Enter the kana reading for kanji before rendering.';
  if(voice==='hak')return 'The Hakka voice reads Pha̍k-fa-sṳ romanization in the Sixian accent.';
  const expected=script(code),pattern=scriptPatterns.get(expected);
  if(!pattern)return '';
  let count=0,match=0;
  for(const letter of text.slice(0,1200)){
    if(!/\p{L}/u.test(letter))continue;
    count++;if(pattern.test(letter))match++;
  }
  return count>=6 && match===0 ? 'The selected voice expects '+supportedScripts[expected]+' script. Check the text or choose a matching language and script before creating audio.' : '';
}
