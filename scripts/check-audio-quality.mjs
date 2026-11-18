import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'portfolio-audio-test-'));
fs.writeFileSync(path.join(fixture,'package.json'),JSON.stringify({type:'module'}));
for(const file of ['translate.js','film-track.js','languages.js','voice-list.js','photo-descriptions.js'])fs.copyFileSync(new URL('../assets/audio-studio/'+file,import.meta.url),path.join(fixture,file));
const {chunks}=await import(pathToFileURL(path.join(fixture,'translate.js')));
const {filmTrack}=await import(pathToFileURL(path.join(fixture,'film-track.js')));
const {photoDescription}=await import(pathToFileURL(path.join(fixture,'photo-descriptions.js')));
process.on('exit',()=>fs.rmSync(fixture,{recursive:true,force:true}));
const encoder=new TextEncoder();
for(const text of ['First sentence. Second sentence stays together.','മലയാളം വാചകം. അടുത്ത വാചകം ഇവിടെ.','日本語の文です。次の文です。','One\n\ntwo.   Three?','a'.repeat(900),'😀'.repeat(400)]){
 for(const limit of [20,50,470]){
  const parts=chunks(text,limit);assert.equal(parts.join(''),text);
  assert(parts.every(p=>encoder.encode(p).length<=limit));
 }
}
assert.deepEqual(chunks('One sentence. Next sentence.',20),['One sentence. ','Next sentence.']);
assert.throws(()=>chunks('Hello',1),RangeError);
const film={narration:'Original English words.',originalAudio:'assets/clips/assenttag-hd.mp4'};
const en=filmTrack(film,{},'narration','en',new URL('https://example.com/portfolio/'));
assert.equal(en.native,true);assert.equal(en.src,'https://example.com/portfolio/assets/clips/assenttag-hd.mp4?v=6');
assert.equal(en.voice,'Original film soundtrack · English');
assert.equal(filmTrack({...film,originalAudio:'https://evil.test/a.mp4'},{},'narration','en',new URL('https://example.com/')).src,null);
const ml=filmTrack(film,{ml:{text:'മലയാളം',src:'assenttag-ml.m4a',voice:'Meera',language:'ml-IN'}},'narration','ml-IN',new URL('https://example.com/'));
assert(ml.src.includes('assenttag-ml.m4a'));assert.equal(ml.native,false);
const source=fs.readFileSync(new URL('../assets/audio-studio/studio.js',import.meta.url),'utf8');
assert(source.includes("film=null;sourceRevision++;drafts.clear()"));
assert(source.includes("originalAudio:originalFilmAudio(slug)"));
const html=fs.readFileSync(new URL('../audio-studio.html',import.meta.url),'utf8');assert(html.includes('id="qualityNote"'));
const field=JSON.parse(fs.readFileSync(new URL('../assets/field/film-text-v5.json',import.meta.url)));
for(const [slug,word] of Object.entries({mca:'main block',bsc:'motherboard',hse:'microscope',sslc:'Churam',bluegen:'laptop',skybrisk:'keyboard',codtech:'network cables'})){
 const original=field[slug],site=new URL('https://example.com/');
 const photo=photoDescription(original,slug,null);
 assert.notEqual(photo,original);
 assert(photo.description.includes(word));
 assert.equal(photo.narration,original.narration);
 assert.equal(photoDescription(original,slug,'original'),original);
 assert.equal(filmTrack(photo,{},'description','en',site).src,null);
 assert.equal(filmTrack(photo,{},'description','ml-IN',site).textCode,'ml');
 assert.equal(filmTrack(photo,{},'description','ar-KW',site),null);
}
assert.equal(photoDescription(field.assenttag,'assenttag','photo'),field.assenttag);
console.log('PASS: UTF-8 sentence-aware chunks, exact text reconstruction, native soundtrack preservation, source URL boundary, existing dub retention, source reset and voice disclosure.');
