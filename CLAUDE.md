@AGENTS.md

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Asciify Monorepo**

Asciify is an ASCII video converter that transforms video into animated ASCII art and exports self-contained files. This milestone restructures the single Next.js app into a pnpm + Turborepo monorepo, extracting two publishable npm packages: `@asciify/encoder` (the conversion engine) and `@asciify/player` (a canvas text animation engine powered by @chenglou/pretext). The existing app becomes `apps/web` and consumes both packages.

**Core Value:** Developers and creative coders can install `@asciify/player` on any website to render and animate text on canvas — in grid, proportional font, typewriter, or reflow mode — with a single HTML tag or ES import.

### Constraints

- **Tech stack**: pnpm + Turborepo + tsup — chosen for monorepo tooling
- **Browser-only**: Both packages target browser environments only (no Node.js runtime)
- **Pretext bundled**: @chenglou/pretext is bundled inside @asciify/player, not exposed as peer dependency
- **In-place migration**: Restructure current repo, preserve git history
- **Package scope**: Published under `@asciify/*` on npm
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.x - Application source code and type definitions
- JavaScript (ES2017+) - Runtime execution target
- CSS / Tailwind CSS - Styling (via @tailwindcss/postcss)
- JSX/TSX - React component definitions
## Runtime
- Node.js 24 (per `.nvmrc`)
- npm (lockfile: package-lock.json present)
## Frameworks
- Next.js 16.2.1 - Full-stack React framework with SSR, static generation, and API routes
- React 19.2.4 - UI component library
- React DOM 19.2.4 - DOM rendering
- @base-ui/react 1.3.0 - Unstyled, accessible component primitives (Tabs, Slider, Tooltip, Switch, Separator, Button, Select)
- class-variance-authority 0.7.1 - Type-safe CSS class composition for components
- Tailwind CSS 4 (with @tailwindcss/postcss 4) - Utility-first CSS framework
- tailwind-merge 3.5.0 - Intelligent Tailwind class merging
- tw-animate-css 1.4.0 - Tailwind animation utilities
- lucide-react 1.7.0 - Icon library (used in `Download`, `Loader2`, `CircleAlert` icons)
- shadcn 4.1.2 - Pre-built component library
- zustand 5.0.12 - Lightweight state management (used in `src/stores/editor-store.ts`)
- clsx 2.1.1 - Conditional className utility
## Key Dependencies
- @ffmpeg/ffmpeg 0.12.15 - FFmpeg WebAssembly build for video processing (listed but not actively integrated in source)
- @ffmpeg/util 0.12.2 - FFmpeg utilities (listed but not actively integrated in source)
- gif.js 0.2.0 - GIF encoding library (listed in package.json but not actively used in source code)
- Built-in Web APIs: HTMLVideoElement, Canvas 2D Context, AudioContext, MediaDevices API, Blob/File APIs
- WebGPU - GPU-accelerated rendering (via browser API, type definitions in `src/types/webgpu.d.ts`)
- Canvas 2D - Fallback rendering for ASCII frames
- Web Audio API - Built-in browser API for audio processing
- AudioContext - Decoding audio from video containers
## Build & Dev Tools
- TypeScript 5.x - Language compiler and type checking
- ESLint 9 - JavaScript/TypeScript code quality
- eslint-config-next 16.2.1 - Next.js-specific linting rules
- PostCSS - CSS transformation (configured via `postcss.config.mjs`)
- Tailwind CSS 4 - Utility CSS generation
- next/font/google - Google Fonts optimization (Geist, Geist_Mono fonts loaded)
## Configuration Files
- `next.config.ts` - Next.js configuration (minimal, placeholder)
- `tsconfig.json` - TypeScript compiler options
- `postcss.config.mjs` - PostCSS configuration with Tailwind CSS plugin
- `eslint.config.mjs` - ESLint configuration (extends next/core-web-vitals and next/typescript)
- `package.json` - Dependencies and scripts
- `.nvmrc` - Node version lock (24)
## Scripts
## Platform Requirements
- Node.js 24
- npm
- WebGPU-capable browser (Chrome 113+, Edge 113+) for GPU acceleration
- Web Audio API support for audio processing
- Canvas 2D API support for ASCII rendering
- Static HTML/CSS/JavaScript deployment (Next.js can export static site)
- No backend runtime required for core functionality
- Browser requirements: ES2017 JavaScript support, Canvas API, Web Audio API
- Optional: WebGPU for GPU-accelerated video playback (falls back to Canvas 2D)
## External CDNs
- Google Fonts API - Geist and Geist_Mono font families loaded at runtime
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- React components: PascalCase with `.tsx` extension (e.g., `AsciiCanvas.tsx`, `InputControls.tsx`)
- Utilities/libraries: kebab-case with `.ts` extension (e.g., `ascii-engine.ts`, `measure-char.ts`)
- Store files: descriptive kebab-case (e.g., `editor-store.ts`)
- UI component files: PascalCase (e.g., `slider.tsx`, `button.tsx`)
- Exported functions: camelCase (e.g., `convertFrameToAscii`, `measureMonospaceChar`, `generateExportHtml`)
- Internal/private functions: camelCase (e.g., `hexToRgb`, `buildColoredLine`, `applyLowPass`)
- Hook functions: camelCase with use prefix (e.g., `useEditorStore`)
- Factory functions: camelCase with create/make prefix (e.g., `createObjectURL`)
- State variables: camelCase (e.g., `videoFile`, `brightnessThreshold`, `crtVignette`)
- Constants: camelCase for runtime, UPPER_SNAKE_CASE for true constants
- Loop counters: single letters (i, j, k, y, x) for pixel/grid operations
- Refs in React: camelCase with "Ref" suffix (e.g., `canvasRef`, `videoRef`, `extractionCanvasRef`)
- Interfaces: PascalCase with descriptive names (e.g., `EditorState`, `AsciiFrame`, `ExportOptions`)
- Type aliases: PascalCase for union types (e.g., `ColorMode`, `ExportFormat`, `PlaybackState`)
- Generic type parameters: single letters or descriptive (T, K, V) or full names for clarity
## Code Style
- No formatter explicitly configured (no Prettier config found)
- ESLint configured with Next.js web vitals and TypeScript rules
- Single quotes used throughout for string literals
- Consistent 2-space indentation observed
- Line length varies; no strict limit enforced
- ESLint: version 9 with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Config: `eslint.config.mjs` - flat config format
- Ignores: `.next/**`, `out/**`, `build/**`, `next-env.d.ts`
- TypeScript strict mode enabled in `tsconfig.json`
- Next.js core web vitals enforcement
- TypeScript type checking
- React best practices from Next.js preset
## Import Organization
- `@/*` maps to `./src/*` (configured in `tsconfig.json`)
- All local imports use absolute `@/` paths for consistency
- Examples:
- Named imports preferred: `import { convertFrameToAscii } from '@/lib/ascii-engine'`
- Type imports explicit: `import type { AsciiFrame } from '@/lib/ascii-engine'`
- Side-effect imports for modules (e.g., CSS, direct initialization)
## Error Handling
- Try-catch blocks for async operations and error-prone code:
- Silent error handling acceptable for non-critical operations:
- Explicit error throws for critical failures:
- Error messages passed to UI state when user-facing:
- Fallback to alternative implementations on error (e.g., Canvas2D fallback if WebGPU fails)
- Check for null/undefined before use: `if (!video)` or `if (!prev)`
- Use optional chaining where safe: `sourceNode?.disconnect()`
- Validate input lengths: `if (frames.length === 0) throw new Error('No frames to encode')`
## Logging
- Warning logs for non-critical failures: `console.warn('Audio processing failed:', audioErr)`
- Error logs for important issues: `console.error('WebGPU render failed:', e)`
- No debug/verbose logging observed in production code
- Minimal logging in general; let errors propagate or fail silently as appropriate
## Comments
- Explain complex algorithms (e.g., Bayer dithering matrix, Sobel edge detection)
- Mark sections within functions (e.g., "// Extract trimmed segment")
- Document non-obvious optimizations (e.g., "// Fast path: original single-pass when no new effects are active")
- Explain constraints (e.g., "// +2 for quotes" when calculating delta size)
- Note workarounds and hacks
- Not consistently used; interfaces and functions typically lack JSDoc comments
- Type information is expressed via TypeScript types, reducing need for documentation
- Comments are inline and sparse rather than block-level documentation
- Single-line comments with `//` for inline explanations
- Uppercase first letter convention not strictly followed
- Technical clarity preferred over style
## Function Design
- Small utility functions: 5-10 lines (e.g., `measureMonospaceChar`)
- Processing functions: 30-100+ lines (e.g., `convertFrameToAscii`)
- Export/generation functions: 50-150+ lines (e.g., `generateExportHtml`)
- Functions accept 2-10 parameters for complex operations
- Options/configuration passed as single object/interface when many params needed:
- Destructuring used in function bodies to extract object properties
- Functions return typed values (interfaces or primitives)
- Async functions return `Promise<T>`
- Void functions used for state mutations (e.g., Zustand setters)
- Helper functions often return derived data structures (e.g., `{ frames: EncodedFrame[] }`)
## Module Design
- Named exports for functions and interfaces: `export function name() {}`
- Type exports explicit: `export type TypeName = ...`
- Default exports not used; named exports only
- Single responsibility per module (e.g., `ascii-engine.ts` handles ASCII conversion)
- Not observed in codebase
- Components imported directly from their files
- Constants in dedicated file: `constants.ts` (character sets, export formats, defaults)
- Utilities in `lib/` directory (processing, conversion, export)
- Components in `components/` with subdirectories by feature (ui, panels, preview, export)
- State management in `stores/` directory
## Component Patterns (React/Next.js)
- Marked with `'use client'` directive at top of file
- Use hooks: `useRef`, `useEffect`, `useCallback`, `useState`
- Import from Zustand store: `useEditorStore()`
- Handle local UI state separate from global store
- Components avoid props when possible; access global state directly via store
- Event handlers inline or extracted as named functions
- Type safety via TypeScript (no PropTypes)
- Tailwind CSS utility classes
- Class composition via `cn()` utility: `className={cn("base", condition && "override")}`
- Shadcn/ui components for consistent UI (Button, Slider, Select, etc.)
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Single-page React application (Next.js 16) with client-side processing
- Zustand for centralized reactive state management
- Multi-threaded frame processing using Web Workers
- Plugin-based export format system (HTML, WebGPU, APNG, SVG, ANSI)
- GPU-accelerated rendering when available (WebGPU fallback to canvas)
## Layers
- Purpose: User interface for video input, conversion settings, preview, and export
- Location: `src/components/`
- Contains: React components (panels, preview, export, UI primitives)
- Depends on: Zustand store, render libraries, encoding utilities
- Used by: Next.js app layer
- Purpose: Centralized reactive state for all editor settings, video metadata, and export progress
- Location: `src/stores/editor-store.ts`
- Contains: Zustand store with 70+ state fields and action methods
- Depends on: Constants (default settings)
- Used by: All components
- Purpose: Video frame extraction, ASCII conversion, audio processing, and format export
- Location: `src/lib/`
- Contains: Core algorithms and encoding utilities
- Sub-categories:
- Depends on: Browser APIs (Canvas, WebGL/WebGPU, Web Audio, Workers)
- Used by: Components and export handlers
- Purpose: TypeScript types and WebGPU type definitions
- Location: `src/types/`
- Purpose: Constants, default settings, presets
- Location: `src/lib/constants.ts`
## Data Flow
```
- InputControls: Read settings, dispatch setters
- PreviewPanel: Read playback state, videoUrl
- AsciiCanvas: Read settings + videoUrl, sync audio on changes
- OutputPanel: Read export settings, isExporting, exportProgress
- ExportButton: Read all state via getState() for export
```
## Key Abstractions
- Purpose: Result of converting one image to ASCII art
- Location: `src/lib/ascii-engine.ts`
- Pattern: Value object containing:
- Usage: Passed through extraction, rendering, and export pipelines
- Purpose: Pre-rendered texture of all characters for efficient GPU rendering
- Location: `src/lib/glyph-atlas.ts`
- Pattern: Factory function that creates a canvas with grid of characters
- Usage: WebGPU renderer uses atlas coordinates instead of rendering text per-frame
- Purpose: Optimized representation of frame for export
- Location: `src/lib/delta-encoder.ts`
- Pattern: Union type - either RLE-encoded keyframe string or array of delta patches
- Usage: Reduces HTML export file size via inter-frame compression
- Purpose: GPU-accelerated rendering using WebGPU shaders
- Location: `src/lib/webgpu-renderer.ts`
- Pattern: Class with lifecycle methods (init, render, cleanup)
- Usage: Preview canvas rendering when available; fallback to 2D canvas
- Purpose: Configuration object bundling all conversion parameters
- Location: `src/lib/frame-extractor.ts`
- Pattern: Interface passed once to extraction function for consistency
- Usage: Ensures all frames extract with identical settings
## Entry Points
- Location: `src/app/page.tsx`
- Triggers: Client navigation to `/`
- Responsibilities: Renders `AppShell` component
- Location: `src/components/app-shell.tsx`
- Triggers: Initial render on client
- Responsibilities:
- Location: `src/components/preview/video-drop-zone.tsx`
- Triggers: Drag-drop or file input
- Responsibilities: Reads file → `store.setVideoFile()`
- Location: `src/components/preview/ascii-canvas.tsx` (useEffect + requestAnimationFrame)
- Triggers: Video URL change, store subscription to settings
- Responsibilities:
- Location: `src/components/export/export-button.tsx`
- Triggers: User clicks "Export" button
- Responsibilities:
## Error Handling
- Video load errors: Caught in `extractFrames()`, displayed in export UI
- Worker errors: Implicitly handled via promise rejection (timeout fallback possible)
- Audio decode errors: Caught in `processAudio()`, exports continue without audio
- GPU unavailability: Graceful fallback from WebGPU to canvas 2D in `AsciiCanvas`
- Export errors: Caught in `handleExport()`, stored in local state, displayed to user
## Cross-Cutting Concerns
- Console.log scattered in processing functions for debugging
- No structured logging framework
- Store setters include bounds checking (e.g., trim start/end constraints)
- Component sliders enforce min/max ranges
- No centralized validation layer
- Not applicable (client-side only)
- Web Workers offload frame conversion to background thread
- Delta encoding reduces HTML export size
- RLE compression for text frames
- WebGPU rendering for real-time preview (when available)
- Extraction canvas scales down to max 720px width
- Multi-pass rendering only when effects (gamma, dither, edges, invert) enabled
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
