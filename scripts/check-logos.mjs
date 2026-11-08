import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/images/logos/sources.json'), 'utf8'));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.equal(manifest.logos.length, 6, 'Expected three employers and three verified institutions');
assert.equal(new Set(manifest.logos.map(x => x.organization)).size, 6, 'Each organization needs its own record');
for (const logo of manifest.logos) {
  assert(logo.source_page.startsWith('https://'), `Missing source page: ${logo.organization}`);
  if (logo.source_type !== "user_supplied") assert(logo.image_url.startsWith('https://'), `Missing image source: ${logo.organization}`);
  const file = `assets/images/logos/${logo.file}`;
  const bytes = fs.readFileSync(path.join(root, file));
  assert(bytes.length > 100, `Empty logo: ${file}`);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), logo.sha256, `Original image changed: ${file}`);
  assert(html.includes(`src="${file}"`), `Logo not displayed: ${file}`);
}
assert.equal((html.match(/class="organization-identity(?: [^"]*)?"/g) || []).length, 6, 'Expected six verified logo blocks');
assert(html.includes('href="https://bluegensolutions.com/"'), 'Bluegen website missing');
assert(!html.includes('argon-hyper'), 'Do not reintroduce the superseded redesign');
const mgm = html.match(/<article class="timeline-item" id="education-mgm">([\s\S]*?)<\/article>/)?.[1];
assert(mgm && !mgm.includes('<a '), 'MGM emblem must be image-only, without a link');
assert(mgm.includes('school-identity'), 'School emblem needs the larger responsive layout');

const certificates = JSON.parse(fs.readFileSync(path.join(root, 'assets/images/certificates/sources.json'), 'utf8'));
const section = html.match(/<section id="certifications"[\s\S]*?<\/section>/)?.[0];
assert(section, 'Certificate section missing');
const cards = [...section.matchAll(/<article class="cert-card">([\s\S]*?)<\/article>/g)].map(x => x[1]);
assert.equal(cards.length, 15, 'Preserve every existing course');
assert(section.includes('class="more-credentials" open'), 'Additional courses should be visible initially');
const sources = new Map(certificates.logos.map(x => [x.organization, x]));
const pending = new Set(certificates.pending.map(x => x.organization));
let displayed = 0;
for (const card of cards) {
  const label = card.match(/class="certificate-provider-name">([^<]+)</)?.[1];
  assert(label, 'Every course must retain its organization label');
  const organization = label === 'NPTEL, IIT' ? 'NPTEL' : label;
  const logo = sources.get(organization);
  if (logo) {
    assert(card.includes(`src="assets/images/certificates/${logo.file}"`), `Missing course issuer logo: ${label}`);
    displayed += 1;
  } else {
    assert(pending.has(organization), `Untracked missing issuer: ${organization}`);
    assert(!card.includes('<img'), `Do not substitute an unverified logo: ${organization}`);
  }
}
for (const logo of certificates.logos) {
  assert(logo.source_page.startsWith('https://') && logo.image_url.startsWith('https://'), `Missing issuer source: ${logo.organization}`);
  const bytes = fs.readFileSync(path.join(root, 'assets/images/certificates', logo.file));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), logo.sha256, `Issuer asset modified: ${logo.organization}`);
  if (logo.file.endsWith('.svg')) assert(!/<script|<foreignObject|(?:href|src)=["']https?:/i.test(bytes.toString()), `External or active SVG content: ${logo.file}`);
}
console.log(`PASS: six organization marks and ${certificates.logos.length} authentic course providers on ${displayed}/15 cards; original hashes, larger unlinked MGM and Bluegen link.`);
