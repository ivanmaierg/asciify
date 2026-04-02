# Coding Conventions

**Analysis Date:** 2026-04-02

## Naming Patterns

**Files:**
- React components: PascalCase with `.tsx` extension (e.g., `AsciiCanvas.tsx`, `InputControls.tsx`)
- Utilities/libraries: kebab-case with `.ts` extension (e.g., `ascii-engine.ts`, `measure-char.ts`)
- Store files: descriptive kebab-case (e.g., `editor-store.ts`)
- UI component files: PascalCase (e.g., `slider.tsx`, `button.tsx`)

**Functions:**
- Exported functions: camelCase (e.g., `convertFrameToAscii`, `measureMonospaceChar`, `generateExportHtml`)
- Internal/private functions: camelCase (e.g., `hexToRgb`, `buildColoredLine`, `applyLowPass`)
- Hook functions: camelCase with use prefix (e.g., `useEditorStore`)
- Factory functions: camelCase with create/make prefix (e.g., `createObjectURL`)

**Variables:**
- State variables: camelCase (e.g., `videoFile`, `brightnessThreshold`, `crtVignette`)
- Constants: camelCase for runtime, UPPER_SNAKE_CASE for true constants
  - Example: `DEFAULT_SETTINGS` (constant), `CHARACTER_SETS` (constant)
  - Example: `charWidth` (runtime computed value), `cellHeight` (computed)
- Loop counters: single letters (i, j, k, y, x) for pixel/grid operations
- Refs in React: camelCase with "Ref" suffix (e.g., `canvasRef`, `videoRef`, `extractionCanvasRef`)

**Types:**
- Interfaces: PascalCase with descriptive names (e.g., `EditorState`, `AsciiFrame`, `ExportOptions`)
- Type aliases: PascalCase for union types (e.g., `ColorMode`, `ExportFormat`, `PlaybackState`)
- Generic type parameters: single letters or descriptive (T, K, V) or full names for clarity

## Code Style

**Formatting:**
- No formatter explicitly configured (no Prettier config found)
- ESLint configured with Next.js web vitals and TypeScript rules
- Single quotes used throughout for string literals
- Consistent 2-space indentation observed
- Line length varies; no strict limit enforced

**Linting:**
- ESLint: version 9 with `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Config: `eslint.config.mjs` - flat config format
- Ignores: `.next/**`, `out/**`, `build/**`, `next-env.d.ts`
- TypeScript strict mode enabled in `tsconfig.json`

**Key ESLint Rules (from config):**
- Next.js core web vitals enforcement
- TypeScript type checking
- React best practices from Next.js preset

## Import Organization

**Order:**
1. React and external packages (e.g., `import { create } from 'zustand'`)
2. Type imports from packages (e.g., `import type { ClassValue } from "clsx"`)
3. Local absolute imports using `@/` alias (e.g., `import { useEditorStore } from '@/stores/editor-store'`)
4. Local relative imports (rarely used, absolute preferred)

**Path Aliases:**
- `@/*` maps to `./src/*` (configured in `tsconfig.json`)
- All local imports use absolute `@/` paths for consistency
- Examples:
  - `@/lib/constants` for utilities
  - `@/components/ui/button` for UI components
  - `@/stores/editor-store` for state management

**Import Style:**
- Named imports preferred: `import { convertFrameToAscii } from '@/lib/ascii-engine'`
- Type imports explicit: `import type { AsciiFrame } from '@/lib/ascii-engine'`
- Side-effect imports for modules (e.g., CSS, direct initialization)

## Error Handling

**Patterns:**
- Try-catch blocks for async operations and error-prone code:
  ```typescript
  try {
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0))
  } finally {
    await audioCtx.close()
  }
  ```
- Silent error handling acceptable for non-critical operations:
  ```typescript
  try { sourceNode?.disconnect() } catch { /* ok */ }
  ```
- Explicit error throws for critical failures:
  ```typescript
  if (!adapter) throw new Error('No GPU adapter')
  ```
- Error messages passed to UI state when user-facing:
  ```typescript
  const message = err instanceof Error ? err.message : 'Export failed. Please try again.'
  setError(message)
  ```
- Fallback to alternative implementations on error (e.g., Canvas2D fallback if WebGPU fails)

**Error Detection:**
- Check for null/undefined before use: `if (!video)` or `if (!prev)`
- Use optional chaining where safe: `sourceNode?.disconnect()`
- Validate input lengths: `if (frames.length === 0) throw new Error('No frames to encode')`

## Logging

**Framework:** `console` for direct output

**Patterns:**
- Warning logs for non-critical failures: `console.warn('Audio processing failed:', audioErr)`
- Error logs for important issues: `console.error('WebGPU render failed:', e)`
- No debug/verbose logging observed in production code
- Minimal logging in general; let errors propagate or fail silently as appropriate

## Comments

**When to Comment:**
- Explain complex algorithms (e.g., Bayer dithering matrix, Sobel edge detection)
- Mark sections within functions (e.g., "// Extract trimmed segment")
- Document non-obvious optimizations (e.g., "// Fast path: original single-pass when no new effects are active")
- Explain constraints (e.g., "// +2 for quotes" when calculating delta size)
- Note workarounds and hacks

**JSDoc/TSDoc:**
- Not consistently used; interfaces and functions typically lack JSDoc comments
- Type information is expressed via TypeScript types, reducing need for documentation
- Comments are inline and sparse rather than block-level documentation

**Comment Style:**
- Single-line comments with `//` for inline explanations
- Uppercase first letter convention not strictly followed
- Technical clarity preferred over style

## Function Design

**Size:** Functions typically range from 10-50 lines
- Small utility functions: 5-10 lines (e.g., `measureMonospaceChar`)
- Processing functions: 30-100+ lines (e.g., `convertFrameToAscii`)
- Export/generation functions: 50-150+ lines (e.g., `generateExportHtml`)

**Parameters:**
- Functions accept 2-10 parameters for complex operations
- Options/configuration passed as single object/interface when many params needed:
  ```typescript
  export function convertFrameToAscii(
    imageData: ImageData,
    columns: number,
    charset: string,
    brightnessThreshold: number,
    // ... more params
  ): AsciiFrame
  ```
- Destructuring used in function bodies to extract object properties

**Return Values:**
- Functions return typed values (interfaces or primitives)
- Async functions return `Promise<T>`
- Void functions used for state mutations (e.g., Zustand setters)
- Helper functions often return derived data structures (e.g., `{ frames: EncodedFrame[] }`)

## Module Design

**Exports:**
- Named exports for functions and interfaces: `export function name() {}`
- Type exports explicit: `export type TypeName = ...`
- Default exports not used; named exports only
- Single responsibility per module (e.g., `ascii-engine.ts` handles ASCII conversion)

**Barrel Files:**
- Not observed in codebase
- Components imported directly from their files

**Module Organization:**
- Constants in dedicated file: `constants.ts` (character sets, export formats, defaults)
- Utilities in `lib/` directory (processing, conversion, export)
- Components in `components/` with subdirectories by feature (ui, panels, preview, export)
- State management in `stores/` directory

## Component Patterns (React/Next.js)

**Client Components:**
- Marked with `'use client'` directive at top of file
- Use hooks: `useRef`, `useEffect`, `useCallback`, `useState`
- Import from Zustand store: `useEditorStore()`
- Handle local UI state separate from global store

**Prop Patterns:**
- Components avoid props when possible; access global state directly via store
- Event handlers inline or extracted as named functions
- Type safety via TypeScript (no PropTypes)

**Styling:**
- Tailwind CSS utility classes
- Class composition via `cn()` utility: `className={cn("base", condition && "override")}`
- Shadcn/ui components for consistent UI (Button, Slider, Select, etc.)
