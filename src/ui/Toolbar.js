import { CENSOR_METHODS } from '../censors/CensorRegistry.js';

const TOOLS = [
  {
    id: 'select',
    label: 'Select',
    description: 'Click a box to toggle it, or drag across several to select an area at once.',
  },
  {
    id: 'manual',
    label: 'Manual censor',
    description: 'Drag anywhere to add a custom censor box — for logos, watermarks, or anything OCR missed.',
  },
];

/**
 * Toolbar
 * --------
 * Renders the method list, tool switch, marquee-action toggle, the
 * scan progress bar, and wires up all toolbar buttons. Reads from /
 * writes to AppState only — never touches canvases directly.
 */
export class Toolbar {
  /**
   * @param {Object} els - relevant DOM elements
   * @param {import('../state/AppState.js').AppState} state
   * @param {{onDownload: Function, onReset: Function}} handlers
   */
  constructor(els, state, handlers) {
    this.els = els;
    this.state = state;
    this.handlers = handlers;

    this._renderMethodList();
    this._renderToolList();
    this._bindActions();
    this._bindStateEvents();
    this._updateMarqueeButtons();
    this._updateToolVisibility();
  }

  _renderMethodList() {
    this.els.methodList.innerHTML = '';
    CENSOR_METHODS.forEach((method) => {
      const option = this._buildRadioOption({
        checked: method.id === this.state.censorMethodId,
        name: method.label,
        desc: method.description,
        onSelect: () => {
          this.state.setCensorMethod(method.id);
          this._markChecked(this.els.methodList, option);
        },
      });
      this.els.methodList.appendChild(option);
    });
  }

  _renderToolList() {
    this.els.toolList.innerHTML = '';
    TOOLS.forEach((tool) => {
      const option = this._buildRadioOption({
        checked: tool.id === this.state.activeTool,
        name: tool.label,
        desc: tool.description,
        onSelect: () => {
          this.state.setActiveTool(tool.id);
          this._markChecked(this.els.toolList, option);
          this._updateToolVisibility();
        },
      });
      this.els.toolList.appendChild(option);
    });
  }

  _buildRadioOption({ checked, name, desc, onSelect }) {
    const option = document.createElement('div');
    option.className = 'method-option';
    option.setAttribute('role', 'radio');
    option.setAttribute('tabindex', '0');
    option.setAttribute('aria-checked', String(checked));
    option.innerHTML = `
      <span class="method-option__radio" aria-hidden="true"></span>
      <span>
        <span class="method-option__name">${name}</span>
        <span class="method-option__desc">${desc}</span>
      </span>
    `;
    option.addEventListener('click', onSelect);
    option.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); }
    });
    return option;
  }

  _markChecked(listEl, selectedOption) {
    listEl.querySelectorAll('.method-option').forEach((el) => el.setAttribute('aria-checked', 'false'));
    selectedOption.setAttribute('aria-checked', 'true');
  }

  _bindActions() {
    this.els.keepAllBtn.addEventListener('click', () => this.state.setAllRegions(true));
    this.els.censorAllBtn.addEventListener('click', () => this.state.setAllRegions(false));
    this.els.downloadBtn.addEventListener('click', () => this.handlers.onDownload());
    this.els.resetBtn.addEventListener('click', () => this.handlers.onReset());

    this.els.marqueeCensorBtn.addEventListener('click', () => {
      this.state.setMarqueeAction('censor');
      this._updateMarqueeButtons();
    });
    this.els.marqueeKeepBtn.addEventListener('click', () => {
      this.state.setMarqueeAction('keep');
      this._updateMarqueeButtons();
    });
  }

  _bindStateEvents() {
    this.state.on('regions:changed', (regions) => this._updateRegionCount(regions));
    this.state.on('loading:changed', (isLoading) => {
      this.els.loadingLabel.textContent = 'Scanning for text… 0%';
    });
    this.state.on('progress:changed', (progress) => {
      const pct = Math.round(progress * 100);
      this.els.progressFill.style.width = `${pct}%`;
      this.els.loadingLabel.textContent = `Scanning for text… ${pct}%`;
    });
  }

  _updateMarqueeButtons() {
    const isCensor = this.state.marqueeAction === 'censor';
    this.els.marqueeCensorBtn.classList.toggle('btn--active', isCensor);
    this.els.marqueeKeepBtn.classList.toggle('btn--active', !isCensor);
  }

  _updateToolVisibility() {
    this.els.marqueeActionRow.style.display = this.state.activeTool === 'select' ? 'flex' : 'none';
  }

  _updateRegionCount(regions) {
    if (this.state.isLoading) return; // progress handler owns the label while scanning
    const censored = regions.filter((r) => !r.keep).length;
    const kept = regions.length - censored;
    this.els.regionCount.textContent = regions.length === 0
      ? 'No text detected — use Manual censor to add boxes by hand.'
      : `${regions.length} region${regions.length === 1 ? '' : 's'} found — ${censored} to censor, ${kept} kept.`;
  }

  setDownloadEnabled(enabled) {
    this.els.downloadBtn.disabled = !enabled;
  }
}