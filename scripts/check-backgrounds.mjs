import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
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

const filmInfo = JSON.parse(home.match(/<script[^>]*\bid="filmInfo"[^>]*>([\s\S]*?)<\/script>/)[1]);
const photos = [...home.matchAll(/<img\b[^>]*\ssrc="(assets\/field\/[^"]+\.webp)"/g)].map(match => match[1]);
const films = ['projects', 'journey'];
for (const file of new Set([...photos, ...films.map(name => 'assets/field/' + name + '-v2.webp')])) {
  const bytes = readFileSync(root + file);
  const [width, height] = dimensions(bytes);
  assert(width >= 640 && height >= 400, file + ' has enough detail for its frame');
  assert(bytes.length < 1_500_000, file + ' should stay under 1.5 MB');
  assert(home.includes(file) || Object.values(filmInfo).some(film => film.poster === file.split('/').at(-1)), file + ' is connected');
}

// Inspect MP4 sample descriptions and sample sizes directly. This keeps CI
// independent of system codecs and measures the emitted streams deterministically.
function boxes(bytes, start = 0, end = bytes.length) {
  const entries = [];
  for (let offset = start; offset + 8 <= end;) {
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    let size = bytes.readUInt32BE(offset);
    let header = 8;
    if (size === 0) size = end - offset;
    if (size === 1) {
      size = Number(bytes.readBigUInt64BE(offset + 8));
      header = 16;
    }
    assert(size >= header && offset + size <= end, 'Invalid MP4 box ' + type);
    entries.push({type, start: offset + header, end: offset + size});
    offset += size;
  }
  return entries;
}

function child(bytes, parent, type) {
  const value = boxes(bytes, parent.start, parent.end).find(box => box.type === type);
  assert(value, 'Missing MP4 box ' + type);
  return value;
}

function probeTrack(bytes, track) {
  const tkhd = child(bytes, track, 'tkhd');
  const mdia = child(bytes, track, 'mdia');
  const minf = child(bytes, mdia, 'minf');
  const stbl = child(bytes, minf, 'stbl');
  const mdhd = child(bytes, mdia, 'mdhd').start;
  const isLong = bytes[mdhd] === 1;
  const scale = bytes.readUInt32BE(mdhd + (isLong ? 20 : 12));
  const ticks = isLong ? Number(bytes.readBigUInt64BE(mdhd + 24)) : bytes.readUInt32BE(mdhd + 16);
  const duration = ticks / scale;
  const stsd = child(bytes, stbl, 'stsd').start;
  const stsz = child(bytes, stbl, 'stsz').start;
  const sampleSize = bytes.readUInt32BE(stsz + 4);
  const count = bytes.readUInt32BE(stsz + 8);
  let sampleBytes = sampleSize * count;
  if (!sampleSize) {
    for (let index = 0; index < count; index++) sampleBytes += bytes.readUInt32BE(stsz + 12 + 4 * index);
  }
  return {
    codec: bytes.toString('ascii', stsd + 12, stsd + 16),
    width: bytes.readUInt32BE(tkhd.end - 8) / 65536,
    height: bytes.readUInt32BE(tkhd.end - 4) / 65536,
    duration, bitrate: Math.round(sampleBytes * 8 / duration),
  };
}

function seconds(stamp) {
  return stamp.split(':').reduce((total, part) => total * 60 + Number(part), 0);
}

function validateCaptions(file, duration) {
  const text = readFileSync(root + 'assets/field/' + file, 'utf8').replace(/\r/g, '');
  assert(/^WEBVTT(?:\s|$)/.test(text), file + ' has a WebVTT header');
  const blocks = text.trim().split(/\n\s*\n/).filter(block => block.includes('-->'));
  assert(blocks.length > 1, file + ' contains timed speech');
  let previous = -1;
  for (const block of blocks) {
    const match = block.match(/^(?:.*\n)?([\d:.]+) --> ([\d:.]+)[^\n]*\n([\s\S]+)$/);
    assert(match && match[3].trim(), file + ' has a cue without time or content');
    const start = seconds(match[1]);
    const end = seconds(match[2]);
    assert(start >= previous && start >= 0 && start < end && end <= duration + .25, file + ' has invalid cue times');
    previous = start;
  }
  return blocks.length;
}

function inspectFilm(bytes, label, width, height) {
  const top = boxes(bytes);
  const moov = top.find(box => box.type === 'moov');
  const mdat = top.find(box => box.type === 'mdat');
  assert(moov && mdat && moov.start < mdat.start, label + ' needs a fast-start movie header');
  const tracks = boxes(bytes, moov.start, moov.end).filter(box => box.type === 'trak').map(box => probeTrack(bytes, box));
  const video = tracks.find(track => track.codec === 'avc1');
  const audio = tracks.find(track => track.codec === 'mp4a');
  assert(video && video.width === width && video.height === height, label + ' has incorrect H.264 dimensions');
  assert(audio && audio.bitrate > 0, label + ' is missing its encoded AAC audio');
  assert(video.duration >= 60 && video.duration <= 120.1, label + ' should run one to two minutes');
  assert(Math.abs(video.duration - audio.duration) < 1, label + ' has mismatched audio and video duration');
  console.log(label + ': ' + width + '×' + height + ', ' + video.duration.toFixed(2) + 's, video ' +
    Math.round(video.bitrate / 1000) + ' kb/s, AAC ' + Math.round(audio.bitrate / 1000) + ' kb/s');
  return video.duration;
}

function readMediaFile(name) {
  const bytes = readFileSync(root + 'assets/field/' + name);
  assert(bytes.length > 0 && bytes.length < 100 * 1024 * 1024, name + ' must fit in one GitHub file');
  return bytes;
}

for (const name of films) {
  const meta = filmInfo[name];
  assert(Array.isArray(meta.parts) && meta.parts.length > 1 && new Set(meta.parts).size === meta.parts.length,
    name + ' requires an ordered list of unique master parts');
  const parts = meta.parts.map(readMediaFile);
  const master = Buffer.concat(parts);
  assert.equal(master.length, meta.masterBytes, name + ' assembled byte count mismatch');
  const hash = createHash('sha256').update(master).digest('hex');
  assert.match(meta.masterSha256, /^[a-f0-9]{64}$/);
  assert.equal(hash, meta.masterSha256, name + ' master hash mismatch');
  const duration = inspectFilm(master, name + ' assembled master', 3840, 2160);
  const direct4k = inspectFilm(readMediaFile(meta['4k']), name + ' compact UHD', 3840, 2160);
  const hd = inspectFilm(readMediaFile(meta.web), name + ' direct HD', 1280, 720);
  assert(Math.abs(hd - duration) < .2 && Math.abs(direct4k - duration) < .2,
    name + ' has inconsistent durations across the three encodes');
  assert.equal(meta.web, name + '-hd-v2.mp4');
  assert.equal(meta['4k'], name + '-v2.mp4');
  assert.equal(meta.poster, name + '-v2.webp');
  assert.equal(meta.captions, name + '-v2.vtt');
  assert(Math.abs(duration - meta.duration) < 1, name + ' program duration differs from the actual video');
  assert(meta.chapters.length > 1 && meta.chapters[0].start === 0, name + ' needs an opening chapter');
  for (const [i, chapter] of meta.chapters.entries()) {
    assert(chapter.title?.trim() && chapter.start < duration, name + ' contains an invalid chapter');
    if (i) assert(chapter.start > meta.chapters[i-1].start, name + ' chapters need chronological order');
  }
  const cues = validateCaptions(meta.captions, duration);
  console.log(name + ': ' + cues + ' English caption cues');
}
console.log('PASS: photographic assets, pixel dimensions, narrated streams, bitrates, duration and captions.');
