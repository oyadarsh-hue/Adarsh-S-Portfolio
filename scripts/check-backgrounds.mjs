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
const durations = new Map();
const films = ['projects', 'journey'];
for (const file of new Set([...photos, ...films.map(name => 'assets/field/' + name + '-v2.webp')])) {
  const bytes = readFileSync(root + file);
  const [width, height] = dimensions(bytes);
  const minHeight = file.startsWith('assets/field/journal-photos/') ? 240 : 400;
  const minWidth = file.endsWith('/skybrisk-commerce.webp') ? 500 : 640; // Keep this site screenshot at its native resolution.
  assert(width >= minWidth && height >= minHeight, file + ' has enough detail for its frame');
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

function validateCaptions(file, duration, {directory = 'field', clip = false} = {}) {
  const text = readFileSync(root + 'assets/' + directory + '/' + file, 'utf8').replace(/\r/g, '');
  assert(/^WEBVTT(?:\s|$)/.test(text), file + ' has a WebVTT header');
  const blocks = text.trim().split(/\n\s*\n/).filter(block => block.includes('-->'));
  assert(blocks.length >= (clip ? 1 : 2), file + ' contains timed speech');
  let previous = -1;
  for (const block of blocks) {
    const match = block.match(/^(?:.*\n)?([\d:.]+) --> ([\d:.]+)[^\n]*\n([\s\S]+)$/);
    assert(match && match[3].trim(), file + ' has a cue without time or content');
    const start = seconds(match[1]);
    const end = seconds(match[2]);
    if (clip && previous === -1) assert(start < 1.5, file + ' first cue must be on the clip’s own timeline');
    assert(start >= previous && start >= 0 && start < end && end <= duration + .25, file + ' has invalid cue times');
    previous = start;
  }
  return blocks.length;
}

function inspectFilm(bytes, label, width, height, {minDuration = 60, maxDuration = 120.1, narrated = true} = {}) {
  const top = boxes(bytes);
  const moov = top.find(box => box.type === 'moov');
  const mdat = top.find(box => box.type === 'mdat');
  assert(moov && mdat && moov.start < mdat.start, label + ' needs a fast-start movie header');
  const tracks = boxes(bytes, moov.start, moov.end).filter(box => box.type === 'trak').map(box => probeTrack(bytes, box));
  const video = tracks.find(track => track.codec === 'avc1');
  const audio = tracks.find(track => track.codec === 'mp4a');
  assert(video && video.width === width && video.height === height, label + ' has incorrect H.264 dimensions');
  if (narrated) {
    assert(audio && audio.bitrate > 0, label + ' is missing its encoded AAC audio');
    assert(Math.abs(video.duration - audio.duration) < 1, label + ' has mismatched audio and video duration');
  }
  assert(video.duration >= minDuration && video.duration <= maxDuration, label + ' has the wrong duration');
  console.log(label + ': ' + width + '×' + height + ', ' + video.duration.toFixed(2) + 's, video ' +
    Math.round(video.bitrate / 1000) + ' kb/s' + (audio ? ', AAC ' + Math.round(audio.bitrate / 1000) + ' kb/s' : ''));
  return video.duration;
}

function readMediaFile(name, directory = 'field') {
  const bytes = readFileSync(root + 'assets/' + directory + '/' + name);
  assert(bytes.length > 0 && bytes.length < 100 * 1024 * 1024, name + ' must fit in one GitHub file');
  return bytes;
}

for (const name of films) {
  const meta = filmInfo[name];
  assert(Array.isArray(meta.parts) && meta.parts.length > 1 && new Set(meta.parts).size === meta.parts.length,
    name + ' requires an ordered list of unique master parts');
  const parts = meta.parts.map(name => readMediaFile(name));
  const master = Buffer.concat(parts);
  assert.equal(master.length, meta.masterBytes, name + ' assembled byte count mismatch');
  const hash = createHash('sha256').update(master).digest('hex');
  assert.match(meta.masterSha256, /^[a-f0-9]{64}$/);
  assert.equal(hash, meta.masterSha256, name + ' master hash mismatch');
  const duration = inspectFilm(master, name + ' assembled master', 3840, 2160);
  durations.set(name, duration);
  const direct4k = inspectFilm(readMediaFile(meta['4k']), name + ' compact UHD', 3840, 2160);
  const hd = inspectFilm(readMediaFile(meta.web), name + ' direct HD', 1280, 720);
  assert(Math.abs(hd - duration) < .2 && Math.abs(direct4k - duration) < .2,
    name + ' has inconsistent durations across the three encodes');
  const revision = name === 'journey' ? 'v8' : 'v2';
  assert.equal(meta.web, name + '-hd-' + revision + '.mp4');
  assert.equal(meta['4k'], name + '-' + revision + '.mp4');
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
for (const [name, seconds] of [['film-720.mp4', 15], ['landscape-720.mp4', 9]]) {
  inspectFilm(readMediaFile(name), name, 1280, 720,
    {minDuration: seconds-.1, maxDuration: seconds+.1, narrated: false});
}
const archive = [
  {slug: 'orbit', file: 'film.mp4', folder: 'field', stem: 'orbit-score', duration: 15, width: 3840, height: 2160,
    digest: '7975753a50d09ea97a5fc7c03c2cf0938256f0e54c09c1201dfcf9aec8c52d27'},
  {slug: 'landscape', file: 'landscape.mp4', folder: 'field', stem: 'landscape-score', duration: 9, width: 3840, height: 2160,
    digest: '8260cc7ddee0820abc2efb6d8b4d9bc614f101a68f1105345e7c4c904df6de19'},
  {slug: 'original-project', file: 'adarsh-project-reel.mp4', folder: 'video', stem: 'teaser-remaster', duration: 16, width: 960, height: 540,
    digest: 'd637a76f51caf899c1ab00cedabeaca952ca62897c33bb02973f6cf116418af5'},
  {slug: 'original-loop', file: 'dimensional-loop.mp4', folder: 'video', stem: 'loop-remaster', duration: 8, width: 960, height: 540,
    digest: '61c6a7ebfeb8a51340f22d329ce93b1d6dd4dd6d3a76d80348443f5174a5ac2f'},
];
for (const {slug, file, folder, stem, duration, width, height, digest} of archive) {
  const original = readMediaFile(file, folder);
  assert.equal(createHash('sha256').update(original).digest('hex'), digest, file + ' original changed');
  const limits = {minDuration: duration-.15, maxDuration: duration+.15};
  durations.set(slug, inspectFilm(original, file, width, height, {...limits, narrated: false}));
  for (const [suffix, w, h] of [['-hd',1280,720],['',3840,2160]]) {
    const edition = stem + suffix + '.mp4';
    inspectFilm(readMediaFile(edition,'archive'), edition, w, h, limits);
  }
}
const clipNames = ['assenttag', 'epigraphix-ai', 'aegisforge-x', 'deciphera', 'quietnote',
  'mca', 'bsc', 'hse', 'sslc', 'bluegen', 'skybrisk', 'codtech', 'publication'];
const documentaries = new Set(['mca', 'bsc', 'hse', 'sslc', 'bluegen', 'skybrisk', 'codtech']);
const videoHashes = new Set();
const captionHashes = new Set();
for (const name of clipNames) {
  const directory = documentaries.has(name) ? 'film-v8' : 'clips';
  let duration;
  for (const [suffix, width, height] of [['-hd', 1280, 720], ['', 3840, 2160]]) {
    const file = name + suffix + '.mp4';
    const bytes = readMediaFile(file, directory);
    const hash = createHash('sha256').update(bytes).digest('hex');
    assert(!videoHashes.has(hash), file + ' duplicates another clip');
    videoHashes.add(hash);
    const length = inspectFilm(bytes, file, width, height, {minDuration: 2, maxDuration: 120.1});
    if (duration) assert(Math.abs(duration - length) < .2, file + ' duration differs by quality');
    duration = length;
  }
  durations.set(name, duration);
  if (documentaries.has(name)) {
    assert(home.includes('data-documentary-sheet="assets/film-v8/' + name + '-sheet.webp"'));
    inspectFilm(readMediaFile(name + '.mp4', 'photo-editions'), name + ' low-data edition', 960, 540,
      {minDuration: duration - .25, maxDuration: duration + .25});
  }
  const captions = name + '.vtt';
  validateCaptions(captions, duration, {directory: 'clips', clip: true});
  const hash = createHash('sha256').update(readMediaFile(captions, 'clips')).digest('hex');
  assert(!captionHashes.has(hash), name + ' duplicates another clip’s transcript');
  captionHashes.add(hash);
  const [width, height] = dimensions(readMediaFile(name + '.webp', directory));
  assert(width >= 640 && width > height, name + ' needs a landscape poster');
}
// Each new premiere ships independently of the original projects and archive.
for (const [slug, stem] of [['premiere-teaser','trailer'], ['premiere-loop','kinetic']]) {
  assert(home.includes('data-clip="' + slug + '"'), slug + ' is missing its player');
  const poster = 'assets/premieres/' + stem + '.webp';
  assert(home.includes(poster));
  const [posterWidth, posterHeight] = dimensions(readFileSync(root + poster));
  assert(posterWidth >= 800 && posterWidth > posterHeight);
  let hdDuration;
  for (const [suffix, width, height] of [['-hd',1280,720],['',3840,2160]]) {
    const filename = stem + suffix + '.mp4';
    assert(home.includes('assets/premieres/' + filename));
    const duration = inspectFilm(readMediaFile(filename,'premieres'), filename, width, height,
      {minDuration:8, maxDuration:120});
    if (hdDuration) assert(Math.abs(hdDuration-duration) < .2, slug + ' differs between HD and UHD');
    hdDuration = duration;
  }
  durations.set(slug, hdDuration);
}
const dubs = JSON.parse(readFileSync(root + 'assets/dubs-v5/manifest.json','utf8'));
const descriptions = JSON.parse(readFileSync(root + 'assets/field/film-text-v5.json','utf8'));
const playerSlugs = [...home.matchAll(/<figure\b[^>]*\bdata-clip="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(playerSlugs).size,21);
assert.equal(playerSlugs.length,21);
const frameTimes = JSON.parse(readFileSync(root + 'assets/frames-v6/frames.json', 'utf8'));
assert.deepEqual(Object.keys(frameTimes).sort(), [...playerSlugs].sort(), 'Every film needs its own three-frame thumbnail strip');
const sheetHashes = new Set();
for (const slug of playerSlugs) {
  const times = frameTimes[slug];
  assert.equal(times.length, 3);
  assert(times.every((time, i) => Number.isFinite(time) && time >= 0 && time < durations.get(slug)
    && (!i || time > times[i - 1])), slug + ' thumbnails must seek to three successive points within the actual film');
  const sheet = documentaries.has(slug) ? readMediaFile(slug + '-sheet.webp', 'film-v8')
    : readMediaFile(slug + '.webp', 'frames-v6');
  const [width, height] = dimensions(sheet);
  assert(width / 3 >= 240 && width / 3 * 9 === height * 16, slug + ' thumbnail sheet needs three 16:9 frames');
  const hash = createHash('sha256').update(sheet).digest('hex');
  assert(!sheetHashes.has(hash), slug + ' reuses another film’s thumbnails');
  sheetHashes.add(hash);
  assert(descriptions[slug]?.description?.trim().length > 15, slug + ' has no written visual description');
  for (const lang of ['en','ml','ta','hi','ur','es','si','bn','ar-KW','ar','am','fa']) {
    const segment = descriptions[slug].audio?.[lang];
    assert(segment && descriptions[slug].translations?.[lang]?.trim().length > 10,
      slug + ' needs its ' + lang + ' visual description and soundtrack');

    const bytes = readFileSync(root + segment.src);
    assert(bytes.length > 1000 && segment.start >= 0 && segment.end > segment.start,
      slug + ' has an invalid ' + lang + ' description segment');
  }
}
for (const slug of [...clipNames, ...films]) {
  const tracks = dubs[slug];
  assert(tracks, slug + ' is missing its language catalog');
  for (const lang of ['ml','ta','hi','ur','bn','si','es','ar','ar-KW','fa','am']) {
    assert(tracks[lang]?.text?.trim().length > 20, slug + ' is missing ' + lang + ' narration');
  }
  for (const locale of ['ml','ta','si','hi','ur','es','bn','ar','fa']) {
    assert(tracks[locale]?.src, slug + ' is missing its recorded ' + locale + ' dub');
  }
  for (const [locale, recording] of Object.entries(tracks).filter(([,track])=>track.src)) {
    const audio = readMediaFile(recording.src,'dubs-v5');
    const moov = boxes(audio).find(box => box.type === 'moov');
    assert(moov, slug + ' missing audio header: ' + locale);
    const streams = boxes(audio,moov.start,moov.end).filter(box => box.type==='trak').map(track=>probeTrack(audio,track));
    const aac = streams.find(track=>track.codec==='mp4a' && track.bitrate>0);
    assert(aac && Math.abs(aac.duration - durations.get(slug)) < 1,
      slug + ' ' + locale + ' narration must contain AAC covering the film');
    assert(recording.voice?.trim() && recording.language?.trim(), slug + ' lacks its voice or locale label');
  }
}
console.log('PASS: full masters, 4K premieres, thumbnail sheets, captions, recorded dubs and translated visual descriptions.');
