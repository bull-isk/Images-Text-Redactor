import { CensorMethod } from './CensorMethod.js';
import { computeBlockSize } from '../utils/pixelateBlockSize.js';

/**
 * PixelateCensor
 * ---------------
 * Classic mosaic blur: shrink the region down, then scale it back up
 * with no smoothing so it renders as visible blocks. Block size
 * scales up with region area (see pixelateBlockSize.js) — a small
 * word gets fine blocks, a large banner gets chunkier ones.
 *
 * NOTE: this is the method you flagged as "not safe" — mosaic/pixelate
 * censoring of text is a known-weak scheme. With the original pixels
 * still statistically present in each block average, short or
 * predictable strings can sometimes be recovered (this is the same
 * class of attack that's been demonstrated against pixelated text and
 * faces in the past). It's kept here because you asked for it as an
 * option, but PixelateOpacityCensor, BlackoutCensor and FakeTextCensor
 * are all meaningfully harder to reverse — worth surfacing that
 * tradeoff to your users in the UI, not just in this comment.
 */
export class PixelateCensor extends CensorMethod {
  static id = 'pixelate';
  static label = 'Pixelate';
  static description = 'Mosaic blur, chunkier on larger areas. Reversible with effort — low-stakes use only.';

  static apply(ctx, region, sourceCanvas) {
    const { x, y, width, height } = region;
    const blockSize = computeBlockSize(region);
    const cols = Math.max(1, Math.ceil(width / blockSize));
    const rows = Math.max(1, Math.ceil(height / blockSize));

    // Downscale the region to `cols x rows`, then draw it back up at
    // full size with imageSmoothingEnabled off — that's what produces
    // hard mosaic blocks instead of a blur.
    const tiny = document.createElement('canvas');
    tiny.width = cols;
    tiny.height = rows;
    const tinyCtx = tiny.getContext('2d');
    tinyCtx.drawImage(sourceCanvas, x, y, width, height, 0, 0, cols, rows);

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tiny, 0, 0, cols, rows, x, y, width, height);
    ctx.restore();
  }
}
