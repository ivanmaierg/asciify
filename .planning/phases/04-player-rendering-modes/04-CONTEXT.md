# Phase 4: Player Rendering Modes - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

All v1 rendering modes are available in `@asciify/player` and the package is fully tested. This phase adds proportional font mode, typewriter mode (with timestamp variant), scroll/hover/click triggers, and a comprehensive test suite (unit, integration, snapshot, browser). The existing grid mode, Web Component, and ES Module API from Phase 3 are extended — not rewritten.

</domain>

<decisions>
## Implementation Decisions

### Proportional Font Rendering (MODE-02)
- **D-01:** Proportional mode uses pretext `layoutWithLines()` to position variable-width characters per D-11 (pretext for all modes). Each frame line is laid out independently.
- **D-02:** Overflow handling: clip silently at canvas edge. No auto-shrink or horizontal scroll. User adjusts font size or canvas width if content is too wide.
- **D-03:** Per-cell coloring is supported in proportional mode, consistent with grid mode. Each character positioned individually using pretext measurements with its own color from `AsciiCell` data.

### Claude's Discretion (Proportional)
- Whitespace handling strategy (pre-wrap vs word-wrap) — choose based on pretext API capabilities and what works best for ASCII art frames
- Line height calculation for variable-width fonts
- Whether to cache pretext layout results between frames with identical text

### Typewriter Animation (MODE-03, MODE-04)
- **D-04:** Typewriter mode reveals characters one at a time at a configurable per-character delay (`char-delay` attribute, default 30ms). Standard mode uses constant delay.
- **D-05:** Typewriter timestamp mode (MODE-04) produces per-character timing data for external audio sync. Data format and integration API are Claude's discretion.

### Claude's Discretion (Typewriter)
- Reveal granularity (per-char vs per-word vs per-line) — per-char is the default per MODE-03, but Claude may add options
- Cursor style during reveal (block, underline, or none)
- Easing curve for character delays (linear vs configurable)
- Timestamp data format for MODE-04 (callback vs event vs property)
- How typewriter interacts with loop modes (restart reveal on loop?)

### Playback Triggers (XTRA-02)
- **D-06:** `trigger="scroll"` starts playback when element enters viewport via IntersectionObserver. Replays on re-enter (reset + play each time element scrolls into view).
- **D-07:** Three trigger modes supported in v1: `trigger="scroll"`, `trigger="hover"`, `trigger="click"`. Each uses the appropriate DOM event/observer.
- **D-08:** Trigger modes are mutually exclusive with `autoplay`. If `trigger` is set, `autoplay` is ignored.

### Claude's Discretion (Triggers)
- IntersectionObserver threshold value (e.g., 0.5 = 50% visible)
- Hover behavior: play on mouseenter, pause on mouseleave? Or play on enter, continue after leave?
- Click behavior: toggle play/pause? Or play-once on click?
- Disconnect/reconnect strategy for scroll observer cleanup

### Named Themes (XTRA-01)
- **D-09:** Keep the existing 5 themes from Phase 3 (`green-on-black`, `matrix`, `amber`, `white-on-black`, `blue`). No new themes needed — XTRA-01 is already satisfied by the THEMES constant in `types.ts`.

### Test Strategy (TEST-02 through TEST-05)
- **D-10:** Unit tests (TEST-02): expand existing vitest suite with tests for new modes, trigger logic, and option parsing. Continue using happy-dom environment.
- **D-11:** Integration tests (TEST-03): canvas rendering output verification. Extend existing `integration.test.ts` pattern.
- **D-12:** Visual snapshot tests (TEST-04): rendered canvas output compared against baselines. Format and tooling are Claude's discretion.
- **D-13:** Browser tests (TEST-05): real DOM testing with Playwright for custom element registration, attribute changes, event firing.

### Claude's Discretion (Testing)
- Snapshot baseline format (PNG screenshot vs text dump)
- Playwright configuration and setup
- Whether snapshot tests run in CI or local-only
- Test coverage targets
- How to mock/verify canvas rendering output for proportional and typewriter modes

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Player package (source of truth for extension)
- `packages/player/src/types.ts` — `RenderMode`, `AsciiPlayerOptions`, `THEMES` — extend RenderMode union, add new options
- `packages/player/src/renderer.ts` — `renderGridFrame()` — add proportional and typewriter render functions following same pattern
- `packages/player/src/playback.ts` — `PlaybackController` — may need typewriter-specific timing hooks
- `packages/player/src/player.ts` — `AsciiPlayer` class — add mode switching, trigger logic
- `packages/player/src/web-component.ts` — `AsciiPlayerElement` — add `mode`, `char-delay`, `trigger` attributes
- `packages/player/src/index.ts` — barrel exports

### Encoder types (input data format)
- `packages/encoder/src/player-data.ts` — `AsciiPlayerData`, `AsciiPlayerDataCompact` — frame data the player consumes
- `packages/encoder/src/ascii-engine.ts` — `AsciiFrame`, `AsciiCell` — per-cell data for coloring
- `packages/encoder/src/rle.ts` — `rleDecode()` — decompression utility

### Requirements
- `.planning/REQUIREMENTS.md` §Player Package — Rendering Modes — MODE-02, MODE-03, MODE-04
- `.planning/REQUIREMENTS.md` §Player Package — Extras — XTRA-01, XTRA-02
- `.planning/REQUIREMENTS.md` §Testing — TEST-02, TEST-03, TEST-04, TEST-05

### Prior phase decisions
- `.planning/phases/03-player-scaffold-grid-mode/03-CONTEXT.md` — D-11 (pretext for all modes), D-13 (rAF timing), D-17 (module organization)

### Existing test patterns
- `packages/player/tests/renderer.test.ts` — grid renderer test patterns to replicate
- `packages/player/tests/playback.test.ts` — playback controller test patterns
- `packages/player/tests/player.test.ts` — AsciiPlayer class test patterns
- `packages/player/tests/web-component.test.ts` — Web Component test patterns with happy-dom
- `packages/player/tests/integration.test.ts` — build integration test pattern

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `renderGridFrame()` in `renderer.ts` — pattern for new render functions (accepts ctx, frame data, dimensions, colors)
- `PlaybackController` in `playback.ts` — rAF loop with FPS throttle, can be extended for typewriter timing
- `AsciiPlayer` class in `player.ts` — mode dispatching point, already has `this._options.mode` check
- `THEMES` in `types.ts` — 5 themes already defined, satisfies XTRA-01
- `AsciiPlayerElement` in `web-component.ts` — `observedAttributes` and `attributeChangedCallback` pattern for new attributes

### Established Patterns
- TDD workflow: tests written first (red), then implementation (green) — established in Phase 3
- Per-cell rendering: iterate `frame.cells[][]`, position each character with its color — extend for proportional positioning
- Canvas mock in tests: `HTMLCanvasElement.prototype.getContext` mock returning tracked calls
- Module structure: one file per concern (renderer, playback, player, web-component, types)

### Integration Points
- `RenderMode` type union in `types.ts` — extend with `'proportional' | 'typewriter'`
- `AsciiPlayerOptions` interface — add `charDelay`, `trigger` options
- `AsciiPlayerElement.observedAttributes` — add `'mode'`, `'char-delay'`, `'trigger'`
- `player.ts` render loop — dispatch to correct render function based on mode

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches within the decisions above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-player-rendering-modes*
*Context gathered: 2026-04-03*
