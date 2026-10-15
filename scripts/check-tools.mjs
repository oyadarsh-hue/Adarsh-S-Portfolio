import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {analyze,selectedIds,buildBrief}=require('../assets/js/workbench.js');
const {raceEvents,sha256}=require('../assets/js/lab.js');
const {projects}=require('../assets/js/workbench-data.js');
const ids=text=>analyze(text).map(s=>s.id);
assert.deepEqual(ids('JavaScript, React.js, C#'),['react','javascript','csharp']);
assert.deepEqual(ids(' Ｐｙｔｈｏｎ / Django, postgres '),['python','django','postgresql']);
assert.deepEqual(ids('reactive dispatch javaBeans'),[]);
assert.equal(analyze('AWS')[0].projects.length,0);
assert.deepEqual(selectedIds(['quietnote','invalid','quietnote','assenttag','aegisforge-x','deciphera']),['quietnote','assenttag','aegisforge-x']);
assert.equal(analyze('PostgreSQL')[0].projects[0].id,'quietnote');
const brief=buildBrief({company:'Example\nCompany',role:'Backend Developer',ids:['quietnote','invalid']});
assert(brief.includes('Prepared for: Example Company'));
assert(brief.includes('not end-to-end encrypted'));
assert(brief.includes('Original CV: https://'));
assert(!brief.includes('AssentTag'));
for(const p of projects) assert(fs.existsSync(fileURLToPath(new URL('../projects/'+p.id+'.html',import.meta.url))));
for(const count of [2,5,25]) {
  const unsafe=raceEvents('unsafe',count);
  assert.equal(unsafe.filter(e=>e.success).length,count);
  assert(unsafe.slice(0,count).every(e=>e.action==='read' && !e.success));
  const atomic=raceEvents('atomic',count);
  assert.equal(atomic.filter(e=>e.success).length,1);
  for(const state of ['expired','revoked']) for(const mode of ['unsafe','atomic'])
    assert.equal(raceEvents(mode,count,state).filter(e=>e.success).length,0);
}
assert.equal(await sha256('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
assert.equal(await sha256(''),'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
assert.notEqual(await sha256('é'),await sha256('e'));
assert.notEqual(await sha256('note'),await sha256('note '));
console.log('PASS: term boundaries, missing evidence, selection limits, brief scope, race schedules and SHA-256 known vectors.');
