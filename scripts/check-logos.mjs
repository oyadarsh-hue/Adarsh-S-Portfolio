import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/images/logos/sources.json'), 'utf8'));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.equal(manifest.logos.length, 5, 'Expected three employers and two verified institutions');
assert.equal(new Set(manifest.logos.map(x => x.organization)).size, 5, 'Each organization needs its own record');
for (const logo of manifest.logos) {
  assert(logo.source_page.startsWith('https://'), `Missing source page: ${logo.organization}`);
  assert(logo.image_url.startsWith('https://'), `Missing image source: ${logo.organization}`);
  const file = `assets/images/logos/${logo.file}`;
  const bytes = fs.readFileSync(path.join(root, file));
  assert(bytes.length > 100, `Empty logo: ${file}`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), logo.sha256, `Original image changed: ${file}`);
  assert(html.includes(`src="${file}"`), `Logo not displayed: ${file}`);
}
assert.equal((html.match(/class="organization-identity"/g) || []).length, 5, 'Expected five verified logo blocks');
assert(html.includes('href="https://bluegensolutions.com/"'), 'Bluegen website missing');
assert(!html.includes('argon-hyper'), 'Do not reintroduce the superseded redesign');
console.log('PASS: five authentic organization marks, original image hashes, source records and Bluegen link.');
