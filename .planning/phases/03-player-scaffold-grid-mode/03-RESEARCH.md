# Phase 3: Player Scaffold + Grid Mode - Research

**Researched:** 2026-04-03
**Domain:** Web Component authoring, ES Module API design, canvas rendering, pretext layout engine, tsup IIFE build
**Confidence:** HIGH

## Summary

This phase builds `@asciify/player` from a stub into a fully functional package. The package shell exists from Phase 1 with an empty `src/index.ts`. The encoder package from Phase 2 provides all the data types and decompression utilities the player imports as a peer dependency. The architectural decisions are fully locked in CONTEXT.md — this research verifies the technical implementation path against the actual APIs and their current state.

`@chenglou/pretext` 0.0.4 (released 2026-04-02, 2 days ago) is the active layout engine. Its API is stable and confirmed: `prepare()` and `prepareWithSegments()` for one-time text analysis, `layoutWithLines()` for per-frame line layout. Grid mode in this phase uses pretext with `pre-wrap` whitespace mode — it measures character widths for positioning rather than using multi-line text wrapping. The Web Component API follows the Custom Elements v1 spec with Shadow DOM, `observedAttributes`, and `attributeChangedCallback`. The IIFE build output is added to tsup from day one per D-18. Testing uses vitest with `happy-dom` environment to approximate browser APIs without a real browser.

**Primary recommendation:** Mirror the encoder's tsup config, add `noExternal: ['@chenglou/pretext']` and `format: ['esm', 'cjs', 'iife']` with `globalName: 'AsciiPlayer'`. Wire the grid mode renderer directly to `ctx.fillText()` per-cell (matching the existing `pretext-renderer.ts` pattern), bypassing pretext's line-breaking for grid mode since the frame already provides a fixed-grid text string.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Theming via both HTML attributes (`fg-color`, `bg-color`, `theme`) AND CSS custom properties (`--ascii-fg`, `--ascii-bg`) as fallback. Attributes take priority, CSS properties as fallback. Named themes set both.
- **D-02:** Constructor: `new AsciiPlayer(canvas, data, options)` — canvas element provided by user, player renders to it.
- **D-03:** API parity with Web Component — same option names in camelCase (e.g., `fgColor`, `bgColor`, `fps`, `loop`, `autoplay`).
- **D-04:** State exposed via EventTarget (`addEventListener`) AND callback options (`onTimeUpdate`, `onEnded`). EventTarget is primary, callbacks are convenience sugar.
- **D-05:** `player.destroy()` method for cleanup — stops playback, cancels rAF, clears canvas, removes listeners. Required for SPA integration.
- **D-06:** `@asciify/encoder` as peer dependency. Player imports types and decompression utilities from encoder.
- **D-07:** Async init with `player.ready` promise. Constructor returns immediately. Font loads via `document.fonts.load()`, then pretext `prepare()` runs, then playback can start. Autoplay waits for ready.
- **D-08:** Accepts both `AsciiPlayerData` (uncompressed) and `AsciiPlayerDataCompact` (delta+RLE) formats. Auto-detects on load.
- **D-09:** Export surface: `AsciiPlayer` class + TypeScript types only. No standalone render function.
- **D-10:** Fresh renderer built inside player package — not extracted from `apps/web/src/lib/pretext-renderer.ts`. Clean implementation using pretext APIs.
- **D-11:** Pretext used for all modes including grid. `prepare()` for glyph measurement, `layoutWithLines()` for per-frame layout. Consistent code path across all future modes.
- **D-12:** Per-cell color rendering from `AsciiCell` data. No line-by-line fast path for monochrome — uniform per-cell approach for simplicity.
- **D-13:** `requestAnimationFrame` + time delta for FPS throttling. Check elapsed time since last frame, only advance when enough time has passed for target FPS.
- **D-14:** Both `seekTo(seconds)` and `seekToFrame(index)` methods. Seconds for media-like use, frame index for precise control.
- **D-15:** Decompression utilities imported from `@asciify/encoder` (peer dep). Single source of truth.
- **D-16:** Pretext bundled via tsup `noExternal` — `@chenglou/pretext` inlined into dist. Users never see it.
- **D-17:** Feature module organization: `src/player.ts` (core class), `src/renderer.ts` (canvas rendering), `src/playback.ts` (timing/loop), `src/web-component.ts` (custom element), `src/types.ts`, `src/index.ts` (re-exports).
- **D-18:** tsup outputs: ESM + CJS + IIFE + .d.ts types. Full coverage from day one.

### Claude's Discretion (Web Component)
- Shadow DOM strategy (open shadow DOM recommended for encapsulation)
- Controls bar design (minimal play/pause + progress bar recommended)
- Data loading (`src` attribute for URL fetch + `.data` property for direct object assignment)
- Responsive sizing (width-driven auto-height from frame aspect ratio per PLR-09)
- Error handling (visual error state + error event)
- IIFE build output (include from day one per PLR-01)
- Attribute reactivity via `observedAttributes` + `attributeChangedCallback`

### Claude's Discretion (Playback)
- `timeupdate` event frequency (every frame vs ~4x/second)
- End-of-playback behavior (stay on last frame recommended)
- Loop mode state machine internals

### Claude's Discretion (Decompression)
- Eager vs lazy decompression strategy (eager recommended for simplicity)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PLR-01 | `@asciify/player` package created with tsup build (ESM + CJS + IIFE + types) | tsup `format: ['esm','cjs','iife']` + `globalName` + `noExternal` confirmed working |
| PLR-02 | Web Component `<ascii-player>` registered as custom element | `customElements.define('ascii-player', AsciiPlayerElement)` — Custom Elements v1, all modern browsers |
| PLR-03 | ES Module API: `new AsciiPlayer(canvas, data, options)` for programmatic use | Standard class pattern, canvas passed by user per D-02 |
| PLR-04 | `play()`, `pause()`, `seekTo(seconds)` methods on both Web Component and ES Module | rAF loop + elapsed-time FPS throttle per D-13; `seekToFrame()` additional per D-14 |
| PLR-05 | Configurable FPS via attribute/option | Stored as option, FPS throttle calculated from it in rAF loop |
| PLR-06 | Loop modes: `forever`, `once`, or numeric N | State machine with loop counter; `'forever'` = infinite, `'once'` = 1 pass, number = N passes |
| PLR-07 | Autoplay attribute/option | Autoplay waits for `player.ready` promise per D-07 |
| PLR-08 | Foreground and background color attributes/options | HTML attrs + CSS custom property fallback per D-01; `getComputedStyle` for CSS var reads |
| PLR-09 | Canvas auto-sizing (width given, height calculated from frame aspect ratio) | `height = canvasWidth * (rows / cols)` — pure arithmetic from metadata |
| PLR-10 | `@chenglou/pretext` bundled inside player | tsup `noExternal: ['@chenglou/pretext']` confirmed approach |
| PLR-11 | Font loading guard (`document.fonts.load()` before pretext `prepare()`) | `document.fonts.load('16px MonoFont')` returns Promise; chain to pretext `prepare()` in ready sequence |
| PLR-12 | `currentTime`, `duration` properties and `timeupdate`, `ended` custom events | `CustomEvent` dispatch; `currentTime = frameIndex / fps`, `duration = frameCount / fps` |
| PLR-13 | Optional playback controls bar via `controls` attribute | Shadow DOM with conditionally-rendered controls div; play/pause button + range input progress bar |
| MODE-01 | Grid mode — fixed monospace grid rendering (classic ASCII art) | Per-cell `ctx.fillText()` at `col * charWidth, row * lineHeight`; charWidth from pretext measurement |
| MODE-05 | `font` attribute/option — render with any loaded web font | Font string passed to `document.fonts.load()` + pretext `prepare(font)` + `ctx.font = font` |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @chenglou/pretext | 0.0.4 | Text measurement + layout; `prepare()` for glyph metrics, `layoutWithLines()` for line positions | Only library providing DOM-free multiline text layout matching browser rendering exactly |
| tsup | 8.5.1 | Bundle player package to ESM + CJS + IIFE + .d.ts | Already used in encoder; `noExternal` option enables pretext inlining |
| vitest | 4.1.2 | Unit tests for playback logic, option parsing, decompression | Already used in encoder; `happy-dom` environment for Canvas API mocking |
| typescript | 5.x | Strict types; project already on TypeScript 5 | Project constraint |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| happy-dom | 20.8.9 | Vitest browser environment for Canvas2D + CustomEvent mocking | Player tests that exercise the DOM/canvas surface |
| @asciify/encoder | 0.1.0 (peer) | `AsciiPlayerData`, `AsciiPlayerDataCompact`, `rleDecode` | Peer dep — imports types + decompression, NOT bundled |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pretext for grid measurement | `ctx.measureText()` directly | pretext caches measurements and is consistent across modes; direct `measureText` requires manual caching and loses consistency with future non-grid modes |
| Shadow DOM | Light DOM | Shadow DOM prevents style leakage; Light DOM allows host-app CSS but risks conflicts |
| `happy-dom` for tests | `jsdom` | happy-dom is faster and supports Canvas2D context; jsdom requires additional canvas polyfill |

**Installation (packages/player):**
```bash
pnpm add @chenglou/pretext
pnpm add -D tsup typescript vitest happy-dom
pnpm add --save-peer @asciify/encoder
```

**Version verification (confirmed 2026-04-03):**
- `@chenglou/pretext`: 0.0.4 (published 2026-04-02)
- `tsup`: 8.5.1
- `vitest`: 4.1.2
- `happy-dom`: 20.8.9

---

## Architecture Patterns

### Recommended Project Structure
```
packages/player/
├── src/
│   ├── index.ts          # Re-exports AsciiPlayer class + all public types
│   ├── types.ts          # AsciiPlayerOptions, AsciiPlayerEvents, theme definitions
│   ├── player.ts         # AsciiPlayer class — core ES Module API (D-03 through D-09)
│   ├── renderer.ts       # Canvas rendering — grid mode per-cell fillText (MODE-01)
│   ├── playback.ts       # rAF loop, FPS throttling, loop state machine (D-13, D-14, PLR-06)
│   └── web-component.ts  # AsciiPlayerElement extends HTMLElement (PLR-02, PLR-13)
├── tests/
│   ├── player.test.ts    # AsciiPlayer class unit tests
│   ├── playback.test.ts  # FPS throttle, seekTo, loop state machine
│   ├── renderer.test.ts  # Canvas mock rendering verification
│   └── web-component.test.ts # Custom element registration, attribute changes
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```

### Pattern 1: tsup Config with IIFE + Pretext Inlined
**What:** Build all three formats with pretext bundled and types generated
**When to use:** Required for PLR-01 and PLR-10

```typescript
// packages/player/tsup.config.ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs', 'iife'],
  globalName: 'AsciiPlayer',     // window.AsciiPlayer for <script> tag usage
  dts: true,
  clean: true,
  sourcemap: true,
  noExternal: ['@chenglou/pretext'],  // inline pretext into dist (D-16, PLR-10)
  // @asciify/encoder stays external (peer dep — NOT inlined)
})
```

**Note on `globalName`:** With `format: ['iife']`, tsup wraps the bundle and exposes it on `window.AsciiPlayer`. This means IIFE users get `window.AsciiPlayer.AsciiPlayer` unless the entry re-exports are structured carefully. Consider `globalName: 'AsciifyPlayer'` or check how tsup flattens the namespace — alternatively set `entry` to a dedicated IIFE entry that does `export { AsciiPlayer }` as the default-like export. Research conclusion: `globalName` sets the outer namespace; named exports inside become `AsciiPlayer.AsciiPlayer`, `AsciiPlayer.AsciiPlayerElement`, etc. This is acceptable for IIFE usage.

### Pattern 2: AsciiPlayer Class — Async Init with `ready` Promise
**What:** Constructor is synchronous, `ready` resolves after font load + pretext prepare (D-07)
**When to use:** Core class pattern for PLR-11, PLR-07

```typescript
// Source: D-07 from CONTEXT.md + document.fonts.load() Web API
export class AsciiPlayer extends EventTarget {
  readonly ready: Promise<void>
  private _data: AsciiPlayerData | AsciiPlayerDataCompact
  private _canvas: HTMLCanvasElement
  private _options: AsciiPlayerOptions
  private _prepared: PreparedText | null = null
  private _rafId: number | null = null

  constructor(
    canvas: HTMLCanvasElement,
    data: AsciiPlayerData | AsciiPlayerDataCompact,
    options: AsciiPlayerOptions = {},
  ) {
    super()
    this._canvas = canvas
    this._data = data
    this._options = options
    this.ready = this._init()
    if (options.autoplay) {
      this.ready.then(() => this.play())
    }
  }

  private async _init(): Promise<void> {
    const font = this._options.font ?? '14px monospace'
    await document.fonts.load(font)
    const sampleText = this._data.metadata.charset
    // prepare() is cheap for a short charset string (~0.1ms)
    this._prepared = prepare(sampleText, font, { whiteSpace: 'pre-wrap' })
  }

  destroy(): void {
    if (this._rafId !== null) cancelAnimationFrame(this._rafId)
    const ctx = this._canvas.getContext('2d')
    if (ctx) ctx.clearRect(0, 0, this._canvas.width, this._canvas.height)
  }
}
```

### Pattern 3: Grid Mode Renderer — Per-Cell fillText
**What:** For grid mode, pretext provides character width measurement; actual rendering is direct per-cell `fillText()` since grid frames already have fixed positions
**When to use:** MODE-01 — the frame's `cells` array is row/col indexed

```typescript
// Source: apps/web/src/lib/pretext-renderer.ts (reference only), pretext measurement API
// Grid mode: cells[row][col].char positioned at (col * charWidth, row * lineHeight)
export function renderGridFrame(
  ctx: CanvasRenderingContext2D,
  frame: AsciiFrame,
  charWidth: number,   // from pretext prepare() result or ctx.measureText() on a single char
  lineHeight: number,
  fgColor: string,
  bgColor: string,
  colorMode: ColorMode,
): void {
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.textBaseline = 'top'

  for (let row = 0; row < frame.cells.length; row++) {
    const rowCells = frame.cells[row]
    for (let col = 0; col < rowCells.length; col++) {
      const cell = rowCells[col]
      if (cell.char === ' ') continue
      ctx.fillStyle = cellColor(cell, colorMode, fgColor)
      ctx.fillText(cell.char, col * charWidth, row * lineHeight)
    }
  }
}
```

**Key insight on pretext for grid mode:** The `prepare()` call for grid mode is used to get accurate glyph width via `getMeasureContext()` / `parseFontSize()`, not for line breaking. Alternatively, after `prepare()` returns, call `ctx.measureText('M').width` on the prepared canvas context — this is what the existing `measure-char.ts` does. Per D-11, pretext is the consistent code path, so call `prepare()` on a sample string to prime the internal canvas, then read `ctx.measureText()` from the pretext measurement context, OR just use `ctx.measureText()` directly on the player's own canvas after setting `ctx.font`. The existing `pretext-renderer.ts` uses `measureMonospaceChar` which calls `ctx.measureText` directly. For grid mode this is equivalent and simpler.

### Pattern 4: Web Component with Shadow DOM
**What:** Custom element wrapping AsciiPlayer class; manages its own canvas inside Shadow DOM
**When to use:** PLR-02, PLR-08, PLR-09, PLR-13

```typescript
// Source: Custom Elements v1 spec + D-01
export class AsciiPlayerElement extends HTMLElement {
  static get observedAttributes() {
    return ['src', 'autoplay', 'loop', 'controls', 'fps', 'fg-color', 'bg-color', 'theme', 'font']
  }

  private _shadow: ShadowRoot
  private _canvas: HTMLCanvasElement
  private _player: AsciiPlayer | null = null

  constructor() {
    super()
    this._shadow = this.attachShadow({ mode: 'open' })
    this._canvas = document.createElement('canvas')
    this._shadow.appendChild(this._canvas)
  }

  connectedCallback() {
    const src = this.getAttribute('src')
    if (src) this._loadSrc(src)
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    // Handle attribute changes reactively
  }

  // CSS custom property fallback for color (D-01)
  private _resolveColor(attr: string, cssVar: string): string {
    return this.getAttribute(attr)
      ?? getComputedStyle(this).getPropertyValue(cssVar).trim()
      || '#00ff00'
  }
}

customElements.define('ascii-player', AsciiPlayerElement)
```

### Pattern 5: rAF Loop with FPS Throttle
**What:** `requestAnimationFrame` loop checks elapsed time; advances frame only when 1/fps ms has passed (D-13)
**When to use:** Playback engine core

```typescript
// Source: D-13 from CONTEXT.md — standard rAF + time delta pattern
private _lastFrameTime = 0
private _currentFrameIndex = 0

private _tick(timestamp: number): void {
  const elapsed = timestamp - this._lastFrameTime
  const frameDuration = 1000 / this._options.fps!

  if (elapsed >= frameDuration) {
    this._lastFrameTime = timestamp - (elapsed % frameDuration) // drift correction
    this._renderFrame(this._currentFrameIndex)
    this._advance()
  }

  this._rafId = requestAnimationFrame((ts) => this._tick(ts))
}
```

### Pattern 6: Data Format Auto-Detection + Decompression
**What:** Detect `AsciiPlayerData` vs `AsciiPlayerDataCompact` by checking frame type (D-08, D-15)
**When to use:** On data load, before playback starts

```typescript
// Source: packages/encoder/src/delta-encoder.ts + rle.ts
import type { AsciiPlayerData, AsciiPlayerDataCompact } from '@asciify/encoder'
import { rleDecode } from '@asciify/encoder'

// EncodedFrame = string (RLE keyframe) | DeltaPatch[] (delta)
// AsciiPlayerData.frames are AsciiFrame[] (already decoded)
// AsciiPlayerDataCompact.frames are EncodedFrame[]

function isCompact(data: AsciiPlayerData | AsciiPlayerDataCompact): data is AsciiPlayerDataCompact {
  // Compact frames: first frame is always a string (RLE keyframe)
  return typeof data.frames[0] === 'string' || Array.isArray(data.frames[0])
}

// Eager decompression: decode all frames upfront (recommended per CONTEXT.md)
function decompressFrames(data: AsciiPlayerDataCompact): AsciiFrame[] {
  // Walk EncodedFrame[], reconstruct full text per frame, then parse cells
  // Keyframe (string): rleDecode(frame) → full text
  // Delta (DeltaPatch[]): apply patches to previous frame text
}
```

**Note:** Decompression produces the flat `text` string per frame, but `AsciiPlayerData.frames` contains full `AsciiFrame` objects with `cells[][]`. The compact format only stores the text delta (not cells). For colored/monoscale modes, the player needs cells — which means either: (a) decode from `AsciiPlayerData` which has cells, or (b) the compact format doesn't support per-cell color (it only stores text). Verify: `AsciiPlayerDataCompact` frames are `EncodedFrame[]` = text deltas. `AsciiPlayerData` frames are `AsciiFrame[]` = full cells. For this phase, accept both formats: when compact, reconstruct text only (monochrome/monoscale modes), when uncompressed, use cells for colored mode.

### Anti-Patterns to Avoid
- **Calling `prepare()` every frame:** `prepare()` is the expensive one-time pass (~19ms for 500 texts). Call it once in `_init()`, reuse the result. Only call `layoutWithLines()` per frame if needed for proportional mode.
- **Not awaiting `player.ready` before `play()`:** If autoplay calls `play()` before `_init()` completes, `_prepared` is null and rendering fails. Always `await ready` or guard with `if (!this._prepared) return`.
- **Forgetting `cancelAnimationFrame` in `destroy()`:** rAF loops continue even when the element is disconnected. `destroy()` must cancel the loop.
- **Using `window.customElements.define()` in Node/test environment:** Registration throws in jsdom/happy-dom if called at module load time. Guard with `if (typeof customElements !== 'undefined')`.
- **Shadow DOM canvas sizing:** The canvas inside Shadow DOM needs explicit `width`/`height` attributes (not just CSS) — CSS dimensions don't set canvas buffer size.
- **CSS custom property reads before connection:** `getComputedStyle(this)` returns defaults before `connectedCallback`. Read CSS vars inside `connectedCallback` or lazily.
- **IIFE + `noExternal` warning:** tsup with `noExternal: ['@chenglou/pretext']` and `external: ['@asciify/encoder']` (peer dep) must be explicit. Not setting `external` on the peer dep will inline it too, breaking the peer dep contract.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Text width measurement | Custom canvas `measureText` cache | `@chenglou/pretext` `prepare()` | Handles CJK, emoji, bidi, all browser quirks; already bundled |
| RLE decompression | Custom regex-based decoder | `rleDecode()` from `@asciify/encoder` | Single source of truth — peer dep; decoder already tested in Phase 2 |
| Delta patch application | Custom diff reconstruction | Walk `EncodedFrame[]` from `@asciify/encoder` types | Format defined in encoder; must match encoder's delta format exactly |
| Font loading detection | Poll `document.fonts.ready` or setTimeout | `document.fonts.load(fontString)` Promise | Returns when specific font face is loaded; `fonts.ready` is too broad |
| Custom Elements boilerplate | Manual lifecycle management | Custom Elements v1 spec natively | `observedAttributes` + `attributeChangedCallback` is the spec pattern |
| FPS throttle | Sleep/setTimeout loop | rAF + time delta | rAF syncs to display refresh; setTimeout is inaccurate for animation |

**Key insight:** The encoder is a peer dep precisely to avoid bundling two copies of the decompression logic — one in the player and one in the app. Honor this: only import from `@asciify/encoder`, mark it as `external` in tsup so it stays a peer dep in the compiled output.

---

## Common Pitfalls

### Pitfall 1: `document.fonts.load()` Font String Must Match Exactly
**What goes wrong:** Font doesn't load; pretext measures wrong widths; glyphs appear unstyled.
**Why it happens:** `document.fonts.load()` takes a CSS font shorthand string like `'14px "Courier New"'`. The string must match the font face's `font-family` name exactly, including quotes for multi-word families. Passing `'Courier New'` (without size) returns a resolved promise but doesn't trigger load.
**How to avoid:** Always pass size + family: `document.fonts.load('14px "Courier New"')`. Match the same string used for `ctx.font` and `prepare(text, font)`.
**Warning signs:** Glyphs render at wrong width; grid cells misalign; monospace font falls back to system default.

### Pitfall 2: `customElements.define()` at Module Load Time Breaks Tests
**What goes wrong:** Vitest with `happy-dom` throws "NotSupportedError: Custom elements are not supported" or conflicts with test isolation when the registration is at module scope.
**Why it happens:** Calling `customElements.define('ascii-player', AsciiPlayerElement)` at import time means every test file importing `web-component.ts` re-registers the element, which throws on second registration.
**How to avoid:** Export a `register()` function and call it explicitly. Guard: `if (!customElements.get('ascii-player')) customElements.define('ascii-player', AsciiPlayerElement)`.
**Warning signs:** Tests fail with "NotSupportedError" or "has already been defined" on the second test file.

### Pitfall 3: tsup `noExternal` Inlines Peer Deps Too
**What goes wrong:** `@asciify/encoder` gets bundled into the player dist, breaking the peer dep contract and causing duplicate code when apps import both.
**Why it happens:** `noExternal: ['@chenglou/pretext']` is a whitelist approach but tsup also has an `external` option. If not set, tsup may inline everything not in `node_modules` during bundle.
**How to avoid:** Set both: `noExternal: ['@chenglou/pretext']` AND `external: ['@asciify/encoder']`. The peer dep must be explicitly external.
**Warning signs:** `dist/index.js` file size is unexpectedly large; `@asciify/encoder` source appears in dist output.

### Pitfall 4: Canvas `width`/`height` Attributes vs CSS
**What goes wrong:** Canvas renders blurry or scaled incorrectly; auto-sizing calculation is ignored.
**Why it happens:** Setting `canvas.style.width = '600px'` doesn't change the canvas buffer. You must set `canvas.width = 600` (attribute) to resize the drawing buffer.
**How to avoid:** For PLR-09 auto-sizing: `canvas.width = containerWidth; canvas.height = Math.round(containerWidth * rows / cols)`. Do NOT use CSS alone.
**Warning signs:** ASCII art appears stretched/squished; canvas context dimensions don't match visual dimensions.

### Pitfall 5: `AsciiPlayerDataCompact` Only Contains Text, Not Cells
**What goes wrong:** Colored/monoscale rendering fails because `cells[][]` is missing in compact format.
**Why it happens:** `compressPlayerData()` in the encoder delta-encodes the `frame.text` string only — it doesn't compress/store `cells`. `AsciiPlayerDataCompact.frames` is `EncodedFrame[]` (text deltas), not full `AsciiFrame[]`.
**How to avoid:** For compact format input, reconstruct text per frame from delta/RLE. For colored modes (PLR-08), require uncompressed `AsciiPlayerData`. Alternatively, document this limitation and only support monochrome in compact mode.
**Warning signs:** TypeError: `frame.cells is undefined` when attempting colored rendering with compact input.

### Pitfall 6: rAF Loop Drift Accumulation
**What goes wrong:** Playback gradually speeds up or slows down; timing drift becomes noticeable on long animations.
**Why it happens:** Naive `if (elapsed >= frameDuration) { lastTime = now }` accumulates drift — if `elapsed` is 18ms and `frameDuration` is 16.67ms, the leftover 1.33ms is thrown away each frame.
**How to avoid:** `lastTime = timestamp - (elapsed % frameDuration)` — carry the remainder forward. This is the standard game loop pattern.
**Warning signs:** A 24fps animation drifts noticeably over 10+ seconds.

---

## Code Examples

Verified patterns from official sources and inspected package:

### pretext: One-Time Prepare + Per-Frame Layout
```typescript
// Source: @chenglou/pretext 0.0.4 README + dist/layout.d.ts (inspected)
import { prepareWithSegments, layoutWithLines } from '@chenglou/pretext'

// In _init() — once:
const font = '14px "Courier New"'
await document.fonts.load(font)
const prepared = prepareWithSegments(sampleText, font, { whiteSpace: 'pre-wrap' })

// Per frame (grid mode) — layoutWithLines not needed for grid;
// prepare() gives us the measurement context for charWidth:
// Use ctx.measureText after setting ctx.font = font for charWidth in grid mode.
// layoutWithLines is used for proportional mode (Phase 4).
```

### pretext: Confirmed API Surface (from dist/layout.d.ts)
```typescript
prepare(text: string, font: string, options?: PrepareOptions): PreparedText
prepareWithSegments(text: string, font: string, options?: PrepareOptions): PreparedTextWithSegments
layoutWithLines(prepared: PreparedTextWithSegments, maxWidth: number, lineHeight: number): LayoutLinesResult
// LayoutLinesResult.lines: LayoutLine[] where LayoutLine = { text: string, width: number, start, end }
layout(prepared: PreparedText, maxWidth: number, lineHeight: number): LayoutResult
layoutNextLine(prepared: PreparedTextWithSegments, start: LayoutCursor, maxWidth: number): LayoutLine | null
clearCache(): void
```

### package.json exports map for player (mirroring encoder pattern)
```json
{
  "name": "@asciify/player",
  "version": "0.1.0",
  "private": false,
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    }
  },
  "peerDependencies": {
    "@asciify/encoder": "workspace:*"
  },
  "dependencies": {
    "@chenglou/pretext": "^0.0.4"
  }
}
```

### vitest config for player (browser-like environment)
```typescript
// packages/player/vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',  // Canvas2D + CustomEvent support
    include: ['tests/**/*.test.ts'],
  },
})
```

### Custom Event dispatch pattern (PLR-12)
```typescript
// timeupdate event — mirrors HTMLMediaElement
this.dispatchEvent(new CustomEvent('timeupdate', {
  detail: { currentTime: this.currentTime },
  bubbles: true,
  composed: true,  // crosses Shadow DOM boundary
}))

// ended event
this.dispatchEvent(new CustomEvent('ended', { bubbles: true, composed: true }))
```

### Font attribute for MODE-05
```typescript
// font option/attribute accepted as CSS font shorthand
// Default: '14px monospace' — always a valid CSS font string
// User provides: '16px "Fira Code"' or '12px Courier'
// document.fonts.load() requires size + family
const font = this.getAttribute('font') ?? this._options.font ?? '14px monospace'
await document.fonts.load(font)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `measure-char.ts` custom measurement | `@chenglou/pretext` | Phase 3 (this phase) | Consistent measurement for all modes; no custom cache management |
| `pretext-renderer.ts` (app-specific) | Fresh `src/renderer.ts` in player | Phase 3 | Clean API, not coupled to apps/web internals |
| Static pretext bundling assumption | Confirmed via `noExternal` in tsup | 2026-04-03 | Explicit tsup config verified against encoder pattern |
| pretext 0.0.3 (ESM only) | pretext 0.0.4 (published 2026-04-02) | 2 days ago | 0.0.3→0.0.4: layout edge case fixes; same API surface |

**Recently active / important:**
- `@chenglou/pretext` is very new (0.0.4, April 2026). Pre-1.0 — API could change. Pin to exact version or `^0.0.4`.
- pretext has NO CommonJS export — it's ESM-only (`"type": "module"`). tsup `noExternal` will inline it into ESM and CJS outputs correctly via its bundling, but be aware: the pretext source is ESM. tsup handles this transparently.

---

## Open Questions

1. **Grid mode: use `prepare()` or direct `ctx.measureText()`?**
   - What we know: D-11 says use pretext for all modes including grid. `prepare()` is the measurement tool. For grid, we need `charWidth` = width of one monospace character.
   - What's unclear: pretext doesn't expose a direct `charWidth` getter. The measurement context can be accessed via `getMeasureContext()` but that's an internal API.
   - Recommendation: In `_init()`, after `prepare()`, do `ctx.font = font; charWidth = ctx.measureText('M').width` on the player's own canvas. This is the same approach as `measure-char.ts` and is consistent with what pretext does internally. D-11's intent is code path consistency across modes (all routes through pretext for layout), not that pretext must be the charWidth source.

2. **Compact format + colored mode — is it supported?**
   - What we know: `AsciiPlayerDataCompact` has text deltas only; `AsciiPlayerData` has full cells.
   - What's unclear: Whether Phase 3 should silently fall back to monochrome for compact input, throw an error, or document the limitation.
   - Recommendation: Accept both; for compact input, reconstruct text only and use monochrome rendering regardless of `colorMode` option. Document in types. Phase 4 can revisit.

3. **IIFE global name collision**
   - What we know: tsup `globalName: 'AsciiPlayer'` exposes `window.AsciiPlayer`. Named exports become `window.AsciiPlayer.AsciiPlayer`, etc.
   - What's unclear: Whether `window.AsciiPlayer.AsciiPlayer` is acceptable UX or needs a re-export restructure.
   - Recommendation: Set `globalName: 'Asciify'` so IIFE users get `window.Asciify.AsciiPlayer` — cleaner. Or restructure `index.ts` to export a default-like object. Decide before building.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build + test | ✓ | 24.7.0 | — |
| pnpm | Workspace install | ✓ | 10.33.0 | — |
| @chenglou/pretext | Player rendering | ✗ (not installed yet) | 0.0.4 on npm | — (must install) |
| tsup | Package build | ✗ (not in player package.json yet) | 8.5.1 on npm | — (must install) |
| vitest | Player tests | ✗ (not in player package.json yet) | 4.1.2 on npm | — (must install) |
| happy-dom | Test browser env | ✗ (not in player package.json yet) | 20.8.9 on npm | jsdom (heavier, needs canvas polyfill) |
| @asciify/encoder (built) | Player peer dep | ✓ | workspace:* (Phase 2 complete) | — |

**Missing dependencies with no fallback:**
- `@chenglou/pretext` — must be installed before any rendering code compiles
- `tsup` — required for `pnpm build` in player package

**Missing dependencies with fallback:**
- `happy-dom` — jsdom is viable but requires additional `canvas` npm package for Canvas2D mock

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 |
| Config file | `packages/player/vitest.config.ts` — Wave 0 gap (does not exist yet) |
| Quick run command | `pnpm --filter @asciify/player test` |
| Full suite command | `pnpm turbo test --filter @asciify/player` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PLR-01 | tsup builds ESM + CJS + IIFE outputs | smoke | `pnpm --filter @asciify/player build && ls dist/index.{js,cjs,global.js}` | ❌ Wave 0 |
| PLR-02 | `<ascii-player>` registers as custom element | unit | `vitest run tests/web-component.test.ts` | ❌ Wave 0 |
| PLR-03 | `new AsciiPlayer(canvas, data, opts)` constructs | unit | `vitest run tests/player.test.ts` | ❌ Wave 0 |
| PLR-04 | `play()`, `pause()`, `seekTo()` control playback | unit | `vitest run tests/playback.test.ts` | ❌ Wave 0 |
| PLR-05 | FPS option throttles frame advancement | unit | `vitest run tests/playback.test.ts` | ❌ Wave 0 |
| PLR-06 | Loop modes `forever`/`once`/N work correctly | unit | `vitest run tests/playback.test.ts` | ❌ Wave 0 |
| PLR-07 | Autoplay starts after `ready` resolves | unit | `vitest run tests/player.test.ts` | ❌ Wave 0 |
| PLR-08 | `fg-color`/`bg-color` attrs + CSS vars applied | unit | `vitest run tests/web-component.test.ts` | ❌ Wave 0 |
| PLR-09 | Canvas height auto-calculated from aspect ratio | unit | `vitest run tests/web-component.test.ts` | ❌ Wave 0 |
| PLR-10 | pretext not in dist `externals` / bundled | smoke | `grep -L '@chenglou/pretext' dist/index.js` (text not as external ref) | ❌ Wave 0 |
| PLR-11 | `document.fonts.load()` awaited before `prepare()` | unit | `vitest run tests/player.test.ts` (mock fonts.load) | ❌ Wave 0 |
| PLR-12 | `timeupdate` + `ended` events fire; `currentTime`/`duration` correct | unit | `vitest run tests/playback.test.ts` | ❌ Wave 0 |
| PLR-13 | `controls` attribute shows controls bar | unit | `vitest run tests/web-component.test.ts` | ❌ Wave 0 |
| MODE-01 | Grid mode renders cells at correct positions | unit | `vitest run tests/renderer.test.ts` | ❌ Wave 0 |
| MODE-05 | `font` option passed to `document.fonts.load()` + pretext | unit | `vitest run tests/player.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm --filter @asciify/player test`
- **Per wave merge:** `pnpm turbo test`
- **Phase gate:** Full suite green + build smoke passes before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `packages/player/vitest.config.ts` — vitest config with `environment: 'happy-dom'`
- [ ] `packages/player/tests/player.test.ts` — AsciiPlayer class unit tests
- [ ] `packages/player/tests/playback.test.ts` — FPS throttle, seekTo, loop state machine
- [ ] `packages/player/tests/renderer.test.ts` — Canvas mock rendering verification
- [ ] `packages/player/tests/web-component.test.ts` — Custom element tests
- [ ] Framework install: `pnpm add -D vitest happy-dom --filter @asciify/player`

---

## Project Constraints (from CLAUDE.md)

Directives from `CLAUDE.md` that constrain implementation:

| Directive | Impact on Phase 3 |
|-----------|------------------|
| **Browser-only** — both packages target browser environments only | Player package: no Node.js APIs (no `fs`, `path`, etc.); tsup target stays browser |
| **Pretext bundled** — not exposed as peer dep | tsup `noExternal: ['@chenglou/pretext']` mandatory |
| **pnpm + Turborepo + tsup** — chosen for monorepo tooling | Must use tsup for build, pnpm for install, Turborepo `build` task for pipeline |
| **TypeScript strict mode** | `packages/player/tsconfig.json` inherits `tsconfig.base.json` which has `strict: true` |
| **Named exports only** — no default exports | `src/index.ts` uses `export { AsciiPlayer }` not `export default AsciiPlayer` |
| **Single quotes, 2-space indent** | Code style consistent with rest of project |
| **`@asciify/encoder` as peer dep** | tsup `external: ['@asciify/encoder']` + `peerDependencies` in package.json |
| **GSD workflow enforcement** — edits through GSD commands | Planning artifact discipline; no direct file edits outside GSD |
| **AGENTS.md:** Read Next.js guide before writing Next.js code | Not directly relevant here — player package has no Next.js dependency |

---

## Sources

### Primary (HIGH confidence)
- `@chenglou/pretext` package: `dist/layout.d.ts`, `README.md`, `CHANGELOG.md` — inspected from npm tarball (0.0.4)
- `packages/encoder/tsup.config.ts` — inspected directly; encoder build pattern confirmed
- `packages/encoder/src/index.ts`, `player-data.ts`, `rle.ts`, `delta-encoder.ts` — inspected directly; encoder API surface confirmed
- `apps/web/src/lib/pretext-renderer.ts` — inspected directly; existing rendering reference
- `tsconfig.base.json` — inspected; ES2020 target, DOM lib, strict mode
- `.planning/phases/03-player-scaffold-grid-mode/03-CONTEXT.md` — all locked decisions

### Secondary (MEDIUM confidence)
- Custom Elements v1 spec patterns — standard Web API, well-documented
- `document.fonts.load()` — FontFace API, part of CSS Font Loading Module Level 3, widely supported
- tsup `noExternal` option — documented in tsup README; verified pattern for bundling specific deps

### Tertiary (LOW confidence)
- IIFE `globalName` namespace behavior with named exports — inferred from tsup behavior patterns; validate empirically during build

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — pretext, tsup, vitest versions confirmed from npm registry and inspected packages
- Architecture: HIGH — locked decisions from CONTEXT.md; renderer pattern confirmed from existing `pretext-renderer.ts`
- Pitfalls: HIGH — most derived from inspecting actual source code and API surface; canvas sizing, rAF drift are well-known patterns
- pretext API: HIGH — confirmed from inspected dist/layout.d.ts, 0.0.4

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (pretext is pre-1.0 — check for API changes before implementing if >1 week delay)
