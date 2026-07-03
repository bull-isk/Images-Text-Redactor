import { RegionManager } from '../core/RegionManager.js';

/**
 * AppState
 * ---------
 * The single source of truth for the app. Holds no business logic —
 * only data plus a tiny pub/sub so UI modules can react to changes
 * without reaching into each other directly.
 */
export class AppState {
  constructor() {
    /** @type {HTMLImageElement|null} the original, unmodified image */
    this.sourceImage = null;

    /** @type {import('../core/RegionManager.js').TextRegion[]} */
    this.regions = [];

    /** @type {string} id of the currently selected censor method */
    this.censorMethodId = 'pixelate';

    /** @type {'select'|'manual'} which canvas tool is active */
    this.activeTool = 'select';

    /** @type {'censor'|'keep'} what a marquee drag applies to the regions it encloses */
    this.marqueeAction = 'censor';

    /** @type {boolean} whether OCR is currently running */
    this.isLoading = false;

    /** @type {number} 0-1, OCR progress for the loading bar */
    this.progress = 0;

    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
  }

  on(event, handler) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(handler);
    return () => this._listeners.get(event).delete(handler);
  }

  emit(event, payload) {
    (this._listeners.get(event) || []).forEach((fn) => fn(payload));
  }

  setSourceImage(image) {
    this.sourceImage = image;
    this.emit('image:loaded', image);
  }

  setRegions(regions) {
    this.regions = regions;
    this.emit('regions:changed', regions);
  }

  toggleRegionKeep(regionId) {
    const region = this.regions.find((r) => r.id === regionId);
    if (!region) return;
    region.keep = !region.keep;
    this.emit('regions:changed', this.regions);
  }

  setAllRegions(keep) {
    this.regions.forEach((r) => { r.keep = keep; });
    this.emit('regions:changed', this.regions);
  }

  /** Apply the current marqueeAction (keep/censor) to every region overlapping `rect`. */
  applyMarqueeToRect(rect) {
    const hits = RegionManager.regionsIntersectingRect(this.regions, rect);
    if (hits.length === 0) return;
    const keep = this.marqueeAction === 'keep';
    hits.forEach((r) => { r.keep = keep; });
    this.emit('regions:changed', this.regions);
  }

  /** Add a user-drawn manual censor region from a marquee rect. */
  addManualRegion(rect) {
    const MIN_SIZE = 6; // ignore accidental tiny drags/clicks
    if (rect.width < MIN_SIZE || rect.height < MIN_SIZE) return;
    const region = RegionManager.createManualRegion(rect);
    this.regions = [...this.regions, region];
    this.emit('regions:changed', this.regions);
  }

  removeRegion(regionId) {
    this.regions = this.regions.filter((r) => r.id !== regionId);
    this.emit('regions:changed', this.regions);
  }

  setCensorMethod(methodId) {
    this.censorMethodId = methodId;
    this.emit('method:changed', methodId);
  }

  setActiveTool(tool) {
    this.activeTool = tool;
    this.emit('tool:changed', tool);
  }

  setMarqueeAction(action) {
    this.marqueeAction = action;
    this.emit('marqueeAction:changed', action);
  }

  setLoading(isLoading) {
    this.isLoading = isLoading;
    if (isLoading) this.progress = 0;
    this.emit('loading:changed', isLoading);
  }

  setProgress(progress) {
    this.progress = progress;
    this.emit('progress:changed', progress);
  }
}
