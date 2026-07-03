import { CensorMethod } from './CensorMethod.js';
import { sampleBackgroundColor } from '../utils/backgroundSampler.js';
import { computeBlockSize } from '../utils/pixelateBlockSize.js';

const OVERLAY_OPACITY = 0.6; // how strongly the sampled background is blended over the mosaic

/**
 * PixelateOpacityCensor
 * ----------------------
 * Same area-scaled mosaic as PixelateCensor, but afterwards blends a
 * solid, sampled background color over the region at high opacity.
 * The mosaic blocks are still faintly visible (so it still *reads*
 * as "pixelated" to the eye) but a large fraction of the original
 * pixel signal is overwritten by flat color, which meaningfully
 * raises the bar for any reconstruction attempt compared to plain
 * pixelation. It is not cryptographically safe — nothing pixel-based
 * is — but it is strictly harder to reverse than PixelateCensor.
 */
export class PixelateOpacityCensor extends CensorMethod {
  static id = 'pixelate-opacity';
  static label = 'Pixelate + background blend';
  static description = 'Area-scaled mosaic blended with the surrounding background color.';

  static apply(ctx, region, sourceCanvas) {
    const { x, y, width, height } = region;
    const blockSize = computeBlockSize(region);
    const cols = Math.max(1, Math.ceil(width / blockSize));
    const rows = Math.max(1, Math.ceil(height / blockSize));

    const tiny = document.createElement('canvas');
    tiny.width = cols;
    tiny.height = rows;
    const tinyCtx = tiny.getContext('2d');
    tinyCtx.drawImage(sourceCanvas, x, y, width, height, 0, 0, cols, rows);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tiny, 0, 0, cols, rows, x, y, width, height);
    ctx.restore();

    const bgColor = sampleBackgroundColor(sourceCanvas, region);
    ctx.save();
    ctx.globalAlpha = OVERLAY_OPACITY;
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, width, height);
    ctx.restore();
  }
}
