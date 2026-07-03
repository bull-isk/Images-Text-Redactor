/**
 * @typedef {Object} TextRegion
 * @property {string} id
 * @property {string} text        - the OCR'd text, used for length-matching fake text
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {boolean} keep       - true = leave untouched, false = censor
 * @property {boolean} isManual   - true = user-drawn box, not from OCR
 */

const PADDING_PX = 3; // small margin so censors fully cover glyph ascenders/descenders
const MANUAL_PLACEHOLDER_TEXT = 'manual redaction'; // gives fake-text a sensible default length

let _idCounter = 0;

/**
 * RegionManager
 * -------------
 * Turns raw OCR output (and user-drawn boxes) into TextRegion objects
 * the rest of the app works with, and owns the (pure) geometry logic:
 * padding, hit-testing, and rectangle-intersection for marquee select.
 * Selection state itself lives in AppState — this module just builds
 * and queries region lists.
 */
export class RegionManager {
  /**
   * @param {Array<{text: string, x:number, y:number, width:number, height:number}>} ocrWords
   * @returns {TextRegion[]}
   */
  static fromOCRWords(ocrWords) {
    return ocrWords.map((w) => ({
      id: `region-${_idCounter++}`,
      text: w.text,
      x: Math.max(0, w.x - PADDING_PX),
      y: Math.max(0, w.y - PADDING_PX),
      width: w.width + PADDING_PX * 2,
      height: w.height + PADDING_PX * 2,
      keep: false, // default: censor everything detected
      isManual: false,
    }));
  }

  /**
   * Build a user-drawn manual censor region from a normalized rect
   * (see `normalizeRect`). Used for text OCR missed — logos, stylized
   * headers, handwriting, watermarks, etc.
   * @param {{x:number, y:number, width:number, height:number}} rect
   * @returns {TextRegion}
   */
  static createManualRegion(rect) {
    return {
      id: `manual-${_idCounter++}`,
      text: MANUAL_PLACEHOLDER_TEXT,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      keep: false,
      isManual: true,
    };
  }

  /**
   * Turn two raw drag points into a top-left-origin rect, handling
   * drags in any direction (up/left as well as down/right).
   */
  static normalizeRect(x1, y1, x2, y2) {
    return {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
    };
  }

  /** Regions the user has chosen to censor. */
  static censoredOf(regions) {
    return regions.filter((r) => !r.keep);
  }

  /** Find the region (if any) under a given canvas coordinate. */
  static hitTest(regions, x, y) {
    // iterate in reverse so the most-recently-drawn (topmost) box wins
    for (let i = regions.length - 1; i >= 0; i--) {
      const r = regions[i];
      if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) {
        return r;
      }
    }
    return null;
  }

  /** All regions whose bounding box overlaps a marquee rectangle at all. */
  static regionsIntersectingRect(regions, rect) {
    return regions.filter((r) => RegionManager._rectsOverlap(r, rect));
  }

  static _rectsOverlap(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }
}
