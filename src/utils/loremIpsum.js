const LOREM_WORDS = (
	"lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod " +
	"tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam " +
	"quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo " +
	"consequat duis aute irure in reprehenderit voluptate velit esse cillum"
).split(" ");

/**
 * A LoremCursor tracks a running position in LOREM_WORDS so that
 * successive calls to generateMatchedLorem() continue the sequence
 * ("lorem", "ipsum", "dolor", "sit", ...) instead of restarting at
 * "lorem" for every region. Wraps back to the start once the word
 * list is exhausted. Create one per export/render pass so each
 * download starts fresh at "lorem" but advances naturally across all
 * the regions censored in that pass.
 */
export function createLoremCursor() {
	return { index: 0 };
}

/**
 * Generate a lorem-ipsum string whose character length is close to
 * `targetLength`, preserving the original's rough word-count shape,
 * continuing from wherever `cursor` last left off.
 *
 * @param {string} originalText
 * @param {{index: number}} cursor - from createLoremCursor()
 * @returns {string}
 */
export function generateMatchedLorem(originalText, cursor = createLoremCursor()) {
	const targetLength = originalText.length;
	const targetWordCount = Math.max(1, originalText.split(/\s+/).filter(Boolean).length);

	const words = [];
	while (words.length < targetWordCount || words.join(" ").length < targetLength) {
		words.push(LOREM_WORDS[cursor.index % LOREM_WORDS.length]);
		cursor.index++;
		if (words.length > targetWordCount * 3) break; // safety valve
	}

	let result = words.join(" ");
	// Trim (not mid-word) to stay close to the original character length.
	// Note: the cursor has already advanced past every word pushed above,
	// even ones trimmed off here, so the next region still picks up
	// where the untrimmed sequence would have continued.
	if (result.length > targetLength + 4) {
		result = result.slice(0, targetLength);
		const lastSpace = result.lastIndexOf(" ");
		if (lastSpace > 0) result = result.slice(0, lastSpace);
	}

	return result || LOREM_WORDS[0];
}
