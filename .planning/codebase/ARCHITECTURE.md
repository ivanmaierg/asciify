# Architecture

**Analysis Date:** 2026-04-02

## Pattern Overview

**Overall:** Three-tier client-side application with state management, rendering pipeline, and format exporters

**Key Characteristics:**
- Single-page React application (Next.js 16) with client-side processing
- Zustand for centralized reactive state management
- Multi-threaded frame processing using Web Workers
- Plugin-based export format system (HTML, WebGPU, APNG, SVG, ANSI)
- GPU-accelerated rendering when available (WebGPU fallback to canvas)

## Layers

**Presentation Layer (Components):**
- Purpose: User interface for video input, conversion settings, preview, and export
- Location: `src/components/`
- Contains: React components (panels, preview, export, UI primitives)
- Depends on: Zustand store, render libraries, encoding utilities
- Used by: Next.js app layer

**State Management Layer:**
- Purpose: Centralized reactive state for all editor settings, video metadata, and export progress
- Location: `src/stores/editor-store.ts`
- Contains: Zustand store with 70+ state fields and action methods
- Depends on: Constants (default settings)
- Used by: All components

**Processing Layer (Lib):**
- Purpose: Video frame extraction, ASCII conversion, audio processing, and format export
- Location: `src/lib/`
- Contains: Core algorithms and encoding utilities
- Sub-categories:
  - **Frame Processing:** `ascii-engine.ts`, `ascii-worker.ts`, `frame-extractor.ts`
  - **Audio:** `audio-processor.ts`, `audio-preview.ts`
  - **Rendering:** `pretext-renderer.ts`, `webgpu-renderer.ts`, `glyph-atlas.ts`, `measure-char.ts`
  - **Export Formats:** `html-export.ts`, `export-apng.ts`, `export-svg.ts`, `export-webgpu.ts`, `export-ansi.ts`
  - **Encoding:** `delta-encoder.ts`, `rle.ts`, `png-encoder.ts`
- Depends on: Browser APIs (Canvas, WebGL/WebGPU, Web Audio, Workers)
- Used by: Components and export handlers

**Type Definitions:**
- Purpose: TypeScript types and WebGPU type definitions
- Location: `src/types/`

**Configuration Layer:**
- Purpose: Constants, default settings, presets
- Location: `src/lib/constants.ts`

## Data Flow

**Video Input to Preview (Real-time):**

1. User drops/selects video file
2. `InputControls` → `store.setVideoFile()`
3. `AsciiCanvas` creates video element, extracts frame on every `requestAnimationFrame`
4. Extraction canvas scales video (max 720px width)
5. Frame pixels → `convertFrameToAscii()` (single-pass or multi-pass depending on effects)
6. ASCII frame (text + colored cells) → `renderAsciiToCanvas()` with canvas 2D
7. Canvas rendered on screen with optional CRT overlay effects

**Video Export (Batch Processing):**

1. User configures export settings → clicks export button
2. `ExportButton` → `store.setIsExporting(true)`
3. **Phase 1 (Extract Frames):**
   - `extractFrames()` iterates video by seeking to each frame time
   - Extracts to canvas, passes ImageData to Web Worker
   - Worker runs `convertFrameToAscii()` returning `AsciiFrame` (text + cells)
   - Collects all frames in `extracted.frames[]`
4. **Phase 1.5 (Process Audio - if enabled):**
   - `processAudio()` decodes audio from video file
   - Applies trimming, resampling, bit-crushing, low-pass, distortion
   - Encodes as WAV data URL
5. **Phase 2 (Format-Specific Generation):**
   - HTML: `deltaEncode()` RLE-compresses keyframes, generates self-contained HTML with embedded runtime
   - WebGPU: Generates HTML using WebGPU shader-based rendering
   - APNG: `renderAsciiToCanvas()` for each frame → `encodeAPNG()` using PNG encoder
   - SVG: Text elements for each character with per-character coloring
   - ANSI: ANSI escape codes for color, plain text output
6. Format handler writes blob/string → download triggered

**State Management Flow:**

```
Store (Zustand)
├─ Video metadata (duration, dimensions, frameRate)
├─ Conversion settings (columns, charset, brightness, gamma, dither, etc.)
├─ Audio settings (bitDepth, sampleRate, lowPass, distortion)
├─ CRT effects (vignette, scanlines, curvature, roundedCorners)
├─ Export settings (format, fps, loop, canvasWidth, colors)
└─ Playback state (empty|loading|paused|playing, currentTime)

Components subscribe to store slices:
- InputControls: Read settings, dispatch setters
- PreviewPanel: Read playback state, videoUrl
- AsciiCanvas: Read settings + videoUrl, sync audio on changes
- OutputPanel: Read export settings, isExporting, exportProgress
- ExportButton: Read all state via getState() for export

Actions flow: User input → store setter → subscribed components re-render → effects trigger
```

## Key Abstractions

**AsciiFrame:**
- Purpose: Result of converting one image to ASCII art
- Location: `src/lib/ascii-engine.ts`
- Pattern: Value object containing:
  - `text`: Plain text representation (newline-separated characters)
  - `cells`: 2D array of `AsciiCell[][]` with per-character color and brightness
- Usage: Passed through extraction, rendering, and export pipelines

**GlyphAtlas:**
- Purpose: Pre-rendered texture of all characters for efficient GPU rendering
- Location: `src/lib/glyph-atlas.ts`
- Pattern: Factory function that creates a canvas with grid of characters
- Usage: WebGPU renderer uses atlas coordinates instead of rendering text per-frame

**EncodedFrame:**
- Purpose: Optimized representation of frame for export
- Location: `src/lib/delta-encoder.ts`
- Pattern: Union type - either RLE-encoded keyframe string or array of delta patches
- Usage: Reduces HTML export file size via inter-frame compression

**WebGPURenderer:**
- Purpose: GPU-accelerated rendering using WebGPU shaders
- Location: `src/lib/webgpu-renderer.ts`
- Pattern: Class with lifecycle methods (init, render, cleanup)
- Usage: Preview canvas rendering when available; fallback to 2D canvas

**FrameExtractionConfig:**
- Purpose: Configuration object bundling all conversion parameters
- Location: `src/lib/frame-extractor.ts`
- Pattern: Interface passed once to extraction function for consistency
- Usage: Ensures all frames extract with identical settings

## Entry Points

**Next.js Root:**
- Location: `src/app/page.tsx`
- Triggers: Client navigation to `/`
- Responsibilities: Renders `AppShell` component

**App Shell:**
- Location: `src/components/app-shell.tsx`
- Triggers: Initial render on client
- Responsibilities:
  - Three-column layout (input panel | preview | output panel)
  - Mobile banner warning
  - Composes top-level UI structure

**Video Upload:**
- Location: `src/components/preview/video-drop-zone.tsx`
- Triggers: Drag-drop or file input
- Responsibilities: Reads file → `store.setVideoFile()`

**Preview Rendering Loop:**
- Location: `src/components/preview/ascii-canvas.tsx` (useEffect + requestAnimationFrame)
- Triggers: Video URL change, store subscription to settings
- Responsibilities:
  - Maintain video element
  - Extract current frame to canvas
  - Convert frame to ASCII
  - Render to output canvas
  - Sync audio playback

**Export Handler:**
- Location: `src/components/export/export-button.tsx`
- Triggers: User clicks "Export" button
- Responsibilities:
  - Orchestrate multi-phase export pipeline
  - Handle format-specific generators
  - Manage progress/error state
  - Trigger file download

## Error Handling

**Strategy:** Try-catch with user-facing error messages; console logging for debugging

**Patterns:**
- Video load errors: Caught in `extractFrames()`, displayed in export UI
- Worker errors: Implicitly handled via promise rejection (timeout fallback possible)
- Audio decode errors: Caught in `processAudio()`, exports continue without audio
- GPU unavailability: Graceful fallback from WebGPU to canvas 2D in `AsciiCanvas`
- Export errors: Caught in `handleExport()`, stored in local state, displayed to user

## Cross-Cutting Concerns

**Logging:** 
- Console.log scattered in processing functions for debugging
- No structured logging framework

**Validation:**
- Store setters include bounds checking (e.g., trim start/end constraints)
- Component sliders enforce min/max ranges
- No centralized validation layer

**Authentication:**
- Not applicable (client-side only)

**Performance Optimization:**
- Web Workers offload frame conversion to background thread
- Delta encoding reduces HTML export size
- RLE compression for text frames
- WebGPU rendering for real-time preview (when available)
- Extraction canvas scales down to max 720px width
- Multi-pass rendering only when effects (gamma, dither, edges, invert) enabled

---

*Architecture analysis: 2026-04-02*
