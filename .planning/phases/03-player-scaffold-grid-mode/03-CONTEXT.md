# Phase 3: Player Scaffold + Grid Mode - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

`@asciify/player` exists as a buildable package with a working Web Component (`<ascii-player>`) and ES Module API (`new AsciiPlayer(canvas, data, options)`) rendering ASCII art in grid mode. Covers PLR-01 through PLR-13, MODE-01, and MODE-05. Other rendering modes (proportional, typewriter, reflow) are Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Web Component API
- **D-01:** Theming via both HTML attributes (`fg-color`, `bg-color`, `theme`) AND CSS custom properties (`--ascii-fg`, `--ascii-bg`) as fallback. Attributes take priority, CSS properties as fallback. Named themes set both.

### Claude's Discretion (Web Component)
- Shadow DOM strategy (open shadow DOM recommended for encapsulation)
- Controls bar design (minimal play/pause + progress bar recommended)
- Data loading (`src` attribute for URL fetch + `.data` property for direct object assignment)
- Responsive sizing (width-driven auto-height from frame aspect ratio per PLR-09)
- Error handling (visual error state + error event)
- IIFE build output (include from day one per PLR-01)
- Attribute reactivity via `observedAttributes` + `attributeChangedCallback`

### ES Module API
- **D-02:** Constructor: `new AsciiPlayer(canvas, data, options)` — canvas element provided by user, player renders to it.
- **D-03:** API parity with Web Component — same option names in camelCase (e.g., `fgColor`, `bgColor`, `fps`, `loop`, `autoplay`).
- **D-04:** State exposed via EventTarget (`addEventListener`) AND callback options (`onTimeUpdate`, `onEnded`). EventTarget is primary, callbacks are convenience sugar.
- **D-05:** `player.destroy()` method for cleanup — stops playback, cancels rAF, clears canvas, removes listeners. Required for SPA integration.
- **D-06:** `@asciify/encoder` as peer dependency. Player imports types and decompression utilities from encoder.
- **D-07:** Async init with `player.ready` promise. Constructor returns immediately. Font loads via `document.fonts.load()`, then pretext `prepare()` runs, then playback can start. Autoplay waits for ready.
- **D-08:** Accepts both `AsciiPlayerData` (uncompressed) and `AsciiPlayerDataCompact` (delta+RLE) formats. Auto-detects on load.
- **D-09:** Export surface: `AsciiPlayer` class + TypeScript types only. No standalone render function.

### Rendering Approach
- **D-10:** Fresh renderer built inside player package — not extracted from `apps/web/src/lib/pretext-renderer.ts`. Clean implementation using pretext APIs.
- **D-11:** Pretext used for all modes including grid. `prepare()` for glyph measurement, `layoutWithLines()` for per-frame layout. Consistent code path across all future modes.
- **D-12:** Per-cell color rendering from `AsciiCell` data. No line-by-line fast path for monochrome — uniform per-cell approach for simplicity.

### Playback Engine
- **D-13:** `requestAnimationFrame` + time delta for FPS throttling. Check elapsed time since last frame, only advance when enough time has passed for target FPS.
- **D-14:** Both `seekTo(seconds)` and `seekToFrame(index)` methods. Seconds for media-like use, frame index for precise control.

### Claude's Discretion (Playback)
- `timeupdate` event frequency (every frame vs ~4x/second)
- End-of-playback behavior (stay on last frame recommended)
- Loop mode state machine internals

### Data Decompression
- **D-15:** Decompression utilities imported from `@asciify/encoder` (peer dep). Single source of truth for compression/decompression logic.

### Claude's Discretion (Decompression)
- Eager vs lazy decompression strategy (eager recommended for simplicity)

### Package Structure & Build
- **D-16:** Pretext bundled via tsup `noExternal` — `@chenglou/pretext` inlined into dist. Users never see it.
- **D-17:** Feature module organization: `src/player.ts` (core class), `src/renderer.ts` (canvas rendering), `src/playback.ts` (timing/loop), `src/web-component.ts` (custom element), `src/types.ts`, `src/index.ts` (re-exports).
- **D-18:** tsup outputs: ESM + CJS + IIFE + .d.ts types. Full coverage from day one.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Player Package — Core — PLR-01 through PLR-13
- `.planning/REQUIREMENTS.md` §Player Package — Rendering Modes — MODE-01, MODE-05
- `.planning/REQUIREMENTS.md` §Player Package — Extras — XTRA-01, XTRA-02

### Canonical data format (input to player)
- `packages/encoder/src/player-data.ts` — `AsciiPlayerData`, `AsciiPlayerDataCompact`, `AsciiPlayerMetadata` interfaces; `createPlayerData()` and `compressPlayerData()` functions
- `packages/encoder/src/ascii-engine.ts` — `AsciiFrame`, `AsciiCell` types (player reads these)
- `packages/encoder/src/delta-encoder.ts` — `EncodedFrame`, `DeltaPatch` types; delta encoding format
- `packages/encoder/src/rle.ts` — `rleDecode()` for decompressing compact frames

### Player package shell (from Phase 1)
- `packages/player/package.json` — Existing shell (needs tsup, pretext, build scripts)
- `packages/player/tsconfig.json` — Extends tsconfig.base.json
- `packages/player/src/index.ts` — Empty stub to be replaced

### Existing rendering reference (DO NOT extract — reference only)
- `apps/web/src/lib/pretext-renderer.ts` — Current canvas rendering approach (app-specific, not reusable but shows the pattern)
- `apps/web/src/lib/measure-char.ts` — Current monospace char measurement (replaced by pretext `prepare()`)
- `apps/web/src/lib/glyph-atlas.ts` — WebGPU glyph atlas (not relevant for Phase 3 canvas rendering)

### Project constraints
- `.planning/PROJECT.md` — Browser-only constraint, pretext bundled inside player
- `.planning/phases/02-encoder-package/02-CONTEXT.md` — Encoder API surface, canonical format spec

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/encoder/src/player-data.ts`: Canonical `AsciiPlayerData` and `AsciiPlayerDataCompact` interfaces — the player's input data contract
- `packages/encoder/src/rle.ts`: `rleDecode()` function — player imports this for compact format decompression
- `packages/encoder/src/delta-encoder.ts`: Delta patch format — player needs to understand `EncodedFrame` union type (keyframe string | DeltaPatch[])

### Established Patterns
- tsup build with ESM + CJS + types (already configured in `packages/encoder/`) — player mirrors this config with IIFE added
- TypeScript strict mode, `tsconfig.base.json` inheritance — player already extends this
- Vitest for testing (configured in encoder) — player can mirror test setup

### Integration Points
- `@asciify/encoder` peer dependency — player imports types (`AsciiPlayerData`, `AsciiFrame`, `AsciiCell`, `ColorMode`) and utilities (`rleDecode`)
- `@chenglou/pretext` — npm dependency, bundled via tsup `noExternal`. Provides `prepare()` and `layoutWithLines()` APIs
- Future: `apps/web` will consume `@asciify/player` in Phase 5 (App Integration)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-player-scaffold-grid-mode*
*Context gathered: 2026-04-03*
