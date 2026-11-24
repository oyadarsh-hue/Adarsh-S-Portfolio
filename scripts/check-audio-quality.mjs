import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'portfolio-audio-test-'));
fs.writeFileSync(path.join(fixture,'package.json'),JSON.stringify({type:'module'}));
const moduleDirectory = new URL('../assets/audio-studio/', import.meta.url);
for (const file of fs.readdirSync(moduleDirectory).filter(name => name.endsWith('.js'))) {
  fs.copyFileSync(new URL(file, moduleDirectory), path.join(fixture, file));
}
fs.mkdirSync(path.join(fixture, 'documentary-v8'));
fs.copyFileSync(new URL('documentary-v8/catalog.js', moduleDirectory), path.join(fixture, 'documentary-v8/catalog.js'));
const {chunks}=await import(pathToFileURL(path.join(fixture,'translate.js')));
const {filmTrack}=await import(pathToFileURL(path.join(fixture,'film-track.js')));
const {photoDescription}=await import(pathToFileURL(path.join(fixture,'photo-descriptions.js')));
const {descriptionForEdition, resolveEdition, documentaryMedia}=await import(pathToFileURL(path.join(fixture,'film-editions-v8.js')));
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
const html=fs.readFileSync(new URL('../audio-studio.html',import.meta.url),'utf8');assert(html.includes('id="qualityNote"'));
const field=JSON.parse(fs.readFileSync(new URL('../assets/field/film-text-v5.json',import.meta.url)));
for(const [slug,word] of Object.entries({mca:'main block',bsc:'motherboard',hse:'microscope',sslc:'Churam',bluegen:'laptop',skybrisk:'keyboard',codtech:'network cables'})){
 const original=field[slug],site=new URL('https://example.com/');
 const photo=photoDescription(original,slug,'photo');
 assert.notEqual(photo,original);
 assert(photo.description.includes(word));
 assert.equal(photo.narration,original.narration);
 assert.equal(photoDescription(original,slug,'original'),original);
 assert.equal(filmTrack(photo,{},'description','en',site).src,null);
 assert.equal(filmTrack(photo,{},'description','ml-IN',site).textCode,'ml');
 for (const lang of ['hi','ta','es','ur','bn','fa','si','ar-KW']){
   const track=filmTrack(photo,{},'description',lang,site);
   assert.equal(track.textCode,lang);
   assert.equal(track.src,null);
   assert(track.text.length>50 && track.text!==photo.description);
 }
 assert.equal(filmTrack(photo,{},'description','arc',site),null);
 const edition = resolveEdition(slug, null);
 assert.equal(edition, 'documentary');
 const doc = descriptionForEdition(original, slug, edition);
 assert.notEqual(doc.description, photo.description);
 assert.equal(doc.narration, original.narration);
 assert.equal(documentaryMedia(slug, edition), 'assets/film-v8/' + slug + '-hd.mp4');
 assert.equal(documentaryMedia(slug, 'photo'), 'assets/photo-editions/' + slug + '.mp4');
 for (const lang of ['en','ml','ta','hi','ur','bn','si','es','ar','ar-KW','am','fa']) {
   const track = filmTrack(doc, {}, 'description', lang, site);
   assert.equal(track.textCode, lang);
   assert(track.text.length > 20 && track.start >= 0 && track.end > track.start);
   const file = new URL(track.src).pathname;
   assert.equal(file, '/assets/audio-studio/documentary-v8/' + lang + '.mp3');
   assert(fs.statSync(new URL('..' + file, import.meta.url)).size > 1000);
 }
}
assert.equal(photoDescription(field.assenttag,'assenttag','photo'),field.assenttag);
console.log('PASS: UTF-8 chunks, original tracks and dubs, edition routing, and 84 recorded documentary descriptions.');
