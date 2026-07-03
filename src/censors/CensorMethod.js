/**
 * CensorMethod
 * ------------
 * Base "interface" every censor strategy implements. Not enforced by
 * the language, but documented here as the contract:
 *
 *   id          {string}   unique key, used in the UI and by CensorRegistry
 *   label       {string}   shown to the user
 *   description {string}   one line explaining the tradeoff
 *   apply(ctx, region, sourceCanvas) -> void
 *     ctx           CanvasRenderingContext2D of the OUTPUT canvas (already
 *                    has the untouched image drawn on it)
 *     region         a TextRegion {x, y, width, height, text, ...}
 *     sourceCanvas   an offscreen canvas holding the ORIGINAL, unmodified
 *                    image — needed by methods that sample the background
 *                    (e.g. fake-text) so they never sample already-censored
 *                    pixels from an earlier region.
 *
 * Extending the app with a new censor method = add one file here that
 * exports an object matching this shape, then register it in
 * CensorRegistry.js. Nothing else needs to change.
 */

export class CensorMethod {
  static id = 'base';
  static label = 'Base method';
  static description = '';

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('../core/RegionManager.js').TextRegion} region
   * @param {HTMLCanvasElement} sourceCanvas
   */
  // eslint-disable-next-line no-unused-vars
  static apply(ctx, region, sourceCanvas) {
    throw new Error('CensorMethod.apply() must be implemented by subclasses');
  }
}
