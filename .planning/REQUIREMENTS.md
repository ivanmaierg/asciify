# Requirements: Asciify Monorepo

**Defined:** 2026-04-02
**Core Value:** Developers and creative coders can install `@asciify/player` on any website to render and animate text on canvas — with a single HTML tag or ES import.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Monorepo Infrastructure

- [x] **MONO-01**: Project restructured into pnpm workspaces with `apps/web` and `packages/*` layout
- [x] **MONO-02**: Turborepo configured with build pipeline (`dependsOn: ["^build"]`)
- [ ] **MONO-03**: Existing Next.js app runs correctly from `apps/web` after migration
- [x] **MONO-04**: Shared TypeScript base config (`tsconfig.base.json`) used by all packages and app
- [x] **MONO-05**: `npm` replaced with `pnpm` (package-lock.json removed, pnpm-lock.yaml generated)

### Encoder Package

- [x] **ENC-01**: `@asciify/encoder` package created with tsup build (ESM + CJS + types)
- [x] **ENC-02**: `convertFrameToAscii(imageData, options): AsciiFrame` exported as core function
- [x] **ENC-03**: All types exported: `AsciiFrame`, `AsciiCell`, `ColorMode`, `DitherMode`
- [x] **ENC-04**: Multi-pass pipeline preserved: gamma correction, Sobel edge detection, Floyd-Steinberg dithering, Bayer dithering
- [x] **ENC-05**: Brightness threshold and contrast boost parameters supported
- [x] **ENC-06**: `deltaEncode` and `rleEncode` compression utilities exported
- [x] **ENC-07**: Canonical JSON data format spec defined (`AsciiPlayerData` with version field, frame data, metadata)
- [x] **ENC-08**: `apps/web` imports encoder from `@asciify/encoder` instead of local `src/lib/ascii-engine.ts`

### Player Package — Core

- [x] **PLR-01**: `@asciify/player` package created with tsup build (ESM + CJS + IIFE + types)
- [x] **PLR-02**: Web Component `<ascii-player>` registered as custom element
- [x] **PLR-03**: ES Module API: `new AsciiPlayer(canvas, data, options)` for programmatic use
- [x] **PLR-04**: `play()`, `pause()`, `seekTo(seconds)` methods on both Web Component and ES Module
- [x] **PLR-05**: Configurable FPS via attribute/option
- [x] **PLR-06**: Loop modes: `forever`, `once`, or numeric N
- [x] **PLR-07**: Autoplay attribute/option
- [ ] **PLR-08**: Foreground and background color attributes/options
- [ ] **PLR-09**: Canvas auto-sizing (width given, height calculated from frame aspect ratio)
- [x] **PLR-10**: `@chenglou/pretext` bundled inside player (not exposed as peer dep)
- [x] **PLR-11**: Font loading guard (`document.fonts.load()` before pretext `prepare()`)
- [x] **PLR-12**: `currentTime`, `duration` properties and `timeupdate`, `ended` custom events (mirrors HTMLMediaElement)
- [x] **PLR-13**: Optional playback controls bar via `controls` attribute

### Player Package — Rendering Modes

- [x] **MODE-01**: Grid mode — fixed monospace grid rendering (classic ASCII art)
- [x] **MODE-02**: Proportional font mode — variable-width font rendering via pretext `layoutWithLines()`
- [x] **MODE-03**: Typewriter mode — character-by-character reveal with configurable per-character delay
- [x] **MODE-04**: Typewriter timestamp mode — precise per-character timing data for audio sync
- [x] **MODE-05**: `font` attribute/option — render with any loaded web font

### Player Package — Extras

- [x] **XTRA-01**: Named themes (`theme="green-on-black"`, `matrix`, `amber`, `white-on-black`, `blue`)
- [x] **XTRA-02**: Scroll-triggered playback via `trigger="scroll"` attribute (IntersectionObserver)

### App Integration

- [x] **APP-01**: `apps/web` live preview uses `@asciify/player` for canvas rendering
- [ ] **APP-02**: HTML export refactored to embed compiled `@asciify/player` bundle instead of separate inline runtime
- [x] **APP-03**: All existing export formats (HTML, WebGPU, APNG, SVG, ANSI) continue working after migration

### Testing

- [x] **TEST-01**: Unit tests for encoder — all conversion functions, edge cases, color modes, dithering algorithms (vitest)
- [x] **TEST-02**: Unit tests for player — playback logic, mode switching, option parsing (vitest)
- [x] **TEST-03**: Integration tests for player — canvas rendering output verification (vitest + canvas mocking)
- [x] **TEST-04**: Visual snapshot tests for player — rendered canvas output compared against baseline snapshots
- [x] **TEST-05**: Browser tests for Web Component — real DOM testing with Playwright (custom element registration, attribute changes, event firing)
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
| MONO-01 | Phase 1 | Complete |
| MONO-02 | Phase 1 | Complete |
| MONO-03 | Phase 1 | Pending |
| MONO-04 | Phase 1 | Complete |
| MONO-05 | Phase 1 | Complete |
| ENC-01 | Phase 2 | Complete |
| ENC-02 | Phase 2 | Complete |
| ENC-03 | Phase 2 | Complete |
| ENC-04 | Phase 2 | Complete |
| ENC-05 | Phase 2 | Complete |
| ENC-06 | Phase 2 | Complete |
| ENC-07 | Phase 2 | Complete |
| ENC-08 | Phase 2 | Complete |
| PLR-01 | Phase 3 | Complete |
| PLR-02 | Phase 3 | Complete |
| PLR-03 | Phase 3 | Complete |
| PLR-04 | Phase 3 | Complete |
| PLR-05 | Phase 3 | Complete |
| PLR-06 | Phase 3 | Complete |
| PLR-07 | Phase 3 | Complete |
| PLR-08 | Phase 3 | Pending |
| PLR-09 | Phase 3 | Pending |
| PLR-10 | Phase 3 | Complete |
| PLR-11 | Phase 3 | Complete |
| PLR-12 | Phase 3 | Complete |
| PLR-13 | Phase 3 | Complete |
| MODE-01 | Phase 3 | Complete |
| MODE-02 | Phase 4 | Complete |
| MODE-03 | Phase 4 | Complete |
| MODE-04 | Phase 4 | Complete |
| MODE-05 | Phase 3 | Complete |
| XTRA-01 | Phase 4 | Complete |
| XTRA-02 | Phase 4 | Complete |
| APP-01 | Phase 5 | Complete |
| APP-02 | Phase 5 | Pending |
| APP-03 | Phase 5 | Complete |
| TEST-01 | Phase 2 | Complete |
| TEST-02 | Phase 4 | Complete |
| TEST-03 | Phase 4 | Complete |
| TEST-04 | Phase 4 | Complete |
| TEST-05 | Phase 4 | Complete |
| TEST-06 | Phase 6 | Pending |
| PUB-01 | Phase 6 | Pending |
| PUB-02 | Phase 6 | Pending |
| PUB-03 | Phase 6 | Pending |
| PUB-04 | Phase 6 | Pending |
| PUB-05 | Phase 6 | Pending |
| PUB-06 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 48 total
- Mapped to phases: 48
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-02*
*Last updated: 2026-04-02 — traceability filled after roadmap creation*
