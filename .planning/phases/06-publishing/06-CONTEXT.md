# Phase 6: Publishing - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

**Reduced scope:** Only the demo/playground (PUB-05) is in scope for this execution. The user wants to verify that pretext integration and exports work end-to-end via a live interactive playground. Publishing to npm, CI pipeline, CDN distribution, and changesets are all deferred.

</domain>

<decisions>
## Implementation Decisions

### Demo Site Location
- **D-01:** Demo lives as a `/demo` route in `apps/web` (the existing Next.js app). No new infrastructure — reuses the app that already imports both packages.

### Demo Content
- **D-02:** Full interactive playground — users can drop a video, see it convert via `@asciify/encoder`, and play back via `@asciify/player` with all modes and options configurable live. This validates pretext integration and export pipeline end-to-end.
- **D-03:** Live conversion on page — the encoder runs in-browser to convert video to ASCII, then the player renders the result. No pre-baked sample data.

### Claude's Discretion
- Page layout and UI design for the playground
- Which player options to expose (mode, theme, fps, loop, trigger, charDelay, font)
- How to handle long conversion times (progress indicator)
- Whether to show the raw AsciiPlayerData JSON for debugging
- Export button to test HTML export from the playground

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Player package (what the demo consumes)
- `packages/player/src/index.ts` — public exports: AsciiPlayer, AsciiPlayerElement, registerAsciiPlayer, renderGridFrame, TypewriterReveal, types
- `packages/player/src/types.ts` — AsciiPlayerOptions, RenderMode, TriggerMode, LoopMode, THEMES
- `packages/player/src/web-component.ts` — `<ascii-player>` element attributes

### Encoder package (conversion pipeline)
- `packages/encoder/src/index.ts` — public exports: convertFrameToAscii, createPlayerData, compressPlayerData
- `packages/encoder/src/player-data.ts` — AsciiPlayerData, AsciiPlayerDataCompact formats

### Existing app patterns
- `apps/web/src/components/preview/ascii-canvas.tsx` — existing canvas preview (reference for how video → frames → render works)
- `apps/web/src/components/preview/video-drop-zone.tsx` — existing video input component
- `apps/web/src/lib/frame-extractor.ts` — extractFrames function
- `apps/web/src/stores/editor-store.ts` — Zustand store pattern used in the app

### Requirements
- `.planning/REQUIREMENTS.md` §Publishing & Demo — PUB-05

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `VideoDropZone` component — drag-and-drop video input, already wired
- `extractFrames` — video → canvas frames extraction
- `convertFrameToAscii` — frame → ASCII conversion (from @asciify/encoder)
- `createPlayerData` / `compressPlayerData` — frame assembly into player format
- `AsciiPlayer` / `<ascii-player>` — playback (from @asciify/player)
- `generateExportHtml` — HTML export with embedded player bundle (from Phase 5)

### Established Patterns
- `'use client'` components with Zustand store for state
- Tailwind CSS + shadcn/ui for UI primitives
- Dynamic import for `@asciify/player` (SSR-safe pattern from Phase 5)

### Integration Points
- New `/demo` route in `apps/web/src/app/demo/page.tsx`
- Imports from both `@asciify/encoder` and `@asciify/player` packages

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The key goal is validating that the full pipeline works: video → encoder → player data → player rendering with pretext.

</specifics>

<deferred>
## Deferred Ideas

- **PUB-01:** npm scope claiming — deferred
- **PUB-02:** publint validation — deferred
- **PUB-03:** Changesets for versioning — deferred
- **PUB-04:** npm publishing with correct exports map — deferred
- **PUB-06:** CDN-installable IIFE build — deferred
- **TEST-06:** CI pipeline on GitHub Actions — deferred

All of these are Phase 6 requirements that the user explicitly deferred. They can be picked up in a follow-up execution or a new milestone.

</deferred>

---

*Phase: 06-publishing*
*Context gathered: 2026-04-03*
