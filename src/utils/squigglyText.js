/**
 * squigglyText
 * -------------
 * Renders a string character-by-character along a sine-wave baseline,
 * so it reads as a hand-scrawled "fake" line of text rather than a
 * flat, obviously-computer-set string. Font size is auto-shrunk to
 * fit the target box, and ink color adapts to the sampled background
 * so it stays legible on both light and dark regions.
 */

const FONT_FAMILY = "'Redacted Script', cursive";
const WAVE_AMPLITUDE_RATIO = 0.08; // Redacted Script already reads as blocky/redacted; a subtler wave keeps it legible-looking
const WAVE_FREQUENCY = 0.3; // radians per character

// Only backgrounds clearly on the dark end flip to white ink; anything
// bright or in between defaults to black, per how most redaction
// marks/handwriting actually look on paper or screenshots.
const DARK_LUMINANCE_THRESHOLD = 90; // 0 (black) - 255 (white)
const INK_DARK_BG = 'rgba(255, 255, 255, 0.88)';
const INK_LIGHT_BG = 'rgba(20, 20, 20, 0.82)';

/**
 * @param {string} rgbString - e.g. "rgb(230, 225, 210)"
 * @returns {[number, number, number]}
 */
function parseRgbString(rgbString) {
  const match = /rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/.exec(rgbString || '');
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : [255, 255, 255];
}

/**
 * Perceptual luminance (ITU-R BT.601 weighting) — cheap and good
 * enough for a black-vs-white ink decision.
 */
function luminanceOf([r, g, b]) {
  return (r * 299 + g * 587 + b * 114) / 1000;
}

/**
 * Pick a legible ink color for the given background. Bright and
 * mid-tone backgrounds get black ink; only clearly dark backgrounds
 * switch to white.
 * @param {string} [backgroundColor] - "rgb(r, g, b)" string
 * @returns {string}
 */
export function pickInkColor(backgroundColor) {
  if (!backgroundColor) return INK_LIGHT_BG;
  const isDark = luminanceOf(parseRgbString(backgroundColor)) < DARK_LUMINANCE_THRESHOLD;
  return isDark ? INK_DARK_BG : INK_LIGHT_BG;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {{x:number, y:number, width:number, height:number}} box
 * @param {string} [backgroundColor] - the region's sampled background, used to pick ink color
 */
export function drawSquigglyText(ctx, text, box, backgroundColor) {
  const { x, y, width, height } = box;

  // Pick the largest font size (down to a floor) that fits the box width.
  let fontSize = Math.max(10, Math.floor(height * 0.9));
  ctx.save();
  ctx.font = `${fontSize}px ${FONT_FAMILY}`;
  while (ctx.measureText(text).width > width * 1.15 && fontSize > 8) {
    fontSize -= 1;
    ctx.font = `${fontSize}px ${FONT_FAMILY}`;
  }

  const amplitude = fontSize * WAVE_AMPLITUDE_RATIO;
  const baselineY = y + height * 0.72;
  const totalTextWidth = ctx.measureText(text).width;
  const startX = x + Math.max(0, (width - totalTextWidth) / 2);

  ctx.fillStyle = pickInkColor(backgroundColor);
  ctx.textBaseline = 'alphabetic';

  let cursorX = startX;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const wave = Math.sin(i * WAVE_FREQUENCY) * amplitude;
    ctx.save();
    ctx.translate(cursorX, baselineY + wave);
    ctx.rotate(Math.sin(i * WAVE_FREQUENCY + 1) * 0.06); // slight per-glyph tilt
    ctx.fillText(char, 0, 0);
    ctx.restore();
    cursorX += ctx.measureText(char).width;
  }

  ctx.restore();
}