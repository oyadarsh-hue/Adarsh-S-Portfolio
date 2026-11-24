(() => {
  const root = document.documentElement;
  const intro = document.querySelector('.studio-intro');
  const monitor = document.querySelector('.studio-monitor');
  if (!intro || !monitor) return;
  const panels = Array.from(document.querySelectorAll('.workflow .panel'));
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const channels = Array.from(document.querySelectorAll('[data-meter]'), meter => ({
    meter, audio: document.getElementById(meter.dataset.meter), text: meter.querySelector('b')
  }));
  const original = document.getElementById('originalAudio');
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  const clamp = number => Math.max(0, Math.min(1, number));
  let frame = 0, meterTimer = 0, link = null;
  const visible = new Set();
  const motionOn = () => !preference.matches && !document.hidden;
  function supported(audio) {
    return Boolean(AudioEngine && (audio.captureStream || audio.mozCaptureStream));
  }
  function drawLayout() {
    frame = 0;
    if (!motionOn()) return;
    const height = Math.max(innerHeight, 1);
    if (visible.has(monitor)) {
      const progress = clamp(scrollY / Math.max(1, intro.offsetTop + intro.offsetHeight));
      monitor.style.setProperty('--console-y', (progress * 18).toFixed(2) + 'px');
      monitor.style.setProperty('--console-angle', (progress * -1.8).toFixed(2) + 'deg');
      monitor.style.setProperty('--dial-turn', (progress * 240).toFixed(1) + 'deg');
      intro.style.setProperty('--title-shift', (progress * 15).toFixed(2) + 'px');
      intro.style.setProperty('--title-turn', (progress * -3.2).toFixed(2) + 'deg');
    }
    for (const panel of panels) {
      if (!visible.has(panel)) continue;
      const position = panel.getBoundingClientRect().top;
      const progress = clamp((height - position) / (height + panel.offsetHeight * .36));
      panel.style.setProperty('--stage-progress', progress.toFixed(3));
      panel.style.setProperty('--step-turn', (42 - progress * 66).toFixed(1) + 'deg');
      panel.style.setProperty('--step-lean', (7 - progress * 11).toFixed(1) + 'deg');
      panel.style.setProperty('--stage-type', (9 - progress * 18).toFixed(2) + 'px');
      panel.style.setProperty('--stage-slant', (1.8 - progress * 3.5).toFixed(2) + 'deg');
      panel.style.setProperty('--fader-scale', (.55 + progress * 1.15).toFixed(2));
    }
  }
  function requestLayout() {
    if (!frame && motionOn()) frame = requestAnimationFrame(drawLayout);
  }
  function unlink() {
    clearTimeout(meterTimer);
    if (!link) return;
    const current = link;
    link = null;
    current.input?.disconnect();
    current.stream?.getAudioTracks().forEach(track => track.stop());
    current.engine?.close().catch(() => {});
    current.channel.meter.style.removeProperty('--vu');
    current.channel.text.textContent = '—';
  }
  function showLevel(current) {
    if (link !== current) return;
    const {analyser, samples, channel} = current;
    analyser.getFloatTimeDomainData(samples);
    let power = 0;
    for (const value of samples) power += value * value;
    const db = Math.max(-60, 10 * Math.log10(Math.max(power / samples.length, .000001)));
    channel.meter.style.setProperty('--vu', clamp((db + 60) / 60).toFixed(3));
    channel.text.textContent = db <= -59.9 ? '≤−60 dBFS' : Math.round(db) + ' dBFS';
    meterTimer = setTimeout(() => showLevel(current), 95);
  }
  async function attach(channel) {
    const current = {channel, engine: null, stream: null, input: null};
    link = current;
    try {
      current.engine = new AudioEngine();
      await current.engine.resume();
      if (link !== current) return;
      current.stream = (channel.audio.captureStream || channel.audio.mozCaptureStream).call(channel.audio);
      if (!current.stream.getAudioTracks().length) throw Error();
      current.input = current.engine.createMediaStreamSource(current.stream);
      current.analyser = current.engine.createAnalyser();
      current.analyser.fftSize = 512;
      current.samples = new Float32Array(current.analyser.fftSize);
      // This is a passive tap. Only the native audio element sends sound to the speakers.
      current.input.connect(current.analyser);
      showLevel(current);
    } catch {
      if (link !== current) return;
      unlink();
      channel.unmetered = channel.audio.getAttribute('src');
      channel.meter.hidden = true;
    }
  }
  function syncAudio() {
    const allowed = motionOn();
    const hasSource = !original.hidden && Boolean(original.getAttribute('src'));
    monitor.toggleAttribute('data-source-file', hasSource);
    const sourcePlaying = hasSource && !original.paused && !original.ended;
    monitor.classList.toggle('is-playing', allowed && sourcePlaying);
    if (allowed && hasSource && original.duration > 0) {
      monitor.style.setProperty('--playhead', (clamp(original.currentTime / original.duration) * 100).toFixed(2) + '%');
    }
    let next = null;
    for (const channel of channels) {
      const {audio, meter} = channel;
      const url = audio.getAttribute('src');
      const available = allowed && supported(audio) && Boolean(url) && url !== channel.unmetered &&
        !audio.hidden && !audio.closest('[hidden]');
      meter.hidden = !available;
      if (available && !audio.paused && !audio.ended && audio.readyState >= 2 && visible.has(audio)) next = channel;
    }
    if (next === link?.channel) return;
    unlink();
    if (next) attach(next);
  }
  function syncMotion() {
    root.dataset.studioFx = motionOn() ? 'on' : 'off';
    if (!motionOn()) {
      for (const key of ['--console-y','--console-angle','--dial-turn']) monitor.style.removeProperty(key);
      for (const key of ['--title-shift','--title-turn']) intro.style.removeProperty(key);
    }
    syncAudio();
    requestLayout();
  }
  const observed = [monitor,...panels,...channels.map(channel => channel.audio)];
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
        if (entry.target === monitor) monitor.classList.toggle('in-sight', entry.isIntersecting);
      }
      syncAudio();
      requestLayout();
    });
    observed.forEach(element => observer.observe(element));
  } else {
    observed.forEach(element => visible.add(element));
    monitor.classList.add('in-sight');
  }
  for (const {audio} of channels) {
    for (const event of ['loadedmetadata','play','playing','pause','ended','emptied','seeking','timeupdate']) {
      audio.addEventListener(event, syncAudio);
    }
  }
  const resourceObserver = new MutationObserver(syncAudio);
  [original,document.getElementById('result'),document.getElementById('resultAudio')].forEach(element => {
    resourceObserver.observe(element,{attributes: true, attributeFilter: ['src','hidden']});
  });
  window.addEventListener('scroll', requestLayout, {passive: true});
  window.addEventListener('resize', requestLayout);
  document.addEventListener('visibilitychange', syncMotion);
  preference.addEventListener('change', syncMotion);
  window.addEventListener('pagehide', unlink);
  syncMotion();
})();
