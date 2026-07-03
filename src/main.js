import { AppState } from "./state/AppState.js";
import { OCREngine } from "./core/OCREngine.js";
import { RegionManager } from "./core/RegionManager.js";
import { CensorEngine } from "./core/CensorEngine.js";
import { DropZone } from "./ui/DropZone.js";
import { CanvasRenderer } from "./ui/CanvasRenderer.js";
import { Toolbar } from "./ui/Toolbar.js";
import { Toast } from "./ui/Toast.js";
import { downloadCanvasAsPNG } from "./utils/exportImage.js";

// ---- wire up DOM references ------------------------------------------
const dropzoneEl = document.getElementById("dropzone");
const workspaceEl = document.getElementById("workspace");
const imageCanvas = document.getElementById("imageCanvas");
const overlayCanvas = document.getElementById("overlayCanvas");
const skeletonOverlayEl = document.getElementById("skeletonOverlay");
const toastEl = document.getElementById("toast");

const toolbarEls = {
	methodList: document.getElementById("methodList"),
	toolList: document.getElementById("toolList"),
	progressBar: document.getElementById("progressBar"),
	progressFill: document.getElementById("progressFill"),
	loadingLabel: document.getElementById("loadingLabel"),
	regionCount: document.getElementById("regionCount"),
	marqueeActionRow: document.getElementById("marqueeActionRow"),
	marqueeCensorBtn: document.getElementById("marqueeCensorBtn"),
	marqueeKeepBtn: document.getElementById("marqueeKeepBtn"),
	keepAllBtn: document.getElementById("keepAllBtn"),
	censorAllBtn: document.getElementById("censorAllBtn"),
	downloadBtn: document.getElementById("downloadBtn"),
	resetBtn: document.getElementById("resetBtn"),
};

// ---- instantiate core pieces -------------------------------------------
const state = new AppState();
const toast = new Toast(toastEl);
const ocrEngine = new OCREngine((progress) => {
	if (progress.status === "recognizing text") {
		state.setProgress(progress.progress);
	}
});

const renderer = new CanvasRenderer(imageCanvas, overlayCanvas, {
	onRegionClick: (regionId) => state.toggleRegionKeep(regionId),
	onMarqueeSelect: (rect) => state.applyMarqueeToRect(rect),
	onManualDraw: (rect) => state.addManualRegion(rect),
	onRegionDelete: (regionId) => state.removeRegion(regionId),
});

const dropZone = new DropZone(dropzoneEl, (image) => handleImageLoaded(image));

const toolbar = new Toolbar(toolbarEls, state, {
	onDownload: handleDownload,
	onReset: handleReset,
});

// ---- state -> render wiring --------------------------------------------
state.on("regions:changed", (regions) => renderer.renderRegions(regions));
state.on("tool:changed", (tool) => renderer.setTool(tool));
state.on("loading:changed", (isLoading) => {
	workspaceEl.classList.toggle("is-loading", isLoading);
	skeletonOverlayEl.classList.toggle("is-visible", isLoading);
});

// ---- flow ---------------------------------------------------------------
async function handleImageLoaded(image) {
	dropZone.hide();
	workspaceEl.dataset.visible = "true";
	toolbar.setDownloadEnabled(false);

	state.setSourceImage(image);
	renderer.drawImage(image);
	renderer.setTool(state.activeTool);

	state.setLoading(true);
	try {
		const words = await ocrEngine.detectText(image);
		const regions = RegionManager.fromOCRWords(words);
		state.setRegions(regions);
		toolbar.setDownloadEnabled(true);
		if (regions.length === 0) toast.show("No text detected — try Manual censor to add boxes by hand.");
	} catch (err) {
		console.error(err);
		toast.show("Text detection failed — see console for details.");
	} finally {
		state.setLoading(false);
	}
}

function handleDownload() {
	if (!state.sourceImage) return;
	const outputCanvas = CensorEngine.render(imageCanvas, state.regions, state.censorMethodId);
	downloadCanvasAsPNG(outputCanvas, "redacted-image.png");
	toast.show("Downloaded.");
}

function handleReset() {
	state.setSourceImage(null);
	state.setRegions([]);
	renderer.clearOverlay();
	workspaceEl.dataset.visible = "false";
	dropZone.show();
}
