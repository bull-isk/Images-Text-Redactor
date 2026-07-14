import { AppState } from "./state/AppState.js";
import { OCREngine } from "./core/OCREngine.js";
import { RegionManager } from "./core/RegionManager.js";
import { CensorEngine } from "./core/CensorEngine.js";
import { DropZone } from "./ui/DropZone.js";
import { CanvasRenderer } from "./ui/CanvasRenderer.js";
import { Toolbar } from "./ui/Toolbar.js";
import { Toast } from "./ui/Toast.js";
import { downloadCanvasAsPNG } from "./utils/exportImage.js";
import { ensureFakeTextFontLoaded } from "./utils/fontLoader.js";

ensureFakeTextFontLoaded();

const dropzoneEl = document.getElementById("dropzone");
const workspaceEl = document.getElementById("workspace");
const imageCanvas = document.getElementById("imageCanvas");
const overlayCanvas = document.getElementById("overlayCanvas");
const skeletonOverlayEl = document.getElementById("skeletonOverlay");
const toastEl = document.getElementById("toast");
const resetBtnEl = document.getElementById("resetBtn"); // lives in the topbar now, top-left

const toolbarEls = {
	methodList: document.getElementById("methodList"),
	toolList: document.getElementById("toolList"),
	progressBar: document.getElementById("progressBar"),
	progressFill: document.getElementById("progressFill"),
	loadingLabel: document.getElementById("loadingLabel"),
	regionCount: document.getElementById("regionCount"),
	marqueeActionRow: document.getElementById("marqueeActionRow"),
	keepAllBtn: document.getElementById("keepAllBtn"),
	censorAllBtn: document.getElementById("censorAllBtn"),
	downloadBtn: document.getElementById("downloadBtn"),
	resetBtn: resetBtnEl,
	retryBtn: document.getElementById('retryBtn'),
	clearAllBtn: document.getElementById('clearAllBtn'),
};

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
	onRetry: handleRetry,
	onClearAll: handleClearAll,
});

state.on("regions:changed", (regions) => renderer.renderRegions(regions));
state.on("tool:changed", (tool) => renderer.setTool(tool));
state.on("loading:changed", (isLoading) => {
	workspaceEl.classList.toggle("is-loading", isLoading);
	skeletonOverlayEl.classList.toggle("is-visible", isLoading);
});

async function runDetection(image) {
	toolbar.setDownloadEnabled(false);
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

async function handleImageLoaded(image) {
	dropZone.hide();
	workspaceEl.dataset.visible = "true";
	resetBtnEl.hidden = false;

	state.setSourceImage(image);
	renderer.drawImage(image);
	renderer.setTool(state.activeTool);

	await runDetection(image);
}

function handleRetry() {
	if (!state.sourceImage) return;
	state.setRegions([]);
	runDetection(state.sourceImage);
}

function handleClearAll() {
	state.setRegions([]);
	toast.show('Cleared draw your own boxes with Manual censor.');
}

async function handleDownload() {
	if (!state.sourceImage) return;
	await ensureFakeTextFontLoaded(); // no-op if already loaded; guards a slow/first-time fetch
	const outputCanvas = CensorEngine.render(imageCanvas, state.regions, state.censorMethodId);
	downloadCanvasAsPNG(outputCanvas, "redacted-image.png");
	toast.show("Downloaded.");
}

function handleReset() {
	state.setSourceImage(null);
	state.setRegions([]);
	renderer.clearOverlay();
	workspaceEl.dataset.visible = "false";
	resetBtnEl.hidden = true;
	dropZone.show();
}
