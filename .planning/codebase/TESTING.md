# Testing Patterns

**Analysis Date:** 2026-04-02

## Test Framework

**Runner:**
- No test runner configured (Jest, Vitest, etc. not in package.json)
- No test configuration files found (`jest.config.*`, `vitest.config.*`)

**Assertion Library:**
- None detected; testing infrastructure not present

**Run Commands:**
- No test scripts in `package.json`
- Current scripts: `dev`, `build`, `start`, `lint`

## Current State

**Status:** No automated testing infrastructure is present in this codebase.

**Implication:** All testing must be:
- Manual through the running application (`npm run dev`)
- Visual verification in browser
- Manual video input testing with the UI

## Recommended Testing Approach

If testing is to be added, the following areas should be prioritized:

### Unit Tests (High Priority)

**Core Processing Logic** (`src/lib/`):
- `ascii-engine.ts` - `convertFrameToAscii()` with various color modes and dither settings
- `audio-processor.ts` - audio processing chain (resample, bitcrush, filters)
- `delta-encoder.ts` - delta encoding logic and keyframe detection
- `measure-char.ts` - character dimension caching
- `rle.ts` - run-length encoding/decoding
- Export generators: `export-ansi.ts`, `export-svg.ts`, `export-apng.ts`

**Test Pattern for Processing:**
```typescript
// Example: ASCII engine test structure
describe('convertFrameToAscii', () => {
  it('should convert ImageData to AsciiFrame with monochrome mode', () => {
    const imageData = createTestImageData(80, 24)
    const result = convertFrameToAscii(
      imageData,
      80,      // columns
      charset,
      0,       // brightnessThreshold
      100,     // contrastBoost
      'monochrome',
      1.0,     // gamma
      0,       // edgeDetection
      'none',  // ditherMode
      false    // invertCharset
    )
    expect(result).toHaveProperty('cells')
    expect(result).toHaveProperty('text')
    expect(result.cells.length).toBeGreaterThan(0)
  })

  it('should apply gamma correction when gamma !== 1.0', () => {
    // Test with gamma < 1.0 darkens output
    // Test with gamma > 1.0 brightens output
  })

  it('should apply dithering with floyd-steinberg mode', () => {
    // Verify dither matrix application
  })
})
```

**Test Pattern for Type Safety:**
```typescript
// Example: Type validation
describe('constants', () => {
  it('should have valid CHARACTER_SETS', () => {
    Object.entries(CHARACTER_SETS).forEach(([name, charset]) => {
      expect(typeof charset).toBe('string')
      expect(charset.length).toBeGreaterThan(0)
    })
  })

  it('should have valid DEFAULT_SETTINGS', () => {
    expect(DEFAULT_SETTINGS.columns).toBeGreaterThan(0)
    expect(DEFAULT_SETTINGS.fontSize).toBeGreaterThan(0)
    expect(DEFAULT_SETTINGS.exportFps).toBeGreaterThan(0)
  })
})
```

### Integration Tests (Medium Priority)

**Export Pipeline:**
- Full video → ASCII → export format flow
- Test each export format with sample video
- Verify frame count, dimensions, encoding integrity

**Audio Processing:**
- Load sample audio file
- Apply processing chain
- Verify output format and sample rate

**State Management:**
- Store initialization with default settings
- Setting updates propagate correctly
- Video file loading triggers state updates

**Test Pattern:**
```typescript
describe('Export Pipeline', () => {
  it('should convert video frames to HTML export', async () => {
    const videoFile = createTestVideoFile()
    const options = {
      format: 'html' as ExportFormat,
      fps: 24,
      columns: 80
    }
    const result = await exportVideo(videoFile, options)
    expect(result).toContain('<!DOCTYPE html>')
    expect(result).toContain('canvas')
  })
})
```

### Component Tests (Lower Priority)

**React Components** (`src/components/`):
- InputControls - verify all sliders/selectors update store
- PreviewPanel - verify canvas renders when video loaded
- ExportButton - verify export formats selectable
- AsciiCanvas - verify WebGPU detection and fallback

**Test Pattern:**
```typescript
describe('InputControls', () => {
  it('should update store when column slider changes', async () => {
    render(<InputControls />)
    const slider = screen.getByRole('slider', { name: /columns/i })
    await user.click(slider)
    // Verify store was updated
  })
})
```

## Test Data / Fixtures

**Recommended Location:** `src/__fixtures__/` or `src/lib/__tests__/fixtures.ts`

**Content:**
```typescript
// Test images
export function createTestImageData(width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(width * height * 4)
  // Fill with test pattern: gradient, checker, solid colors
  return new ImageData(data, width, height)
}

// Test video
export function createTestVideoFile(duration: number = 1): File {
  // Create minimal valid MP4 or WebM for testing
}

// Test frame data
export const testFrames = {
  simple: ['AAAA', 'BBBB', 'CCCC'],
  gradient: ['#...#', '.#.#.', '...#.'],
}
```

## Coverage Targets

**Minimum Targets (if implementing):**
- Lib functions: 80% coverage
- Components: 50% coverage (visual components harder to test)
- Overall: 70% coverage

**Critical Path:**
1. `ascii-engine.ts` - core algorithm (100%)
2. `delta-encoder.ts` - frame encoding (95%)
3. `audio-processor.ts` - audio chain (85%)
4. Export generators - format correctness (90%)

## Testing Tools Recommendation

**If adding tests, use:**
- **Runner:** Vitest (modern, fast, ESM-first)
- **Testing Library:** @testing-library/react for components
- **Assertion:** Vitest built-in expect or Chai
- **Coverage:** Vitest coverage built-in

**Config Setup:**
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/__fixtures__/', '**/*.d.ts']
    }
  }
})
```

## Manual Testing Checklist

Until automated tests are added, verify:

**Conversion Features:**
- [ ] Different character sets produce different output
- [ ] Brightness threshold removes dark pixels
- [ ] Contrast boost changes range
- [ ] Color modes render correctly (monochrome, colored, inverted, monoscale)
- [ ] Edge detection enhances edges
- [ ] Dithering creates dotted patterns
- [ ] Gamma correction brightens/darkens consistently
- [ ] Invert charset reverses character order

**Audio:**
- [ ] Audio sync with video playback
- [ ] Bit depth reduction sounds intentional
- [ ] Low-pass filter smooths audio
- [ ] Distortion adds crunchiness

**CRT Effects:**
- [ ] Vignette darkens edges
- [ ] Rounded corners apply smoothly
- [ ] Scanlines visible and adjustable
- [ ] Curvature distorts appropriately

**Export:**
- [ ] HTML export plays in browser
- [ ] ANSI export renders in terminal
- [ ] SVG export opens in image viewer
- [ ] APNG export shows animation
- [ ] Canvas width affects output
- [ ] Color settings preserved
- [ ] Audio embedded when present
- [ ] Controls functional if enabled
- [ ] Loop settings work (once, forever, N times)

## Edge Cases to Test

- Zero-duration video trim
- Single-frame video
- Very small video dimensions
- Very large video dimensions (performance)
- Empty custom character set
- Invalid hex color values
- Video with no audio track
- Rapid setting changes during preview
- Browser without WebGPU support
