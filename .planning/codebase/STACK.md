# Technology Stack

**Analysis Date:** 2026-04-02

## Languages

**Primary:**
- TypeScript 5.x - Application source code and type definitions
- JavaScript (ES2017+) - Runtime execution target

**Secondary:**
- CSS / Tailwind CSS - Styling (via @tailwindcss/postcss)
- JSX/TSX - React component definitions

## Runtime

**Environment:**
- Node.js 24 (per `.nvmrc`)

**Package Manager:**
- npm (lockfile: package-lock.json present)

## Frameworks

**Core:**
- Next.js 16.2.1 - Full-stack React framework with SSR, static generation, and API routes
- React 19.2.4 - UI component library
- React DOM 19.2.4 - DOM rendering

**UI Components & Styling:**
- @base-ui/react 1.3.0 - Unstyled, accessible component primitives (Tabs, Slider, Tooltip, Switch, Separator, Button, Select)
- class-variance-authority 0.7.1 - Type-safe CSS class composition for components
- Tailwind CSS 4 (with @tailwindcss/postcss 4) - Utility-first CSS framework
- tailwind-merge 3.5.0 - Intelligent Tailwind class merging
- tw-animate-css 1.4.0 - Tailwind animation utilities
- lucide-react 1.7.0 - Icon library (used in `Download`, `Loader2`, `CircleAlert` icons)
- shadcn 4.1.2 - Pre-built component library

**State Management:**
- zustand 5.0.12 - Lightweight state management (used in `src/stores/editor-store.ts`)

**Utilities:**
- clsx 2.1.1 - Conditional className utility

## Key Dependencies

**Critical:**
- @ffmpeg/ffmpeg 0.12.15 - FFmpeg WebAssembly build for video processing (listed but not actively integrated in source)
- @ffmpeg/util 0.12.2 - FFmpeg utilities (listed but not actively integrated in source)
- gif.js 0.2.0 - GIF encoding library (listed in package.json but not actively used in source code)

**Video & Media:**
- Built-in Web APIs: HTMLVideoElement, Canvas 2D Context, AudioContext, MediaDevices API, Blob/File APIs

**Graphics & Rendering:**
- WebGPU - GPU-accelerated rendering (via browser API, type definitions in `src/types/webgpu.d.ts`)
- Canvas 2D - Fallback rendering for ASCII frames

**Audio:**
- Web Audio API - Built-in browser API for audio processing
- AudioContext - Decoding audio from video containers

## Build & Dev Tools

**TypeScript:**
- TypeScript 5.x - Language compiler and type checking

**Linting:**
- ESLint 9 - JavaScript/TypeScript code quality
- eslint-config-next 16.2.1 - Next.js-specific linting rules

**CSS Processing:**
- PostCSS - CSS transformation (configured via `postcss.config.mjs`)
- Tailwind CSS 4 - Utility CSS generation

**Next.js Integration:**
- next/font/google - Google Fonts optimization (Geist, Geist_Mono fonts loaded)

## Configuration Files

**Build:**
- `next.config.ts` - Next.js configuration (minimal, placeholder)
- `tsconfig.json` - TypeScript compiler options
  - Target: ES2017
  - Module resolution: bundler
  - Path alias: `@/*` → `./src/*`
  - Strict mode: enabled
  - JSX factory: react-jsx

**CSS/Styling:**
- `postcss.config.mjs` - PostCSS configuration with Tailwind CSS plugin

**Linting:**
- `eslint.config.mjs` - ESLint configuration (extends next/core-web-vitals and next/typescript)

**Package Management:**
- `package.json` - Dependencies and scripts
- `.nvmrc` - Node version lock (24)

## Scripts

```bash
npm run dev              # Start Next.js development server
npm run build            # Build for production
npm run start            # Run production server
npm run lint             # Run ESLint
```

## Platform Requirements

**Development:**
- Node.js 24
- npm
- WebGPU-capable browser (Chrome 113+, Edge 113+) for GPU acceleration
- Web Audio API support for audio processing
- Canvas 2D API support for ASCII rendering

**Production:**
- Static HTML/CSS/JavaScript deployment (Next.js can export static site)
- No backend runtime required for core functionality
- Browser requirements: ES2017 JavaScript support, Canvas API, Web Audio API
- Optional: WebGPU for GPU-accelerated video playback (falls back to Canvas 2D)

## External CDNs

**Fonts:**
- Google Fonts API - Geist and Geist_Mono font families loaded at runtime

---

*Stack analysis: 2026-04-02*
