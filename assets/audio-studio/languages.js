// Primary language tags that the bundled multilingual Whisper tiny checkpoint recognizes.
const whisper = new Set('en zh de es ru ko fr ja pt tr pl ca nl ar sv it id hi fi vi he uk el ms cs ro da hu ta no th ur hr bg lt la mi ml cy sk te fa lv bn sr az sl kn et mk br eu is hy ne mn bs kk sq sw gl mr pa si km sn yo so af oc ka be tg sd gu am yi lo uz fo ht ps tk nn mt sa lb my bo tl mg as tt haw ln ha ba jw su'.split(' '));
const voices = new Set('af am an ar as az ba be bg bn bpy bs ca ca-ba ca-nw ca-va chr-US-Qaaa-x-west cmn cmn-latn-pinyin cs cv cy da de el en-029 en-gb en-gb-scotland en-gb-x-gbclan en-gb-x-gbcwmd en-gb-x-rp en-us en-us-nyc eo es es-419 et eu fa fa-latn fi fo fr-be fr-ch fr-fr ga gd gn grc gu hak haw he hi hr ht hu hy hyw ia id io is it ja jbo ka kaa kk kl kn ko kok ku ky la lb lfn lt ltg lv mi mk ml mr ms mt mto my nb nci ne nl nog om or pa pap piqd pl pt pt-br py qdb qu quc qya ro ru ru-cl ru-lv sd shn si sjn sk sl smj sq sr sv sw ta te th ti tk tn tr tt ug uk ur uz vi vi-vn-x-central vi-vn-x-south xex yue'.toLowerCase().split(' '));
const fallbacks = {en:'en-us',fr:'fr-fr',zh:'cmn',no:'nb'};
const extra = 'arc am syr aii swb ar-KW ar-SA ar-EG ar-AE ar-IQ ar-QA ar-LB ar-MA fa-IR fa-AF ml-IN ta-IN ta-LK en-IN en-US en-GB en-AU en-CA es-ES es-MX es-US bn-BD bn-IN ur-PK ur-IN si-LK pt-BR pt-PT zh-CN zh-TW zh-HK fil jv ak av ay bm ce ch co cr dv dz ee ff fj fy gv ho hz ig ii ik iu kg ki kj kr ks kv kw lg li lu mh na nd ng nr nv ny oj os rn rw sc se sg sm ss st to ts tw ty ve vo wa wo xh za zu ckb haw ceb lus bho doi mai mni sat nso tsn gaa chr tet ace'.split(' ');
const overrides = {'ar-KW':'Kuwaiti Arabic','arc':'Aramaic','syr':'Syriac','aii':'Assyrian Neo-Aramaic','am':'Amharic','bn':'Bangla (Bengali)','si':'Sinhala','ml':'Malayalam','fa':'Persian','cmn':'Mandarin Chinese','yue':'Cantonese'};
let names; try { names = new Intl.DisplayNames(['en'],{type:'language'}); } catch {}
export function language(value){
  try { return Intl.getCanonicalLocales(value.trim().replaceAll('_','-'))[0] || ''; } catch {return '';}
}
export function languageName(code){try{return overrides[code] || names?.of(code) || code;}catch{return code;}}
export const catalog = [...new Set([...extra,...whisper,...voices].map(language).filter(Boolean))].sort((a,b)=>languageName(a).localeCompare(languageName(b)));
export function voiceFor(code){
  const lower = code.toLowerCase();
  if(voices.has(lower)) return lower;
  const primary=lower.split('-')[0];
  if(voices.has(primary)) return primary;
  return fallbacks[primary] || '';
}
export function whisperFor(code){
  const primary=code.toLowerCase().split('-')[0];
  const mapped=({cmn:'zh',nb:'no',fil:'tl',jv:'jw'})[primary] || primary;
  return whisper.has(mapped) ? mapped : '';
}
export function translationCode(code){return code === 'ar-KW' ? 'ar' : code;}
export function deviceVoice(code){
  if(!code || !globalThis.speechSynthesis) return null;
  const match = code.toLowerCase(), primary=match.split('-')[0];
  const local=globalThis.speechSynthesis.getVoices().filter(v=>v.localService);
  return local.find(v=>v.lang.toLowerCase().replaceAll('_','-')===match) || local.find(v=>v.lang.toLowerCase().split(/[-_]/)[0]===primary) || null;
}
