/**
 * backgroundSampler
 * ------------------
 * Estimates the background color surrounding a text region by
 * sampling a thin ring of pixels just outside its edges (rather than
 * inside it, where the text glyphs themselves would skew the
 * average). This is a cheap heuristic, not real inpainting — it
 * works well for flat or gently-gradiented backgrounds (paper,
 * screenshots, slides) and less well for busy photographic
 * backgrounds, which is a reasonable limitation to call out to users.
 */

const RING_THICKNESS = 4; // px sampled just outside the region on each side
const MAX_SAMPLES = 400; // cap for performance on large regions

/**
 * @param {HTMLCanvasElement} sourceCanvas - the ORIGINAL, uncensored image
 * @param {{x:number, y:number, width:number, height:number}} region
 * @returns {string} an "rgb(r, g, b)" CSS color string
 */
export function sampleBackgroundColor(sourceCanvas, region) {
  const ctx = sourceCanvas.getContext('2d');
  const { x, y, width, height } = region;

  const sampleX = Math.max(0, Math.floor(x - RING_THICKNESS));
  const sampleY = Math.max(0, Math.floor(y - RING_THICKNESS));
  const sampleW = Math.min(sourceCanvas.width - sampleX, Math.ceil(width + RING_THICKNESS * 2));
  const sampleH = Math.min(sourceCanvas.height - sampleY, Math.ceil(height + RING_THICKNESS * 2));

  if (sampleW <= 0 || sampleH <= 0) return 'rgb(230, 230, 230)';

  const { data } = ctx.getImageData(sampleX, sampleY, sampleW, sampleH);

  let r = 0, g = 0, b = 0, count = 0;
  const totalPixels = sampleW * sampleH;
  const stride = Math.max(1, Math.floor(totalPixels / MAX_SAMPLES));

  for (let py = 0; py < sampleH; py++) {
    for (let px = 0; px < sampleW; px++) {
      // Only sample the outer ring, skip the interior (the text itself).
      const inInterior =
        px >= RING_THICKNESS && px < sampleW - RING_THICKNESS &&
        py >= RING_THICKNESS && py < sampleH - RING_THICKNESS;
      if (inInterior) continue;

      const pixelIndex = py * sampleW + px;
      if (pixelIndex % stride !== 0) continue;

      const i = pixelIndex * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
  }

  if (count === 0) return 'rgb(230, 230, 230)';
  return `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`;
}
