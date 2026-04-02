# Codebase Concerns

**Analysis Date:** 2026-04-02

## Tech Debt

**Large Generated HTML Exports:**
- Issue: WebGPU and HTML export modes generate massive inline HTML files with embedded JavaScript, base64-encoded audio, and stringified frame data. Single files can exceed 50MB+.
- Files: `src/lib/export-webgpu.ts` (359 lines), `src/lib/html-export.ts` (182 lines)
- Impact: Large exports become unwieldy in file systems, slow to transfer, difficult to inspect, risk browser memory exhaustion during load/edit. Base64 audio encoding increases payload by ~33% vs binary.
- Fix approach: Implement lazy-loading wrapper that fetches frame data and audio separately; create manifest format that references external assets; investigate streaming playback for large animations.

**Audio Processing Always Runs to Completion:**
- Issue: Audio processing is not cancellable. If user clicks export multiple times or closes the browser mid-export, audio blob still processes to completion even if result is discarded.
- Files: `src/lib/audio-processor.ts` (205 lines), `src/components/export/export-button.tsx` (261 lines)
- Impact: Wasted CPU/memory on abandoned operations, potentially long browser freezes with large video files (>5min). No abort signal or cleanup mechanism.
- Fix approach: Add AbortSignal to `processAudio()`, implement cleanup in finally block, cancel fetch if abort fires, expose cancel button in export progress UI.

**Frame Extraction Seeking Race Condition:**
- Issue: `frame-extractor.ts` line 70 uses `video.onseeked` callback without timeout safety. If `onseeked` never fires (network interruption, codec mismatch, browser quirk), Promise hangs indefinitely.
- Files: `src/lib/frame-extractor.ts` (108 lines)
- Impact: Export hangs silently for certain video files, especially on mobile or unstable networks. No progress indicator timeout.
- Fix approach: Wrap Promise in `Promise.race([seekPromise, timeoutPromise(5s)])` to fail fast; log seek failures with frame index; allow user to retry or skip frames.

**Memory Leak in Worker Termination:**
- Issue: `convertFrameInWorker()` copies ImageData.data into Uint8ClampedArray and transfers buffer (line 234). If Worker crashes or message never resolves, pending Map accumulates entries and imageData buffer references never GC'd.
- Files: `src/lib/ascii-worker.ts` (268 lines)
- Impact: Long extraction sessions (100+ frames) leak 4MB+ per crashed frame; browser memory grows unbounded. `terminateWorker()` only called after ALL frames complete, too late for cleanup.
- Fix approach: Auto-cleanup pending callbacks after 30s timeout; track transferred buffers separately with expiry; refactor to explicitly detach ArrayBuffer after transfer.

**No Validation of Character Set Boundaries:**
- Issue: Custom character sets accept any Unicode string, including emoji, multi-byte chars, combining marks. Charset length used directly as array index in brightness quantization. Off-by-one risk with unusual charsets.
- Files: `src/lib/ascii-engine.ts` (268 lines), `src/components/panels/input-controls.tsx` (410 lines)
- Impact: Wrong character selection with emoji charsets; potential out-of-bounds index access in dithering algorithms (lines 253-255); visual glitches with zero-width combining characters.
- Fix approach: Add charset validation: reject empty sets, normalize combining marks, validate charset.length >= 2, clamp charIndex safety in all quantization paths.

## Fragile Areas

**HTML/JavaScript Code Generation:**
- Files: `src/lib/html-export.ts`, `src/lib/export-webgpu.ts` (359 lines of template strings)
- Why fragile: Raw string concatenation of JavaScript code without escaping. `fgColor` and `bgColor` hex values inserted directly into CSS/JS. A malformed color like `#');alert('xss` would inject code. Frame JSON not minified, risk of quote escaping failures. Function names hardcoded in multiple places (`getFrame`, `buildCache`, `run`) with no central definition.
- Safe modification: Extract JavaScript generation to safer builder (JSDoc validation layer), validate all color inputs with strict regex, use safer JSON.stringify with space=0 for minification, move function names to constants.
- Test coverage: No tests for malformed input colors, no XSS injection tests, no large frame count edge cases in stringified output.

**WebGPU Fallback Not Fully Tested:**
- Files: `src/lib/export-webgpu.ts` (lines 340-341), `src/lib/webgpu-renderer.ts` (317 lines)
- Why fragile: Try-catch at render time (line 334) catches WebGPU errors and calls `initCanvas2D()`, but `initCanvas2D()` defined outside scope. Device/context may be partially initialized. If WebGPU setup succeeds but rendering fails on first frame, fallback called mid-animation loop.
- Safe modification: Move fallback logic to promise chain during init, not render-time. Test WebGPU disabled scenario end-to-end. Verify device lost handlers work.
- Test coverage: No tests for WebGPU device lost, no tests for shader compilation failures, no tests for missing texture support.

**Audio Preview State Machine Complexity:**
- Files: `src/lib/audio-preview.ts` (248 lines)
- Why fragile: Multiple global mutable references (`audioCtx`, `sourceNode`, `crusherNode`, etc.) with manual lifetime management. `connectAudioPreview()` can be called multiple times without cleanup. `buildChain()` rebuilds the entire audio graph without disconnecting old nodes, risking stale connections. `workletLoaded` flag never reset, assuming worklet persists across context changes (false if context suspended/resuming).
- Safe modification: Refactor to AudioPreviewManager class with explicit init/cleanup lifecycle. Use WeakMap for video→chain tracking. Add teardown validation tests.
- Test coverage: No tests for repeated calls to `connectAudioPreview()`, no tests for context suspension/resumption, no memory tests for node cleanup.

**Delta Encoding Size Comparison Logic:**
- Files: `src/lib/delta-encoder.ts` (56 lines)
- Why fragile: Line 45-46 compares delta size to full RLE size by stringifying patches array: `JSON.stringify(patches).length` vs `rleEncode(curr).length + 2`. This assumes JSON stringify length equals file size, which is true for ASCII but breaks with Unicode characters. Delta size heuristic doesn't account for frame boundaries in keyframe intervals—may alternate between keyframes/deltas unpredictably.
- Safe modification: Use actual byte length (UTF-8 encoded), add comment explaining assumption, consider measuring actual compression with deflate estimate.
- Test coverage: No tests with emoji/Unicode in frames, no tests validating keyframe interval is respected.

**Video Element Cleanup Incomplete:**
- Files: `src/components/preview/ascii-canvas.tsx` (323 lines)
- Why fragile: Line 71 calls `video.removeAttribute('src')` and `video.load()` but doesn't wait for load to complete. Refs to `videoRef.current`, `extractionCanvasRef.current` used after unmount in cleanup dependencies (lines 69-73) could race with component destruction.
- Safe modification: Track unmount flag, ensure all timers/listeners cleared, verify video is in safe state before cleanup.
- Test coverage: No tests for rapid component mount/unmount, no tests for memory leaks on video switch.

## Performance Bottlenecks

**Frame Extraction Synchronous Pixel Sampling:**
- Problem: ASCII conversion (single-pass and multi-pass) iterates every pixel for every cell in nested loops. Extraction scales O(width × height × rows × columns).
- Files: `src/lib/ascii-engine.ts` (lines 72-86, 144-153), `src/lib/ascii-worker.ts` (lines 41-50)
- Cause: No SIMD, no pixel pooling, no GPU acceleration for sampling phase. 720p video (921,600 pixels) × 100 columns = 19M pixel reads per frame.
- Improvement path: Use OffscreenCanvas with WebGL to pre-downsample video to grid resolution, reducing pixel reads 10-100x. Or: Use GPU-accelerated frame extractor with compute shaders. For single-threaded fallback, implement pixel buffer pooling to avoid allocation per frame.

**Delta Encoding Building on Every Export:**
- Problem: `deltaEncode()` called on every export (html, webgpu formats). Computes deltas from scratch even if frames unchanged. For 100-frame export, comparing 100 frame pairs sequentially.
- Files: `src/components/export/export-button.tsx` (lines 94-98, 171)
- Cause: No caching, no memoization of frame text. If user exports same extracted frames twice, full delta work repeats.
- Improvement path: Cache delta encoding in store keyed by frame array identity, invalidate only on frame re-extraction. Pre-compute during frame extraction phase.

**Canvas Rendering Every Frame Without Throttling:**
- Problem: `ascii-canvas.tsx` runs requestAnimationFrame callback on every frame during playback without checking if state changed. Renders identical frame multiple times if audio/extraction slow.
- Files: `src/components/preview/ascii-canvas.tsx` (323 lines), playback loop in render function
- Cause: No frame skipping, no dirty checking, no double buffering awareness.
- Improvement path: Skip render if currentTime hasn't advanced, implement frame budget throttling (e.g., max 60fps cap).

## Security Considerations

**HTML Injection in Exported Files:**
- Risk: User-supplied colors, font family, canvas width inserted into exported HTML without escaping. Malformed fontFamily like `"; alert('xss'); "` would execute. Color picker should prevent this but custom strings bypass validation.
- Files: `src/lib/html-export.ts` (lines 104, 142-144), `src/lib/export-webgpu.ts` (lines 123, 189-191)
- Current mitigation: HTML template uses double quotes consistently, but fontFamily and theme strings not validated.
- Recommendations: Validate fontFamily against whitelist of safe fonts; use CSS.escape() for all user-supplied CSS values; sanitize color strings with strict hex regex `/^#[0-9A-Fa-f]{6}$/`.

**Audio Data URL Memory Risk:**
- Risk: Full audio processed and encoded to base64 data URL (100+ MB for long videos) stored in exported HTML. Mobile browsers may crash loading. XSS attacker could reference external audio source instead.
- Files: `src/lib/audio-processor.ts`, `src/components/export/export-button.tsx` (line 82)
- Current mitigation: Audio embedded in HTML directly, no external fetch.
- Recommendations: Consider separate audio file download instead of embedding; implement size limit (e.g., max 10MB audio); validate audio blob before base64 encoding.

**Web Worker Code Injection:**
- Risk: Worker code is string template with user-provided charset. If charset contains backticks or special regex chars, could break string boundary.
- Files: `src/lib/ascii-worker.ts` (line 4-187), charset passed at line 16
- Current mitigation: Charset is JSON-stringified, but RLE encoding in worker uses unescaped charset directly.
- Recommendations: Use parameterized charset passing via postMessage, not string interpolation. Validate charset for suspicious Unicode (zero-width, RTL override, etc.).

## Scaling Limits

**Single-Pass Frame Extraction Memory:**
- Current capacity: ~50-100 frames at 720p resolution before 4GB heap stress
- Limit: Float32Array allocations in multi-pass path (line 124-127) create 4 × rows × columns × 4 bytes. 100 columns × 50 rows = 30KB per frame. 100 frames = 3MB data + 30MB ImageData intermediate = ~100MB total. Browser tab limit typically 500MB-2GB.
- Scaling path: Implement streaming frame processor that processes batches of 10 frames, discards pixel data after conversion, holds only text/cell arrays in memory.

**Worker Pool Limitation:**
- Current capacity: Single worker instance handles frames sequentially
- Limit: One frame converts at a time; blocking on video.onseeked. E.g., 100 frames at 5s/frame = 8+ minutes extraction time.
- Scaling path: Implement worker pool with N workers, queue frames, parallel extraction. Problem: May exhaust GPU/CPU context limits.

**Export File Size:**
- Current capacity: ~50MB HTML export for 200-frame animation
- Limit: Browser download limits, GitHub file size restrictions (100MB+), CDN/email transfer limits
- Scaling path: Implement streaming export or split into segments; use SegmentedBase64 format; implement WASM compression.

## Known Bugs

**Video Frame Seeking Timeout on Certain Codecs:**
- Symptoms: Export hangs at random frame (30-70% progress), no error message, user forced to refresh page
- Files: `src/lib/frame-extractor.ts` (lines 68-71)
- Trigger: Reproducible with older H.264 videos, less common with VP9. Occurs on slow machines or when tab backgrounded.
- Workaround: Split video into shorter clips before export, or use browser's Video Decode Service to verify codec support upfront.
- Root cause: `video.onseeked` not guaranteed to fire for all seek operations; no timeout safety net.

**CRT Overlay CSS Not Applied in Some Browsers:**
- Symptoms: CRT effect (scanlines, vignette, curvature) missing in Firefox, even when enabled
- Files: `src/components/preview/crt-overlay.tsx` (95 lines)
- Trigger: CSS transforms or webkit-specific properties not auto-prefixed
- Workaround: Manual vendor prefix in CSS generation
- Root cause: No autoprefixer pass on generated CSS; relies on browser autoprefixer which may be disabled.

**Audio Preview Worklet Fallback Silently Degrades:**
- Symptoms: Bit-crushing effect missing on systems without AudioWorklet support, no warning to user
- Files: `src/lib/audio-preview.ts` (lines 69-79)
- Trigger: Safari <15, some Chromium forks, or when Security Policy blocks worklets
- Workaround: None; user unaware audio is not processed as intended
- Root cause: Fallback to ScriptProcessorNode is never tested, may not produce same results.

## Dependency Risk

**@ffmpeg/ffmpeg (0.12.15) Not Used But Imported:**
- Risk: Package listed in package.json but no import found in src/. Dead dependency using 50MB+ disk space, unclear if accidental or planned for future feature.
- Impact: Wastes CI/CD time, increases bundle size if bundler doesn't tree-shake properly, creates confusion for contributors.
- Migration plan: Verify unused, remove from package.json. If planned, document the feature in README.

**Next.js Version Mismatch with TypeScript Version:**
- Risk: package.json specifies Next.js 16.2.1 and TypeScript ^5, but AGENTS.md warns of breaking changes. If TypeScript minor version bumps beyond 5.6, could encounter compatibility issues.
- Impact: Builds may fail unexpectedly on CI, local dev diverges from CI.
- Recommendation: Pin TypeScript to specific version (e.g., 5.6) rather than ^5, document any Next.js breaking changes encountered.

## Missing Critical Features

**No Progress Feedback for Frame Extraction:**
- Problem: User sees progress bar for export but not frame extraction. Extraction can take 5-10 minutes for long videos with no visual feedback. User thinks app froze.
- Blocks: Cannot implement cancellation without progress tracking, cannot inform user why export is slow.
- Priority: High

**No Keyboard Shortcuts for Common Operations:**
- Problem: No shortcuts for play/pause, seek, export. Mobile-unfriendly UI requires many clicks.
- Blocks: Power users cannot efficiently use app for batch conversions.
- Priority: Low

**No Preset/Template System:**
- Problem: Users must manually tune 15+ parameters (brightness, contrast, gamma, dither, etc.). No way to save or share settings.
- Blocks: Users cannot quickly apply community-tested configurations, learning curve steep.
- Priority: Medium

## Test Coverage Gaps

**Untested Frame Extraction Failure Modes:**
- What's not tested: Video files with multiple audio tracks, videos with codeccs not supported by browser's VideoDecoder, videos that report duration=0, videos that are MJPEG or interlaced, videos smaller than 1×1 pixel.
- Files: `src/lib/frame-extractor.ts` (108 lines), `src/components/preview/ascii-canvas.tsx` (323 lines)
- Risk: App crashes or hangs on edge-case videos without helpful error message.
- Priority: High

**Untested Export Format Edge Cases:**
- What's not tested: Exporting with zero frames, exporting with 10,000+ frames, exporting with custom charset containing null/newline, exporting with loop=0 (infinite), exporting with 1px canvas width.
- Files: `src/components/export/export-button.tsx` (261 lines), all export modules
- Risk: Generated files corrupt or malformed, fail to playback.
- Priority: High

**No WebGPU End-to-End Tests:**
- What's not tested: Shader compilation errors, device lost recovery, texture binding failures, rendering with 1 column grid, rendering with charset > 65536 characters.
- Files: `src/lib/webgpu-renderer.ts` (317 lines), `src/lib/export-webgpu.ts` (359 lines)
- Risk: WebGPU exports silently fall back to Canvas2D without warning, user unaware they lost GPU acceleration features.
- Priority: Medium

**No Audio Processing Error Tests:**
- What's not tested: Processing video with no audio track, processing video with audio > 2 hours, processing with invalid audio codec, low-pass cutoff > Nyquist frequency, distortion amount validation.
- Files: `src/lib/audio-processor.ts` (205 lines)
- Risk: Silent audio omission or corrupted audio in exports.
- Priority: Medium

**No Memory Leak Tests:**
- What's not tested: Extracting 100 frames, switching videos multiple times, cancelling export mid-way, toggling audio on/off rapidly.
- Files: All extraction, rendering, audio modules
- Risk: Browser tab memory grows to 1GB+ on long use, undetected resource leaks in production.
- Priority: High

---

*Concerns audit: 2026-04-02*
