import { RegionManager } from './RegionManager.js';
import { getCensorMethodById } from '../censors/CensorRegistry.js';

/**
 * CensorEngine
 * -------------
 * Produces a final, censored canvas from the original image + region
 * selections + chosen method. Always renders fresh from the
 * untouched source image, so switching methods or toggling a region
 * never compounds artifacts from a previous render.
 */
export class CensorEngine {
  /**
   * @param {HTMLCanvasElement} sourceCanvas - untouched original image
   * @param {import('./RegionManager.js').TextRegion[]} regions
   * @param {string} methodId
   * @returns {HTMLCanvasElement} a new canvas with censoring applied
   */
  static render(sourceCanvas, regions, methodId) {
    const output = document.createElement('canvas');
    output.width = sourceCanvas.width;
    output.height = sourceCanvas.height;
    const ctx = output.getContext('2d');

    ctx.drawImage(sourceCanvas, 0, 0);

    const method = getCensorMethodById(methodId);
    const toCensor = RegionManager.censoredOf(regions);
    toCensor.forEach((region) => method.apply(ctx, region, sourceCanvas));

    return output;
  }
}
