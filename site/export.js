// Client-side rendering of MP4 / WebM / GIF from Plush data — nothing is uploaded anywhere.
import { renderFrame } from './runtime/plush-player.js';

const even = (n) => Math.max(2, Math.round(n / 2) * 2);

function frameSize(data, size) {
  const k = size / Math.max(data.w, data.h);
  return { w: even(data.w * k), h: even(data.h * k) };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

/**
 * format: 'mp4' | 'webm' | 'gif'
 * opts: { size (longest side px), fps, loops, background (css colour or null for transparent), onProgress(0..1) }
 */
export async function exportMedia(data, format, opts = {}) {
  const { size = 720, loops = 1, background = null, onProgress = () => {} } = opts;
  const fps = opts.fps ?? (format === 'gif' ? 30 : 60);
  const { w, h } = frameSize(data, size);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: format === 'gif' });
  const perLoop = Math.round((data.frames / data.fps) * fps);
  const total = perLoop * loops;
  const at = (i) => ((i % perLoop) / perLoop) * data.frames;

  if (format === 'gif') {
    const { GIFEncoder, quantize, applyPalette } = await import('./vendor/gifenc.esm.js');
    const gif = GIFEncoder();
    const transparent = !background;
    for (let i = 0; i < total; i++) {
      renderFrame(ctx, data, at(i), w, h, { background });
      const { data: rgba } = ctx.getImageData(0, 0, w, h);
      const palette = transparent ? quantize(rgba, 256, { format: 'rgba4444', oneBitAlpha: true }) : quantize(rgba, 256);
      const index = applyPalette(rgba, palette, transparent ? 'rgba4444' : 'rgb565');
      const frameOpts = { palette, delay: Math.round(1000 / fps) };
      if (transparent) {
        const ti = palette.findIndex((c) => c[3] === 0);
        if (ti >= 0) Object.assign(frameOpts, { transparent: true, transparentIndex: ti, dispose: 2 });
      }
      gif.writeFrame(index, w, h, frameOpts);
      onProgress((i + 1) / total);
      if (i % 4 === 0) await tick();
    }
    gif.finish();
    return new Blob([gif.bytes()], { type: 'image/gif' });
  }

  const mb = await import('./vendor/mediabunny.min.mjs');
  const codec = format === 'mp4' ? 'avc' : 'vp9';
  const alpha = format === 'webm' && !background;
  if (!(await mb.canEncodeVideo(codec, { width: w, height: h }))) {
    throw new Error(`This browser can’t encode ${format.toUpperCase()} video. Try the latest Chrome, Edge or Safari.`);
  }
  const output = new mb.Output({
    format: format === 'mp4' ? new mb.Mp4OutputFormat() : new mb.WebMOutputFormat(),
    target: new mb.BufferTarget(),
  });
  const source = new mb.CanvasSource(canvas, { codec, quality: mb.QUALITY_HIGH, ...(alpha ? { alpha: 'keep' } : {}) });
  output.addVideoTrack(source, { frameRate: fps });
  await output.start();
  for (let i = 0; i < total; i++) {
    // MP4 has no transparency, so it always gets a background.
    renderFrame(ctx, data, at(i), w, h, { background: background ?? (format === 'mp4' ? '#ffffff' : null) });
    await source.add(i / fps, 1 / fps);
    onProgress((i + 1) / total);
  }
  await output.finalize();
  return new Blob([output.target.buffer], { type: format === 'mp4' ? 'video/mp4' : 'video/webm' });
}

export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
