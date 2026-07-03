/**
 * computeBlockSize
 * -----------------
 * Bigger censored regions get bigger mosaic blocks. This isn't just
 * cosmetic: a fixed block size means a huge banner of text still gets
 * blocked at word-scale granularity, leaving plenty of per-block
 * pixel-average signal to work with. Scaling the block size with the
 * region's area means large regions genuinely destroy more
 * information per block, not just "look more pixelated."
 *
 * Scaling is by sqrt(area) so it grows with the region's linear
 * dimensions rather than its raw pixel count (which would explode
 * block size far too quickly for large regions).
 */
const MIN_BLOCK = 5;
const MAX_BLOCK = 32;
const SCALE_FACTOR = 0.18;

/**
 * @param {{width: number, height: number}} region
 * @returns {number} block size in source-image pixels
 */
export function computeBlockSize(region) {
  const area = Math.max(1, region.width * region.height);
  const scaled = Math.sqrt(area) * SCALE_FACTOR;
  return Math.round(Math.min(MAX_BLOCK, Math.max(MIN_BLOCK, scaled)));
}
