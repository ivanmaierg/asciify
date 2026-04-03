# Phase 5: App Integration - Research

**Researched:** 2026-04-03
**Domain:** apps/web integration with @asciify/player — live preview migration and HTML export refactor
**Confidence:** HIGH

## Summary

Phase 5 connects the two packages built in earlier phases to the actual application. The work splits into two distinct integration concerns: (1) replacing the internal `pretext-renderer.ts` in the live preview canvas with `AsciiPlayer` from `@asciify/player`, and (2) replacing the hand-rolled JS runtime embedded in `html-export.ts` with the compiled `@asciify/player` IIFE bundle.

The live preview integration is the more architecturally significant change. The current `ascii-canvas.tsx` uses a direct rAF loop that calls `convertFrameToAscii` per frame, then calls `renderAsciiToCanvas` from `pretext-renderer.ts`. Replacing this with `AsciiPlayer` means the player takes ownership of the canvas, the rAF loop, and the rendering calls. The app side retains ownership of video frame extraction, ASCII conversion, and store state. The adapter layer must bridge these two worlds — the player expects `AsciiPlayerData` (full frames), the app produces them one at a time or in batches.

The HTML export integration is more mechanical: instead of the ~150-line inline JS runtime in `html-export.ts`, the new export embeds the compiled `dist/index.global.js` IIFE bundle (currently ~95 KB) and uses the `Asciify.AsciiPlayer` API. The existing delta-encoded `EncodedFrame[]` format must map to `AsciiPlayerDataCompact` for compatibility. Four other export formats (WebGPU, APNG, SVG, ANSI) are not HTML-player-based and will not be affected.

**Primary recommendation:** For the live preview, build a thin React adapter hook that converts the current real-time pipeline output into `AsciiPlayerData` and feeds it to `AsciiPlayer`. For HTML export, read the IIFE bundle from the dist filesystem at build time and inline it into the generated HTML.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| APP-01 | `apps/web` live preview uses `@asciify/player` for canvas rendering | AsciiPlayer ES module API accepts canvas + AsciiPlayerData; adapter pattern needed to bridge from real-time extraction pipeline |
| APP-02 | HTML export embeds compiled `@asciify/player` bundle instead of separate inline runtime | dist/index.global.js exists at ~95 KB; IIFE exposes `Asciify.AsciiPlayer`; build-time inlining via fs.readFileSync in tsup/node context or via dynamic import at export time |
| APP-03 | All existing export formats (HTML, WebGPU, APNG, SVG, ANSI) produce correct output after migration | WebGPU/APNG/SVG/ANSI do not use pretext-renderer or the HTML runtime and require no changes; APNG uses `renderAsciiToCanvas` which must be preserved |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Tech stack**: pnpm + Turborepo + tsup — no npm or yarn
- **Browser-only**: Both packages are browser-only; no Node.js runtime code in packages
- **Pretext bundled**: @chenglou/pretext is inside @asciify/player, not a direct app dependency
- **In-place migration**: Preserve git history; no package renames
- **Named exports only**: No default exports (existing project convention)
- **`'use client'` directive**: All interactive React components require this
- **Import paths**: `@/*` for local app imports, package names for workspace packages
- **Type imports**: Explicit `import type` for type-only imports
- **Single quotes**: String literals use single quotes throughout
- **2-space indent**: Consistent indentation
- **GSD workflow**: All file changes go through a GSD workflow phase plan

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @asciify/player | workspace:* | Canvas animation engine | The package being integrated — provides AsciiPlayer class and IIFE build |
| @asciify/encoder | workspace:* | AsciiFrame types and data format | Already a direct dep of apps/web; provides createPlayerData() |
| React 19 | 19.2.4 | Component framework | Existing app framework |
| Zustand 5 | 5.0.12 | Global state | Existing state management |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next/dynamic | built-in | Dynamic imports for client-only code | If player import must be deferred until browser environment |
| node:fs (build-time) | built-in | Read IIFE bundle content at export generation time | Embedding player bundle in HTML export |

### No New Dependencies Required
The integration uses only packages already in the monorepo. `apps/web` adds `@asciify/player` as a workspace dependency — that is the only package.json change needed.

**Installation:**
```bash
# In apps/web directory
pnpm add @asciify/player@workspace:*
```

## Architecture Patterns

### Current live preview architecture

```
ascii-canvas.tsx (rAF loop owner)
  ├── convertFrameToAscii(imageData, options) → AsciiFrame   [from @asciify/encoder]
  ├── renderAsciiToCanvas(ctx, ...) — Canvas 2D               [from pretext-renderer.ts]
  ├── WebGPURenderer.render(cells)                            [from webgpu-renderer.ts]
  └── video element (HTMLVideoElement) — frame source
```

### Target live preview architecture (APP-01)

```
ascii-canvas.tsx (extraction loop owner)
  ├── convertFrameToAscii(imageData, options) → AsciiFrame   [from @asciify/encoder]
  ├── AsciiPlayer(canvas, data, options)                      [from @asciify/player]
  │     └── renderGridFrame / renderProportionalFrame         [internal to player]
  └── video element (HTMLVideoElement) — frame source
```

### Recommended Project Structure (no changes to layout)
```
apps/web/src/
├── components/preview/
│   └── ascii-canvas.tsx     # modified — swap render call for player API
├── lib/
│   ├── pretext-renderer.ts  # remains for export-apng.ts use
│   ├── html-export.ts       # modified — embed player IIFE bundle
│   └── measure-char.ts      # remains for export-apng.ts use
└── package.json             # add @asciify/player workspace dep
```

### Pattern 1: Live Preview — Batch-on-load Adapter

**What:** Pre-convert all frames on video load; hand the full `AsciiPlayerData` object to AsciiPlayer; let the player drive the rAF loop.

**When to use:** When extraction is fast enough that buffering the full clip is acceptable (existing behavior already does full extraction for export).

**Limitation:** Breaks the real-time per-frame-on-display behavior that makes the current preview interactive. The current preview shows frames live while the user adjusts settings — it calls `convertFrameToAscii` inside the rAF tick for each displayed frame, applying settings at render time. This makes settings sliders feel immediate.

**Example:**
```typescript
// Source: packages/player/src/player.ts — AsciiPlayer constructor
const player = new AsciiPlayer(canvas, playerData, {
  fps: s.exportFps,
  loop: 'forever',
  autoplay: true,
  font: `${s.fontSize}px ${s.fontFamily}, monospace`,
  fgColor: s.foregroundColor,
  bgColor: s.backgroundColor,
  mode: 'grid',
})
await player.ready
player.play()
```

### Pattern 2: Live Preview — Streaming Adapter (Recommended)

**What:** Keep the existing per-frame extraction pipeline (video → imageData → convertFrameToAscii). After each frame is converted, pass the resulting `AsciiFrame` directly to the player's renderer functions rather than to the old `renderAsciiToCanvas`. The app owns the rAF loop; the player provides only the renderer functions.

**When to use:** When settings must apply in real time without re-extracting all frames. This is the design that preserves UX parity with the current implementation.

**How:** Call `renderGridFrame(ctx, frame, charWidth, lineHeight, fgColor, bgColor, colorMode)` directly, imported from `@asciify/player`. The player's renderer functions are pure (ctx, frame, options → void) and can be called outside the player's own rAF loop.

**Example:**
```typescript
// Source: packages/player/src/renderer.ts — renderGridFrame signature
import { renderGridFrame } from '@asciify/player'

// Inside ascii-canvas.tsx renderFrame():
renderGridFrame(dctx, result, charWidth, lineHeight, s.foregroundColor, s.backgroundColor, s.colorMode)
```

**Note:** `renderGridFrame` is NOT currently exported from `packages/player/src/index.ts`. It will need to be added to the barrel export.

### Pattern 3: HTML Export — Bundle Inlining

**What:** Read the compiled IIFE bundle from `packages/player/dist/index.global.js` at export generation time, inline it as a `<script>` block in the generated HTML, then write minimal bootstrap code that creates `new Asciify.AsciiPlayer(canvas, data, options)`.

**When to use:** Always — for APP-02. The IIFE exposes `window.Asciify.AsciiPlayer` (globalName set to `'Asciify'` in tsup.config.ts, avoiding the `AsciiPlayer.AsciiPlayer` collision).

**How to read the bundle:**
The bundle reading must happen in the browser context (apps/web is Next.js client-side). Two approaches:

1. **Build-time embed via Next.js**: Use `next.config.ts` to import the bundle content as a string (via a webpack raw-loader or Next.js asset handling). Then pass it as a module constant.

2. **Runtime fetch + inline**: At export time, `fetch('/player-bundle.js')` from a static asset served by Next.js, then inline the text into the HTML string.

3. **Direct import as string via tsup/esbuild raw**: Since Next.js uses webpack/turbopack, add a webpack rule for `.global.js` to be imported as raw text, then `import playerBundle from '@asciify/player/dist/index.global.js?raw'`.

**Recommended approach:** Copy `dist/index.global.js` into `apps/web/public/` as part of the build pipeline (Turborepo task), then `fetch('/index.global.js')` at export time. Or: import the dist file path and read it at Next.js build time using `fs.readFileSync` inside a `getStaticProps`-style approach — but this is a client component (export button is 'use client').

**Simplest approach that works:** At export time in `export-button.tsx`, do:
```typescript
const bundleResponse = await fetch('/player-bundle.js')
const playerBundleJs = await bundleResponse.text()
```
Where `/player-bundle.js` is served from `apps/web/public/` and is populated by the Turborepo build via a `cp` command in the build pipeline.

**HTML structure with player:**
```html
<script>
/* @asciify/player IIFE bundle */
${playerBundleJs}
</script>
<canvas id="c" width="${canvasWidth}" height="${canvasHeight}"></canvas>
<script>
(function(){
  var data = ${JSON.stringify(playerData)};
  var canvas = document.getElementById('c');
  var player = new Asciify.AsciiPlayer(canvas, data, {
    fps: ${fps},
    loop: ${JSON.stringify(loop)},
    autoplay: ${autoplay},
    font: '${fontSize}px ${fontFamily}, monospace',
    fgColor: '${fgColor}',
    bgColor: '${bgColor}',
  });
  player.ready.then(function(){ /* player.play() is called by autoplay option */ });
})();
</script>
```

### Anti-Patterns to Avoid

- **Wrapping AsciiPlayer in a React component for the preview canvas**: The player manages its own canvas lifecycle and rAF loop. If AsciiPlayer is used for live preview (batch-on-load pattern), it must not be a React child component — it should be held in a ref and managed imperatively.
- **Importing @asciify/player in server components**: The player uses browser APIs (canvas, requestAnimationFrame, document.fonts). It must only be imported in 'use client' files or behind `typeof window !== 'undefined'` guards.
- **Re-reading the IIFE bundle on every export click**: The bundle is ~95 KB and static. Cache the fetched text in module scope after first load.
- **Using the Web Component `<ascii-player>` in the export HTML**: The web component requires custom element registration and a `src` URL. For self-contained exports, use `Asciify.AsciiPlayer` directly with inlined data.
- **Passing `AsciiPlayerDataCompact` frames as raw `EncodedFrame[]`**: The player's `_isCompact()` detection looks at whether the first frame is a string or an array. Wrap frames in the correct `AsciiPlayerDataCompact` shape with a `metadata` object and `version: 1`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Canvas text rendering | Custom char-by-char draw loop | `renderGridFrame` from @asciify/player | Already handles monochrome/colored/monoscale modes with correct cell iteration |
| rAF loop with FPS throttling | Custom timing logic | `AsciiPlayer` / `PlaybackController` | Drift correction, loop modes, pause/resume already implemented |
| Delta frame decoding in exported HTML | Custom buildCache/getFrameText | Player's `_decompressFrames` / compact format detection | Edge cases in delta application already handled |
| Font measurement | `ctx.measureText()` inline | `measureMonospaceChar` (existing util, kept) | Cached, consistent |

**Key insight:** The player package was built specifically to be the render engine. The only justified reason to call renderer functions directly (Pattern 2) is to preserve the real-time settings-feedback loop during live preview. For HTML export, use the player API completely.

## Common Pitfalls

### Pitfall 1: `renderGridFrame` Not Exported
**What goes wrong:** `renderGridFrame`, `renderProportionalFrame`, `renderTypewriterFrame` are in `packages/player/src/renderer.ts` but are NOT exported from `packages/player/src/index.ts`. Importing them will fail with a module resolution error.
**Why it happens:** They were designed as internal rendering utilities called by `AsciiPlayer`, not as public API.
**How to avoid:** Either (a) export them from `index.ts` as part of this phase, or (b) use the batch-on-load pattern so `AsciiPlayer` calls them internally. If Pattern 2 (streaming) is used, add exports to `index.ts` and bump the player package version.
**Warning signs:** TypeScript error `Module '@asciify/player' has no exported member 'renderGridFrame'`.

### Pitfall 2: `AsciiPlayer.ready` Must Await Font Load
**What goes wrong:** Calling `player.play()` before `player.ready` resolves causes rendering before pretext `prepare()` has run — characters appear mis-measured.
**Why it happens:** `_init()` awaits `document.fonts.load(font)` and runs `prepare()` before setting up the playback controller.
**How to avoid:** Always `await player.ready` before calling `play()`, or use `autoplay: true` option which chains `play()` after `ready` internally.

### Pitfall 3: IIFE Bundle Path Must Be Resolved at Build Time
**What goes wrong:** `generateExportHtml` runs in the browser (it's in a 'use client' component). `fs.readFileSync` is not available. If the bundle path is hard-coded as a relative FS path, it will throw at runtime.
**Why it happens:** Next.js does not automatically serve files from package `dist/` directories. Only `public/` is statically served.
**How to avoid:** Add a Turborepo pipeline step that copies `packages/player/dist/index.global.js` to `apps/web/public/player-bundle.js` as part of `apps/web`'s build pipeline. Then fetch from `'/player-bundle.js'` at export time.

### Pitfall 4: Data Format Mismatch Between Old Export and Player
**What goes wrong:** `html-export.ts` passes `EncodedFrame[]` directly. The player expects `AsciiPlayerDataCompact` which is `{ version: 1, metadata: AsciiPlayerMetadata, frames: EncodedFrame[] }`. Passing a bare array will fail `_isCompact()` detection.
**Why it happens:** The old export was hand-rolled with no data format wrapper. The player's format detection checks `data.frames[0]`, not `data` itself.
**How to avoid:** Wrap the encoded frames in a proper `AsciiPlayerDataCompact` object using `createPlayerData()` from `@asciify/encoder` before passing to the player (or construct the wrapper inline in `generateExportHtml`).

### Pitfall 5: WebGPU/APNG Exporters Use `renderAsciiToCanvas` From pretext-renderer.ts
**What goes wrong:** If `pretext-renderer.ts` is deleted or emptied as part of the migration, `export-apng.ts` will break (it directly imports and calls `renderAsciiToCanvas`).
**Why it happens:** The APNG exporter uses the same canvas renderer as the old preview, but the migration targets only the live preview and HTML export.
**How to avoid:** Do NOT delete or modify `pretext-renderer.ts`. It remains in use by `export-apng.ts`. The migration removes it from the live preview hot path only. APP-03 explicitly requires APNG to keep working.

### Pitfall 6: Live Preview Loses Real-Time Settings Response
**What goes wrong:** If the batch-on-load pattern is used (extracting all frames, handing to AsciiPlayer), changing a settings slider (columns, brightness, charset) no longer takes effect until the user re-extracts frames.
**Why it happens:** AsciiPlayer renders pre-computed `AsciiFrame[]` data. Settings that affect conversion happen before the player receives data.
**How to avoid:** Use Pattern 2 (streaming adapter). Keep the real-time extraction loop in `ascii-canvas.tsx` and call renderer functions directly from `@asciify/player` per frame. This maintains the existing UX where sliders update the canvas in real time.

### Pitfall 7: Player Re-initialization on Every Settings Change
**What goes wrong:** If `AsciiPlayer` is constructed in a `useEffect` that reacts to every settings change, a new player instance is created on every slider move — causing canvas flicker and memory leaks if `player.destroy()` is not called.
**Why it happens:** `useEffect` dependency arrays that include all settings would re-run on every change.
**How to avoid:** If using AsciiPlayer for the preview, hold the instance in a ref. Update individual properties rather than recreating the player. Or: use the streaming pattern where AsciiPlayer is not used for live preview at all — renderer functions are stateless.

## Code Examples

### Creating AsciiPlayerData from extracted frames
```typescript
// Source: packages/encoder/src/player-data.ts — createPlayerData()
import { createPlayerData } from '@asciify/encoder'

const playerData = createPlayerData(extracted.frames, {
  columns: s.columns,
  fps: s.exportFps,
  duration: extracted.frames.length / s.exportFps,
  colorMode: s.colorMode,
  charset: getCharset(s.characterSet, s.customCharacters),
})
```

### Creating AsciiPlayerDataCompact from delta-encoded frames
```typescript
// Source: packages/encoder/src/player-data.ts — compressPlayerData()
import { createPlayerData, compressPlayerData } from '@asciify/encoder'

const fullData = createPlayerData(extracted.frames, { ...metadata })
const compactData = compressPlayerData(fullData, keyframeInterval)
// compactData is AsciiPlayerDataCompact — valid PlayerInputData for AsciiPlayer
```

### Using AsciiPlayer for full-clip preview (batch-on-load pattern)
```typescript
// Source: packages/player/src/player.ts — AsciiPlayer constructor
import { AsciiPlayer } from '@asciify/player'

const playerRef = useRef<AsciiPlayer | null>(null)

useEffect(() => {
  if (!canvasRef.current || !playerData) return
  playerRef.current?.destroy()
  const player = new AsciiPlayer(canvasRef.current, playerData, {
    fps: s.fps,
    loop: 'forever',
    autoplay: true,
    font: `${s.fontSize}px ${s.fontFamily}, monospace`,
    fgColor: s.foregroundColor,
    bgColor: s.backgroundColor,
    mode: 'grid',
  })
  playerRef.current = player
  return () => { playerRef.current?.destroy(); playerRef.current = null }
}, [playerData])
```

### Inlining player bundle in HTML export
```typescript
// Fetch from public/ — called once, cached in module
let _playerBundle: string | null = null
async function getPlayerBundle(): Promise<string> {
  if (_playerBundle) return _playerBundle
  const res = await fetch('/player-bundle.js')
  _playerBundle = await res.text()
  return _playerBundle
}

// In generateExportHtml — now async
const playerBundleJs = await getPlayerBundle()
// Inline in HTML:
// <script>${playerBundleJs}</script>
```

### Calling renderGridFrame directly (streaming pattern)
```typescript
// Source: packages/player/src/renderer.ts
// Requires renderGridFrame to be exported from packages/player/src/index.ts first
import { renderGridFrame } from '@asciify/player'

// Inside ascii-canvas.tsx renderFrame():
renderGridFrame(dctx, result, charWidth, lineHeight, s.foregroundColor, s.backgroundColor, s.colorMode)
```

### IIFE global name access
```javascript
// Source: packages/player/tsup.config.ts — globalName: 'Asciify'
// In exported HTML bootstrap script:
var player = new Asciify.AsciiPlayer(canvas, data, options)
await player.ready  // Promise<void>
// autoplay option chains play() after ready automatically
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline hand-rolled JS runtime in HTML export | Embed compiled @asciify/player IIFE | Phase 5 | Export HTML uses the same tested player code as the web app |
| `renderAsciiToCanvas` from pretext-renderer.ts in live preview | `renderGridFrame` from @asciify/player | Phase 5 | Renderer unification — one code path for all rendering |
| Custom delta decode (buildCache/getFrameText) in exported HTML | `AsciiPlayer._decompressFrames` (internal) | Phase 5 | Tested decompression replaces inline JS |

**Deprecated/outdated:**
- The inline `buildCache`/`getFrameText`/`render` JS in `html-export.ts`: replaced by `Asciify.AsciiPlayer` API
- The `renderAsciiToCanvas` call in the live preview: replaced by player renderer functions or full AsciiPlayer instance
- `pretext-renderer.ts` as a live-preview dependency: still needed by `export-apng.ts`; not deleted, just removed from the hot path

## Open Questions

1. **Should the live preview use the streaming adapter pattern or the batch-on-load pattern?**
   - What we know: Streaming (Pattern 2) preserves real-time settings feedback. Batch-on-load (Pattern 1) gives the player full control but breaks immediate slider response.
   - What's unclear: Whether the intent is to preserve the current interactive UX (settings sliders apply instantly) or to accept a less interactive preview in exchange for using the player end-to-end.
   - Recommendation: Use streaming (Pattern 2). Export `renderGridFrame` from `@asciify/player/src/index.ts`. This keeps the current UX and satisfies APP-01 (player is on the hot path) without a disruptive UX regression.

2. **How to get the IIFE bundle content into the browser-side export generator?**
   - What we know: `generateExportHtml` is called from a 'use client' component (export-button.tsx). `fs.readFileSync` is unavailable at runtime.
   - What's unclear: Whether the Turborepo build pipeline already copies player dist files, or if a new pipeline step is needed.
   - Recommendation: Add a Turborepo `web#build` dependency on `player#build` (already implied by `dependsOn: ["^build"]`), then add a `cp` or `copyfiles` step in `apps/web` build to place `packages/player/dist/index.global.js` at `apps/web/public/player-bundle.js`. Fetch at export time with a module-level cache.

3. **Should `generateExportHtml` become async?**
   - What we know: It is currently synchronous. Fetching the bundle requires `async`.
   - What's unclear: Whether there are callers that expect it to be synchronous.
   - Recommendation: Make it `async`. The only caller is `handleExport` in `export-button.tsx` which is already an async function.

4. **Does the colorMode option need to be threaded into AsciiPlayerData metadata for the HTML export?**
   - What we know: `AsciiPlayerMetadata.colorMode` exists. The player reads `data.metadata.colorMode` to set `this._colorMode`. The old HTML export used `colorMode` to decide render style (but the current old runtime only renders monochrome text).
   - What's unclear: Whether the old HTML export actually supported colored output or silently ignored it.
   - Recommendation: The old `html-export.ts` runtime does NOT support colored output (it renders `text` as a whole string with a single `fillStyle`). With the player, colored mode becomes automatic if `AsciiFrame.cells` have color data. Ensure the export pipeline passes `AsciiPlayerData` (full frames, not compact) if colored output is desired, or `AsciiPlayerDataCompact` for monochrome-only.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| pnpm | All workspace operations | Yes | 10.33.0 | — |
| Node.js 24 | Build pipeline | Yes | per .nvmrc | — |
| @asciify/player dist | HTML export bundle inlining | Yes (built) | packages/player/dist/index.global.js exists, ~95 KB | Must rebuild if source changed |
| @asciify/encoder dist | Workspace dep resolution | Yes (built) | packages/encoder/dist/ exists | Must rebuild if source changed |

**No missing dependencies with no fallback.** All required packages are in the workspace and already built.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.x |
| Config file | `packages/player/vitest.config.ts` (for player tests); apps/web has no vitest config yet |
| Quick run command | `pnpm --filter @asciify/player test` |
| Full suite command | `pnpm turbo test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| APP-01 | Live preview renders via @asciify/player renderer | unit / manual | `pnpm --filter @asciify/player test` (renderer exports) | Partial — renderer.test.ts exists but doesn't test export |
| APP-02 | HTML export embeds player bundle and plays back | manual (browser) | Manual browser open of exported HTML | No test file |
| APP-03 | All export formats produce correct output | manual / smoke | Manual export each format | No test file |

### Sampling Rate
- **Per task commit:** `pnpm --filter @asciify/player test`
- **Per wave merge:** `pnpm turbo test`
- **Phase gate:** Full suite green + manual browser test of exported HTML before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/web` does not have a vitest config — export-format integration tests would require one
- [ ] No automated test for `generateExportHtml` output (APP-02 is browser-verification only)
- [ ] APP-03 format correctness is manual-only (APNG/SVG/ANSI/WebGPU have no automated tests)

*(These gaps pre-exist this phase; the scope of Phase 5 is not to create a full app test suite)*

## Sources

### Primary (HIGH confidence)
- Direct source code read of `apps/web/src/lib/pretext-renderer.ts` — current renderer implementation
- Direct source code read of `apps/web/src/components/preview/ascii-canvas.tsx` — full rAF loop and store integration
- Direct source code read of `apps/web/src/lib/html-export.ts` — inline runtime JS and delta decode logic
- Direct source code read of `packages/player/src/player.ts` — AsciiPlayer constructor, _init, _isCompact
- Direct source code read of `packages/player/src/renderer.ts` — renderGridFrame, renderProportionalFrame, renderTypewriterFrame signatures
- Direct source code read of `packages/player/src/index.ts` — current public exports (missing renderer functions)
- Direct source code read of `packages/player/tsup.config.ts` — IIFE config, globalName: 'Asciify'
- Direct source code read of `packages/encoder/src/player-data.ts` — AsciiPlayerData, createPlayerData, compressPlayerData
- `packages/player/dist/index.global.js` — confirmed built, ~95 KB

### Secondary (MEDIUM confidence)
- `apps/web/src/lib/export-apng.ts` — confirmed uses `renderAsciiToCanvas` (APP-03 constraint)
- `apps/web/src/components/export/export-button.tsx` — confirmed all export format handlers

## Metadata

**Confidence breakdown:**
- Current code structure: HIGH — read every relevant file directly
- Integration pattern recommendations: HIGH — based on actual API signatures and code flow
- IIFE bundle inlining approach: MEDIUM — Turborepo + Next.js public/ pattern is well-established but the exact build step needs to be confirmed in practice
- Test gaps: HIGH — confirmed by checking test file inventory

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable codebase, no fast-moving dependencies)
