/**
 * fontLoader
 * -----------
 * Makes sure the "Redacted Script" web font is actually fetched and
 * decoded before we draw text with it on a <canvas>. A CSS @font-face
 * link (see index.html) only tells the browser the font *exists* —
 * it doesn't fetch the file until something on the page renders text
 * in that family, and canvas text drawn before that finishes will
 * silently fall back to the generic 'cursive' font instead of
 * "Redacted Script", with no error. document.fonts.load() forces the
 * fetch (from Google's CDN if it isn't cached on this device yet) and
 * gives us a promise we can await before rendering.
 */
const FONT_FAMILY = "Redacted Script";

let loadPromise = null;

/**
 * Kick off (or reuse) loading the font. Safe to call multiple times —
 * the underlying fetch only happens once.
 * @returns {Promise<void>}
 */
export function ensureFakeTextFontLoaded() {
	if (!loadPromise) {
		loadPromise = document.fonts
			.load(`16px "${FONT_FAMILY}"`)
			.then(() => document.fonts.ready)
			.catch(() => {
				// If the fetch fails (offline, blocked domain, etc.) we still
				// resolve — squigglyText.js falls back to 'cursive' cleanly.
			});
	}
	return loadPromise;
}
