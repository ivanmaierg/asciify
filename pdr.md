# ASCIIfy — Product Requirements Document

> Convert any video to animated ASCII art. Export a file that runs anywhere.

| | |
|---|---|
| **Status** | Draft — MVP Scope |
| **Version** | v0.1 — March 2026 |
| **Stack** | Next.js · shadcn/ui · Tailwind · @chenglou/pretext · ffmpeg.wasm |
| **Core differentiator** | Exports a self-contained file (HTML / Web Component / ES Module) that plays the ASCII animation anywhere — no dependency on ASCIIfy, no server, no player app |
| **Outputs** | Self-contained HTML · Web Component (.js) · ES Module · MP4 / WebM · GIF |

---

## 1. Vision

ASCIIfy turns any video into an animated ASCII art experience — and then gives you a file you actually own. Not a link back to ASCIIfy. Not a video that requires a special player. A real, self-contained file you drop into any website, share on Discord, open on a USB drive, or embed in a portfolio — and it just works.

Every existing ASCII video tool treats the output as a media file (MP4, GIF) or a JavaScones home. ASCIIfy's primary output is a portable artifact: one file, zero dependencies, runs in any browser, forever.

> **The one-sentence pitch:** ASCIIfy is the only ASCII video tool that exports a self-contained, dependency-free file you can drop into any website or open in any browser — powered by @chenglou/pretext, the hottest new JS library in the ecosystem.

---

## 2. Output Formats — The Core of the Product

This is what makes ASCIIfy different from every existing tool. The export formats are not an afterthought — they are the product. Every decision about the editor flows from making these outputs as good as possible.

---

### 2.1 Self-Contained HTML File *(Primary MVP output)*

A single `.html` file. Open it in Chrome, Firefox, Safari — it plays. No internet connection required. No server. No dependencies. Works offline. Works from a USB drive. Works in Notion embeds, GitHub Pages, Netlify drops.

**What's inside the file:**
- A `<canvas>` element sized to the output dimensions
- All frames encoded as a compact JSON array of strings, inlined in a `<script>` tag
- A tiny vanilla JS player (~2KB) that reads the frame array and draws each frame at the configured FPS using `requestAnimationFrame`
- Optional inline CSS for background color, font, centering
- Zero external requests — 100% self-contained

> **Why this matters:** The user owns the output completely. They can rename it, email it, post it on GitHub, open it 10 years from now. It has no expiry date, no account requirement, no dependency on ASCIIfy existing. This is the web as it was designed to work.

**HTML output controls:**
- Playback FPS (6 / 12 / 24 / 30)
- Loop toggle — loop forever, play once, or play N times
- Autoplay vs click-to-play
- Canvas width in pixels (height auto-calculated from aspect ratio)
- Background color and foreground color baked into the file
- Include/exclude playback controls bar (play/pause/scrub)

> ⚠️ **File size consideration:** At 120 columns, 24fps, 10 seconds, each frame string is ~8KB — roughly 1.9MB uncompressed. The player applies lightweight RLE compression on export. For videos longer than 30 seconds, ASCIIfy recommends the MP4 output instead and displays an estimated file size warning before export.

---

### 2.2 Web Component *(Developer output)*

A single `ascii-player.js` file the user downloads and self-hosts. Drop it into any project — React, Vue, Svelte, plain HTML, Webflow, Framer, WordPress — and use it with a single tag:

```html
<script src="./ascii-player.js"></script>
<ascii-player
  src="./my-ascii-data.json"
  fps="24"
  loop
  width="640"
  theme="green-on-black"
></ascii-player>
```

This is the output that gets developers excited. It is a standard Web Component built with the Custom Elements API — framework-agnostic by definition. The frame data travels as a separate `.json` file referenced by the `src` attribute.

**Why Web Component over a plain script:**
- Works in React, Vue, Angular, Svelte, and plain HTML with zero adapter code
- Encapsulated — the component's styles don't leak into the host page
- Declarative — the usage is one HTML tag, readable by non-developers
- Progressively enhanced — if JS is disabled, the element renders nothing and doesn't break the page

**Web Component output controls:**
- Exposed attributes: `fps`, `loop`, `autoplay`, `width`, `theme`, `controls`
- Data format: minified JSON with RLE-compressed frame strings
- The `ascii-player.js` runtime is versioned and tiny (~4KB gzipped)

---

### 2.3 ES Module *(Developer output)*

For developers who want full programmatic control. Exports a `.js` ES module they import and mount to any canvas they already control in their app.

```js
import { AsciiPlayer } from './ascii-player.esm.js'
import data from './my-ascii-data.json' assert { type: 'json' }

const player = new AsciiPlayer(canvasElement, data, { fps: 24, loop: true })
player.play()
player.pause()
player.seekTo(1.5) // seconds
```

This output targets developers building custom integrations — a portfolio site with a scroll-triggered ASCII animation, a WebGL scene that uses the ASCII data as a texture source, a live-coding demo, etc.

---

### 2.4 Video File (MP4 / WebM)

The ASCII animation baked into a real video file via `ffmpeg.wasm`. Best for uploading to YouTube, Instagram, Twitter/X, or sharing in contexts where a JS file isn't appropriate.

**Video output controls:**
- Format: MP4 (H.264) or WebM (VP9)
- Resolution: 480p / 720p / 1080p / match canvas
- Video bitrate: Low / Medium / High, or manual kbps
- FPS: 12 / 24 / 30 / 60
- Audio: include original audio track or strip it

---

### 2.5 GIF

Universally compatible. Works in Slack, Discord, Twitter/X, email, Notion, GitHub READMEs. No JS required.

**GIF output controls:**
- Width in pixels (height proportional)
- FPS: 6 / 10 / 15
- Loop: infinite or N times
- Duration cap: max 15 seconds recommended — estimated file size shown before export

---

### 2.6 Format Comparison

| Format | File(s) | Works without JS? | Best for |
|---|---|---|---|
| Self-contained HTML | 1 × `.html` | No (needs browser JS) | Portfolios, embeds, sharing, offline use |
| Web Component | `.js` + `.json` | No (needs browser JS) | Dropping into any web project |
| ES Module | `.js` + `.json` | No (needs browser JS) | Devs with full control of their canvas |
| MP4 / WebM | 1 × video | Yes | Social media, YouTube, video contexts |
| GIF | 1 × `.gif` | Yes | Slack, Discord, email, GitHub READMEs |

---

## 3. How the Conversion Works

### 3.1 The per-frame pipeline

1. Video frame is drawn to an offscreen canvas and pixel data extracted via `getImageData()`
2. Frame is divided into a W×H grid of cells — each cell's average brightness (and optionally RGB) is computed
3. Brightness (0–255) is mapped to a character in the selected character set — dense chars for dark pixels, sparse for bright
4. The 2D character grid is joined into a newline-delimited string — one string per frame
5. The character grid string is passed to pretext's `prepareWithSegments()` for one-time glyph measurement and caching; `layoutWithLines()` then computes exact line positions and widths for canvas rendering
6. Lines are drawn to the preview canvas via `ctx.fillText()` using the positions from pretext's layout — one draw call per line, no DOM involvement
7. On export, this loop repeats for every frame to generate the final output artifact

### 3.2 Why pretext is the right layout engine for rendering

The ASCII conversion itself — extracting pixel data, computing brightness, mapping brightness to characters — is entirely custom code and has nothing to do with pretext. pretext enters the picture at step 5: once we have the character grid, we need to measure and lay it out on a canvas accurately and fast.

Every existing ASCII video tool uses a naive canvas loop: call `ctx.fillText()` with a fixed character width and hope the monospace grid lines up. At high densities or with non-standard fonts this breaks — characters overlap, lines misalign, and there's no way to know the actual rendered width without calling `ctx.measureText()` per glyph per frame, which is far too slow for real-time playback.

pretext replaces all of that:

- `prepare()` does the expensive glyph measurement work once — width measurement via canvas, whitespace normalization. The result is a cached handle reused every frame.
- `layoutWithLines()` is pure arithmetic over those cached widths — runs at ~0.09ms per call. Fast enough for 60fps.
- This means ASCIIfy can support non-monospace fonts, emoji character sets, mixed-language characters, and very high density grids — because the layout math is always based on real glyph widths, not assumptions.

pretext is a text measurement and layout library. It does not extract video frames, compute pixel brightness, or map brightness to characters. Its role is making canvas text rendering accurate and fast — replacing manual `ctx.measureText()` calls with a cached, batch-optimized layout pipeline.

> **The differentiation in one sentence:** Other tools hardcode monospace grid math and call `ctx.measureText()` per frame. ASCIIfy uses pretext's cached glyph measurement for layout — which means it renders correctly with any font, any character set, any language, at real-time framerates.

---

## 4. Input Controls

All controls update the canvas preview in real time.

| Control | Range / Options | Notes |
|---|---|---|
| Character set | Minimal · Standard · Dense · Emoji · Custom | Ordered dark→light. Custom: user types their own string. |
| Grid density (columns) | 20 – 240 cols | Rows calculated proportionally. Drives character size. |
| Brightness threshold | 0 – 255 | Clips very dark/bright pixels before character mapping. |
| Contrast boost | 0 – 200% | Amplifies brightness spread to improve character variety. |
| Color mode | Monochrome · Colored · Inverted | Colored: each char inherits source pixel RGB. |
| Foreground color | Color picker | Character color in Monochrome mode. |
| Background color | Color picker | Canvas background. Defaults to black. |
| Font | Monospace presets + Google Fonts | pretext's `prepare()` uses this font string directly. |
| Font size (px) | 6 – 24 px | Drives density in sync with column count. |
| Frame skip | 1 – 8 | Process every Nth source frame. Reduces output size. |

---

## 5. Competitive Landscape

| Tool | Client-side? | HTML export? | Web Component? | Uses pretext? | Open source? |
|---|---|---|---|---|---|
| AsciiCraft | Yes | No | No | No | No (freemium) |
| EZASCII | Yes | No | No | No | No |
| collidingscopes | Yes | No | No | No | Yes (MIT) |
| textarttools | Partial | No | No | No | No |
| promptcache | Partial (CORS req.) | Snippet only | No | No | No |
| **ASCIIfy (this)** | **Yes** | **Yes (full)** | **Yes** | **Yes** | **TBD** |

The HTML export and Web Component output are the gaps no existing tool fills. Every competitor treats the ASCII animation as ephemeral — something you watch on their site or download as a video. ASCIIfy treats it as an artifact you own and deploy.

---

## 6. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Framework | Next.js 16+ (App Router) | Static export, COOP/COEP headers via `next.config.js` for ffmpeg.wasm |
| UI | shadcn/ui + Tailwind CSS | Slider, Select, Tabs, ColorPicker, Tooltip, code preview block |
| Text layout engine | @chenglou/pretext | Cached glyph measurement + line positioning for accurate, fast canvas text rendering |
| Canvas | Native Canvas 2D API | `getImageData()` for frame extraction, `fillText()` for ASCII compositing |
| Video encode | @ffmpeg/ffmpeg (wasm) | MP4 / WebM export from canvas frames |
| GIF encode | gif.js (Web Worker) | GIF palette generation, dithering, frame assembly. Last published 2016 — see note below. |
| State | Zustand | All editor settings, playback state, export config |
| File I/O | Browser File API + Blob URLs | Video import, all export downloads |
| Web Component runtime | Custom Elements API (vanilla) | `ascii-player.js` — zero framework dependency, ships with every export |

> **gif.js tech debt:** gif.js was last published in 2016 and is unmaintained. It works correctly for MVP needs but should be treated as tech debt. Evaluate alternatives in Phase 3: [gifenc](https://github.com/mattdesl/gifenc) (modern, smaller) or [modern-gif](https://github.com/nichenqin/modern-gif) (Web Worker support, active maintenance).

---

## 7. UI Layout

Three-panel layout:

- **Left sidebar** — Input Controls. Character set, grid density, color mode, font, contrast, frame skip. All controls update the preview on change.
- **Center** — Preview canvas + playback bar. Full-width ASCII preview of the current frame. Play / Pause / Scrub. FPS counter. Resolution indicator.
- **Right sidebar** — Output Controls. Format selector at the top (HTML · Web Component · ES Module · MP4 · WebM · GIF). Format-specific settings below. Export button with progress indicator and estimated file size.

When the user selects HTML, Web Component, or ES Module, a code preview drawer opens below the canvas showing a syntax-highlighted snippet of the exported file with a Copy button. This is a key conversion moment — seeing the clean, simple output code is what convinces a developer this is worth using.

---

## 8. Technical Constraints & Risks

| Risk | Impact | Mitigation |
|---|---|---|
| SharedArrayBuffer required for ffmpeg.wasm | High — MP4/WebM export fails without COOP/COEP headers | Set headers in `next.config.js`. Document Vercel / CF Pages config. |
| HTML file size for long videos | Medium — impractically large past ~30s at high density | Show estimated size before export. Cap at 30s with warning. Apply RLE compression. |
| pretext font must be loaded before `prepare()` | Low — chars render in fallback font if font isn't ready | Preload font via FontFace API. Block `prepare()` until `document.fonts.ready`. |
| GIF file size | Medium — large, especially in colored mode | Cap at 15s. Default 10fps and 480px wide. Show estimated size. |
| Safari + SharedArrayBuffer | Medium — Safari requires specific flags | Detect Safari, show banner recommending Chrome/Firefox for video export. HTML, Web Component, GIF still work. |
| CPU load during preview | Medium — high density + colored mode can drop fps | Auto-reduce preview density if fps < 15. Run brightness mapping in a Web Worker. |

### 8.1 Input Constraints

| Constraint | Limit | Rationale |
|---|---|---|
| Max file size | 100 MB | Browser memory limit — larger files risk OOM during frame extraction |
| Max duration | 60 seconds | Warn at 30s for HTML export (file size); hard cap at 60s for all formats |
| Supported formats | MP4, WebM, MOV | Whatever the browser's `<video>` element can decode natively |
| Source resolution | No hard limit | Performance degrades above 1080p source — consider downscaling before processing |

### 8.2 Error Handling Strategy

| Scenario | Behavior |
|---|---|
| Invalid or corrupt video file | Show error toast with message ("This file couldn't be read as video"). Don't crash — return to the import state. |
| Codec not supported by browser | Fall back to browser's native `<video>` decode. If that also fails, show a warning with supported format list. |
| Out of memory on large files | Monitor memory usage during frame extraction. Show warning before processing very long or high-resolution videos. Suggest reducing duration or resolution. |
| Export failure | Retry once with reduced quality. If retry fails, show actionable error message with the specific failure reason. |

### 8.3 Mobile & Responsive Behavior

- The three-panel layout collapses to a single-column stack on viewports below 768px
- Input and output controls move to a collapsible drawer/sheet positioned below the preview canvas
- Touch-friendly controls — larger tap targets on sliders, no hover-dependent interactions
- MVP ships as desktop-only. Show a "Best experienced on desktop" banner on mobile viewports — the app still functions, but layout is not optimized.

### 8.4 Accessibility

- All controls are keyboard-navigable (shadcn/ui provides this by default)
- ARIA labels on the canvas preview element describing the current playback state
- Color contrast in the UI chrome meets WCAG AA (4.5:1 for text, 3:1 for UI components)
- `prefers-reduced-motion` media query respected — when active, preview defaults to paused with manual frame stepping instead of auto-playback

---

## 9. Go-To-Market & Traction Strategy

### 9.1 The pretext timing window

`@chenglou/pretext` launched in late March 2026 and reached 26k GitHub stars within days. There is a narrow window where building a high-quality showcase project on top of the library will get noticed by the author, the library's followers, and the JS ecosystem press. **The window for riding this wave is roughly 4–8 weeks.**

### 9.2 Launch sequence

1. **Ship the HTML export first** — it's the most demonstrable output and the easiest story to tell.
2. **Record a demo video** — a recognizable clip side-by-side with its ASCIIfy output, then show the exported `.html` file being dropped into a blank page and playing. Post to X/Twitter tagging `@chenglou`.
3. **Write a technical post** on dev.to or Hashnode explaining the pretext integration — specifically how `prepareWithSegments()` + `layoutWithLines()` replace the naive `ctx.fillText()` grid loop. This is the post that gets picked up by TLDR, JavaScript Weekly, and Bytes.
4. **Post the Web Component demo** — a single `<ascii-player>` tag working in a CodePen. This is the tweet that developers share.
5. **Open source on GitHub** — the collidingscopes project got traction purely from being open source MIT. Contributors and stars compound.

### 9.3 Target audiences

- **Frontend / fullstack developers** — attracted by the Web Component and ES Module outputs, the pretext integration, and the open source code.
- **Creative developers / generative art community** — ASCII art has a strong following here (see collidingscopes' Instagram traction).
- **Content creators with a lo-fi / retro aesthetic** — the HTML export lets them add an ASCII animation to their portfolio site with one file drop.
- **Portfolio site builders** — the most common use case: "I want something cool and unusual on my personal site." One HTML file solves this completely.

---

## 10. Milestones

### Phase 1 — MVP (ship first)

The minimum viable product. Everything needed to go from video input to a working self-contained HTML file.

1. Project scaffold — Next.js + shadcn/ui + Tailwind + Zustand
2. Video import — File API, draw frames to offscreen canvas, `getImageData()`
3. ASCII conversion engine — brightness → character mapping, grid cell averaging
4. pretext integration — `prepareWithSegments()` + `layoutWithLines()` for canvas rendering
5. Live preview panel — play/pause, scrub bar, real-time ASCII rendering at preview quality
6. Input controls panel — all conversion knobs wired to live preview
7. Self-contained HTML export — frame serialization, RLE compression, inline player, download
8. Code preview drawer — syntax-highlighted output snippet with Copy button

### Phase 2 — Developer Outputs

The outputs that get developers excited. Extends the export pipeline to produce reusable components and modules.

9. Web Component export — `ascii-player.js` + `data.json` download pair
10. ES Module export — programmatic API, mountable to any canvas
11. Output controls panel — format selector + per-format settings + file size estimate

### Phase 3 — Media Outputs

Video and GIF export for social media and non-web contexts. Requires COOP/COEP headers for ffmpeg.wasm.

12. MP4 / WebM export — ffmpeg.wasm frame pipe, encode, download (requires COOP/COEP headers)
13. GIF export — gif.js, palette, download
14. Deploy to Vercel with COOP/COEP headers. Open source on GitHub.

---

## 11. Success Criteria

- The exported self-contained HTML file opens and plays correctly when double-clicked locally — no server, no internet connection.
- The exported Web Component works when dropped into a blank HTML file with a single `<script>` tag.
- The exported MP4 plays in VLC, QuickTime, and Chrome's native video player.
- The exported GIF plays correctly in Slack, Discord, and GitHub README previews.
- The DevTools Network tab shows zero backend requests during the entire session.
- The canvas preview maintains >= 20fps during playback at standard density on a modern laptop.
- The app loads and functions on Chrome and Firefox desktop without any install or plugin.
- At least one tweet about the project is retweeted by `@chenglou` or a JS ecosystem newsletter within 2 weeks of launch.
