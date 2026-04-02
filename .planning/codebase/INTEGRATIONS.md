# External Integrations

**Analysis Date:** 2026-04-02

## APIs & External Services

**Video Processing:**
- Web Video API (browser native) - HTMLVideoElement for frame extraction from video files
  - Implementation: `src/lib/frame-extractor.ts` uses `document.createElement('video')` to load and scrub video
  - Supports: MP4, WebM, Ogg, and other browser-supported video formats

**Font Services:**
- Google Fonts API - Dynamic font loading
  - Implementation: `src/app/layout.tsx` imports `Geist` and `Geist_Mono` from `next/font/google`
  - Fonts: Geist sans-serif and Geist monospace with CSS variables `--font-geist-sans`, `--font-geist-mono`

**GPU Acceleration (Optional):**
- WebGPU API (browser native) - GPU-accelerated ASCII rendering
  - Implementation: `src/lib/webgpu-renderer.ts` and `src/lib/export-webgpu.ts`
  - Type definitions: `src/types/webgpu.d.ts`
  - Fallback: Canvas 2D when WebGPU unavailable

## Data Storage

**Databases:**
- None - Fully client-side application

**File Storage:**
- Local filesystem only (via File API and Blob downloads)
- Implementation: `src/components/export/export-button.tsx` uses `URL.createObjectURL()` and `<a>` element downloads
- User-selected video files handled via File input (not persisted)

**Caching:**
- Browser localStorage - Not detected in codebase
- IndexedDB - Not detected in codebase
- In-memory state: Zustand store in `src/stores/editor-store.ts`

**Exported Media:**
- Multiple formats generated as Blobs and downloaded:
  - HTML (with embedded Canvas2D animation)
  - WebGPU HTML (with GPU-accelerated playback)
  - APNG (Animated PNG) - via `src/lib/export-apng.ts`
  - SVG (Scalable Vector Graphics) - via `src/lib/export-svg.ts`
  - ANSI (Shell script) - via `src/lib/export-ansi.ts`

## Authentication & Identity

**Auth Provider:**
- None - No authentication required
- Fully public, client-side application

## Monitoring & Observability

**Error Tracking:**
- None detected

**Logs:**
- console.warn() for non-critical issues
  - Implementation: `src/components/export/export-button.tsx` logs audio processing failures
- No persistent logging

## CI/CD & Deployment

**Hosting:**
- Not configured in codebase (can be deployed as static Next.js export)
- Suitable for: Vercel, Netlify, GitHub Pages, or any static host

**CI Pipeline:**
- None detected in codebase

## Environment Configuration

**Required env vars:**
- None detected - fully client-side, no backend configuration needed

**Optional env vars:**
- `.env.local` file support (standard Next.js, not used)
- No secrets or credentials required

**Environment Detection:**
- Next.js automatically injects build-time variables via `next-env.d.ts`

## Web APIs Used (No External Integration)

**Audio Processing:**
- Web Audio API (`AudioContext`) - Decode and process audio from video
  - Implementation: `src/lib/audio-processor.ts`
  - Operations: resampling, bit-crushing, low-pass filtering, distortion
  - Output: WAV format encoded locally

**Media APIs:**
- Canvas 2D Context - Render ASCII frames to images
- Canvas methods: `getImageData()`, `drawImage()`, context properties
  - Implementation: `src/lib/frame-extractor.ts`, `src/lib/export-apng.ts`, `src/lib/export-svg.ts`

**File Handling:**
- File API - Read user-uploaded video files
  - Implementation: `src/stores/editor-store.ts` stores File object
  - Used by: `src/lib/audio-processor.ts` for direct arrayBuffer access

**Blob & URL APIs:**
- Blob - Create binary output for exports
- URL.createObjectURL() / URL.revokeObjectURL() - Generate download links
  - Implementation: `src/components/export/export-button.tsx`

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Deprecated/Unused Dependencies

**Listed but not integrated:**
- @ffmpeg/ffmpeg 0.12.15 - No FFmpeg imports found in source
- @ffmpeg/util 0.12.2 - No FFmpeg imports found in source
- gif.js 0.2.0 - No GIF.js imports found in source; GIF export not implemented

These packages may be remnants from earlier development or intended for future features.

## CORS & Cross-Origin Considerations

**Video Loading:**
- `video.crossOrigin = 'anonymous'` set in frame extraction
  - Implementation: `src/lib/frame-extractor.ts`
  - Allows loading cross-origin videos with proper CORS headers
  - Fallback: Videos uploaded directly as Files bypass CORS

**Canvas Taint:**
- Canvas 2D operations on cross-origin video require CORS headers to export images
- Mitigation: Uploaded files and anonymous CORS video sources handled safely

---

*Integration audit: 2026-04-02*
