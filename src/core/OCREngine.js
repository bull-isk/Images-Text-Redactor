/**
 * OCREngine
 * ---------
 * Wraps Tesseract.js so the rest of the app never touches its API
 * directly. If you ever swap OCR providers (cloud API, a different
 * WASM engine, etc.), this is the only file that changes.
 */
export class OCREngine {
  /**
   * @param {(progress: {status: string, progress: number}) => void} [onProgress]
   */
  constructor(onProgress) {
    this._onProgress = onProgress || (() => {});
    this._worker = null;
  }

  async _getWorker() {
    if (this._worker) return this._worker;
    // Tesseract is loaded globally via the CDN <script> tag in index.html.
    this._worker = await Tesseract.createWorker('eng', 1, {
      logger: (m) => this._onProgress(m),
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
