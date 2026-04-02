# Phase 2: Encoder Package - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 02-encoder-package
**Areas discussed:** API surface design, Canonical JSON data format, Code extraction strategy, Test approach

---

## API Surface Design

### Function signature

| Option | Description | Selected |
|--------|-------------|----------|
| Options object | convertFrameToAscii(imageData, options) — single config object | ✓ |
| Keep positional args | Keep current 10-param signature as-is | |
| Hybrid approach | imageData + columns positional, rest as options object | |

**User's choice:** Options object
**Notes:** Extensible, self-documenting, matches modern library conventions.

### Export surface

| Option | Description | Selected |
|--------|-------------|----------|
| Compression utilities | deltaEncode(), rleEncode(), rleDecode() | ✓ |
| Character set presets | CHARACTER_SETS, DEFAULT_SETTINGS | ✓ |
| All types | AsciiFrame, AsciiCell, ColorMode, DitherMode, ConvertOptions, etc. | ✓ |
| Canonical format helpers | createPlayerData(), compressPlayerData() | ✓ |

**User's choice:** All four selected (multiSelect)
**Notes:** Full export surface for maximum consumer utility.

### Defaults

| Option | Description | Selected |
|--------|-------------|----------|
| Sensible defaults | All optional except columns and charset | ✓ |
| All required | Consumer must specify every option | |
| Partial defaults | Only visual params get defaults | |

**User's choice:** Sensible defaults
**Notes:** Defaults match current DEFAULT_SETTINGS.

---

## Canonical JSON Data Format

### Top-level structure

| Option | Description | Selected |
|--------|-------------|----------|
| Full frame data + metadata | version, metadata, frames[] — self-contained | ✓ |
| Minimal: frames only | Just version + frames[], metadata external | |
| Two-layer: clean + compressed | Clean spec + separate compressed format | |

**User's choice:** Full frame data + metadata
**Notes:** Self-contained format — everything needed to play back without original video.

### Compression layer

| Option | Description | Selected |
|--------|-------------|----------|
| Both formats | AsciiPlayerData (clean) + AsciiPlayerDataCompact (compressed) | ✓ |
| Always uncompressed | Every frame is full AsciiFrame | |
| Always compressed | Delta+RLE by default | |

**User's choice:** Both formats
**Notes:** Clean spec for inspection/debugging, compact format for production.

---

## Code Extraction Strategy

### Constants handling

| Option | Description | Selected |
|--------|-------------|----------|
| Split constants | Encoder types to package, app types stay in app | ✓ |
| Copy encoder types | Duplicate into encoder, risk drift | |
| Keep all in app | Encoder depends on app — breaks independence | |

**User's choice:** Split constants
**Notes:** App imports encoder types from @asciify/encoder.

### Worker handling

| Option | Description | Selected |
|--------|-------------|----------|
| Leave worker in app | Worker orchestration stays in apps/web | ✓ |
| Include worker utilities | Ship createEncoderWorker() in encoder | |

**User's choice:** Leave worker in app
**Notes:** Per project constraint — encoder = pure functions, app = parallelization.

### Migration approach

| Option | Description | Selected |
|--------|-------------|----------|
| Move and update imports | Move files directly, update imports | ✓ |
| Copy, refactor, then delete | Copy first, safer intermediate step | |

**User's choice:** Move and update imports
**Notes:** One source of truth, clean break.

---

## Test Approach

### Testing strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Assertion-based | Test inputs/outputs with assertions | ✓ |
| Snapshot-based | Snapshot full AsciiFrame output | |
| Both | Assertions for logic + snapshots for integration | |

**User's choice:** Assertion-based
**Notes:** Deterministic and fast for pure functions.

### ImageData in tests

| Option | Description | Selected |
|--------|-------------|----------|
| Synthetic ImageData | Plain { width, height, data } objects | ✓ |
| jsdom + canvas polyfill | Real ImageData via browser polyfill | |
| Happy-dom | Lighter alternative to jsdom | |

**User's choice:** Synthetic ImageData
**Notes:** No browser environment needed — function only reads .width, .height, .data.

---

## Claude's Discretion

- Internal file organization within packages/encoder/src/
- tsup configuration details
- Exact default values for ConvertOptions
- vitest configuration and test file organization
- Whether to add validate() for AsciiPlayerData

## Deferred Ideas

None — discussion stayed within phase scope.
