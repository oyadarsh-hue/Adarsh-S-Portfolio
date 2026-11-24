import {photoDescription} from './photo-descriptions.js?v=9';
import {documentaryCatalog} from './documentary-v8/catalog.js?v=8';

export function resolveEdition(slug, requested) {
  if (requested === 'photo' || requested === 'original') return requested;
  return Object.hasOwn(documentaryCatalog, slug) ? 'documentary' : 'original';
}

export function descriptionForEdition(film, slug, edition) {
  if (edition === 'photo') return photoDescription(film, slug, edition);
  const documentary = documentaryCatalog[slug];
  if (edition !== 'documentary' || !documentary) return film;

  const translations = {};
  const audio = {};
  for (const [code, [text, start, end, voiceLanguage]] of Object.entries(documentary)) {
    if (code !== 'en') translations[code] = text;
    audio[code] = {
      src: 'assets/audio-studio/documentary-v8/' + code + '.mp3',
      start, end, voice: 'eSpeak NG', voiceLanguage
    };
  }
  return {...film, description: documentary.en[0], translations, audio};
}

export function documentaryMedia(slug, edition) {
  if (!Object.hasOwn(documentaryCatalog, slug)) return '';
  if (edition === 'documentary') return 'assets/film-v8/' + slug + '-hd.mp4';
  if (edition === 'photo') return 'assets/photo-editions/' + slug + '.mp4';
  return '';
}
