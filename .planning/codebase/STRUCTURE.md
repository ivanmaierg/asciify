# Codebase Structure

**Analysis Date:** 2026-04-02

## Directory Layout

```
/Users/ivanmaierg/asciify/
├── src/                           # Source code (TypeScript/React)
│   ├── app/                       # Next.js app router (client-side)
│   │   ├── layout.tsx            # Root layout, global styles
│   │   └── page.tsx              # Home page, renders AppShell
│   ├── components/               # React components (99% 'use client')
│   │   ├── app-shell.tsx         # Top-level layout: 3-column grid
│   │   ├── export/               # Export format UI & controls
│   │   │   ├── code-preview.tsx
│   │   │   ├── export-button.tsx
│   │   │   ├── export-settings.tsx
│   │   │   └── format-selector.tsx
│   │   ├── panels/               # Main UI panels
│   │   │   ├── input-controls.tsx   # Left sidebar: conversion settings
│   │   │   ├── output-panel.tsx     # Right sidebar: export controls
│   │   │   └── preview-panel.tsx    # Center: video preview + playback
│   │   ├── preview/              # Preview rendering & interaction
│   │   │   ├── ascii-canvas.tsx  # Main rendering loop, video extraction
│   │   │   ├── crt-overlay.tsx   # CRT effect layer
│   │   │   ├── playback-bar.tsx  # Timeline & playback controls
│   │   │   └── video-drop-zone.tsx # Video upload UI
│   │   └── ui/                   # Shadcn/ui primitives
│   │       ├── button.tsx
│   │       ├── label.tsx
│   │       ├── select.tsx
│   │       ├── separator.tsx
│   │       ├── slider.tsx
│   │       ├── switch.tsx
│   │       ├── tabs.tsx
│   │       └── tooltip.tsx
│   ├── lib/                      # Core processing & utilities (isomorphic)
│   │   ├── ascii-engine.ts       # Frame→ASCII conversion algorithm
│   │   ├── ascii-worker.ts       # Web Worker for frame conversion
│   │   ├── audio-preview.ts      # Real-time audio playback with effects
│   │   ├── audio-processor.ts    # Audio extraction, resampling, effects
│   │   ├── constants.ts          # Charset definitions, defaults, enums
│   │   ├── delta-encoder.ts      # RLE + delta frame compression
│   │   ├── export-ansi.ts        # ANSI export generator
│   │   ├── export-apng.ts        # APNG export generator
│   │   ├── export-svg.ts         # SVG export generator
│   │   ├── export-webgpu.ts      # WebGPU HTML export generator
│   │   ├── frame-extractor.ts    # Video→frames pipeline
│   │   ├── glyph-atlas.ts        # Glyph texture atlas (WebGPU)
│   │   ├── html-export.ts        # HTML + player runtime generator
│   │   ├── measure-char.ts       # Font metric measurement utility
│   │   ├── png-encoder.ts        # PNG frame encoding for APNG
│   │   ├── pretext-renderer.ts   # ASCII→Canvas 2D rendering
│   │   ├── rle.ts                # Run-length encoding/decoding
│   │   ├── utils.ts              # General utilities
│   │   └── webgpu-renderer.ts    # WebGPU rendering pipeline
│   ├── stores/                   # State management (Zustand)
│   │   └── editor-store.ts       # Single store: all editor state + actions
│   ├── types/                    # TypeScript type definitions
│   │   └── webgpu.d.ts          # WebGPU type declarations
│   └── app/
│       ├── globals.css           # Tailwind + global styles
│       └── icon.svg              # App icon
├── public/                       # Static assets
├── node_modules/
├── .planning/
│   └── codebase/                 # Generated analysis documents
├── package.json                  # Dependencies (React 19, Next 16, Zustand, FFmpeg)
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── eslint.config.mjs
├── components.json               # Shadcn/ui config
├── postcss.config.mjs
├── pdr.md                        # Project design records
├── CLAUDE.md                     # Agent instructions
└── AGENTS.md                     # Agent API docs
```

## Directory Purposes

**src/app:**
- Purpose: Next.js App Router configuration and root layout
- Contains: Root layout component, home page, global styles
- Key files: `layout.tsx` (metadata, fonts), `page.tsx` (AppShell mount)

**src/components/app-shell.tsx:**
- Purpose: Three-column responsive layout wrapper
- Contains: Layout grid, mobile banner, panel composition
- Key responsibility: Orchestrate top-level UI sections

**src/components/export/:**
- Purpose: Export format selection and configuration UI
- Contains: Format selector, settings panel, code preview, export button handler
- Key files:
  - `export-button.tsx`: Orchestrates extract→process→generate→download pipeline
  - `export-settings.tsx`: Export-specific controls (fps, loop, canvas size, colors)
  - `format-selector.tsx`: Radio/tab selection of export format

**src/components/panels/:**
- Purpose: Three main editor panels (sidebar + center + sidebar)
- Contains:
  - `input-controls.tsx`: Charset, grid density, brightness, contrast, gamma, dither, edge detection, color mode, trim controls
  - `preview-panel.tsx`: Video preview area with ASCII canvas and playback bar
  - `output-panel.tsx`: Export format selection and settings

**src/components/preview/:**
- Purpose: Video preview rendering and interaction
- Contains:
  - `ascii-canvas.tsx`: Main rendering loop (extraction + conversion + render)
  - `crt-overlay.tsx`: CSS-based CRT scanlines, vignette, curvature effects
  - `playback-bar.tsx`: Timeline slider, play/pause, frame time display
  - `video-drop-zone.tsx`: Drag-drop file input, triggers `store.setVideoFile()`

**src/components/ui/:**
- Purpose: Shadcn/ui component library (Base UI + custom styling)
- Contains: Primitives (Button, Slider, Select, Switch, Label, etc.)
- Pattern: Unstyled components from Base UI, styled with Tailwind

**src/lib/:**
- Purpose: Core processing algorithms and utilities
- Sub-purposes by file:

| File | Purpose |
|------|---------|
| `ascii-engine.ts` | Single/multi-pass frame→ASCII conversion with brightness, gamma, edge detection, dithering |
| `ascii-worker.ts` | Inline Web Worker that calls `convertFrameToAscii()` in background thread |
| `audio-preview.ts` | Real-time audio playback with Web Audio API (low-pass, distortion) |
| `audio-processor.ts` | Extract audio from video, resample, bit-crush, apply effects, encode WAV |
| `constants.ts` | Character sets, font presets, FPS options, default settings, type enums |
| `delta-encoder.ts` | Frame compression: keyframes (RLE), deltas (patch arrays) |
| `export-ansi.ts` | Generate ANSI escape code output with optional colors |
| `export-apng.ts` | Render frames to canvas, collect ImageData, encode APNG |
| `export-svg.ts` | Generate SVG with `<text>` elements per character |
| `export-webgpu.ts` | Generate HTML with WebGPU shader rendering runtime |
| `frame-extractor.ts` | Video extraction pipeline: seek→extract→convert (in worker) |
| `glyph-atlas.ts` | Pre-render all characters to canvas texture for GPU sampling |
| `html-export.ts` | Generate self-contained HTML with embedded JS player runtime |
| `measure-char.ts` | Measure monospace font metrics (charWidth, charHeight) |
| `png-encoder.ts` | PNG encoding (APNG frame generation) |
| `pretext-renderer.ts` | Render ASCII + cell colors to Canvas 2D context |
| `rle.ts` | Run-length encode/decode strings |
| `utils.ts` | General utility functions |
| `webgpu-renderer.ts` | WebGPU pipeline: glyph atlas sampling, color mapping, render to canvas |

**src/stores/:**
- Purpose: Global reactive state using Zustand
- Contains: `editor-store.ts` - single store with 70+ state fields
- Scope: Video metadata, conversion settings, audio settings, CRT effects, playback state, export settings, export progress

**src/types/:**
- Purpose: TypeScript type declarations for browser APIs
- Contains: `webgpu.d.ts` - WebGPU API type stubs

## Key File Locations

**Entry Points:**
- `src/app/page.tsx`: Next.js home page → `<AppShell />`
- `src/components/app-shell.tsx`: Root React component, layout container
- `src/stores/editor-store.ts`: Zustand store initialization

**Configuration:**
- `src/lib/constants.ts`: Character sets, presets, defaults
- `next.config.ts`: Next.js configuration
- `tailwind.config.ts`: Tailwind CSS configuration

**Core Logic:**
- `src/lib/ascii-engine.ts`: Frame conversion algorithm (single/multi-pass)
- `src/lib/frame-extractor.ts`: Video extraction + worker orchestration
- `src/components/export/export-button.tsx`: Export pipeline orchestration

**Rendering:**
- `src/components/preview/ascii-canvas.tsx`: Main rendering loop with effects
- `src/lib/pretext-renderer.ts`: Canvas 2D rendering
- `src/lib/webgpu-renderer.ts`: WebGPU rendering (fallback)

**Testing:**
- None (no test files in codebase)

## Naming Conventions

**Files:**
- Component files: `kebab-case.tsx` (e.g., `app-shell.tsx`, `playback-bar.tsx`)
- Library files: `kebab-case.ts` (e.g., `ascii-engine.ts`, `frame-extractor.ts`)
- UI primitives: `lowercase.tsx` (e.g., `button.tsx`, `slider.tsx`)

**Directories:**
- Feature/domain directories: `lowercase` (e.g., `panels`, `preview`, `export`)
- Functional directories: `lowercase` (e.g., `components`, `stores`, `types`)

**Components:**
- React components: `PascalCase` function names (e.g., `export function AppShell()`)
- Hooks: `usePascalCase` (e.g., `useEditorStore()`)
- Interfaces: `PascalCase` (e.g., `EditorState`, `AsciiFrame`)

**Variables:**
- Constants: `CONSTANT_CASE` (e.g., `MAX_SOURCE_WIDTH`, `BAYER_4X4`)
- Variables/functions: `camelCase` (e.g., `convertFrameToAscii`, `extractFrames`)

**Types/Enums:**
- Type names: `PascalCase` (e.g., `ColorMode`, `ExportFormat`, `PlaybackState`)
- Union types: lowercase with pipes (e.g., `type ColorMode = 'monochrome' | 'colored'`)

## Where to Add New Code

**New Video Processing Feature:**
- Processing logic: `src/lib/[feature-name].ts` (new file, export pure functions)
- Component integration: Update `src/components/preview/ascii-canvas.tsx` effect hooks
- Settings: Add state fields to `src/stores/editor-store.ts`, add UI in `src/components/panels/input-controls.tsx`
- Constants: Add defaults to `src/lib/constants.ts`

**New Export Format:**
- Generator: Create `src/lib/export-[format].ts` with function `generateExport[Format]()`
- Export button integration: Add case in `src/components/export/export-button.tsx` (Phase 2)
- Format selector: Add option to `src/components/export/format-selector.tsx`
- Constants: Register format in `src/lib/constants.ts` (ExportFormat type + label)

**New UI Control:**
- Component: Create in `src/components/panels/` or `src/components/export/`
- Store integration: Add state + setter to `src/stores/editor-store.ts`
- Pass store to component via props or `useEditorStore()` hook

**New Utility/Algorithm:**
- Helper: `src/lib/[utility-name].ts` (pure functions, exported)
- Usage: Import in components or other lib files as needed

**UI Primitives (Shadcn):**
- Location: `src/components/ui/`
- Pattern: Wrap Base UI components with Tailwind classes
- Example: `src/components/ui/button.tsx` wraps `@base-ui/react` Button

## Special Directories

**node_modules:**
- Purpose: npm dependencies
- Generated: Yes
- Committed: No

**.next:**
- Purpose: Next.js build cache and output
- Generated: Yes
- Committed: No

**.planning/codebase/:**
- Purpose: Generated architecture documentation
- Generated: Yes (by GSD agents)
- Committed: Yes (part of workflow)

**public/:**
- Purpose: Static assets served directly
- Generated: No
- Committed: Yes

---

*Structure analysis: 2026-04-02*
