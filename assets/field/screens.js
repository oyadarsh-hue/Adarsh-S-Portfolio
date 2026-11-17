(() => {
  'use strict';
  const info = document.querySelector('#filmInfo');
  const masters = info ? JSON.parse(info.textContent) : {};
  const players = new Map();

  for (const frame of document.querySelectorAll('figure.screen-card[data-clip]')) {
    const video = frame.querySelector('video');
    const source = video.querySelector('source');
    const select = frame.querySelector('.screen-quality select');
    const link = frame.querySelector('[data-uhd]');
    const master = info && Object.hasOwn(masters, frame.dataset.clip) ? masters[frame.dataset.clip] : null;
    const hd = source.src;
    const standalone = link?.getAttribute('href');
    const chapters = Array.from(frame.querySelectorAll('[data-chapters] button'));
    const status = document.createElement('p');
    status.className = 'screen-status';
    status.setAttribute('role','status');
    frame.append(status);

    let pending = null;
    let request = null;
    let cachedUrl = null;
    const position = () => pending ?? video.currentTime;
    const playing = () => !video.paused && !video.ended;
    function play() {
      video.play().catch(() => {});
    }
    function changeSource(url) {
      const time = position();
      const resume = playing();
      pending = time;
      video.src = url;
      video.preload = 'metadata';
      video.load();
      if (resume) play();
    }
    function markChapter() {
      const time = position();
      const active = chapters.findLastIndex(button => Number(button.dataset.start) <= time + .04);
      for (const [i,button] of chapters.entries()) {
        if (i === active) button.setAttribute('aria-current','true');
        else button.removeAttribute('aria-current');
      }
    }
    async function fullQuality(controller) {
      try {
        if (!cachedUrl) {
          status.textContent = 'Preparing full-detail 4K…';
          const files = await Promise.all(master.parts.map(async file => {
            const response = await fetch(new URL(file, hd), {signal:controller.signal});
            if (!response.ok) throw new Error('Missing video part');
            return response.blob();
          }));
          if (controller.signal.aborted) return;
          const blob = new Blob(files,{type:'video/mp4'});
          if (blob.size !== master.masterBytes) throw new Error('Incomplete video');
          cachedUrl = URL.createObjectURL(blob);
        }
        changeSource(cachedUrl);
        link.href = cachedUrl;
        status.textContent = '';
      } catch {
        if (controller.signal.aborted) return;
        controller.abort();
        changeSource(standalone);
        status.textContent = 'Using the smaller 4K edition.';
      }
    }

    video.addEventListener('loadedmetadata', () => {
      if (pending !== null) video.currentTime = Math.min(pending,video.duration);
      pending = null;
      markChapter();
    });
    video.addEventListener('timeupdate', markChapter);
    video.addEventListener('error', () => {status.textContent='Playback failed. Open the download to watch this film.';});
    video.addEventListener('play', () => {
      for (const other of players.values()) if (other.video !== video && !other.video.paused) other.video.pause();
    });
    if (select && link) {
      select.parentElement.hidden = false;
      link.download = frame.dataset.clip+'-4k.mp4';
      select.addEventListener('change', () => {
        request?.abort();
        status.textContent='';
        link.setAttribute('href', standalone);
        if (select.value === 'uhd' && master) {
          request = new AbortController();
          fullQuality(request);
        } else changeSource(select.value === 'uhd' ? standalone : hd);
      });
    }
    chapters.forEach(button => button.addEventListener('click', () => {
      const start = Number(button.dataset.start);
      if (video.readyState >= 1) video.currentTime = start;
      else pending = start;
      play();
      markChapter();
    }));
    markChapter();
    players.set(frame.dataset.clip,{frame,video,play});
  }
  document.querySelectorAll('[data-play-film]').forEach(a => a.addEventListener('click',() => {
    players.get('projects')?.play();
  }));
  // Historical links pointed to a single movie switcher. Land on the matching independent frame.
  const id = new URLSearchParams(location.search).get('film');
  if (players.has(id) && (!location.hash || location.hash === '#showreel')) {
    const frame = players.get(id).frame;
    const land = () => frame.scrollIntoView({behavior:'instant',block:'start'});
    if (document.readyState === 'complete') land();
    else window.addEventListener('load',land,{once:true});
  }
})();
