import assert from 'node:assert/strict';
import {readFileSync, statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const home = readFileSync(root + 'index.html', 'utf8');

function dimensions(bytes) {
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  switch (bytes.toString('ascii', 12, 16)) {
    case 'VP8X': return [bytes.readUIntLE(24, 3) + 1, bytes.readUIntLE(27, 3) + 1];
    case 'VP8 ': return [bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff];
    case 'VP8L': {
      const bits = bytes.readUInt32LE(21);
      return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
    }
    default: throw new Error('Unexpected WebP header');
  }
}

const controller = readFileSync(root + 'assets/field/home.js', 'utf8');
for (const name of ['ridge', 'coast', 'privacy', 'script', 'note', 'poster', 'landscape-poster']) {
  const relative = 'assets/field/' + name + '.webp';
  const bytes = readFileSync(root + relative);
  const [width, height] = dimensions(bytes);
  assert(width >= 800 && width > height, relative + ' is a wide image');
  assert(bytes.length < 1_500_000, relative + ' should stay under 1.5 MB');
  assert(home.includes(relative) || controller.includes("'" + name + ".webp'"), relative + ' is connected to the homepage');
}

// MP4 track headers store output width and height as 16.16 fixed-point values.
// Audio track dimensions are zero. Walk actual container boundaries to avoid
// matching coincidental box-name bytes inside compressed frames.
function trackSizes(bytes, start = 0, end = bytes.length) {
  const result = [];
  for (let offset = start; offset + 8 <= end;) {
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    let size = bytes.readUInt32BE(offset);
    let header = 8;
    if (size === 0) size = end - offset;
    if (size === 1) {
      size = Number(bytes.readBigUInt64BE(offset + 8));
      header = 16;
    }
    const next = offset + size;
    assert(size >= header && next <= end, 'Invalid MP4 box ' + type);
    if (type === 'moov' || type === 'trak') result.push(...trackSizes(bytes, offset + header, next));
    if (type === 'tkhd') result.push([bytes.readUInt32BE(next - 8) / 65536, bytes.readUInt32BE(next - 4) / 65536]);
    offset = next;
  }
  return result;
}

const tracks = [
  ['film.mp4', 3840, 2160],
  ['film-720.mp4', 1280, 720],
  ['landscape.mp4', 3840, 2160],
  ['landscape-720.mp4', 1280, 720],
];
for (const [name, width, height] of tracks) {
  const file = root + 'assets/field/' + name;
  const bytes = readFileSync(file);
  assert.equal(bytes.toString('ascii', 4, 8), 'ftyp');
  assert(trackSizes(bytes).some(([w, h]) => w === width && h === height), 'Wrong reel dimensions: ' + name);
  assert(statSync(file).size < (width === 3840 ? 32_000_000 : 5_000_000), 'Unexpected reel payload: ' + name);
}
console.log('PASS: seven photographic assets, size budgets and both films in 720p and UHD.');
