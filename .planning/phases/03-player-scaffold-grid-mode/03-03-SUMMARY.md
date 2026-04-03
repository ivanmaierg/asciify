---
phase: 03-player-scaffold-grid-mode
plan: 03
subsystem: player
tags: [web-component, custom-element, shadow-dom, theming, controls, auto-sizing]
dependency_graph:
  requires: [03-02]
  provides: [AsciiPlayerElement, registerAsciiPlayer, ascii-player custom element]
  affects: [packages/player/src/index.ts]
tech_stack:
  added: []
  patterns: [Custom Elements v1, Shadow DOM open mode, CSS custom property fallback theming, data property setter pattern]
key_files:
  created:
    - packages/player/src/web-component.ts
    - packages/player/tests/web-component.test.ts
  modified:
    - packages/player/src/index.ts
    - packages/player/src/player.ts
decisions:
  - "Shadow DOM open mode chosen for encapsulation while retaining JS access"
  - "Controls rendered after player.ready resolves to ensure duration is available for progress bar"
  - "Color resolution priority: theme < CSS custom property < explicit attr (per D-01)"
  - "Extend D-09 export surface: AsciiPlayerElement + registerAsciiPlayer exported for advanced use cases (lazy registration, SSR guards)"
metrics:
  duration: 179s
  completed: "2026-04-03"
  tasks: 2
  files: 4
---

# Phase 03 Plan 03: AsciiPlayerElement Web Component Summary

**One-liner:** `<ascii-player>` Web Component wrapping AsciiPlayer in open Shadow DOM with attribute/CSS theming, auto-sizing, and optional controls bar.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Implement AsciiPlayerElement with tests (TDD) | 70dcd68 | packages/player/src/web-component.ts, packages/player/tests/web-component.test.ts, packages/player/src/player.ts |
| 2 | Update barrel export and verify full build | c385a06 | packages/player/src/index.ts |

## What Was Built

### AsciiPlayerElement (`packages/player/src/web-component.ts`)

Custom element `<ascii-player>` that:

- Attaches an **open Shadow DOM** with `<style>` and `<canvas>` elements in its constructor
- **observedAttributes:** `src`, `autoplay`, `loop`, `controls`, `fps`, `fg-color`, `bg-color`, `theme`, `font`
- **`src` attribute:** triggers `fetch()` in `connectedCallback` and on attribute change
- **`.data` property setter:** accepts `PlayerInputData` directly; stores as `_pendingData` if not yet connected
- **Color resolution** (D-01 priority chain): theme lookup → CSS custom property (`--ascii-fg` / `--ascii-bg`) → explicit `fg-color`/`bg-color` attr → hardcoded defaults
- **Canvas auto-sizing** (PLR-09): `width = clientWidth || 640`, `height = width * (rows / columns)`
- **Controls bar** (PLR-13): rendered after `player.ready` resolves; includes play/pause button and range progress input; identified with `data-controls` attribute
- **Public API delegation:** `play()`, `pause()`, `seekTo()`, `seekToFrame()`, `currentTime`, `duration`
- **`registerAsciiPlayer()`:** guards against double-registration via `customElements.get()` check; auto-invoked on module load

### Barrel Export Update (`packages/player/src/index.ts`)

Added `AsciiPlayerElement` and `registerAsciiPlayer` exports. Note: This extends D-09's declared export surface to satisfy PLR-02 — the Web Component auto-registers on import, so most users never reference these exports directly.

### Build Output

All 4 formats verified:
- `dist/index.js` (ESM, 60.51 KB)
- `dist/index.cjs` (CJS, 61.66 KB)
- `dist/index.global.js` (IIFE/UMD, 66.14 KB)
- `dist/index.d.ts` + `dist/index.d.cts` (TypeScript types)

Bundle analysis:
- `@chenglou/pretext` inlined (0 external `require` calls — PLR-10 satisfied)
- `@asciify/encoder` external (1 reference in ESM bundle)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Guard `AsciiPlayer.destroy()` when `_playback` not yet initialized**
- **Found during:** Task 1 test run
- **Issue:** `AsciiPlayer.destroy()` called `this._playback.destroy()` unconditionally. When `destroy()` is called before `player.ready` resolves (e.g., element removed immediately after data is set), `_playback` is `undefined` causing a TypeError.
- **Fix:** Changed `this._playback.destroy()` to `this._playback?.destroy()` in `packages/player/src/player.ts:102`
- **Files modified:** `packages/player/src/player.ts`
- **Commit:** 70dcd68

**2. [Rule 2 - Test Fix] Replaced mock `document.createElement` with `HTMLCanvasElement.prototype.getContext` mock**
- **Found during:** Task 1 test development
- **Issue:** Mocking `document.createElement` to return plain objects caused happy-dom's `Node.isInclusiveAncestor` to crash when appending to Shadow DOM (requires real DOM nodes)
- **Fix:** Use `vi.spyOn(HTMLCanvasElement.prototype, 'getContext')` instead — canvas elements are real DOM nodes, only the context is mocked
- **Files modified:** `packages/player/tests/web-component.test.ts`
- **Commit:** 70dcd68

## Known Stubs

None — all plan requirements are wired and functional.

## Self-Check: PASSED

- `packages/player/src/web-component.ts` — FOUND
- `packages/player/tests/web-component.test.ts` — FOUND
- Commit 70dcd68 — FOUND
- Commit c385a06 — FOUND
- `packages/player/dist/index.js` — FOUND
- `packages/player/dist/index.cjs` — FOUND
- `packages/player/dist/index.global.js` — FOUND
- `packages/player/dist/index.d.ts` — FOUND
- All 67 tests passing — VERIFIED
