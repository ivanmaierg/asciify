---
phase: 06-publishing
plan: 01
subsystem: ui
tags: [zustand, nextjs, react, ascii, video, conversion, encoder, player]

# Dependency graph
requires:
  - phase: 05-app-integration
    provides: extractFrames, FrameExtractionConfig, frame-extractor
  - phase: 02-encoder-package
    provides: createPlayerData, compressPlayerData, CHARACTER_SETS, AsciiPlayerDataCompact
  - phase: 03-player-scaffold-grid-mode
    provides: RenderMode, LoopMode types from @asciify/player
provides:
  - /demo Next.js route with DemoPlayground component
  - useDemoStore Zustand store for demo-specific state (video, conversion, player options)
  - DemoDropZone video file upload component wired to demo store
  - DemoConverter component calling extractFrames -> createPlayerData -> compressPlayerData
  - Settings controls (columns, fps, colorMode) before conversion
affects: [06-02-player-embedding]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Demo store pattern: separate Zustand store for demo page, not sharing editor store
    - Player data pipeline: extractFrames -> createPlayerData -> compressPlayerData -> useDemoStore.playerData

key-files:
  created:
    - apps/web/src/stores/demo-store.ts
    - apps/web/src/app/demo/page.tsx
    - apps/web/src/components/demo/demo-playground.tsx
    - apps/web/src/components/demo/demo-drop-zone.tsx
    - apps/web/src/components/demo/demo-converter.tsx
  modified: []

key-decisions:
  - "Demo store is standalone (separate from editor-store) to avoid coupling demo to editor state"
  - "onValueChange type fixed to accept number | readonly number[] to match base-ui Slider callback signature"

patterns-established:
  - "Demo components follow same patterns as editor: 'use client', lucide-react icons, shadcn ui components"

requirements-completed: [PUB-05]

# Metrics
duration: 8min
completed: 2026-04-03
---

# Phase 6 Plan 01: Demo Playground Foundation Summary

**/demo route with video drop zone, configurable settings, and full extractFrames -> createPlayerData -> compressPlayerData conversion pipeline storing AsciiPlayerDataCompact in dedicated Zustand store**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-03T21:33:04Z
- **Completed:** 2026-04-03T21:41:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Standalone `useDemoStore` Zustand store holds video input, conversion state, player options, and AsciiPlayerDataCompact result
- `/demo` Next.js route with two-panel layout: controls/settings left, player area right
- DemoDropZone mirrors existing VideoDropZone pattern — drag-drop and click-to-upload, 100MB limit, video/* validation
- DemoConverter wires the full encoder pipeline: extractFrames + createPlayerData + compressPlayerData with progress bar and error handling
- Settings controls (columns slider, fps slider, color mode select) configurable before conversion

## Task Commits

1. **Task 1: Demo store and page route** - `70ba963` (feat)
2. **Task 2: Conversion pipeline component** - `e9758b2` (feat)

**Plan metadata:** (pending final commit)

## Files Created/Modified

- `apps/web/src/stores/demo-store.ts` - Standalone Zustand store for demo state with video, conversion, player option fields
- `apps/web/src/app/demo/page.tsx` - Next.js route exporting metadata and rendering DemoPlayground
- `apps/web/src/components/demo/demo-playground.tsx` - Root layout: drop zone when no video, two-panel layout with settings + player area when video loaded
- `apps/web/src/components/demo/demo-drop-zone.tsx` - Video drag-drop/click upload wired to useDemoStore.setVideoFile
- `apps/web/src/components/demo/demo-converter.tsx` - Conversion pipeline with progress bar, error handling, and "Ready to play" state

## Decisions Made

- Demo store is standalone (not sharing editor-store) to keep demo self-contained and avoid coupling to editor-specific state fields
- `onValueChange` in Slider component returns `number | readonly number[]` from base-ui — sliderVal helper updated to handle both types

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Slider onValueChange type signature**
- **Found during:** Task 2 (settings controls in demo-playground.tsx)
- **Issue:** TypeScript error — sliderVal helper declared `number[]` parameter but base-ui's onValueChange provides `number | readonly number[]`
- **Fix:** Updated sliderVal signature to `(v: number | readonly number[]): number` with type guard
- **Files modified:** apps/web/src/components/demo/demo-playground.tsx
- **Verification:** `pnpm --filter web exec tsc --noEmit` passes with no errors
- **Committed in:** e9758b2 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 type bug)
**Impact on plan:** Minor TypeScript type fix, no scope change.

## Known Stubs

- **Player area placeholder** (`apps/web/src/components/demo/demo-playground.tsx`, lines 87-92): Shows "Player output will appear here (Plan 02)" text. Intentional — Plan 02 wires in the actual `<ascii-player>` web component once AsciiPlayerDataCompact is stored. The conversion pipeline produces real data; the display is deferred.

## Issues Encountered

None — TypeScript type fix handled automatically.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- AsciiPlayerDataCompact stored in `useDemoStore.playerData` after conversion — Plan 02 reads this to render `<ascii-player>` in the right panel
- Player options (renderMode, theme, loop, charDelay) stored in demo store and ready for Plan 02 to wire
- `/demo` route builds successfully and is included in Next.js static output

---
*Phase: 06-publishing*
*Completed: 2026-04-03*
