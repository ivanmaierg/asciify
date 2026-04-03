# Phase 4: Player Rendering Modes - Research

**Researched:** 2026-04-03
**Domain:** Canvas rendering modes, pretext layout API, typewriter animation, IntersectionObserver, Playwright browser tests, vitest snapshots
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Proportional mode uses pretext `layoutWithLines()` to position variable-width characters per D-11. Each frame line is laid out independently.
- **D-02:** Overflow handling: clip silently at canvas edge. No auto-shrink or horizontal scroll.
- **D-03:** Per-cell coloring supported in proportional mode — each character positioned individually using pretext measurements with its own color from `AsciiCell`.
- **D-04:** Typewriter mode reveals characters one at a time at a configurable per-character delay (`char-delay` attribute, default 30ms). Standard mode uses constant delay.
- **D-05:** Typewriter timestamp mode (MODE-04) produces per-character timing data for external audio sync. Data format and integration API are Claude's discretion.
- **D-06:** `trigger="scroll"` starts playback when element enters viewport via IntersectionObserver. Replays on re-enter (reset + play each time element scrolls into view).
- **D-07:** Three trigger modes supported in v1: `trigger="scroll"`, `trigger="hover"`, `trigger="click"`.
- **D-08:** Trigger modes are mutually exclusive with `autoplay`. If `trigger` is set, `autoplay` is ignored.
- **D-09:** Keep the existing 5 themes from Phase 3 (`green-on-black`, `matrix`, `amber`, `white-on-black`, `blue`). XTRA-01 is already satisfied by the THEMES constant in `types.ts`.
- **D-10:** Unit tests (TEST-02): expand existing vitest suite with tests for new modes, trigger logic, and option parsing. Continue using happy-dom environment.
- **D-11:** Integration tests (TEST-03): canvas rendering output verification. Extend existing `integration.test.ts` pattern.
- **D-12:** Visual snapshot tests (TEST-04): rendered canvas output compared against baselines. Format and tooling are Claude's discretion.
- **D-13:** Browser tests (TEST-05): real DOM testing with Playwright for custom element registration, attribute changes, event firing.

### Claude's Discretion
- Whitespace handling strategy (pre-wrap vs word-wrap) for proportional mode
- Line height calculation for variable-width fonts
- Whether to cache pretext layout results between frames with identical text
- Reveal granularity (per-char is default per MODE-03, but options allowed)
- Cursor style during reveal (block, underline, or none)
- Easing curve for character delays (linear vs configurable)
- Timestamp data format for MODE-04 (callback vs event vs property)
- How typewriter interacts with loop modes
- IntersectionObserver threshold value
- Hover behavior (play on mouseenter, pause on mouseleave, or play-and-continue)
- Click behavior (toggle play/pause, or play-once on click)
- Disconnect/reconnect strategy for scroll observer cleanup
- Snapshot baseline format (PNG screenshot vs text dump)
- Playwright configuration and setup
- Whether snapshot tests run in CI or local-only
- Test coverage targets
- How to mock/verify canvas rendering output for proportional and typewriter modes

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MODE-02 | Proportional font mode — variable-width font rendering via pretext `layoutWithLines()` | Confirmed: pretext 0.0.4 exports `prepareWithSegments` + `layoutWithLines` with correct API |
| MODE-03 | Typewriter mode — character-by-character reveal with configurable per-character delay | rAF + setTimeout pattern; integrate into existing PlaybackController hooks |
| MODE-04 | Typewriter timestamp mode — per-character timing data for audio sync | Computed during reveal; exposed as callback or typed array |
| XTRA-01 | Named themes (`theme="green-on-black"`, `matrix`, `amber`, `white-on-black`, `blue`) | Already implemented in `types.ts` THEMES constant — requires wiring in web-component only |
| XTRA-02 | Scroll-triggered playback via `trigger="scroll"` attribute (IntersectionObserver) | happy-dom has stub IntersectionObserver (observe/disconnect methods are no-ops); trigger logic testable by calling observer callbacks directly |
| TEST-02 | Unit tests for player — playback logic, mode switching, option parsing (vitest) | Extend existing vitest 4.1.2 + happy-dom suite |
| TEST-03 | Integration tests — canvas rendering output verification | Extend `integration.test.ts` file-read pattern; add mode-specific output checks |
| TEST-04 | Visual snapshot tests — rendered canvas output vs baselines | Use vitest inline snapshots for text-based canvas call dumps; no PNG baseline tooling needed |
| TEST-05 | Browser tests — real DOM testing with Playwright | @playwright/test 1.59.1 installed system-wide; browsers present in Library/Caches/ms-playwright; needs `@playwright/test` added as devDep, plus playwright.config.ts |
</phase_requirements>

---

## Summary

Phase 4 extends the `@asciify/player` package with two new render modes (proportional and typewriter), scroll/hover/click triggers, and a comprehensive test suite. The Phase 3 codebase is already well-structured for this: `RenderMode` is explicitly stubbed with a comment pointing to Phase 4, `player.ts` has a mode dispatch point, and `web-component.ts` has an `observedAttributes` / `attributeChangedCallback` pattern ready to receive `mode`, `char-delay`, and `trigger`.

The critical external dependency — `@chenglou/pretext` 0.0.4 — is already installed and exports the exact API needed: `prepareWithSegments()` + `layoutWithLines()` for proportional rendering, confirmed from the installed type definitions. The distinction from Phase 3's `prepare()` usage is that proportional mode needs `prepareWithSegments` (not `prepare`) to get line-level layout data. Each frame line is processed individually, and since ASCII art lines have no word-wrap, the `{ whiteSpace: 'pre-wrap' }` option should be passed to preserve spaces and newlines as-is.

For testing, the existing vitest 4.1.2 + happy-dom setup handles unit and integration tests. happy-dom's `IntersectionObserver` is present but a stub (observe/disconnect are no-ops), so trigger unit tests must invoke observer callbacks directly rather than relying on actual viewport intersection. For TEST-05 browser tests, Playwright 1.59.1 is available system-wide and Chromium browsers are cached — adding `@playwright/test` as a devDependency and a `playwright.config.ts` is all that is needed.

**Primary recommendation:** Add `renderProportionalFrame()` and a typewriter reveal mechanism in `renderer.ts`, extend `PlaybackController` with a typewriter-specific secondary timer, wire up trigger logic in `AsciiPlayerElement`, and test at three levels: vitest unit/integration (extend existing), vitest inline snapshots (canvas call dumps), and Playwright (real custom element in chromium).

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @chenglou/pretext | 0.0.4 (installed) | Variable-width text measurement + line layout | Already bundled in player; only lib that provides canvas-backed measurement without DOM reflow |
| vitest | 4.1.2 (installed) | Unit + integration tests | Already configured and used in Phase 3 tests |
| happy-dom | 20.8.9 (installed) | DOM environment for vitest unit tests | Already the test environment; has IntersectionObserver stub |
| @playwright/test | 1.59.1 (system-wide) | Real browser tests (TEST-05) | Chromium 1200 already cached in ~/Library/Caches/ms-playwright |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (none new) | — | — | All needed libs already in devDependencies |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Playwright (TEST-05) | @vitest/browser + playwright provider | @vitest/browser 4.1.2 also available and would run browser tests inside vitest; simpler config than separate playwright.config.ts but less mature for custom element testing |
| vitest inline snapshots (TEST-04) | PNG canvas snapshots via pixelmatch | PNG snapshots are fragile (font rendering differs by OS/GPU); text-based canvas call dumps are portable and deterministic |

**Installation:**
```bash
# In packages/player
pnpm add -D @playwright/test
```

**Version verification:** `@playwright/test@1.59.1` confirmed via `npm view @playwright/test version`. Vitest 4.1.2 confirmed from installed package.json.

---

## Architecture Patterns

### Recommended Project Structure
```
packages/player/src/
├── types.ts         # Add 'proportional' | 'typewriter' to RenderMode; add charDelay, trigger to options
├── renderer.ts      # Add renderProportionalFrame(), renderTypewriterFrame()
├── playback.ts      # Add TypewriterController or typewriter hooks to PlaybackController
├── player.ts        # Mode dispatch: call correct render fn; trigger setup
├── web-component.ts # Add mode, char-delay, trigger to observedAttributes
└── index.ts         # Barrel: no changes needed

packages/player/tests/
├── renderer.test.ts      # Add tests for renderProportionalFrame, renderTypewriterFrame
├── playback.test.ts      # Add tests for typewriter timing hooks
├── player.test.ts        # Add tests for mode switching, trigger option parsing
├── web-component.test.ts # Add tests for mode/char-delay/trigger attributes
├── integration.test.ts   # Add checks for new exports in dist
├── snapshot.test.ts      # NEW: vitest inline snapshots of canvas call sequences
└── browser/
    ├── playwright.config.ts  # NEW: playwright config
    └── web-component.spec.ts # NEW: real DOM tests in Chromium
```

### Pattern 1: Proportional Frame Rendering
**What:** For each row of an AsciiFrame, call `prepareWithSegments(rowText, font, { whiteSpace: 'pre-wrap' })` then `layoutWithLines(prepared, canvasWidth, lineHeight)` to get measured line data. Because ASCII art rows are single lines with no wrapping, `lines[0]` is the whole row. Draw each character at its measured x-position.

**When to use:** When `mode === 'proportional'`

**Key insight about per-character positioning:** `layoutWithLines` gives us the full line text and width but not per-character x-offsets. To get per-character x-positions for coloring, measure each character prefix with `ctx.measureText()` as in grid mode, but use the pretext-measured total line width for overflow clipping (not the grid charWidth formula).

**Recommended approach for per-cell x-position:** After `prepareWithSegments` establishes the font/language context, use `ctx.measureText(rowText.slice(0, colIndex))` to get the x-offset for cell at column `colIndex`. This is accurate for variable-width fonts and consistent with what pretext uses internally (canvas measureText).

```typescript
// Source: @chenglou/pretext README + dist/layout.d.ts
import { prepareWithSegments, layoutWithLines } from '@chenglou/pretext'

export function renderProportionalFrame(
  ctx: CanvasRenderingContext2D,
  frame: AsciiFrame,
  lineHeight: number,
  fgColor: string,
  bgColor: string,
  colorMode: ColorMode,
): void {
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.textBaseline = 'top'

  const canvasWidth = ctx.canvas.width
  const cells = frame.cells

  for (let row = 0; row < cells.length; row++) {
    const rowCells = cells[row]
    const rowText = rowCells.map(c => c.char).join('')

    // Use pre-wrap to preserve spaces and explicit line breaks
    const prepared = prepareWithSegments(rowText, ctx.font, { whiteSpace: 'pre-wrap' })
    const { lines } = layoutWithLines(prepared, canvasWidth, lineHeight)
    // ASCII art rows are single lines (no wrapping); lines[0] is the whole row
    if (!lines || lines.length === 0) continue

    const y = row * lineHeight

    // Per-character x-position via canvas measureText prefix sums
    let x = 0
    for (let col = 0; col < rowCells.length; col++) {
      const cell = rowCells[col]
      if (cell.char === ' ') {
        x += ctx.measureText(' ').width
        continue
      }
      if (x >= canvasWidth) break // D-02: clip silently

      if (colorMode === 'colored' || colorMode === 'monoscale') {
        ctx.fillStyle = `rgb(${cell.r},${cell.g},${cell.b})`
      } else {
        ctx.fillStyle = fgColor
      }
      ctx.fillText(cell.char, x, y)
      x += ctx.measureText(cell.char).width
    }
  }
}
```

**Caching consideration (Claude's discretion):** `prepareWithSegments` is ~19ms per 500-text batch. For a typical ASCII frame with 40 rows, calling it 40 times per frame at 24fps would be ~40 × 0.04ms = 1.6ms (well within budget). No frame-level caching is needed initially. Caching prepared results per unique row text string is a straightforward optimization if profiling shows need.

### Pattern 2: Typewriter Animation
**What:** Typewriter mode does not advance frames at `fps` rate. Instead, it reveals characters one at a time across the entire content (or per-frame, see below). The `PlaybackController` rAF loop is not the right clock for per-character delays — `setTimeout` chains or a `setInterval` are more appropriate.

**Design decision (Claude's discretion):** Treat typewriter as a flat reveal across all frame content stitched together, OR reveal each video frame's text sequentially. For ASCII video (which has many frames of similar content), the per-frame interpretation is more useful: each video frame advance reveals that frame's text character by character. Implementation: keep the `PlaybackController` rAF loop for frame advancement but pause frame advancement while typewriter reveal is in progress for the current frame.

**Recommended architecture:** Add a `TypewriterReveal` class (or method) that, on each new frame, launches a reveal sequence using `setTimeout` chains. The `PlaybackController.onFrame` callback triggers the reveal; frame advancement is blocked (by not calling `_advance()`) until reveal completes.

```typescript
// Typewriter reveal sequence (in player.ts or a new typewriter.ts)
class TypewriterReveal {
  private _charDelay: number
  private _timeoutId: ReturnType<typeof setTimeout> | null = null

  constructor(charDelay: number) {
    this._charDelay = charDelay
  }

  // Reveal text character by character; returns timestamps for MODE-04
  reveal(
    fullText: string,
    onChar: (revealedSoFar: string, charIndex: number, timestamp: number) => void,
    onComplete: (timestamps: number[]) => void,
    startTime: number,
  ): void {
    const timestamps: number[] = []
    let i = 0

    const step = () => {
      if (i >= fullText.length) {
        onComplete(timestamps)
        return
      }
      const t = startTime + i * this._charDelay
      timestamps.push(t)
      onChar(fullText.slice(0, i + 1), i, t)
      i++
      this._timeoutId = setTimeout(step, this._charDelay)
    }
    step()
  }

  cancel(): void {
    if (this._timeoutId !== null) {
      clearTimeout(this._timeoutId)
      this._timeoutId = null
    }
  }
}
```

**MODE-04 timestamp format (recommended):** Expose per-character timestamps as a `charTimestamps` property on `AsciiPlayer` (a `Float64Array` of millisecond offsets from playback start). Populate it during the first pass through all frames in typewriter mode. Dispatch a `'timestamps-ready'` CustomEvent once populated. This is the most compatible option for audio sync (can be passed to Web Audio API's `AudioBufferSourceNode` or used in user code for `currentTime` sync).

```typescript
// In AsciiPlayerOptions (types.ts)
export interface AsciiPlayerOptions {
  // ... existing ...
  charDelay?: number        // ms per character in typewriter mode (default 30)
  trigger?: 'scroll' | 'hover' | 'click'  // mutually exclusive with autoplay (D-08)
}
```

### Pattern 3: Playback Triggers (IntersectionObserver, hover, click)
**What:** `trigger` attribute defers playback start until a DOM event/observation fires. `autoplay` is ignored if `trigger` is set (D-08).

**IntersectionObserver pattern:**
```typescript
// In AsciiPlayerElement (web-component.ts)
private _intersectionObserver: IntersectionObserver | null = null

private _setupTrigger(trigger: string): void {
  this._teardownTrigger()

  if (trigger === 'scroll') {
    this._intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            // D-06: reset + play each time element enters viewport
            this._player?.seekTo(0)
            this._player?.play()
          }
        }
      },
      { threshold: 0.5 }, // 50% visible before triggering
    )
    this._intersectionObserver.observe(this)
  } else if (trigger === 'hover') {
    this._boundMouseEnter = () => { this._player?.seekTo(0); this._player?.play() }
    this._boundMouseLeave = () => this._player?.pause()
    this.addEventListener('mouseenter', this._boundMouseEnter)
    this.addEventListener('mouseleave', this._boundMouseLeave)
  } else if (trigger === 'click') {
    this._boundClick = () => {
      if (this._player?.isPlaying) this._player.pause()
      else { this._player?.seekTo(0); this._player?.play() }
    }
    this.addEventListener('click', this._boundClick)
  }
}

private _teardownTrigger(): void {
  this._intersectionObserver?.disconnect()
  this._intersectionObserver = null
  if (this._boundMouseEnter) this.removeEventListener('mouseenter', this._boundMouseEnter)
  if (this._boundMouseLeave) this.removeEventListener('mouseleave', this._boundMouseLeave)
  if (this._boundClick) this.removeEventListener('click', this._boundClick)
}
```

**Call `_teardownTrigger()` in `disconnectedCallback()`** to prevent memory leaks.

### Pattern 4: Visual Snapshot Tests (TEST-04)
**What:** Vitest inline snapshots of the sequence of canvas API calls made during a render. This approach is OS/GPU-agnostic and deterministic.

**Why not PNG:** Canvas rendering in happy-dom returns no pixel data (canvas is a stub). Even with `jest-canvas-mock`/`vitest-canvas-mock`, visual pixel comparison would be font-dependent and non-deterministic across environments.

**Recommended approach:** Record `fillText` calls as an array of `{method, args}` tuples, then `expect(callLog).toMatchInlineSnapshot(...)`. The snapshot captures the full sequence of drawing calls with positions and colors.

```typescript
// In snapshot.test.ts
import { expect, it, describe } from 'vitest'
import { renderProportionalFrame } from '../src/renderer'
import type { AsciiFrame } from '@asciify/encoder'

describe('proportional render snapshots', () => {
  it('renders 2-cell row at variable widths', () => {
    const calls: string[] = []
    const ctx = {
      canvas: { width: 200, height: 100 },
      fillStyle: '',
      textBaseline: '',
      font: '14px monospace',
      fillRect: (x: number, y: number, w: number, h: number) => calls.push(`fillRect(${x},${y},${w},${h})`),
      fillText: (t: string, x: number, y: number) => calls.push(`fillText(${JSON.stringify(t)},${x.toFixed(1)},${y})`),
      measureText: (t: string) => ({ width: t.length * 8 }), // deterministic mock
    }
    const frame: AsciiFrame = { text: 'A.', cells: [[
      { char: 'A', r: 0, g: 255, b: 0, brightness: 0.5 },
      { char: '.', r: 0, g: 255, b: 0, brightness: 0.5 },
    ]]}

    renderProportionalFrame(ctx as unknown as CanvasRenderingContext2D, frame, 16, '#00ff00', '#000000', 'monochrome')

    expect(calls).toMatchInlineSnapshot(`
      [
        "fillRect(0,0,200,100)",
        "fillText(\\"A\\",0.0,0)",
        "fillText(\\".\\",8.0,0)",
      ]
    `)
  })
})
```

### Pattern 5: Playwright Browser Tests (TEST-05)
**What:** Run the built IIFE bundle in a real Chromium page, create `<ascii-player>` element, verify custom element registration, attribute changes, and event firing.

**Setup:** Playwright 1.59.1 is system-wide (`npx playwright`). Chromium 1200 is cached at `~/Library/Caches/ms-playwright/chromium-1200`. Add `@playwright/test` as devDependency in `packages/player`. Create `playwright.config.ts` in `packages/player`.

```typescript
// packages/player/playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.spec.ts',
  use: {
    browserName: 'chromium',
    headless: true,
  },
  // Build must run before browser tests
  webServer: undefined, // No server needed — tests load HTML inline
})
```

**Browser test approach:** Use `page.setContent()` with an inline HTML page that includes a `<script src="...">` pointing to the IIFE dist, then test element behavior with Playwright's `page.evaluate()`.

```typescript
// tests/browser/web-component.spec.ts
import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

test('registers <ascii-player> as custom element', async ({ page }) => {
  const iifeBundle = readFileSync(resolve(__dirname, '../../dist/index.global.js'), 'utf-8')
  await page.setContent(`
    <!DOCTYPE html><html><body>
    <script>${iifeBundle}</script>
    <ascii-player id="player"></ascii-player>
    </body></html>
  `)
  const isDefined = await page.evaluate(() =>
    typeof customElements.get('ascii-player') !== 'undefined'
  )
  expect(isDefined).toBe(true)
})
```

**Important:** Browser tests require a prior `pnpm build` to produce `dist/index.global.js`. Integrate into turbo `test` task or document as a prerequisite.

### Anti-Patterns to Avoid
- **Using `prepare()` (not `prepareWithSegments()`) for proportional mode:** `prepare()` returns `PreparedText` which does not carry segment data needed for `layoutWithLines()`. Must use `prepareWithSegments()`.
- **Calling `prepareWithSegments` once per canvas frame in the rAF loop without caching:** This adds ~0.04ms per row per frame. Acceptable initially but caching row text → prepared result is the obvious optimization path.
- **Relying on IntersectionObserver in happy-dom to actually fire callbacks:** happy-dom's IntersectionObserver.observe() is a no-op stub. Unit tests for trigger logic MUST call the observer callback directly (by saving the callback passed to the constructor) rather than expecting DOM intersection to trigger it.
- **Adding `@playwright/test` at workspace root instead of inside `packages/player`:** Browser tests are package-local; the config should live in `packages/player/` and `turbo.json` already propagates the `test` task.
- **Making typewriter mode use `PlaybackController._fps` timing instead of `charDelay`:** The existing `PlaybackController` is a frame-advancement engine, not a character-by-character timer. Typewriter timing requires separate `setTimeout` chains.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Variable-width text measurement | Custom canvas measureText loops | `prepareWithSegments` + `layoutWithLines` | pretext handles bidi, emoji, language-specific shaping quirks; hand-rolled loops fail on non-ASCII content |
| Browser test environment | Custom HTTP server + puppeteer setup | `@playwright/test` with `page.setContent()` | Playwright manages browser lifecycle, network isolation, and provides await-based assertion API |
| DOM presence assertion (Playwright) | `page.evaluate()` + raw JS | `page.locator()` + `expect(locator).toBeVisible()` | Playwright's auto-waiting prevents flaky assertions |

**Key insight:** pretext's internal measurement uses canvas `measureText`, the same primitive we'd use in a hand-rolled loop. The difference is that pretext correctly handles Unicode segmentation, bidi reordering, and tab stops — all of which appear in real-world text and would cause subtle bugs in a custom implementation.

---

## Runtime State Inventory

Step 2.5 SKIPPED — this is a greenfield feature addition phase, not a rename/refactor/migration phase. No runtime state items to audit.

---

## Environment Availability Audit

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Test runner | ✓ | 24.7.0 | — |
| pnpm | Package management | ✓ | 10.33.0 | — |
| vitest | Unit/integration tests | ✓ | 4.1.2 (installed) | — |
| happy-dom | DOM environment | ✓ | 20.8.9 (installed) | — |
| @chenglou/pretext | Proportional rendering | ✓ | 0.0.4 (installed) | — |
| @playwright/test | Browser tests (TEST-05) | ✓ (system npx) | 1.59.1 | — |
| Chromium browser | Playwright tests | ✓ | 1200 (cached in ~/Library/Caches/ms-playwright) | — |

**Missing dependencies with no fallback:** None — all required tools are present.

**Missing dependencies with fallback:** None.

**Note on @playwright/test:** While `playwright` CLI is available system-wide via `npx playwright`, `@playwright/test` must be added as a devDependency in `packages/player` for import resolution in `playwright.config.ts` and test files. It does not need its own browser download — browsers already exist at the system cache path.

---

## Common Pitfalls

### Pitfall 1: prepareWithSegments vs prepare for Proportional Mode
**What goes wrong:** Using `prepare()` in proportional mode returns `PreparedText` which lacks the `segments` property required by `layoutWithLines()`. TypeScript will reject the call.
**Why it happens:** Phase 3 uses `prepare()` for font-loading preheating only. Phase 4 proportional mode needs `prepareWithSegments()` for layout data.
**How to avoid:** Import `prepareWithSegments` and `layoutWithLines` explicitly. Do not reuse the existing `prepare()` call in `_init()` for the proportional render path.
**Warning signs:** TypeScript error `Argument of type 'PreparedText' is not assignable to parameter of type 'PreparedTextWithSegments'`

### Pitfall 2: IntersectionObserver Not Firing in happy-dom
**What goes wrong:** Tests for scroll trigger write `observer.observe(element)` and wait for the callback to fire — it never does. Test passes accidentally or hangs.
**Why it happens:** happy-dom's `IntersectionObserver.observe()` is a documented stub (`// TODO: Implement`).
**How to avoid:** In unit tests, capture the callback passed to `new IntersectionObserver(callback, ...)` and call it directly with a synthetic `IntersectionObserverEntry` where `isIntersecting = true`. Do not rely on DOM visibility in the test environment.
**Warning signs:** Test for scroll trigger passes but the `play()` spy is never called.

### Pitfall 3: Typewriter Mode Interfering with PlaybackController Loop
**What goes wrong:** Implementing typewriter reveals inside the rAF callback means reveal characters fire every frame tick (16ms), not every `charDelay` ms. At 24fps, this gives ~41ms per char, not the configured 30ms.
**Why it happens:** `PlaybackController` fires at `fps` rate, not at `charDelay` rate. These are independent clocks.
**How to avoid:** Typewriter reveal uses `setTimeout(step, charDelay)` chains independent of the rAF loop. The rAF loop can be paused or bypassed for typewriter mode — the frame index does not advance until the reveal for the current frame completes.
**Warning signs:** Character reveal speed varies with configured FPS; `charDelay=30` behaves like `charDelay=41` at 24fps.

### Pitfall 4: Playwright Tests Running Before Build
**What goes wrong:** Browser test loads `dist/index.global.js` but the file does not exist yet, causing a test failure with unhelpful error.
**Why it happens:** Playwright tests are separate from the vitest suite and turbo `test` task may not enforce build ordering for the playwright invocation.
**How to avoid:** Either add a `globalSetup` in `playwright.config.ts` that runs `pnpm build` if dist is missing, or document clearly that `pnpm build` must precede `npx playwright test`. The turbo `test` task already has `"dependsOn": ["^build"]` — ensure browser tests are invoked through turbo.
**Warning signs:** `Error: ENOENT: no such file or directory, open 'dist/index.global.js'`

### Pitfall 5: Cursor Bleeding Into Next Frame in Typewriter Mode
**What goes wrong:** When looping in typewriter mode, the cursor character (e.g., `|`) from the previous frame's reveal remains on canvas when the next frame starts its reveal.
**Why it happens:** Canvas is not cleared between cursor blink positions if the reveal code only draws new characters without erasing the cursor.
**How to avoid:** The render function that draws the partially-revealed frame must also handle cursor rendering. Clear the canvas at the start of each partial render call (same as `renderGridFrame` does with `fillRect`).

---

## Code Examples

Verified patterns from official sources:

### prepareWithSegments + layoutWithLines (verified from pretext dist/layout.d.ts)
```typescript
// Source: packages/player/node_modules/@chenglou/pretext/README.md + dist/layout.d.ts
import { prepareWithSegments, layoutWithLines } from '@chenglou/pretext'

const prepared = prepareWithSegments('AGI 春天到了', '18px monospace', { whiteSpace: 'pre-wrap' })
const { lines } = layoutWithLines(prepared, 320, 24) // 320px wide, 24px line height
// lines[0].text = full row text; lines[0].width = measured pixel width
```

### IntersectionObserver (verified from MDN patterns + happy-dom source)
```typescript
// Threshold 0.5 = fires when 50% of element is visible
const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      player.seekTo(0)
      player.play()
    }
  }
}, { threshold: 0.5 })
observer.observe(element)
// Cleanup:
observer.disconnect()
```

### Mocking IntersectionObserver callback in happy-dom unit tests
```typescript
// In web-component.test.ts — trigger scroll test
let observerCallback: IntersectionObserverCallback | null = null
vi.stubGlobal('IntersectionObserver', class {
  constructor(cb: IntersectionObserverCallback) { observerCallback = cb }
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
})

// Later in test:
observerCallback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver)
expect(mockPlay).toHaveBeenCalled()
```

### Playwright browser test with inline bundle (verified from @playwright/test docs 1.59.x)
```typescript
// Source: https://playwright.dev/docs/api/class-page#page-set-content
test('custom element registers', async ({ page }) => {
  const bundle = readFileSync(resolve(__dirname, '../../dist/index.global.js'), 'utf-8')
  await page.setContent(`<!DOCTYPE html><html><body>
    <script>${bundle}</script>
    <ascii-player id="el"></ascii-player>
  </body></html>`)
  const defined = await page.evaluate(() => !!customElements.get('ascii-player'))
  expect(defined).toBe(true)
})
```

### Vitest inline snapshot for canvas calls
```typescript
// Source: vitest 4.x snapshot API (verified from installed vitest package)
expect(fillTextCalls).toMatchInlineSnapshot(`
  [
    "A at (0, 0)",
    ". at (8, 0)",
  ]
`)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `prepare()` for layout | `prepareWithSegments()` + `layoutWithLines()` for manual line layout | pretext 0.0.x design | Must use the WithSegments variant for proportional mode |
| Separate playwright package | `@playwright/test` unified | Playwright 1.x | One package, no separate `playwright` dep needed |
| vitest `toMatchSnapshot()` (file-based) | `toMatchInlineSnapshot()` (inline in test) | vitest 1.x+ | Inline snapshots are self-documenting; no external snapshot file to manage |

**Deprecated/outdated:**
- `prepare()` alone: Not deprecated, but insufficient for proportional mode — only `prepareWithSegments` provides `LayoutLine` data.

---

## Open Questions

1. **Typewriter + multi-frame: reveal per frame vs. reveal entire content once**
   - What we know: D-04 says "reveals characters one at a time" — likely means per entire content, but ASCII video has many frames
   - What's unclear: Should typewriter mode reveal characters of one video frame at a time (then advance frame), or should it stitch all frames together and do one giant character reveal?
   - Recommendation: Per-video-frame reveal (each frame's text content is revealed before advancing to next frame) is more useful for ASCII video; pure content mode makes more sense for static ASCII art. Default to per-frame; add a future option for full-content mode if needed.

2. **Typewriter timestamp format — callback vs. event vs. property**
   - What we know: D-05 says Claude's discretion. Three patterns are viable.
   - What's unclear: Which is most ergonomic for audio sync in apps?
   - Recommendation: `charTimestamps: Float64Array` property populated after `ready` resolves, plus a `'timestamps-ready'` CustomEvent. This is synchronous to access and works with Web Audio API timing.

3. **Snapshot tests: separate vitest config project or inline in existing?**
   - What we know: Current vitest.config.ts has `environment: 'happy-dom'` for all tests. Snapshots don't need DOM.
   - What's unclear: Can snapshots coexist in the same config with DOM tests?
   - Recommendation: Yes — vitest supports `environmentMatchGlobs` to run specific test files in different environments. Snapshot tests that use only mock ctx objects work fine in happy-dom. No config split needed.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.2 (unit/integration/snapshot) + @playwright/test 1.59.1 (browser) |
| Config file | `packages/player/vitest.config.ts` (exists) + `packages/player/playwright.config.ts` (Wave 0 gap) |
| Quick run command | `cd packages/player && pnpm test` (vitest) |
| Full suite command | `cd packages/player && pnpm test && npx playwright test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MODE-02 | `renderProportionalFrame()` positions variable-width chars per column | unit | `cd packages/player && pnpm test -- renderer.test.ts -t "proportional"` | ❌ Wave 0 (extend renderer.test.ts) |
| MODE-02 | Proportional mode clips at canvas edge (D-02) | unit | `cd packages/player && pnpm test -- renderer.test.ts -t "clips"` | ❌ Wave 0 |
| MODE-02 | Per-cell coloring in proportional mode (D-03) | unit | `cd packages/player && pnpm test -- renderer.test.ts -t "colored"` | ❌ Wave 0 |
| MODE-03 | Typewriter reveals chars at charDelay interval | unit | `cd packages/player && pnpm test -- player.test.ts -t "typewriter"` | ❌ Wave 0 |
| MODE-03 | char-delay attribute wires to charDelay option | unit | `cd packages/player && pnpm test -- web-component.test.ts -t "char-delay"` | ❌ Wave 0 |
| MODE-04 | charTimestamps populated after typewriter reveal | unit | `cd packages/player && pnpm test -- player.test.ts -t "timestamps"` | ❌ Wave 0 |
| XTRA-01 | theme attribute resolves to THEMES colors | unit | `cd packages/player && pnpm test -- web-component.test.ts -t "theme"` | ✅ (partial, needs trigger path test) |
| XTRA-02 | trigger="scroll" calls play() on intersection | unit | `cd packages/player && pnpm test -- web-component.test.ts -t "scroll"` | ❌ Wave 0 |
| XTRA-02 | trigger="hover" calls play/pause on mouseenter/leave | unit | `cd packages/player && pnpm test -- web-component.test.ts -t "hover"` | ❌ Wave 0 |
| XTRA-02 | trigger="click" toggles play/pause | unit | `cd packages/player && pnpm test -- web-component.test.ts -t "click"` | ❌ Wave 0 |
| TEST-02 | mode/charDelay/trigger options parsed correctly | unit | `cd packages/player && pnpm test -- player.test.ts` | ❌ Wave 0 |
| TEST-03 | Proportional mode dist exports exist | integration | `cd packages/player && pnpm test -- integration.test.ts` | ✅ (extend) |
| TEST-04 | Proportional render call sequence matches baseline | snapshot | `cd packages/player && pnpm test -- snapshot.test.ts` | ❌ Wave 0 (new file) |
| TEST-05 | `<ascii-player>` registers in real Chromium | browser | `cd packages/player && npx playwright test` | ❌ Wave 0 (new file) |
| TEST-05 | `mode`, `char-delay`, `trigger` attributes reflected in DOM | browser | `cd packages/player && npx playwright test` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `cd packages/player && pnpm test`
- **Per wave merge:** `cd packages/player && pnpm test && npx playwright test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `packages/player/tests/snapshot.test.ts` — covers TEST-04 (new file)
- [ ] `packages/player/tests/browser/web-component.spec.ts` — covers TEST-05 (new file)
- [ ] `packages/player/playwright.config.ts` — required for browser tests
- [ ] Extend `packages/player/tests/renderer.test.ts` — covers MODE-02 render behaviors
- [ ] Extend `packages/player/tests/player.test.ts` — covers MODE-03, MODE-04, TEST-02
- [ ] Extend `packages/player/tests/web-component.test.ts` — covers XTRA-02, char-delay, trigger attributes
- [ ] Extend `packages/player/tests/integration.test.ts` — covers TEST-03 new exports check
- [ ] Install devDependency: `pnpm add -D @playwright/test` in `packages/player`

---

## Project Constraints (from CLAUDE.md)

Directives the planner must verify compliance against:

- **pnpm + Turborepo + tsup only** — no npm/yarn; no webpack/rollup; new packages added via `pnpm add`
- **Browser-only targets** — both packages target browser environments; no Node.js runtime code in `@asciify/player` source
- **@chenglou/pretext bundled inside player** — must stay in `dependencies`, not `peerDependencies`; must not appear as external import in dist (verified by integration test)
- **Named exports only** — no default exports; follow `export function` / `export type` pattern
- **Single quotes for strings** — consistent with codebase style
- **camelCase for runtime constants, UPPER_SNAKE_CASE for true constants**
- **`@/*` path alias relative to `apps/web/src/`** — player source uses relative imports or package-scoped imports, not `@/*`
- **TDD workflow from Phase 3** — tests written first (red), then implementation (green)
- **Module structure** — one file per concern; new files: `renderer.ts` extensions, possibly `typewriter.ts` if TypewriterReveal class is extracted
- **GSD workflow enforcement** — all edits go through gsd execution phases, no direct repo edits

---

## Sources

### Primary (HIGH confidence)
- `packages/player/node_modules/@chenglou/pretext/README.md` — full API documentation for `prepareWithSegments`, `layoutWithLines`, `layoutNextLine`, `prepare`; whitespace options; performance numbers
- `packages/player/node_modules/@chenglou/pretext/dist/layout.d.ts` — verified exported function signatures; `PreparedTextWithSegments`, `LayoutLine`, `LayoutLinesResult` types
- `packages/player/node_modules/happy-dom/lib/intersection-observer/IntersectionObserver.js` — confirmed observe/disconnect are stubs with `// TODO: Implement`
- `packages/player/node_modules/vitest/package.json` — version 4.1.2 confirmed; `@vitest/snapshot` present as dependency (inline snapshot support confirmed)
- `/Users/ivanmaierg/Library/Caches/ms-playwright` listing — confirmed `chromium-1200`, `chromium_headless_shell-1200` present
- Playwright system version: `npx playwright --version` → 1.59.1

### Secondary (MEDIUM confidence)
- pretext README pattern for `layoutWithLines` usage — extrapolated to per-row ASCII art layout (single-line per row, no wrapping needed)
- Playwright `page.setContent()` pattern for inline bundle testing — standard Playwright docs pattern, version-stable

### Tertiary (LOW confidence)
- None — all critical claims verified from installed packages

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages installed and versions confirmed from node_modules
- Architecture (pretext proportional): HIGH — API confirmed from type defs and README
- Architecture (typewriter): MEDIUM — design is sound but exact integration with PlaybackController is implementation-defined; Claude has discretion per D-05
- Architecture (triggers): HIGH — IntersectionObserver API is browser-standard; happy-dom stub behavior confirmed from source
- Architecture (browser tests): HIGH — Playwright version and browser cache confirmed from system
- Pitfalls: HIGH — each pitfall confirmed from source inspection (happy-dom stub, TypeScript type constraints, etc.)

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (pretext API is stable at 0.0.4; Playwright 1.x API is stable; 30-day window)
