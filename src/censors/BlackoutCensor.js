import { CensorMethod } from './CensorMethod.js';

/**
 * BlackoutCensor
 * ---------------
 * The safest option by far: a solid fill, no trace of the underlying
 * pixels left at all. Equivalent to a redaction marker on paper.
 */
export class BlackoutCensor extends CensorMethod {
  static id = 'blackout';
  static label = 'Solid blackout';
  static description = 'Flat black bar. No original pixel data remains — the safest option.';

  static apply(ctx, region) {
    const { x, y, width, height } = region;
    ctx.save();
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y, width, height);
    ctx.restore();
  }
}
