import { CensorMethod } from './CensorMethod.js';
import { sampleBackgroundColor } from '../utils/backgroundSampler.js';
import { generateMatchedLorem } from '../utils/loremIpsum.js';
import { drawSquigglyText } from '../utils/squigglyText.js';

/**
 * FakeTextCensor
 * ---------------
 * Covers the region with its sampled background color, then draws a
 * "Redacted Script" placeholder string on top — so at a glance the
 * image still "looks like" it has text there, without revealing
 * anything real. Best suited to flat/simple backgrounds; see
 * backgroundSampler.js for the sampling heuristic's limits on busy
 * photo backgrounds.
 *
 * The placeholder text is pulled from a shared lorem-ipsum cursor
 * (sharedState.loremCursor, set up once per export by CensorEngine)
 * so consecutive regions read "lorem", "ipsum", "dolor", "sit", ...
 * instead of every region restarting at "lorem".
 */

export class FakeTextCensor extends CensorMethod {
  static id = 'fake-text';
  static label = 'Fake handwritten text';
  static description = 'Background fill + placeholder text that reads on through the image. Fully safe, most disguised.';

  static apply(ctx, region, sourceCanvas, sharedState) {
    const bgColor = sampleBackgroundColor(sourceCanvas, region);
    ctx.save();
    ctx.fillStyle = bgColor;
    ctx.fillRect(region.x, region.y, region.width, region.height);
    ctx.restore();

    const cursor = sharedState?.loremCursor;
    const fakeText = generateMatchedLorem(region.text || 'text', cursor);
    drawSquigglyText(ctx, fakeText, region, bgColor);
  }
}