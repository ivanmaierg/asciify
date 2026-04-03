---
phase: 05-app-integration
plan: 02
subsystem: export
tags: [html-export, ascii-player, iife-bundle, player-bundle]

# Dependency graph
requires:
  - phase: 05-app-integration/05-01
    provides: player-bundle.js copied to apps/web/public via copy-player-bundle script

provides:
  - "Async generateExportHtml that fetches and embeds the compiled @asciify/player IIFE bundle"
  - "Self-contained exported HTML files using Asciify.AsciiPlayer API for playback"
  - "columns field added to ExportOptions for AsciiPlayerDataCompact metadata"

affects: [apps/web, html-export, export-button, player-bundle]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Module-level bundle cache: _playerBundleCache avoids repeated fetch on repeated exports"
    - "Async HTML generation: generateExportHtml returns Promise<string>, caller awaits"
    - "AsciiPlayerDataCompact bootstrap: exported HTML wraps delta-encoded frames in version:1 data object"

key-files:
  created: []
  modified:
    - "apps/web/src/lib/html-export.ts"
    - "apps/web/src/components/export/export-button.tsx"

key-decisions:
  - "Player API uses isPlaying (not paused) — controls bootstrap adapted accordingly"
  - "player.ready.then() wraps both controls and audio bootstrap to ensure player is initialized before wiring events"
  - "columns added to ExportOptions interface — caller has s.columns from store, cleaner than decoding first frame"

patterns-established:
  - "Async export pipeline: generateExportHtml is async; export-button already async so await is safe"

requirements-completed: [APP-02, APP-03]

# Metrics
duration: 8min
completed: 2026-04-03
---

# Phase 05 Plan 02: HTML Export Player Bundle Integration Summary

**HTML export refactored to embed the compiled @asciify/player IIFE bundle — exported files play via `new Asciify.AsciiPlayer(canvas, data, options)` instead of hand-rolled delta-decode/render loop**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-03T17:44:00Z
- **Completed:** 2026-04-03T17:52:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Replaced ~80 lines of hand-rolled inline JS runtime (buildCache, getFrameText, render, run) with the compiled and tested @asciify/player IIFE bundle
- Added module-level `getPlayerBundle()` cache so repeated exports reuse the fetched bundle without additional network requests
- Updated export-button.tsx to `await generateExportHtml` and pass `columns: s.columns` for AsciiPlayerDataCompact metadata
- Full turbo build (3 tasks) and test suite (127 tests) pass with no regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor generateExportHtml to use player IIFE bundle** - `270d333` (feat)
2. **Task 2: Update export-button.tsx to await async generateExportHtml and pass columns** - `c8164e5` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `apps/web/src/lib/html-export.ts` - Rewritten: async, fetches player bundle, embeds IIFE + bootstrap script using Asciify.AsciiPlayer
- `apps/web/src/components/export/export-button.tsx` - Added `await` and `columns: s.columns` to generateExportHtml call

## Decisions Made

- Player API uses `isPlaying` property (not `paused`) — controls bootstrap adapted to check `player.isPlaying`
- `player.ready.then()` wraps both controls wiring and audio sync to ensure player is initialized before event binding
- `columns` field added to `ExportOptions` — simpler than decoding first EncodedFrame to extract column count at runtime

## Deviations from Plan

None - plan executed exactly as written. The plan's controls bootstrap used `player.paused` which doesn't exist in the player API; `player.isPlaying` was used instead (found from reading player.ts). This is a trivial code correction, not a structural deviation.

## Issues Encountered

None — typecheck initially failed as expected with Task 1 alone (export-button.tsx still calling the old sync signature). Both tasks were needed together for typecheck to pass.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 05 is now complete: AsciiPlayer preview integration (plan 01) and HTML export refactor (plan 02) both done
- apps/web fully consumes @asciify/player — preview canvas and exported HTML both use the player package
- Ready for Phase 06: Publishing (@asciify/encoder and @asciify/player to npm)

## Self-Check: PASSED

All files present and commits verified.

---
*Phase: 05-app-integration*
*Completed: 2026-04-03*
