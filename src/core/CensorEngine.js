import { RegionManager } from "./RegionManager.js";
import { getCensorMethodById } from "../censors/CensorRegistry.js";
import { createLoremCursor } from "../utils/loremIpsum.js";

/**
 * CensorEngine
 * -------------
 * Produces a final, censored canvas from the original image + region
 * selections + chosen method. Always renders fresh from the
 * untouched source image, so switching methods or toggling a region
 * never compounds artifacts from a previous render.
 */
export class CensorEngine {
	/**
	 * @param {HTMLCanvasElement} sourceCanvas - untouched original image
	 * @param {import('./RegionManager.js').TextRegion[]} regions
	 * @param {string} methodId
	 * @returns {HTMLCanvasElement} a new canvas with censoring applied
	 */
	static render(sourceCanvas, regions, methodId) {
		const output = document.createElement("canvas");
		output.width = sourceCanvas.width;
		output.height = sourceCanvas.height;
		const ctx = output.getContext("2d");

		ctx.drawImage(sourceCanvas, 0, 0);

		const method = getCensorMethodById(methodId);
		const toCensor = RegionManager.sortReadingOrder(RegionManager.censoredOf(regions));

		// Fresh per render: e.g. FakeTextCensor's lorem-ipsum sequence
		// restarts at "lorem" on each export, but advances across every
		// region censored within this one pass.
		const sharedState = { loremCursor: createLoremCursor() };

		toCensor.forEach((region) => method.apply(ctx, region, sourceCanvas, sharedState));

		return output;
	}
}
