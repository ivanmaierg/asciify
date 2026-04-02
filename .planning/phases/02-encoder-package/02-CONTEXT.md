# Phase 2: Encoder Package - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Extract `@asciify/encoder` as a standalone npm package with all ASCII conversion functions, compression utilities, type exports, and a formally specified canonical JSON data format. The app (`apps/web`) switches to importing from `@asciify/encoder` instead of local `src/lib/` files. Worker orchestration stays in the app.

</domain>

<decisions>
## Implementation Decisions

### API Surface Design
- **D-01:** `convertFrameToAscii(imageData, options)` — options object pattern instead of 10 positional params. `ConvertOptions` interface with all conversion parameters.
- **D-02:** All `ConvertOptions` fields have sensible defaults except `columns` and `charset` (required). Defaults match current `DEFAULT_SETTINGS` (gamma=1, ditherMode='none', colorMode='monochrome', etc.).
- **D-03:** Full export surface: core conversion function, compression utilities (`deltaEncode`, `rleEncode`, `rleDecode`), character set presets (`CHARACTER_SETS`, `DEFAULT_SETTINGS`), all types (`AsciiFrame`, `AsciiCell`, `ColorMode`, `DitherMode`, `ConvertOptions`, `DeltaPatch`, `EncodedFrame`), and canonical format helpers (`createPlayerData`, `compressPlayerData`).

### Canonical JSON Data Format
- **D-04:** `AsciiPlayerData` spec with `version` (number), `metadata` (columns, rows, fps, duration, frameCount, colorMode, charset), and `frames[]` (array of `AsciiFrame`). Self-contained — everything needed to play back without the original video.
- **D-05:** Two-layer format: `AsciiPlayerData` (clean, uncompressed) as the canonical spec, plus `AsciiPlayerDataCompact` with delta+RLE compressed frames for production use. Encoder exports `createPlayerData()` and `compressPlayerData()` serializers.

### Code Extraction Strategy
- **D-06:** Split `constants.ts` — encoder-relevant types and presets (ColorMode, DitherMode, CHARACTER_SETS, conversion defaults) move to `packages/encoder/src/`. App-only types (PlaybackState, ExportFormat, ExportLoop) stay in `apps/web`. App imports encoder types from `@asciify/encoder`.
- **D-07:** Move files directly from `apps/web/src/lib/` to `packages/encoder/src/` (ascii-engine.ts, delta-encoder.ts, rle.ts). Update `apps/web` imports to `@asciify/encoder`. One source of truth.
- **D-08:** `ascii-worker.ts` stays in `apps/web` — worker orchestration is app responsibility per project constraints. Worker imports conversion function from `@asciify/encoder`.

### Test Approach
- **D-09:** Assertion-based testing with vitest. Test each color mode, each dither algorithm, RLE round-trips, delta encoding patches. Deterministic and fast.
- **D-10:** Synthetic `ImageData` objects in tests — plain `{ width, height, data: Uint8ClampedArray }`. No browser environment needed; the conversion function only reads these properties.

### Claude's Discretion
- Internal file organization within `packages/encoder/src/` (single file vs multiple modules)
- tsup configuration details (entry points, externals, output formats)
- Exact default values for ConvertOptions (should mirror current DEFAULT_SETTINGS)
- vitest configuration and test file organization
- Whether to add a `validate()` function for AsciiPlayerData

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Source files to extract
- `apps/web/src/lib/ascii-engine.ts` — Core conversion function, AsciiFrame/AsciiCell types, Bayer/Sobel matrices
- `apps/web/src/lib/delta-encoder.ts` — Delta + RLE frame compression, DeltaPatch/EncodedFrame types
- `apps/web/src/lib/rle.ts` — Run-length encode/decode utilities
- `apps/web/src/lib/constants.ts` — CHARACTER_SETS, ColorMode, DitherMode, DEFAULT_SETTINGS (split needed)

### Files that import from extracted modules (need import updates)
- `apps/web/src/lib/ascii-worker.ts` — Imports convertFrameToAscii from ascii-engine
- `apps/web/src/lib/html-export.ts` — Imports deltaEncode from delta-encoder
- `apps/web/src/lib/frame-extractor.ts` — Imports AsciiFrame type from ascii-engine
- `apps/web/src/components/preview/ascii-canvas.ts` — Imports convertFrameToAscii
- `apps/web/src/stores/editor-store.ts` — Imports types from constants

### Encoder package shell (from Phase 1)
- `packages/encoder/package.json` — Existing package shell (needs tsup, vitest, build script)
- `packages/encoder/tsconfig.json` — Existing config (extends tsconfig.base.json)
- `packages/encoder/src/index.ts` — Existing empty entry point

### Project constraints
- `.planning/PROJECT.md` — Browser-only constraint, worker orchestration out of scope for encoder
- `.planning/REQUIREMENTS.md` §Encoder Package — ENC-01 through ENC-08, TEST-01

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ascii-engine.ts`: ~200 lines of mature conversion logic with multi-pass pipeline (gamma, Sobel, Floyd-Steinberg, Bayer). Moves directly to encoder.
- `delta-encoder.ts`: Delta + RLE compression. Clean dependency on `rle.ts` only.
- `rle.ts`: Self-contained 24-line module. Zero dependencies.
- `constants.ts`: Contains both encoder types (ColorMode, DitherMode, CHARACTER_SETS) and app types (PlaybackState, ExportFormat). Needs splitting.

### Established Patterns
- All lib files use named exports (no default exports)
- `@/*` path alias in apps/web maps to `./src/*`
- `@encoder/*` path alias configured in Phase 1 for encoder package
- Package shell already exists with `private: false` and TypeScript configured

### Integration Points
- `ascii-worker.ts` creates an inline Worker that calls `convertFrameToAscii()` — will need to import from `@asciify/encoder` instead
- `html-export.ts` calls `deltaEncode()` — import path changes
- `frame-extractor.ts` references `AsciiFrame` type — import path changes
- `editor-store.ts` imports `ColorMode`, `DitherMode` from constants — will import from `@asciify/encoder`

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-encoder-package*
*Context gathered: 2026-04-02*
