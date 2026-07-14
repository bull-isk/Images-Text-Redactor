/**
 * OCREngine
 * ---------
 * Wraps Tesseract.js so the rest of the app never touches its API
 * directly. If you ever swap OCR providers (cloud API, a different
 * WASM engine, etc.), this is the only file that changes.
 */

// Border/gridline characters Tesseract sometimes misreads as "text"
// when scanning spreadsheets, tables, and forms.
const GRID_ARTIFACT_PATTERN = /^[\s\-_|=~.·•+:;]+$/;
// Tesseract confidence is 0-100; below this is usually noise rather
// than a real character (often the same gridline/border artifacts).
const MIN_CONFIDENCE = 35;

function isLikelyGridArtifact(word) {
  const text = word.text.trim();
  if (GRID_ARTIFACT_PATTERN.test(text)) return true;
  if (word.confidence < MIN_CONFIDENCE) return true;
  return false;
}

export class OCREngine {
  /**
   * @param {(progress: {status: string, progress: number}) => void} [onProgress]
   */
  constructor(onProgress) {
    this._onProgress = onProgress || (() => { });
    this._worker = null;
  }

  async _getWorker() {
    if (this._worker) return this._worker;
    // Tesseract is loaded globally via the CDN <script> tag in index.html.
    this._worker = await Tesseract.createWorker('eng', 1, {
      logger: (m) => this._onProgress(m),
    });

    // Spreadsheets, forms, and UI screenshots hold scattered,
    // disconnected text rather than flowing paragraphs. Tesseract's
    // default page-segmentation mode runs full layout analysis first
    // (grouping text into columns/blocks), which on a grid of cells
    // often mis-reads border lines as text and/or drops isolated cell
    // values it can't fit into a column. PSM 11 ("sparse text") skips
    // layout analysis and just looks for text anywhere on the page,
    // which matches this kind of image much better — and doesn't hurt
    // normal documents/photos either, since we don't rely on Tesseract's
    // reading order (CensorEngine sorts regions itself).
    await this._worker.setParameters({
      tessedit_pageseg_mode: '11',
    });

    return this._worker;
  }

  /**
   * Detect text on an image and return word-level bounding boxes.
   * @param {HTMLImageElement|HTMLCanvasElement} imageSource
   * @returns {Promise<Array<{text: string, x: number, y: number, width: number, height: number, confidence: number}>>}
   */
  async detectText(imageSource) {
    const worker = await this._getWorker();
    const { data } = await worker.recognize(imageSource);

    const words = data.words || [];
    return words
      .filter((w) => w.text && w.text.trim().length > 0)
      .filter((w) => !isLikelyGridArtifact(w))
      .map((w) => ({
        text: w.text,
        x: w.bbox.x0,
        y: w.bbox.y0,
        width: w.bbox.x1 - w.bbox.x0,
        height: w.bbox.y1 - w.bbox.y0,
        confidence: w.confidence,
      }));
  }

  async terminate() {
    if (this._worker) {
      await this._worker.terminate();
      this._worker = null;
    }
  }
}