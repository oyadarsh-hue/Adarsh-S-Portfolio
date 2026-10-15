import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {matchesProject, validFocus} = require('../assets/js/recruiter.js');
const projects = [
  {tags:'web vision',text:'AssentTag Python Django face privacy'},
  {tags:'vision',text:'EpigraphiX-AI OpenCV OCR Sauvola'},
  {tags:'security',text:'AegisForge-X Python source security'},
  {tags:'experiment',text:'Deciphera JavaScript ledger'},
  {tags:'web security',text:'QuietNote TypeScript PostgreSQL one-time access'}
];
const select = (focus, query = '') => projects.filter(p => matchesProject(p, focus, query));
assert.equal(select('all').length, 5);
assert.equal(select('web').length, 2);
assert.equal(select('vision').length, 2);
assert.equal(select('security').length, 2);
assert.equal(select('experiment').length, 1);
assert.equal(select('web', ' POSTGRESQL  one-time ').length, 1);
assert.equal(select('vision','postgresql').length, 0);
assert.equal(select('all', 'ｄｊａｎｇｏ').length, 1);
assert.equal(select('all', '<script>alert(1)</script>').length, 0);
assert.equal(select('all','missing').length, 0);
assert.equal(select('all','\n\t').length, 5);
assert.equal(validFocus('unknown'), 'all');
assert.equal(validFocus(null), 'all');
console.log('PASS: role filters, combined search, normalization, empty states and unknown focus.');
