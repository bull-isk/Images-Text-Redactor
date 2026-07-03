const LOREM_WORDS = (
  'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod ' +
  'tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam ' +
  'quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo ' +
  'consequat duis aute irure in reprehenderit voluptate velit esse cillum'
).split(' ');

/**
 * Generate a lorem-ipsum string whose character length is close to
 * `targetLength`, preserving the original's rough word-count shape so
 * the fake text still "reads" like a redacted line of similar
 * density rather than one giant word or many tiny ones.
 *
 * @param {string} originalText
 * @returns {string}
 */
export function generateMatchedLorem(originalText) {
  const targetLength = originalText.length;
  const targetWordCount = Math.max(1, originalText.split(/\s+/).filter(Boolean).length);

  let result = '';
  let wordIndex = 0;
  let words = [];

  while (words.length < targetWordCount || result.length < targetLength) {
    const word = LOREM_WORDS[wordIndex % LOREM_WORDS.length];
    words.push(word);
    result = words.join(' ');
    wordIndex++;
    if (words.length > targetWordCount * 3) break; // safety valve
  }

  // Trim (not mid-word) to stay close to the original character length.
  if (result.length > targetLength + 4) {
    result = result.slice(0, targetLength);
    const lastSpace = result.lastIndexOf(' ');
    if (lastSpace > 0) result = result.slice(0, lastSpace);
  }

  return result || LOREM_WORDS[0];
}
