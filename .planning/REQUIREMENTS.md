# Requirements: Asciify Monorepo

**Defined:** 2026-04-02
**Core Value:** Developers and creative coders can install `@asciify/player` on any website to render and animate text on canvas — with a single HTML tag or ES import.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Monorepo Infrastructure

- [ ] **MONO-01**: Project restructured into pnpm workspaces with `apps/web` and `packages/*` layout
- [ ] **MONO-02**: Turborepo configured with build pipeline (`dependsOn: ["^build"]`)
- [ ] **MONO-03**: Existing Next.js app runs correctly from `apps/web` after migration
- [ ] **MONO-04**: Shared TypeScript base config (`tsconfig.base.json`) used by all packages and app
- [ ] **MONO-05**: `npm` replaced with `pnpm` (package-lock.json removed, pnpm-lock.yaml generated)

### Encoder Package

- [ ] **ENC-01**: `@asciify/encoder` package created with tsup build (ESM + CJS + types)
- [ ] **ENC-02**: `convertFrameToAscii(imageData, options): AsciiFrame` exported as core function
- [ ] **ENC-03**: All types exported: `AsciiFrame`, `AsciiCell`, `ColorMode`, `DitherMode`
- [ ] **ENC-04**: Multi-pass pipeline preserved: gamma correction, Sobel edge detection, Floyd-Steinberg dithering, Bayer dithering
- [ ] **ENC-05**: Brightness threshold and contrast boost parameters supported
- [ ] **ENC-06**: `deltaEncode` and `rleEncode` compression utilities exported
- [ ] **ENC-07**: Canonical JSON data format spec defined (`AsciiPlayerData` with version field, frame data, metadata)
- [ ] **ENC-08**: `apps/web` imports encoder from `@asciify/encoder` instead of local `src/lib/ascii-engine.ts`

### Player Package — Core

- [ ] **PLR-01**: `@asciify/player` package created with tsup build (ESM + CJS + IIFE + types)
- [ ] **PLR-02**: Web Component `<ascii-player>` registered as custom element
- [ ] **PLR-03**: ES Module API: `new AsciiPlayer(canvas, data, options)` for programmatic use
- [ ] **PLR-04**: `play()`, `pause()`, `seekTo(seconds)` methods on both Web Component and ES Module
- [ ] **PLR-05**: Configurable FPS via attribute/option
- [ ] **PLR-06**: Loop modes: `forever`, `once`, or numeric N
- [ ] **PLR-07**: Autoplay attribute/option
- [ ] **PLR-08**: Foreground and background color attributes/options
- [ ] **PLR-09**: Canvas auto-sizing (width given, height calculated from frame aspect ratio)
- [ ] **PLR-10**: `@chenglou/pretext` bundled inside player (not exposed as peer dep)
- [ ] **PLR-11**: Font loading guard (`document.fonts.load()` before pretext `prepare()`)
- [ ] **PLR-12**: `currentTime`, `duration` properties and `timeupdate`, `ended` custom events (mirrors HTMLMediaElement)
- [ ] **PLR-13**: Optional playback controls bar via `controls` attribute

### Player Package — Rendering Modes

- [ ] **MODE-01**: Grid mode — fixed monospace grid rendering (classic ASCII art)
- [ ] **MODE-02**: Proportional font mode — variable-width font rendering via pretext `layoutWithLines()`
- [ ] **MODE-03**: Typewriter mode — character-by-character reveal with configurable per-character delay
- [ ] **MODE-04**: Typewriter timestamp mode — precise per-character timing data for audio sync
- [ ] **MODE-05**: `font` attribute/option — render with any loaded web font

### Player Package — Extras

- [ ] **XTRA-01**: Named themes (`theme="green-on-black"`, `matrix`, `amber`, `white-on-black`, `blue`)
- [ ] **XTRA-02**: Scroll-triggered playback via `trigger="scroll"` attribute (IntersectionObserver)

### App Integration

- [ ] **APP-01**: `apps/web` live preview uses `@asciify/player` for canvas rendering
- [ ] **APP-02**: HTML export refactored to embed compiled `@asciify/player` bundle instead of separate inline runtime
- [ ] **APP-03**: All existing export formats (HTML, WebGPU, APNG, SVG, ANSI) continue working after migration

### Testing

- [ ] **TEST-01**: Unit tests for encoder — all conversion functions, edge cases, color modes, dithering algorithms (vitest)
- [ ] **TEST-02**: Unit tests for player — playback logic, mode switching, option parsing (vitest)
- [ ] **TEST-03**: Integration tests for player — canvas rendering output verification (vitest + canvas mocking)
- [ ] **TEST-04**: Visual snapshot tests for player — rendered canvas output compared against baseline snapshots
- [ ] **TEST-05**: Browser tests for Web Component — real DOM testing with Playwright (custom element registration, attribute changes, event firing)
- [ ] **TEST-06**: CI pipeline running full test suite on PRs (Turborepo `test` task)

### Publishing & Demo

- [ ] **PUB-01**: `@asciify` npm scope claimed and configured
- [ ] **PUB-02**: Both packages pass `publint` validation before publish
- [ ] **PUB-03**: Changesets configured for versioning and changelog generation
- [ ] **PUB-04**: Both packages published to npm with correct `exports` map (including `types` condition)
- [ ] **PUB-05**: Demo site / playground showing all player modes with interactive examples
- [ ] **PUB-06**: CDN-installable IIFE build for `<script>` tag usage

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Player — Reflow Mode

- **REFLOW-01**: Responsive container resize with real-time text reflow via pretext `layoutNextLine()`
- **REFLOW-02**: ResizeObserver integration with debounced canvas height recalculation
- **REFLOW-03**: Performance benchmarks under rapid resize (target: no layout thrash)

### Player — Advanced

- **ADV-01**: WebGPU rendering path for player (GPU-accelerated glyph atlas)
- **ADV-02**: Audio playback synchronized with typewriter timestamp mode
- **ADV-03**: Custom event hooks for frame-level callbacks

### Encoder — Node.js

- **NODE-01**: Node.js support via node-canvas polyfill for `ImageData`
- **NODE-02**: CLI tool: `npx @asciify/encoder video.mp4 --format json --columns 120`

## Out of Scope

| Feature | Reason |
|---------|--------|
| Worker orchestration in encoder | App decides parallelization strategy; encoder stays pure functions |
| Video extraction in encoder | Browser-specific lifecycle; app handles `HTMLVideoElement` and passes `ImageData` |
| Export format generators in packages | HTML/SVG/ANSI/WebGPU generators stay in `apps/web` export pipeline |
| React/Vue/Svelte framework adapters | Web Component works everywhere natively; document usage per framework instead |
| Server-side rendering of player | Canvas is browser-only; SSR placeholder is app responsibility |
| Audio playback in player v1 | Browser autoplay policy makes this fragile; timestamp mode provides timing hooks for app-level sync |
| Default charset in encoder | Consumers must always choose their charset explicitly |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| MONO-01 | — | Pending |
| MONO-02 | — | Pending |
| MONO-03 | — | Pending |
| MONO-04 | — | Pending |
| MONO-05 | — | Pending |
| ENC-01 | — | Pending |
| ENC-02 | — | Pending |
| ENC-03 | — | Pending |
| ENC-04 | — | Pending |
| ENC-05 | — | Pending |
| ENC-06 | — | Pending |
| ENC-07 | — | Pending |
| ENC-08 | — | Pending |
| PLR-01 | — | Pending |
| PLR-02 | — | Pending |
| PLR-03 | — | Pending |
| PLR-04 | — | Pending |
| PLR-05 | — | Pending |
| PLR-06 | — | Pending |
| PLR-07 | — | Pending |
| PLR-08 | — | Pending |
| PLR-09 | — | Pending |
| PLR-10 | — | Pending |
| PLR-11 | — | Pending |
| PLR-12 | — | Pending |
| PLR-13 | — | Pending |
| MODE-01 | — | Pending |
| MODE-02 | — | Pending |
| MODE-03 | — | Pending |
| MODE-04 | — | Pending |
| MODE-05 | — | Pending |
| XTRA-01 | — | Pending |
| XTRA-02 | — | Pending |
| APP-01 | — | Pending |
| APP-02 | — | Pending |
| APP-03 | — | Pending |
| TEST-01 | — | Pending |
| TEST-02 | — | Pending |
| TEST-03 | — | Pending |
| TEST-04 | — | Pending |
| TEST-05 | — | Pending |
| TEST-06 | — | Pending |
| PUB-01 | — | Pending |
| PUB-02 | — | Pending |
| PUB-03 | — | Pending |
| PUB-04 | — | Pending |
| PUB-05 | — | Pending |
| PUB-06 | — | Pending |

**Coverage:**
- v1 requirements: 47 total
- Mapped to phases: 0
- Unmapped: 47 ⚠️

---
*Requirements defined: 2026-04-02*
*Last updated: 2026-04-02 after initial definition*
