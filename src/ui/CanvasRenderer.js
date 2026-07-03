import { RegionManager } from '../core/RegionManager.js';

const COLOR_CENSOR = 'rgba(163, 49, 42, 0.85)';   // will be censored
const COLOR_KEEP = 'rgba(63, 107, 79, 0.85)';      // kept as-is
const COLOR_MARQUEE = 'rgba(32, 29, 24, 0.9)';     // drag-select rectangle preview
const COLOR_MANUAL_DRAW = 'rgba(163, 49, 42, 0.9)'; // manual-censor draw preview
const FILL_ALPHA = 0.12;
const CLICK_DRAG_THRESHOLD_PX = 4; // below this, a drag is treated as a plain click

/**
 * CanvasRenderer
 * ---------------
 * Owns the two stacked canvases: the base image canvas (never
 * touched after the initial draw — it's the "source of truth" pixel
 * data) and a transparent overlay canvas that draws region boxes and
 * handles all pointer interaction:
 *
 *   - plain click on a region        -> toggle that one region
 *   - drag, tool = "select"          -> marquee-select every region
 *                                        the drag rectangle overlaps
 *   - drag, tool = "manual"          -> draw a brand new manual
 *                                        censor region
 *   - right-click a manual region    -> delete it
 *
 * Which of these a drag means is decided by `setTool()`, called from
 * main.js whenever the toolbar's tool switch changes. The renderer
 * itself stays dumb about *why* a region was selected — it just
 * reports gestures back through callbacks.
 */
export class CanvasRenderer {
  /**
   * @param {HTMLCanvasElement} imageCanvas
   * @param {HTMLCanvasElement} overlayCanvas
   * @param {{
   *   onRegionClick: (regionId: string) => void,
   *   onMarqueeSelect: (rect: {x:number,y:number,width:number,height:number}) => void,
   *   onManualDraw: (rect: {x:number,y:number,width:number,height:number}) => void,
   *   onRegionDelete: (regionId: string) => void,
   * }} handlers
   */
  constructor(imageCanvas, overlayCanvas, handlers) {
    this.imageCanvas = imageCanvas;
    this.overlayCanvas = overlayCanvas;
    this.handlers = handlers;
    this._regions = [];
    this._tool = 'select'; // 'select' | 'manual'

    this._drag = null; // { startX, startY, curX, curY, moved }

    this._bindEvents();
  }

  setTool(tool) {
    this._tool = tool;
    this.overlayCanvas.style.cursor = tool === 'manual' ? 'crosshair' : 'pointer';
  }

  /** Draw the original image and size both canvases to match it 1:1. */
  drawImage(image) {
    const { naturalWidth: w, naturalHeight: h } = image;
    [this.imageCanvas, this.overlayCanvas].forEach((c) => {
      c.width = w;
      c.height = h;
    });
    this.imageCanvas.getContext('2d').drawImage(image, 0, 0);
    this.clearOverlay();
  }

  /** Re-render region boxes (plus a marquee preview, if currently dragging). */
  renderRegions(regions) {
    this._regions = regions;
    this._redraw();
  }

  clearOverlay() {
    const ctx = this.overlayCanvas.getContext('2d');
    ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);
  }

  _redraw() {
    const ctx = this.overlayCanvas.getContext('2d');
    this.clearOverlay();

    this._regions.forEach((r) => {
      const color = r.keep ? COLOR_KEEP : COLOR_CENSOR;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      if (r.isManual) ctx.setLineDash([6, 4]); // visually distinguish manual boxes
      ctx.fillStyle = color.replace('0.85', String(FILL_ALPHA));
      ctx.fillRect(r.x, r.y, r.width, r.height);
      ctx.strokeRect(r.x, r.y, r.width, r.height);
      ctx.restore();
    });

    if (this._drag && this._drag.moved) {
      const rect = RegionManager.normalizeRect(
        this._drag.startX, this._drag.startY, this._drag.curX, this._drag.curY
      );
      const isManualDraw = this._tool === 'manual';
      ctx.save();
      ctx.strokeStyle = isManualDraw ? COLOR_MANUAL_DRAW : COLOR_MARQUEE;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.fillStyle = isManualDraw ? 'rgba(163, 49, 42, 0.1)' : 'rgba(32, 29, 24, 0.06)';
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
      ctx.restore();
    }
  }

  _bindEvents() {
    this.overlayCanvas.addEventListener('mousedown', (e) => this._handleMouseDown(e));
    this.overlayCanvas.addEventListener('mousemove', (e) => this._handleMouseMove(e));
    window.addEventListener('mouseup', (e) => this._handleMouseUp(e));
    this.overlayCanvas.addEventListener('contextmenu', (e) => this._handleRightClick(e));
  }

  _toCanvasPoint(e) {
    const rect = this.overlayCanvas.getBoundingClientRect();
    const scaleX = this.overlayCanvas.width / rect.width;
    const scaleY = this.overlayCanvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  _handleMouseDown(e) {
    if (e.button !== 0) return; // left click only; right click is handled separately
    const { x, y } = this._toCanvasPoint(e);
    this._drag = { startX: x, startY: y, curX: x, curY: y, moved: false };
  }

  _handleMouseMove(e) {
    if (!this._drag) return;
    const { x, y } = this._toCanvasPoint(e);
    this._drag.curX = x;
    this._drag.curY = y;
    const dist = Math.hypot(x - this._drag.startX, y - this._drag.startY);
    if (dist > CLICK_DRAG_THRESHOLD_PX) this._drag.moved = true;
    this._redraw();
  }

  _handleMouseUp(e) {
    if (!this._drag) return;
    const drag = this._drag;
    this._drag = null;

    if (!drag.moved) {
      // Plain click: toggle whatever single region is under the pointer.
      const hit = RegionManager.hitTest(this._regions, drag.startX, drag.startY);
      if (hit) this.handlers.onRegionClick(hit.id);
      this._redraw();
      return;
    }

    const rect = RegionManager.normalizeRect(drag.startX, drag.startY, drag.curX, drag.curY);
    if (this._tool === 'manual') {
      this.handlers.onManualDraw(rect);
    } else {
      this.handlers.onMarqueeSelect(rect);
    }
    this._redraw();
  }

  _handleRightClick(e) {
    e.preventDefault();
    const { x, y } = this._toCanvasPoint(e);
    const hit = RegionManager.hitTest(this._regions, x, y);
    if (hit && hit.isManual) this.handlers.onRegionDelete(hit.id);
  }
}
