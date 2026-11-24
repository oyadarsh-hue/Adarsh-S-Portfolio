(() => {
  'use strict';

  const section = document.querySelector('#education');
  if (!section) return;
  const atlas = section.querySelector('.edu9-frame');
  const tiles = [...atlas.querySelectorAll('.lo-atlas-tile')];
  const chapters = [...section.querySelectorAll('.lo-school-hero')];
  const opening = section.querySelector('.campus-open');
  const reading = section.querySelector('.campus-reading-print');
  const dialog = section.querySelector('.campus-viewer');
  const documentRoot = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const bound = value => Math.max(0, Math.min(1, value));
  const elements = [atlas, ...chapters];
  const visible = new Set();
  let frame = 0;
  let moves = false;

  function position(element) {
    const box = element.getBoundingClientRect();
    // The same viewport geometry works during touch scrolling in Safari.
    const viewportHeight = documentRoot.clientHeight || window.innerHeight;
    return bound((viewportHeight - box.top) / (viewportHeight + box.height));
  }

  function draw() {
    frame = 0;
    if (!moves) return;
    for (const element of visible) {
      const progress = position(element);
      if (element === atlas) {
        const track = bound((progress - .14) / .70);
        tiles.forEach((tile, i) => {
          const direction = i % 2 === 0 ? 1 : -1;
          const open = bound((progress - i * .045 - .06) / .51);
          const phase = (progress - .50) * direction;
          tile.style.setProperty('--campus-tilt', ((1 - open) * direction * 8).toFixed(2) + 'deg');
          tile.style.setProperty('--campus-pan', (phase * 22).toFixed(2) + '%');
          tile.style.setProperty('--campus-zoom', (1.13 + (1 - open) * .25).toFixed(3));
          tile.style.setProperty('--campus-shutter', (-134 + open * 270).toFixed(2) + '%');
          tile.style.setProperty('--campus-drift', ((1 - open) * direction * 16).toFixed(1) + 'px');
          tile.style.setProperty('--campus-date-y', ((1 - open) * 21).toFixed(1) + 'px');
        });
        element.style.setProperty('--campus-track', track.toFixed(4));
      } else {
        const open = bound((progress - .09) / .51);
        element.style.setProperty('--campus-record-zoom', (1.04 + (1 - open) * .28).toFixed(3));
        element.style.setProperty('--campus-record-pan', ((.50 - progress) * 16).toFixed(2) + '%');
        element.style.setProperty('--campus-record-cut', ((1 - open) * 12).toFixed(2) + '%');
        element.style.setProperty('--campus-record-label', ((1 - open) * 31).toFixed(1) + 'px');
        element.style.setProperty('--campus-record-line', (.16 + open * .84).toFixed(3));
        if (element.contains(reading)) {
          element.style.setProperty('--campus-print-tip', (-14 + open * 16).toFixed(2) + 'deg');
        }
      }
    }
  }

  function queue() {
    if (!frame && moves && visible.size) frame = window.requestAnimationFrame(draw);
  }

  function syncMotion() {
    moves = !reduced.matches && !documentRoot.classList.contains('paused') &&
      documentRoot.dataset.motion !== 'paused';
    section.classList.toggle('campus-moving', moves);
    queue();
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      queue();
    }, {rootMargin: '130px'});
    elements.forEach(element => observer.observe(element));
  } else {
    elements.forEach(element => visible.add(element));
  }
  window.addEventListener('scroll', queue, {passive:true});
  window.addEventListener('resize', queue, {passive:true});
  window.visualViewport?.addEventListener('resize', queue, {passive:true});
  new MutationObserver(syncMotion).observe(documentRoot, {
    attributes:true, attributeFilter:['class','data-motion']
  });
  if (reduced.addEventListener) reduced.addEventListener('change', syncMotion);
  else reduced.addListener(syncMotion);
  syncMotion();

  if (!dialog || !opening) return;
  const viewerImage = dialog.querySelector('.campus-full-photo');
  const title = dialog.querySelector('.campus-picture-title');
  const caption = dialog.querySelector('.campus-picture-caption');
  const source = dialog.querySelector('.campus-picture-source');
  const record = dialog.querySelector('.campus-picture-record');
  const count = dialog.querySelector('.campus-count');
  const dismiss = dialog.querySelector('.campus-dismiss');
  const captions = [
    'The entrance to MGM Higher Secondary School in Engapuzha.',
    'The school library building at Government Vocational Higher Secondary School, Thamarassery.',
    'An Independence Day gathering at the College of Applied Science in Korangad.',
    'The entrance to Government Engineering College, Thrissur, photographed in 2024.'
  ];
  const credits = ['mgm', 'gvhss', 'cas', 'gec'];
  const backup = [
    ['sslc-campus','The courtyard at MGM Higher Secondary School, Engapuzha.'],
    ['hse-campus','The entrance gate at GVHSS Thamarassery.'], null,
    ['mca-campus','The main block of Government Engineering College, Thrissur.']
  ];
  const pictures = tiles.map((tile, i) => ({
    image:tile.querySelector('img'), title:tile.querySelector('.edu9-place').textContent,
    caption:captions[i], record:tile.hash, credit:'assets/field/education-v9/credits.html#' + credits[i]
  }));
  pictures.forEach((picture, i) => {
    if (!backup[i]) return;
    const [name, description] = backup[i];
    const restore = () => {
      picture.caption = description;
      picture.credit = 'assets/field/education-photo-credits-v8.html#' + name;
      picture.image.src = 'assets/field/education-v8/' + name + '.webp';
      picture.image.removeEventListener('error', restore);
    };
    picture.image.addEventListener('error', restore);
    if (picture.image.complete && !picture.image.naturalWidth) restore();
  });
  pictures.splice(2, 0, {
    src:'assets/field/campus-library.webp', title:'Reading at GVHSS Thamarassery',
    caption:'Students read together in a classroom. Majeedmanasam, SchoolWiki, CC BY-SA 4.0. Resized as WebP.',
    record:'#education-gvhss', credit:'https://schoolwiki.in/index.php?curid=278244'
  });
  let index = 0;
  let trigger = opening;

  function showPicture(next) {
    index = (next + pictures.length) % pictures.length;
    const picture = pictures[index];
    const photoSource = picture.image?.currentSrc || picture.image?.src || picture.src;
    const regional = photoSource.endsWith('bsc-town.webp');
    const description = regional ? 'The town of Thamarassery, where the college is located.' : picture.caption;
    const photoCredit = regional ? 'assets/field/education-photo-credits-v8.html#bsc-town' : picture.credit;
    viewerImage.alt = description;
    viewerImage.src = photoSource;
    title.textContent = picture.title;
    caption.textContent = description;
    record.href = picture.record;
    source.href = photoCredit;
    count.value = (index + 1) + ' / ' + pictures.length;
  }

  // The college can change its gallery URL. Mirror the tile's resolved fallback in the viewer.
  pictures.forEach(picture => {
    if (!picture.image) return;
    picture.image.addEventListener('load', () => {
      if (dialog.open && pictures[index] === picture) showPicture(index);
    });
  });
  const nativeModal = typeof dialog.showModal === 'function';
  function closeViewer() {
    if (nativeModal) dialog.close();
    else dialog.removeAttribute('open');
    trigger.focus({preventScroll:true});
  }
  opening.hidden = false;
  function openViewer(opener, first) {
    trigger = opener;
    showPicture(first);
    if (nativeModal) dialog.showModal();
    else {
      dialog.setAttribute('open', '');
      dialog.setAttribute('aria-modal', 'true');
    }
    dismiss.focus();
  }
  opening.addEventListener('click', () => openViewer(opening, 0));
  reading?.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    openViewer(reading, 2);
  });
  dismiss.addEventListener('click', closeViewer);
  dialog.querySelector('.campus-prev').addEventListener('click', () => showPicture(index - 1));
  dialog.querySelector('.campus-next').addEventListener('click', () => showPicture(index + 1));
  record.addEventListener('click', closeViewer);
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeViewer();
  });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      showPicture(index + (event.key === 'ArrowLeft' ? -1 : 1));
    } else if (!nativeModal && event.key === 'Escape') {
      event.preventDefault();
      closeViewer();
    } else if (!nativeModal && event.key === 'Tab') {
      const controls = [...dialog.querySelectorAll('button, a[href]')];
      if (event.shiftKey && document.activeElement === controls[0]) {
        event.preventDefault();
        controls[controls.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) {
        event.preventDefault();
        controls[0].focus();
      }
    }
  });
})();
