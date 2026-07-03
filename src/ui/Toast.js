export class Toast {
  constructor(el) {
    this.el = el;
    this._timeout = null;
  }

  show(message, durationMs = 2600) {
    this.el.textContent = message;
    this.el.classList.add('is-visible');
    clearTimeout(this._timeout);
    this._timeout = setTimeout(() => this.el.classList.remove('is-visible'), durationMs);
  }
}
