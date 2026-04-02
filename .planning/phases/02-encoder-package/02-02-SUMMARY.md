---
phase: 02-encoder-package
plan: 02
subsystem: api
tags: [typescript, monorepo, pnpm, workspace, encoder, ascii]

requires:
  - phase: 02-encoder-package/02-01
    provides: "@asciify/encoder package with convertFrameToAscii, deltaEncode, rleEncode, CHARACTER_SETS, DEFAULT_SETTINGS, ColorMode, DitherMode, CharacterSetName"

provides:
  - "apps/web fully consumes @asciify/encoder for all encoder types and functions"
  - "Local encoder source files (ascii-engine.ts, delta-encoder.ts, rle.ts) deleted from apps/web"
  - "convertFrameToAscii call in ascii-canvas.tsx updated to options-object signature"

affects:
  - 02-encoder-package/02-03
  - apps/web

tech-stack:
  added: []
  patterns:
    - "Workspace package consumption via @asciify/encoder workspace:* dependency"
    - "Import split: encoder types from @asciify/encoder, app-only types from @/lib/constants"

key-files:
  created: []
  modified:
    - apps/web/package.json
    - apps/web/src/lib/ascii-worker.ts
    - apps/web/src/lib/html-export.ts
    - apps/web/src/lib/frame-extractor.ts
    - apps/web/src/lib/export-apng.ts
    - apps/web/src/lib/export-webgpu.ts
    - apps/web/src/lib/export-ansi.ts
    - apps/web/src/lib/export-svg.ts
    - apps/web/src/lib/webgpu-renderer.ts
    - apps/web/src/lib/pretext-renderer.ts
    - apps/web/src/components/preview/ascii-canvas.tsx
    - apps/web/src/components/panels/input-controls.tsx
    - apps/web/src/components/export/export-button.tsx
    - apps/web/src/stores/editor-store.ts

key-decisions:
  - "ascii-worker.ts WORKER_CODE inlined string left unchanged per D-08 — only TypeScript type imports at top were updated"
  - "convertFrameToAscii call site migrated to options-object pattern matching the updated encoder API"
  - "frame-extractor.ts @/lib/constants import removed entirely as all its symbols moved to @asciify/encoder"

patterns-established:
  - "App-only types (PlaybackState, ExportFormat, ExportLoop, EXPORT_FORMAT_LABELS, FONT_PRESETS, FPS_OPTIONS) remain in @/lib/constants"
  - "Encoder types and values (AsciiFrame, AsciiCell, ColorMode, DitherMode, CharacterSetName, CHARACTER_SETS, DEFAULT_SETTINGS, convertFrameToAscii, deltaEncode) imported from @asciify/encoder"

requirements-completed: [ENC-08]

duration: 5min
completed: 2026-04-02
---

# Phase 02 Plan 02: Encoder Package Migration Summary

**apps/web migrated to consume @asciify/encoder workspace package — local ascii-engine.ts, delta-encoder.ts, rle.ts deleted, all 13 affected files updated, convertFrameToAscii call site migrated to options-object pattern**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-02T21:15:00Z
- **Completed:** 2026-04-02T21:20:00Z
- **Tasks:** 1
- **Files modified:** 18 (14 src files + package.json + 3 deleted + pnpm-lock.yaml)

## Accomplishments

- Added `"@asciify/encoder": "workspace:*"` to apps/web dependencies and ran pnpm install
- Updated all 13 files to import encoder types/functions from `@asciify/encoder` instead of local lib files
- Deleted `apps/web/src/lib/ascii-engine.ts`, `delta-encoder.ts`, `rle.ts` — @asciify/encoder is now single source of truth
- Updated `convertFrameToAscii` call in `ascii-canvas.tsx` from 10 positional args to options-object pattern
- `pnpm --filter web typecheck` passes cleanly with zero errors

## Task Commits

1. **Task 1: Add workspace dependency and migrate all app imports to @asciify/encoder** - `13baa3b` (feat)

## Files Created/Modified

- `apps/web/package.json` - Added @asciify/encoder workspace:* dependency
- `apps/web/src/lib/ascii-worker.ts` - Updated TypeScript imports; WORKER_CODE string unchanged
- `apps/web/src/lib/html-export.ts` - ColorMode, EncodedFrame from @asciify/encoder; ExportLoop stays @/lib/constants
- `apps/web/src/lib/frame-extractor.ts` - AsciiFrame, CharacterSetName, ColorMode, DitherMode, CHARACTER_SETS from @asciify/encoder
- `apps/web/src/lib/export-apng.ts` - AsciiFrame, ColorMode from @asciify/encoder
- `apps/web/src/lib/export-webgpu.ts` - AsciiFrame, ColorMode, deltaEncode from @asciify/encoder
- `apps/web/src/lib/export-ansi.ts` - AsciiFrame, ColorMode from @asciify/encoder
- `apps/web/src/lib/export-svg.ts` - AsciiFrame, AsciiCell, ColorMode from @asciify/encoder
- `apps/web/src/lib/webgpu-renderer.ts` - AsciiCell from @asciify/encoder
- `apps/web/src/lib/pretext-renderer.ts` - AsciiCell, ColorMode from @asciify/encoder
- `apps/web/src/components/preview/ascii-canvas.tsx` - convertFrameToAscii, CHARACTER_SETS, CharacterSetName from @asciify/encoder; call site updated
- `apps/web/src/components/panels/input-controls.tsx` - CHARACTER_SETS, CharacterSetName, ColorMode, DitherMode from @asciify/encoder; FONT_PRESETS stays @/lib/constants
- `apps/web/src/components/export/export-button.tsx` - deltaEncode from @asciify/encoder
- `apps/web/src/stores/editor-store.ts` - CharacterSetName, ColorMode, DitherMode, DEFAULT_SETTINGS from @asciify/encoder; ExportFormat, ExportLoop, PlaybackState stay @/lib/constants
- `apps/web/src/lib/ascii-engine.ts` - DELETED
- `apps/web/src/lib/delta-encoder.ts` - DELETED
- `apps/web/src/lib/rle.ts` - DELETED
- `pnpm-lock.yaml` - Updated with @asciify/encoder workspace link

## Decisions Made

- ascii-worker.ts WORKER_CODE inlined string left unchanged per D-08 — it runs in a Worker context without module resolution, so it must remain self-contained vanilla JS
- convertFrameToAscii call site migrated to options-object pattern to match the updated encoder API from Plan 01

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- apps/web fully decoupled from local encoder source — @asciify/encoder is sole source of truth
- Ready for Plan 03 (encoder tests or next phase work)
- No regressions: `pnpm --filter web typecheck` exits 0

---
*Phase: 02-encoder-package*
*Completed: 2026-04-02*
