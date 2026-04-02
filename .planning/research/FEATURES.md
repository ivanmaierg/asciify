# Feature Landscape

**Domain:** Canvas text animation player (Web Component + ES Module) + ASCII encoder (pure functions)
**Researched:** 2026-04-02
**Confidence note:** Web/npm search tools unavailable. Analysis derived from: (1) existing codebase — actual working code across `pretext-renderer.ts`, `html-export.ts`, `ascii-engine.ts`, `ascii-canvas.tsx`, and all export generators; (2) `pdr.md` — the original product requirements doc; (3) `@chenglou/pretext` README and package; (4) `CONCERNS.md` — engineering issues already observed in production. Competitive comparison in `pdr.md` section 5 is the project owner's own analysis; confidence is MEDIUM (not independently verified).

---

## Package 1: `@asciify/player`

The player receives pre-encoded frame data (JSON) and renders it to a canvas. Its audience is developers who want to embed ASCII animations on any website. The four rendering modes are the main differentiator over existing tooling.

### Table Stakes — must have or developers won't adopt

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Web Component (`<ascii-player>`) | Framework-agnostic drop-in; expected by any modern "embeddable" player lib | Low | Custom Elements v1, already spec'd in `pdr.md` |
| ES Module imperative API (`new AsciiPlayer(canvas, data, opts)`) | Developers with existing canvas want direct control, not HTML tags | Low | Trivial once Web Component internals exist |
| `play()` / `pause()` / `seekTo(seconds)` methods | Every player library exposes these; absence is a dealbreaker | Low | Already implemented in html-export player runtime |
| Configurable FPS | Different outputs need different speeds; fixed FPS is a non-starter | Low | Already in `html-export.ts` |
| Loop modes: `forever` / `once` / `N` | Standard expectation; `once` required for on-scroll triggers | Low | `ExportLoop` type already exists |
| Autoplay attribute/option | Common embedding pattern; paired with muted semantics | Low | Already in `html-export.ts` |
| TypeScript types shipped | Library consumers in TypeScript projects expect `.d.ts`; no types = npm search penalty | Low | tsup outputs types automatically |
| ESM + CJS dual output | Bundlers expect both; CJS needed for older toolchains and Next.js server contexts | Low | tsup handles this |
| Grid mode (classic monospace) | Baseline ASCII art rendering — every existing tool supports this | Low | Already in `pretext-renderer.ts` and `html-export.ts` |
| Foreground / background color | Visual theming is expected; `green-on-black` is the canonical demo | Low | Already parameterized in all render paths |
| Canvas auto-sizing | Developer shouldn't need to manually compute canvas dimensions | Low | Width given, height calculated from frame aspect ratio |
| Graceful no-JS degradation | Web Component should not break pages when JS disabled | Low | Empty custom element is fine; note in docs is enough |

### Table Stakes — differentiating features this project is committed to shipping in v1

These are above the competitive baseline but explicitly required by `PROJECT.md`:

| Feature | Why It Differentiates | Complexity | Notes |
|---------|----------------------|------------|-------|
| Proportional font mode | No other ASCII player supports non-monospace fonts; needs pretext `prepareWithSegments` + `layoutWithLines` | Medium | pretext bundled inside player; one-time `prepare()` call on init |
| Typewriter mode | Character-by-character reveal is absent from all existing ASCII player libs | Medium | Needs per-character timing logic driven by configurable delay |
| Typewriter timestamp mode | Precise timing data for audio sync — required for synchronized sound effects | High | Requires a pre-computed character timing table derived from FPS and character position |
| Reflow mode | Responsive container resize with real-time text reflow | High | Needs `ResizeObserver` + `layoutWithLines` on container width change; performance-sensitive |
| Canonical JSON data format | Clean interchange spec between encoder and player — makes the packages independently useful | Medium | Needs formal spec: `{ version, fps, frames: EncodedFrame[], metadata? }` |

### Differentiators — competitive advantages beyond the baseline

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| pretext-powered layout | Accurate rendering with any font, any charset, any language — not fixed-grid guesswork | Low (pretext is bundled) | Already proven at 0.09ms/frame in `pdr.md` benchmarks |
| `font` attribute/option | Developers can match their brand font — no other ASCII player allows this | Low | Requires pretext to be initialized after FontFace API resolves |
| `controls` attribute | Opt-in play/pause/scrub bar — HTML players rarely expose controls declaratively | Low | Already exists in `html-export.ts` |
| Scroll-triggered playback | Creative coders want on-scroll ASCII reveals; a `trigger="scroll"` attribute would be viral | Medium | IntersectionObserver + play on enter; independent of rendering modes |
| `currentTime` / `duration` event API | `timeupdate` and `ended` custom events mirror the HTMLMediaElement pattern; familiar to developers | Low | Dispatch CustomEvent; lets users build progress indicators |
| Zero-dependency runtime | `npm install @asciify/player` brings only pretext (bundled) — no React, no Vue, no framework | Low | Constraint already enforced by architecture |
| CDN-installable | Developers should be able to `<script src="https://cdn.example/@asciify/player">` | Low | UMD or IIFE build via tsup; single-file |
| Named themes | `theme="green-on-black"` shorthand for common color pairs — reduces friction in demos | Low | Map of 4-5 named presets; overridable by explicit colors |

### Anti-Features — explicitly do NOT build

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Built-in video-to-ASCII conversion | Creates circular dependency; player should be a display primitive, not an encoder | User feeds JSON data from `@asciify/encoder` or the web app |
| Audio playback in player | Out of scope per `PROJECT.md`; browser autoplay policy makes this fragile; audio sync is app-level concern | Audio is the app's responsibility; typewriter timestamp mode provides timing hooks |
| React/Vue/Svelte adapters | Framework wrappers have their own maintenance burden and versioning; Web Component works everywhere natively | Document usage in each framework with copy-paste snippets |
| CSS-in-JS or shadow DOM styles | Leaking styles is bad; locking to shadow DOM makes external CSS customization impossible | Use CSS custom properties (`--ascii-fg`, `--ascii-bg`) on host element |
| Server-side rendering | Canvas is browser-only; any SSR wrapper is a lie and creates hydration debt | Document as browser-only in README; let apps handle SSR placeholder |
| GIF / video export inside player | Out of scope per `PROJECT.md`; adds massive dependencies | Export lives in the web app only |
| Built-in color palette picker | That's editor UI, not player UI | Attributes accept hex strings |
| WebSocket / live data streaming | Not the use case; real-time ASCII has different performance tradeoffs | Separate future package or app extension |

---

## Package 2: `@asciify/encoder`

The encoder takes `ImageData` and conversion parameters, returns `AsciiFrame`. It is a pure function library — no canvas lifecycle, no state.

### Table Stakes — must have for library consumers

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| `convertFrameToAscii(imageData, options): AsciiFrame` | Core function; reason the package exists | Low | Already implemented in `ascii-engine.ts` |
| `AsciiFrame` type export (`{ text, cells }`) | Consumers need typed data to pass to player or their own renderer | Low | Already in `ascii-engine.ts` |
| `AsciiCell` type export (`{ char, r, g, b, brightness }`) | Per-character metadata needed for colored rendering and export pipelines | Low | Already in `ascii-engine.ts` |
| Configurable character set (string) | Custom charsets are the primary knob for visual style | Low | Already parametric |
| Monochrome + colored + inverted + monoscale color modes | Comprehensive color output modes | Low | Already in `ColorMode` type |
| Brightness threshold + contrast boost | Essential quality controls; without them output looks wrong | Low | Already implemented |
| TypeScript types shipped | Same requirement as player | Low | tsup auto-generates |
| ESM + CJS dual output | Same requirement as player | Low | tsup handles |
| Browser-only, no node-canvas | Keeps the package simple and avoids a painful native dependency | Low | Explicit constraint in `PROJECT.md` |
| Pure functions, no side effects | Library consumers expect to call `convertFrameToAscii` in a Worker without setup | Low | Already the case; no global state |

### Table Stakes — quality control features (existing, must be preserved)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Multi-pass rendering path | Gamma + edge detection + dithering are non-trivial visual improvements | Medium | Already implemented with fast single-pass fallback |
| Gamma correction | Standard image processing control | Low | Already in multi-pass path |
| Sobel edge detection | Crisp edge-highlighted output — differentiates from naive tools | Medium | Already implemented with strength parameter |
| Floyd-Steinberg dithering | Best quality dithering for dense charsets | Medium | Already implemented |
| Ordered (Bayer) dithering | Faster alternative with distinct visual style | Medium | Already implemented |
| Invert charset | Dark-background vs light-background output | Low | Already implemented |
| `deltaEncode(frames, keyframeInterval): DeltaEncodedFrames` | Required for HTML/WebComponent export to be a reasonable file size | Medium | Already in `delta-encoder.ts` — needs export from package |

### Differentiators for encoder

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Single-pass fast path | Auto-selects O(1) algorithm when no effects active; raw speed matters in Workers | Low | Already exists; just needs documentation |
| Frame compression utilities (`rleEncode`, `deltaEncode`) | Needed downstream for any export format; re-exporting saves consumers from reimplementing | Low | `rle.ts` + `delta-encoder.ts` already written |
| Canonical JSON data format spec | Stable interchange contract; player and encoder are independently installable | Medium | Currently implicit; needs formal spec document and version field |

### Anti-Features for encoder

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Worker orchestration / pool management | App decides parallelization; encoder should be callable from any context | App wraps `convertFrameToAscii` in its own Worker |
| Video extraction / `HTMLVideoElement` management | Out of scope per `PROJECT.md`; creates browser-specific lifecycle concerns | App handles extraction and passes `ImageData` |
| Export format generators (HTML, SVG, ANSI) | Those live in the app's export pipeline; encoder is a conversion primitive | Keep export generators in `apps/web` |
| Default charset assumptions baked in | Consumers should always choose their charset | Accept charset as required parameter, no default |
| Streaming / observable API | Pure sync function is simpler and testable; workers provide async boundary | Consumer wraps in Worker or async if needed |

---

## Feature Dependencies

```
@asciify/player grid mode
  └── depends on: canonical JSON data format spec
  └── depends on: AsciiFrame.text (newline-delimited string)

@asciify/player proportional mode
  └── depends on: pretext prepareWithSegments + layoutWithLines
  └── depends on: font loaded (FontFace API) before prepare()
  └── depends on: canonical JSON with font metadata field

@asciify/player typewriter mode
  └── depends on: grid mode working
  └── depends on: configurable delay per character

@asciify/player typewriter timestamp mode
  └── depends on: typewriter mode
  └── depends on: pre-computed per-character timing table
  └── output: timing data structure for audio sync (app-level)

@asciify/player reflow mode
  └── depends on: proportional mode (uses same pretext layout path)
  └── depends on: ResizeObserver on container element
  └── depends on: frame data that allows re-layout (text content, not pixel-locked cells)

deltaEncode (encoder export)
  └── depends on: convertFrameToAscii producing deterministic text output
  └── depends on: rleEncode

canonical JSON format
  └── feeds: player src attribute / ES module data argument
  └── consumed by: @asciify/player in all modes
  └── produced by: @asciify/encoder pipeline (app orchestrates)
```

---

## MVP Recommendation

### Player MVP

Prioritize:
1. Grid mode Web Component + ES Module (lowest risk, highest reuse of existing code)
2. Canonical JSON data format (must exist before anything else can work)
3. TypeScript types, dual ESM/CJS, CDN IIFE build (table stakes for npm)
4. Proportional font mode (key differentiator, pretext already installed)
5. Typewriter mode (second differentiator, moderate complexity)

Defer:
- Typewriter timestamp mode: depends on typewriter mode; audio sync is app-level concern, not blocking player adoption
- Reflow mode: highest complexity due to ResizeObserver + layout recalculation performance; defer to v1.1
- Scroll-triggered playback: creative extra; not needed for developer adoption

### Encoder MVP

Prioritize:
1. `convertFrameToAscii` with all existing parameters — pure port of `ascii-engine.ts`
2. All types exported (`AsciiFrame`, `AsciiCell`, `ColorMode`, `DitherMode`)
3. `deltaEncode` + `rleEncode` re-exported as encoding utilities
4. Canonical JSON format spec matching what player consumes

Defer:
- Any new conversion algorithms — what exists is already production-quality
- WebGPU-accelerated frame extraction — that's app concern, not encoder concern

---

## Observations from Existing Codebase

The following gaps were identified by reading the existing code. They are not yet bugs, but they become important when extracting packages:

1. **`measureMonospaceChar` is still used in `ascii-canvas.tsx` for Canvas2D mode** — when the player re-introduces pretext, `measure-char.ts` becomes redundant in player modes. Keep it in `apps/web` only or remove it if all player modes use pretext.

2. **`html-export.ts` embeds a hardcoded monospace-only player runtime** — the exported HTML player does not use pretext. When `@asciify/player` is built, the HTML export should embed the compiled player bundle or reference it, not maintain a separate inline JS runtime. This is a significant refactoring decision.

3. **The JSON frame format in `html-export.ts` is implicit** — `EncodedFrame` is `string | DeltaPatch` but there is no top-level version field or metadata envelope. The canonical JSON spec must be defined before publishing either package.

4. **Proportional mode needs font-loading guard** — pretext's `prepare()` measures glyphs using the browser's font engine. If the font is not yet loaded when `prepare()` is called, measurements will use the fallback font. The player must call `document.fonts.load(font)` before initializing pretext. This is documented in `pdr.md` section 8 but not yet implemented.

5. **Reflow mode is genuinely hard** — `layoutNextLine` in pretext allows variable-width-per-line layout, which is needed for reflow. But reflow also means the canvas height changes on container resize, which can cause layout thrash if not debounced. Flag this mode for deeper research before implementation.

---

## Sources

- `/Users/ivanmaierg/asciify/src/lib/ascii-engine.ts` — encoder implementation (HIGH confidence: this is the shipping code)
- `/Users/ivanmaierg/asciify/src/lib/pretext-renderer.ts` — current Canvas2D render path (HIGH confidence)
- `/Users/ivanmaierg/asciify/src/lib/html-export.ts` — embedded player runtime (HIGH confidence)
- `/Users/ivanmaierg/asciify/src/components/preview/ascii-canvas.tsx` — live preview playback loop (HIGH confidence)
- `/Users/ivanmaierg/asciify/node_modules/@chenglou/pretext/README.md` — pretext API surface, v0.0.3 (HIGH confidence: installed package)
- `/Users/ivanmaierg/asciify/pdr.md` — product requirements and competitive landscape (MEDIUM confidence: owner's analysis, not independently verified)
- `/Users/ivanmaierg/asciify/.planning/PROJECT.md` — milestone requirements, constraints, key decisions (HIGH confidence: authoritative project spec)
- `/Users/ivanmaierg/asciify/.planning/codebase/CONCERNS.md` — known tech debt and fragile areas (HIGH confidence: code analysis)
