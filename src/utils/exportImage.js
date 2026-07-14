/**
 * Triggers a browser download of a canvas as a PNG.
 * @param {HTMLCanvasElement} canvas
 * @param {string} [filename]
 */

export function buildRedactedFilename(originalFileName) {
  return originalFileName ? `Redacted_${originalFileName}` : 'Redacted_image.png';
}

export function downloadCanvasAsPNG(canvas, filename = 'redacted-image.png') {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 'image/png');
}
