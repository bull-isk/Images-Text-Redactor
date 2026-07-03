# Redactor

Drag-and-drop image text censoring, entirely client-side (no server,
no upload — OCR and rendering both happen in the browser via
[Tesseract.js](https://github.com/naptha/tesseract.js)).

## Running it

Because the app uses ES modules (`<script type="module">`), you can't
just double-click `index.html` — browsers block module loading over
`file://`. Serve the folder locally instead:

```bash
cd redactor
python3 -m http.server 8000
# then open http://localhost:8000
```

or `npx serve .` if you have Node installed. No build step, no
dependencies to install — the only external thing is the Tesseract.js
CDN script tag in `index.html`.

## Architecture

The pipeline is: **detect → select → censor → export**, and the file
structure mirrors that directly.

```
index.html                 shell: dropzone + workspace markup
styles/main.css             all styling

src/
  state/
    AppState.js             single source of truth + pub/sub events
                              (regions, active tool, marquee action,
                              loading/progress)

  core/
    OCREngine.js             wraps Tesseract.js — only file that
                              knows the OCR library's API
    RegionManager.js         turns raw OCR words (and user-drawn
                              rects) into TextRegion objects; owns
                              hit-testing and rectangle-intersection
    CensorEngine.js           orchestrator: given regions + a chosen
                              method, renders a final output canvas

  censors/                   one file per censor STRATEGY
    CensorMethod.js           base interface every method implements
    PixelateCensor.js         area-scaled mosaic
    PixelateOpacityCensor.js  area-scaled mosaic + background blend
    BlackoutCensor.js
    FakeTextCensor.js
    CensorRegistry.js         ordered list of all methods — the one
                              place that wires a new method in

  ui/                        DOM-facing modules, no business logic
    DropZone.js               drag/drop + file picker
    CanvasRenderer.js         draws image + region overlay boxes;
                              owns all pointer interaction — click to
                              toggle, drag to marquee-select or draw
                              a manual box, right-click to delete a
                              manual box
    Toolbar.js                method picker, tool switch, marquee
                              action toggle, progress bar, download
    Toast.js                  tiny status message helper

  utils/                     small, pure, independently testable
    backgroundSampler.js      estimates background color around a region
    loremIpsum.js             length-matched placeholder text
    squigglyText.js           draws text along a wavy hand-scrawled baseline
    pixelateBlockSize.js      mosaic block size as a function of region area
    exportImage.js            canvas -> PNG download

  main.js                    wires everything together; the only file
                              that imports from every layer
```

## Interaction model

Two tools, switched from the "03 — Tool" panel:

- **Select** (default): click a box to toggle it between kept/censored.
  Drag across an area to select every region it overlaps at once —
  whether that drag marks them as censor or keep is set by the
  "Drag → censor / Drag → keep" toggle above the region list.
- **Manual censor**: drag anywhere on the image to draw a brand new
  censor box, for anything OCR didn't catch — logos, stylized
  headers, handwriting. Manual boxes render with a dashed outline so
  they're visually distinct from OCR-detected ones. Right-click a
  manual box to delete it (OCR-detected boxes aren't deletable, only
  toggleable, since they always reflect what's actually in the image).

A short drag (under ~4px) is always treated as a plain click rather
than a marquee/manual box, so accidental jitter doesn't create stray
regions — see `CLICK_DRAG_THRESHOLD_PX` in `CanvasRenderer.js`.

## QoL notes

- **Progress bar + skeleton loading**: `AppState` tracks `isLoading`
  and `progress` (fed by Tesseract's own progress callback in
  `OCREngine.js`). `Toolbar.js` renders the bar; `main.js` toggles a
  `.skeleton-overlay` div stacked on the canvas (`index.html` /
  `main.css`) that shimmers via a CSS `background-position` keyframe
  animation while `isLoading` is true. Respects
  `prefers-reduced-motion`.
- **Area-scaled pixelation**: `utils/pixelateBlockSize.js` computes
  mosaic block size as `sqrt(area) * factor`, clamped between a floor
  and ceiling. Both pixelate-family censors import it instead of
  using a fixed block size, so a small word gets fine blocks and a
  large banner gets chunky ones — which also means larger regions
  destroy proportionally more information per block, not just "look
  more pixelated."

### Why it's split this way

- **`state/AppState.js` is the only shared mutable state.** Every
  other module either reads from it, writes to it, or is a pure
  function — nothing reaches into another module's internals. If a
  region's selection looks wrong, the bug is either in `AppState` or
  in whichever module called it; you never have to chase state through
  the UI layer.

- **Censor methods are a strategy pattern (`censors/`).** Each file
  exports an object with the same shape (`id`, `label`, `description`,
  `apply(ctx, region, sourceCanvas)`). `CensorEngine` and `Toolbar`
  both just iterate `CENSOR_METHODS` from the registry — neither has a
  hardcoded `if (method === 'pixelate')` anywhere. **Adding a 5th
  censor method means adding one new file and one line in
  `CensorRegistry.js`; nothing else changes.**

- **`CensorEngine` always re-renders from the untouched source
  canvas**, never from a previously-censored one. That means toggling
  a region or switching methods can never compound artifacts, and the
  preview boxes you see while selecting are never touched by the
  actual censoring — the overlay canvas and image canvas are
  physically separate layers (`CanvasRenderer`).

- **`utils/` holds pure functions with no DOM-event or state
  dependencies** (`backgroundSampler`, `loremIpsum`, `squigglyText`).
  These are the easiest pieces to unit test in isolation, and the
  ones you're most likely to want to tune (mosaic block size, wave
  amplitude, background sampling radius) without touching anything
  else.

## The four methods, and their actual safety

Worth surfacing to users somewhere in the UI, not just here:

| Method | Reversibility risk |
|---|---|
| **Pixelate** | Weakest. Mosaic averaging is a known-weak scheme — short/predictable strings behind large blocks have been reconstructed before. Kept because you wanted the option. |
| **Pixelate + background blend** | Mosaic overwritten with a blended background color at high opacity. Meaningfully harder than plain pixelate, still not provably safe. |
| **Solid blackout** | Safest short of removing the region: no original pixel data survives at all. |
| **Fake handwritten text** | Also fully safe (background fill + synthetic text) — the length-matched lorem ipsum is cosmetic only, it carries no information about the original text. |

## Known limitations / next steps

- OCR quality depends entirely on Tesseract.js — stylized fonts,
  low-resolution scans, or non-Latin scripts (only the `eng`
  language pack is loaded) will miss text. Swapping in a different
  language pack or a cloud OCR API only requires editing
  `OCREngine.js`.
- `backgroundSampler.js` samples a thin ring around each region; it
  works well on flat/gradient backgrounds (documents, screenshots,
  slides) and less well on busy photographic backgrounds, where the
  sampled "background" may not match what's actually behind the text.
- Region boxes are per-word from Tesseract, not merged into full
  lines — for long paragraphs you may want to add a merge step in
  `RegionManager.js` before it reaches the UI.
- No undo/redo on region toggles — `AppState` already emits change
  events, so this is a small addition if you want it.
