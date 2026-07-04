import { CENSOR_METHODS } from "../censors/CensorRegistry.js";

const ICONS = {
	select: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>',
	manual: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 3"><rect x="3" y="3" width="18" height="18" rx="1"/></svg>',
	eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
	eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
};

const TOOLS = [
	{ id: "select", icon: ICONS.select, label: "Select", title: "Click a box to toggle it, or drag to select several" },
	{ id: "manual", icon: ICONS.manual, label: "Manual", title: "Drag to draw a custom censor box" },
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
	 * @param {{onDownload: Function, onReset: Function, onRetry: Function}} handlers
	 */
	constructor(els, state, handlers) {
		this.els = els;
		this.state = state;
		this.handlers = handlers;
		this._toolButtonEls = new Map();

		this._renderMethodList();
		this._renderToolButtons();
		this._renderMarqueeButtons();
		this._bindActions();
		this._bindStateEvents();
		this._updateToolVisibility();
	}

	_renderMethodList() {
		this.els.methodList.innerHTML = "";
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

	_buildRadioOption({ checked, name, desc, onSelect }) {
		const option = document.createElement("div");
		option.className = "method-option";
		option.setAttribute("role", "radio");
		option.setAttribute("tabindex", "0");
		option.setAttribute("aria-checked", String(checked));
		option.innerHTML = `
      <span class="method-option__radio" aria-hidden="true"></span>
      <span>
        <span class="method-option__name">${name}</span>
        <span class="method-option__desc">${desc}</span>
      </span>
    `;
		option.addEventListener("click", onSelect);
		option.addEventListener("keydown", (e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				onSelect();
			}
		});
		return option;
	}

	_markChecked(listEl, selectedOption) {
		listEl.querySelectorAll(".method-option").forEach((el) => el.setAttribute("aria-checked", "false"));
		selectedOption.setAttribute("aria-checked", "true");
	}

	/** Icon-style toggle buttons for Select / Manual censor — grouped visually apart from bulk actions. */
	_renderToolButtons() {
		this.els.toolList.innerHTML = "";
		TOOLS.forEach((tool) => {
			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = "tool-btn";
			btn.title = tool.title;
			btn.setAttribute("aria-pressed", String(tool.id === this.state.activeTool));
			btn.innerHTML = `${tool.icon}<span>${tool.label}</span>`;
			btn.addEventListener("click", () => {
				this.state.setActiveTool(tool.id);
				this._toolButtonEls.forEach((el) => el.setAttribute("aria-pressed", "false"));
				btn.setAttribute("aria-pressed", "true");
				this._updateToolVisibility();
			});
			this._toolButtonEls.set(tool.id, btn);
			this.els.toolList.appendChild(btn);
		});
	}

	/** Icon-coded Drag → censor / Drag → keep toggle, only relevant while the Select tool is active. */
	_renderMarqueeButtons() {
		this.els.marqueeActionRow.innerHTML = "";

		this._marqueeCensorBtn = document.createElement("button");
		this._marqueeCensorBtn.type = "button";
		this._marqueeCensorBtn.className = "tool-btn tool-btn--censor";
		this._marqueeCensorBtn.title = "Dragging selects regions to censor";
		this._marqueeCensorBtn.innerHTML = `${ICONS.eyeOff}<span>Drag = censor</span>`;

		this._marqueeKeepBtn = document.createElement("button");
		this._marqueeKeepBtn.type = "button";
		this._marqueeKeepBtn.className = "tool-btn tool-btn--keep";
		this._marqueeKeepBtn.title = "Dragging selects regions to keep";
		this._marqueeKeepBtn.innerHTML = `${ICONS.eye}<span>Drag = keep</span>`;

		this._marqueeCensorBtn.addEventListener("click", () => {
			this.state.setMarqueeAction("censor");
			this._updateMarqueeButtons();
		});
		this._marqueeKeepBtn.addEventListener("click", () => {
			this.state.setMarqueeAction("keep");
			this._updateMarqueeButtons();
		});

		this.els.marqueeActionRow.appendChild(this._marqueeCensorBtn);
		this.els.marqueeActionRow.appendChild(this._marqueeKeepBtn);
		this._updateMarqueeButtons();
	}

	_bindActions() {
		this.els.keepAllBtn.addEventListener("click", () => this.state.setAllRegions(true));
		this.els.censorAllBtn.addEventListener("click", () => this.state.setAllRegions(false));
		this.els.downloadBtn.addEventListener("click", () => this.handlers.onDownload());
		this.els.resetBtn.addEventListener("click", () => this.handlers.onReset());
		this.els.retryBtn.addEventListener("click", () => this.handlers.onRetry());
	}

	_bindStateEvents() {
		this.state.on("regions:changed", (regions) => this._updateRegionCount(regions));
		this.state.on("loading:changed", () => {
			this.els.loadingLabel.textContent = "Scanning for text… 0%";
		});
		this.state.on("progress:changed", (progress) => {
			const pct = Math.round(progress * 100);
			this.els.progressFill.style.width = `${pct}%`;
			this.els.loadingLabel.textContent = `Scanning for text… ${pct}%`;
		});
	}

	_updateMarqueeButtons() {
		const isCensor = this.state.marqueeAction === "censor";
		this._marqueeCensorBtn.setAttribute("aria-pressed", String(isCensor));
		this._marqueeKeepBtn.setAttribute("aria-pressed", String(!isCensor));
	}

	_updateToolVisibility() {
		this.els.marqueeActionRow.style.display = this.state.activeTool === "select" ? "flex" : "none";
	}

	_updateRegionCount(regions) {
		if (this.state.isLoading) return;
		const censored = regions.filter((r) => !r.keep).length;
		const kept = regions.length - censored;
		this.els.regionCount.textContent =
			regions.length === 0
				? "No text detected — use Manual censor to add boxes by hand."
				: `${regions.length} region${regions.length === 1 ? "" : "s"} found — ${censored} to censor, ${kept} kept.`;
	}

	setDownloadEnabled(enabled) {
		this.els.downloadBtn.disabled = !enabled;
	}
}
