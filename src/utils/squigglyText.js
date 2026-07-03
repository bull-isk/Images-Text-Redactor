/**
 * squigglyText
 * -------------
 * Renders a string character-by-character along a sine-wave baseline,
 * so it reads as a hand-scrawled "fake" line of text rather than a
 * flat, obviously-computer-set string. Font size is auto-shrunk to
 * fit the target box.
 */

const FONT_FAMILY = "'Caveat', cursive";
const WAVE_AMPLITUDE_RATIO = 0.12; // relative to font size
const WAVE_FREQUENCY = 0.35; // radians per character

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {{x:number, y:number, width:number, height:number}} box
 */
export function drawSquigglyText(ctx, text, box) {
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

  ctx.fillStyle = 'rgba(20, 20, 20, 0.82)';
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
