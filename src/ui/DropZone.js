/**
 * DropZone
 * ---------
 * Wires up the drag-and-drop / click-to-choose file input. Knows
 * nothing about OCR, canvases, or app state beyond "here is an
 * HTMLImageElement, do something with it" — kept deliberately dumb
 * so it's easy to test or replace.
 */
export class DropZone {
  /**
   * @param {HTMLElement} rootEl - the .dropzone element
   * @param {(image: HTMLImageElement) => void} onImageReady
   */
  constructor(rootEl, onImageReady) {
    this.rootEl = rootEl;
    this.innerEl = rootEl.querySelector('.dropzone__inner');
    this.fileInput = rootEl.querySelector('#fileInput');
    this.onImageReady = onImageReady;

    this._bindEvents();
  }

  _bindEvents() {
    this.innerEl.addEventListener('click', () => this.fileInput.click());

    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) this._loadFile(file);
    });

    ['dragenter', 'dragover'].forEach((evt) =>
      this.innerEl.addEventListener(evt, (e) => {
        e.preventDefault();
        this.innerEl.classList.add('is-dragover');
      })
    );

    ['dragleave', 'drop'].forEach((evt) =>
      this.innerEl.addEventListener(evt, (e) => {
        e.preventDefault();
        this.innerEl.classList.remove('is-dragover');
      })
    );

    this.innerEl.addEventListener('drop', (e) => {
      const file = e.dataTransfer?.files?.[0];
      if (file) this._loadFile(file);
    });
  }

  _loadFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please drop an image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => this.onImageReady(img, file.name);
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
  hide() {
    this.rootEl.dataset.visible = 'false';
  }

  show() {
    this.rootEl.dataset.visible = 'true';
    this.fileInput.value = '';
  }
}
