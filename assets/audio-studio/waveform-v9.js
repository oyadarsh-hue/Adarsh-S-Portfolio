// This display samples the buffer the converter already decoded. It never starts audio playback.
export function createWaveform(canvas, name, metric) {
  const context = canvas?.getContext('2d');
  if (!context) return () => {};
  let peaks = null;
  function paint() {
    const {width, height} = canvas.getBoundingClientRect();
    if (!width || !height) return;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context.scale(scale, scale);
    context.lineCap = 'round';
    context.strokeStyle = '#d1f64e';
    context.lineWidth = 2;
    const middle = height / 2;
    context.beginPath();
    if (peaks) {
      const step = width / peaks.length;
      for (let i = 0; i < peaks.length; i++) {
        const [low, high] = peaks[i];
        const x = (i + .5) * step;
        context.moveTo(x, middle - high * middle * .92);
        context.lineTo(x, middle - low * middle * .92 + 1);
      }
    } else {
      // The starting trace shows 15 milliseconds of a 440 Hz reference sine.
      for (let x = 0; x <= width; x++) {
        const y = middle - Math.sin(x / width * .015 * 440 * 2 * Math.PI) * middle * .72;
        if (x === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      }
    }
    context.stroke();
  }
  if (window.ResizeObserver) new ResizeObserver(paint).observe(canvas);
  else window.addEventListener('resize', paint);
  paint();
  return function display(buffer) {
    peaks = null;
    if (buffer && buffer.length > 0) {
      const channels = Array.from({length: Math.min(2, buffer.numberOfChannels)}, (_, i) => buffer.getChannelData(i));
      const count = Math.min(190, buffer.length);
      peaks = Array.from({length: count}, (_, i) => {
        const first = Math.floor(i * buffer.length / count);
        const last = Math.floor((i + 1) * buffer.length / count);
        const stride = Math.max(1, Math.ceil((last - first) / 192));
        let low = 0, high = 0;
        for (const channel of channels) {
          for (let at = first; at < last; at += stride) {
            low = Math.min(low, channel[at]);
            high = Math.max(high, channel[at]);
          }
        }
        return [low, high];
      });
      const seconds = Math.round(buffer.duration);
      name.textContent = 'Source waveform';
      metric.textContent = Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0') +
        ' · ' + (buffer.sampleRate / 1000) + ' kHz';
    } else {
      name.textContent = 'Reference tone';
      metric.textContent = '440 Hz';
    }
    paint();
  };
}
