---
phase: 02-encoder-package
plan: 01
subsystem: encoder
tags: [package-extraction, tsup, build, api-refactor, player-data]
dependency_graph:
  requires: []
  provides: [packages/encoder/dist/index.js, packages/encoder/dist/index.cjs, packages/encoder/dist/index.d.ts]
  affects: [apps/web/src/lib/constants.ts]
tech_stack:
  added: [tsup@8.5.1, vitest@4.1.2]
  patterns: [options-object API, dual ESM+CJS package, tsup build pipeline]
key_files:
  created:
    - packages/encoder/package.json
    - packages/encoder/tsup.config.ts
    - packages/encoder/vitest.config.ts
    - packages/encoder/src/constants.ts
    - packages/encoder/src/rle.ts
    - packages/encoder/src/delta-encoder.ts
    - packages/encoder/src/ascii-engine.ts
    - packages/encoder/src/player-data.ts
    - packages/encoder/src/index.ts
  modified:
    - apps/web/src/lib/constants.ts
decisions:
  - "@asciify/encoder builds to ESM + CJS + types via tsup with dts:true and format:['esm','cjs']"
  - "convertFrameToAscii uses ConvertOptions options-object pattern per D-01; all fields optional except columns and charset"
  - "AsciiPlayerData canonical format defined with version:1 discriminant; compressPlayerData uses deltaEncode for production use"
  - "apps/web/src/lib/constants.ts trimmed to app-only types; encoder types live exclusively in packages/encoder/src/constants.ts"
metrics:
  duration: 149s
  completed_date: "2026-04-02"
  tasks_completed: 2
  files_changed: 10
---

# Phase 2 Plan 1: Encoder Package Scaffolding and Source Extraction Summary

One-liner: `@asciify/encoder` package wired with tsup dual-build (ESM + CJS + .d.ts), source files extracted from `apps/web`, `convertFrameToAscii` refactored to options-object pattern, and `AsciiPlayerData` canonical format defined.

## Tasks Completed

| # | Name | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Setup package tooling, move source files, split constants | fb7043a | packages/encoder/package.json, tsup.config.ts, vitest.config.ts, src/constants.ts, src/rle.ts, src/delta-encoder.ts, apps/web/src/lib/constants.ts |
| 2 | Refactor convertFrameToAscii API, create player-data format, write barrel exports, verify build | 11e621e | packages/encoder/src/ascii-engine.ts, src/player-data.ts, src/index.ts |

## What Was Built

The `@asciify/encoder` package now has all source files, complete build tooling, and a working dist output:

- **packages/encoder/package.json** — Updated from Phase 1 stub (`"main":"./src/index.ts"`) to full exports map with `dist/` paths, added `tsup` and `vitest` dev dependencies, and `build`/`test` scripts.
- **packages/encoder/tsup.config.ts** — tsup configuration producing ESM (`dist/index.js`), CJS (`dist/index.cjs`), and type declarations (`dist/index.d.ts`, `dist/index.d.cts`) from `src/index.ts`.
- **packages/encoder/vitest.config.ts** — vitest in `node` environment for browser-free unit testing (D-10).
- **packages/encoder/src/constants.ts** — Encoder-only constants: `CHARACTER_SETS`, `DEFAULT_SETTINGS`, `ColorMode`, `DitherMode`, `CharacterSetName`.
- **packages/encoder/src/rle.ts** — Exact copy of `apps/web/src/lib/rle.ts` (zero-dependency, self-contained).
- **packages/encoder/src/delta-encoder.ts** — Copy of `apps/web/src/lib/delta-encoder.ts` with import fixed from `@/lib/rle` to `./rle`.
- **packages/encoder/src/ascii-engine.ts** — Moved from `apps/web`, with import fixed (`./constants`), `ConvertOptions` interface added, and function signature refactored to options-object pattern. Multi-pass pipeline (gamma, Sobel, Floyd-Steinberg, Bayer) preserved unchanged.
- **packages/encoder/src/player-data.ts** — New file defining `AsciiPlayerData`, `AsciiPlayerDataCompact`, `AsciiPlayerMetadata` interfaces plus `createPlayerData()` and `compressPlayerData()` serializers.
- **packages/encoder/src/index.ts** — Complete barrel exporting all public functions, types, and constants per D-03.
- **apps/web/src/lib/constants.ts** — Trimmed to app-only types (`PlaybackState`, `ExportFormat`, `ExportLoop`, `EXPORT_FORMAT_LABELS`, `FONT_PRESETS`, `FPS_OPTIONS`).

## Verification Results

- `pnpm --filter @asciify/encoder build` exits 0; produces dist/index.js (10KB), dist/index.cjs (11KB), dist/index.d.ts (3KB)
- `pnpm --filter @asciify/encoder typecheck` passes with no errors
- Original `apps/web/src/lib/ascii-engine.ts`, `delta-encoder.ts`, `rle.ts` still present (Plan 02 handles migration)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all exports are fully implemented. The `src/index.ts` Phase 1 stub (`export {}`) has been replaced with the complete barrel.

## Self-Check: PASSED

Files created:
- FOUND: /Users/ivanmaierg/asciify/packages/encoder/dist/index.js
- FOUND: /Users/ivanmaierg/asciify/packages/encoder/dist/index.cjs
- FOUND: /Users/ivanmaierg/asciify/packages/encoder/dist/index.d.ts
- FOUND: /Users/ivanmaierg/asciify/packages/encoder/src/ascii-engine.ts
- FOUND: /Users/ivanmaierg/asciify/packages/encoder/src/player-data.ts
- FOUND: /Users/ivanmaierg/asciify/packages/encoder/src/index.ts

Commits:
- FOUND: fb7043a (task 1)
- FOUND: 11e621e (task 2)
