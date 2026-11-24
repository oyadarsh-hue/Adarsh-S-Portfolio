(() => {
  'use strict';

  const albums = new Map();
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const root = document.documentElement;
  const dwell = 5400;

  function makeAlbum(album) {
    const panel = album.querySelector('.industry-photo-panel');
    const prints = Array.from(panel.querySelectorAll('.industry-plate'));
    const choices = album.querySelector('.industry-proof-grid');
    const card = album.closest('.lo-employer');
    let current = 0;
    let visible = false;
    let manual = false;
    let hovering = false;
    let timer = 0;

    function select(index) {
      current = index;
      prints.forEach((print, position) => {
        const selected = position === current;
        print.toggleAttribute('data-active', selected);
        print.inert = !selected;
        print.setAttribute('aria-hidden', String(!selected));
        print.querySelector('a').tabIndex = selected ? 0 : -1;
        buttons[position].setAttribute('aria-pressed', String(selected));
      });
    }

    function sync() {
      const allowed = visible && !manual && !hovering && !document.hidden && !reduced.matches
        && !root.classList.contains('paused') && root.dataset.motion !== 'paused';
      album.toggleAttribute('data-playing', allowed);
      if (!allowed) {
        clearTimeout(timer);
        timer = 0;
      } else if (!timer) {
        timer = setTimeout(() => {
          timer = 0;
          select((current + 1) % prints.length);
          sync();
        }, dwell);
      }
    }

    function takeControl() {
      manual = true;
      sync();
    }

    const buttons = prints.map((print, index) => {
      const photo = print.querySelector('img');
      const thumb = document.createElement('button');
      thumb.type = 'button';
      thumb.className = print.className.replace('industry-plate', 'industry-thumb');
      thumb.setAttribute('aria-controls', panel.id);
      thumb.setAttribute('aria-label', 'Show ' + print.dataset.photoLabel);
      const little = document.createElement('img');
      little.src = photo.getAttribute('src');
      little.alt = '';
      little.width = Number(photo.getAttribute('width'));
      little.height = Number(photo.getAttribute('height'));
      little.loading = 'lazy';
      little.decoding = 'async';
      const caption = document.createElement('span');
      caption.textContent = print.dataset.photoLabel;
      thumb.append(little, caption);
      choices.append(thumb);
      thumb.addEventListener('click', () => {
        takeControl();
        select(index);
      });
      return thumb;
    });

    choices.addEventListener('keydown', event => {
      const index = buttons.indexOf(event.target);
      if (index < 0 || event.altKey || event.ctrlKey || event.metaKey) return;
      const next = {
        ArrowLeft: index - 1, ArrowRight: index + 1,
        ArrowUp: index - 2, ArrowDown: index + 2,
        Home: 0, End: buttons.length - 1
      }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      const destination = Math.max(0, Math.min(buttons.length - 1, next));
      takeControl();
      select(destination);
      buttons[destination].focus({ preventScroll: true });
    });
    card.addEventListener('focusin', takeControl);
    card.addEventListener('pointerdown', takeControl, { passive: true });
    card.querySelector('video')?.addEventListener('play', takeControl);
    album.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse') { hovering = true; sync(); }
    });
    album.addEventListener('pointerleave', event => {
      if (event.pointerType === 'mouse') { hovering = false; sync(); }
    });
    select(0);
    album.setAttribute('data-album-ready', '');
    choices.hidden = false;
    return {
      sync,
      setVisible(value) { visible = value; sync(); }
    };
  }

  for (const album of document.querySelectorAll('#experience [data-employer-gallery]')) {
    const panel = album.querySelector('.industry-photo-panel');
    albums.set(panel, makeAlbum(album));
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        albums.get(entry.target).setVisible(entry.isIntersecting && entry.intersectionRatio >= .4);
      }
    }, { threshold: [0, .4] });
    albums.forEach((controller, panel) => observer.observe(panel));
  }
  const sync = () => albums.forEach(album => album.sync());
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['class', 'data-motion'] });
})();
