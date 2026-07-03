import { CensorMethod } from './CensorMethod.js';
import { sampleBackgroundColor } from '../utils/backgroundSampler.js';
import { generateMatchedLorem } from '../utils/loremIpsum.js';
import { drawSquigglyText } from '../utils/squigglyText.js';

/**
 * FakeTextCensor
 * ---------------
 * Covers the region with its sampled background color, then draws a
 * hand-scrawled-looking lorem ipsum string (length-matched to the
 * original) on top — so at a glance the image still "looks like" it
 * has text there, without revealing anything real. Best suited to
 * flat/simple backgrounds; see backgroundSampler.js for the sampling
 * heuristic's limits on busy photo backgrounds.
 */
export class FakeTextCensor extends CensorMethod {
  static id = 'fake-text';
  static label = 'Fake handwritten text';
  static description = 'Background fill + squiggly placeholder text of similar length. Fully safe, most disguised.';

  static apply(ctx, region, sourceCanvas) {
    const bgColor = sampleBackgroundColor(sourceCanvas, region);
    ctx.save();
    ctx.fillStyle = bgColor;
    ctx.fillRect(region.x, region.y, region.width, region.height);
    ctx.restore();

    const fakeText = generateMatchedLorem(region.text || 'text');
    drawSquigglyText(ctx, fakeText, region);
  }
}
