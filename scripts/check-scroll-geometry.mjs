import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const window = {scrollY: 0};
vm.runInNewContext(fs.readFileSync(new URL('../assets/js/scroll-geometry.js', import.meta.url), 'utf8'), {window});
const section = {offsetTop: 1200, clientTop: 2, offsetParent: null};
const card = {
  offsetTop: 180, offsetHeight: 640, clientTop: 1, offsetParent: section,
  getBoundingClientRect() { throw new Error('Scroll motion must not measure its animated bounds'); },
};
const title = {offsetTop: 30, offsetHeight: 80, offsetParent: card};
const read = window.portfolioScrollGeometry;
const position = el => JSON.parse(JSON.stringify(read(el)));

assert.deepEqual(position(card), {top: 1382, height: 640});
assert.deepEqual(position(title), {top: 1413, height: 80});
for (const scrollY of [300, 600, 1200, 1600, 1200, 600, 300, 0]) {
  window.scrollY = scrollY;
  // Simulate changing nested entrance, hover and scroll transforms.
  card.style = {translate: `${scrollY / 10}px`, scale: '.978', rotate: 'x 8deg'};
  section.style = {transform: 'perspective(950px) rotateX(9deg)'};
  assert.equal(position(card).top + scrollY, 1382);
  assert.equal(position(title).top + scrollY, 1413);
  assert.equal(position(card).height, 640);
}
card.offsetHeight = 720;
assert.equal(position(card).height, 720, 'Responsive layout changes are read immediately');
console.log('PASS: scroll positions stay stable through nested transforms, reverse scrolling and resized content.');
