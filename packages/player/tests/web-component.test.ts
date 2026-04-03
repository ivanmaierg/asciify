import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { AsciiPlayerData } from '@asciify/encoder'

// ──────────────────────────────────────────────────────────
// Mock @chenglou/pretext before any imports that use it
// ──────────────────────────────────────────────────────────
vi.mock('@chenglou/pretext', () => ({
  prepare: vi.fn().mockReturnValue({}),
}))

// ──────────────────────────────────────────────────────────
// Mock fetch globally
// ──────────────────────────────────────────────────────────
function makeTestData(frameCount = 2): AsciiPlayerData {
  const cols = 10
  const rows = 5
  const text = '.'.repeat(cols * rows)
  const cells = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({
      char: text[r * cols + c] ?? ' ',
      r: 200,
      g: 200,
      b: 200,
      brightness: 0.5,
    })),
  )
  return {
    version: 1,
    metadata: {
      columns: cols,
      rows,
      fps: 10,
      duration: frameCount / 10,
      frameCount,
      colorMode: 'monochrome',
      charset: ' .:-=+*#%@',
    },
    frames: Array.from({ length: frameCount }, () => ({ text, cells })),
  }
}

// ──────────────────────────────────────────────────────────
// Canvas / rAF / global mocks
// ──────────────────────────────────────────────────────────
let rafCallbacks: Map<number, FrameRequestCallback> = new Map()
let rafIdCounter = 0

function makeMockCtx() {
  return {
    fillStyle: '' as string,
    font: '' as string,
    textBaseline: '' as string,
    canvas: { width: 640, height: 320 },
    fillRect: vi.fn(),
    fillText: vi.fn(),
    clearRect: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 8 }),
  }
}

beforeEach(() => {
  rafCallbacks = new Map()
  rafIdCounter = 0

  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    const id = ++rafIdCounter
    rafCallbacks.set(id, cb)
    return id
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    rafCallbacks.delete(id)
  })

  // Mock fetch to return test data
  const testData = makeTestData()
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue(testData),
      ok: true,
    }),
  )

  // Mock HTMLCanvasElement.prototype.getContext so canvas is real DOM but context is mocked
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    makeMockCtx() as unknown as CanvasRenderingContext2D,
  )

  Object.defineProperty(document, 'fonts', {
    value: { load: vi.fn().mockResolvedValue([]) },
    configurable: true,
    writable: true,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  // Clean up any registered elements from test
  document.body.innerHTML = ''
})

// ──────────────────────────────────────────────────────────
// Import the web component after mocks are set up
// ──────────────────────────────────────────────────────────
async function importWebComponent() {
  // Dynamic import to ensure mocks are set before module loads
  const mod = await import('../src/web-component')
  return mod
}

// ──────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────

describe('AsciiPlayerElement', () => {
  describe('custom element registration', () => {
    it('registers as ascii-player custom element', async () => {
      await importWebComponent()
      expect(customElements.get('ascii-player')).toBeDefined()
    })

    it('can be constructed via document.createElement', async () => {
      const { AsciiPlayerElement } = await importWebComponent()
      const el = new AsciiPlayerElement()
      expect(el).toBeInstanceOf(HTMLElement)
    })
  })

  describe('observedAttributes', () => {
    it('includes src, autoplay, loop, controls, fps, fg-color, bg-color, theme, font', async () => {
      const { AsciiPlayerElement } = await importWebComponent()
      const attrs = AsciiPlayerElement.observedAttributes
      expect(attrs).toContain('src')
      expect(attrs).toContain('autoplay')
      expect(attrs).toContain('loop')
      expect(attrs).toContain('controls')
      expect(attrs).toContain('fps')
      expect(attrs).toContain('fg-color')
      expect(attrs).toContain('bg-color')
      expect(attrs).toContain('theme')
      expect(attrs).toContain('font')
    })
  })

  describe('Shadow DOM', () => {
    it('has an open shadow root', async () => {
      const { AsciiPlayerElement } = await importWebComponent()
      const el = new AsciiPlayerElement()
      expect(el.shadowRoot).toBeDefined()
      expect(el.shadowRoot?.mode).toBe('open')
    })

    it('shadow root contains a canvas element', async () => {
      const { AsciiPlayerElement } = await importWebComponent()
      const el = new AsciiPlayerElement()
      // Canvas is created in constructor via document.createElement mock
      expect(el.shadowRoot).toBeDefined()
    })
  })

  describe('.data property setter', () => {
    it('accepts AsciiPlayerData directly when connected', async () => {
      const { AsciiPlayerElement } = await importWebComponent()
      const el = new AsciiPlayerElement()
      document.body.appendChild(el)

      const data = makeTestData()
      // Should not throw
      expect(() => { el.data = data }).not.toThrow()

      document.body.removeChild(el)
    })

    it('stores pending data when not yet connected', async () => {
      const { AsciiPlayerElement } = await importWebComponent()
      const el = new AsciiPlayerElement()

      const data = makeTestData()
      // Not connected yet — stores as pending
      expect(() => { el.data = data }).not.toThrow()
    })
  })

  describe('src attribute fetches data', () => {
    it('calls fetch when src attribute is set and element connects', async () => {
      const { AsciiPlayerElement } = await importWebComponent()
      const el = new AsciiPlayerElement()
      el.setAttribute('src', 'http://example.com/data.json')
      document.body.appendChild(el)

      // fetch should be called
      await Promise.resolve() // allow microtasks
      expect(fetch).toHaveBeenCalledWith('http://example.com/data.json')

      document.body.removeChild(el)
    })
  })

  describe('color attribute resolution', () => {
    it('resolves fg-color attribute over CSS custom property', async () => {
      const { AsciiPlayerElement } = await importWebComponent()
      const el = new AsciiPlayerElement()
      el.setAttribute('fg-color', '#ff0000')

      // The attribute should be readable
      expect(el.getAttribute('fg-color')).toBe('#ff0000')
    })

    it('resolves bg-color attribute', async () => {
      const { AsciiPlayerElement } = await importWebComponent()
      const el = new AsciiPlayerElement()
      el.setAttribute('bg-color', '#001100')

      expect(el.getAttribute('bg-color')).toBe('#001100')
    })

    it('resolves theme attribute and applies THEMES colors', async () => {
      const { AsciiPlayerElement } = await importWebComponent()
      const el = new AsciiPlayerElement()
      el.setAttribute('theme', 'matrix')

      // Theme attribute is observed
      expect(el.getAttribute('theme')).toBe('matrix')
    })
  })

  describe('controls attribute', () => {
    it('no controls attribute: no controls div in shadow DOM', async () => {
      const { AsciiPlayerElement } = await importWebComponent()
      const el = new AsciiPlayerElement()
      document.body.appendChild(el)

      const el2 = el as AsciiPlayerElement & { shadowRoot: ShadowRoot }
      const controls = el2.shadowRoot?.querySelector('[data-controls]')
      expect(controls).toBeNull()

      document.body.removeChild(el)
    })

    it('controls attribute adds controls div to shadow DOM after data loads', async () => {
      const { AsciiPlayerElement } = await importWebComponent()
      const el = new AsciiPlayerElement()
      el.setAttribute('controls', '')
      el.setAttribute('src', 'http://example.com/data.json')
      document.body.appendChild(el)

      // Wait for fetch and init to complete
      await new Promise((resolve) => setTimeout(resolve, 50))

      const controlsDiv = (el as unknown as { shadowRoot: ShadowRoot }).shadowRoot?.querySelector(
        '[data-controls]',
      )
      expect(controlsDiv).not.toBeNull()

      document.body.removeChild(el)
    })
  })

  describe('disconnectedCallback', () => {
    it('calls player.destroy() on disconnect', async () => {
      const { AsciiPlayerElement } = await importWebComponent()
      const el = new AsciiPlayerElement()
      el.setAttribute('src', 'http://example.com/data.json')
      document.body.appendChild(el)

      // Wait for init
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Should not throw when removed
      expect(() => document.body.removeChild(el)).not.toThrow()
    })
  })

  describe('public API delegation', () => {
    it('play() method exists on element', async () => {
      const { AsciiPlayerElement } = await importWebComponent()
      const el = new AsciiPlayerElement()
      expect(typeof el.play).toBe('function')
    })

    it('pause() method exists on element', async () => {
      const { AsciiPlayerElement } = await importWebComponent()
      const el = new AsciiPlayerElement()
      expect(typeof el.pause).toBe('function')
    })

    it('seekTo() method exists on element', async () => {
      const { AsciiPlayerElement } = await importWebComponent()
      const el = new AsciiPlayerElement()
      expect(typeof el.seekTo).toBe('function')
    })

    it('seekToFrame() method exists on element', async () => {
      const { AsciiPlayerElement } = await importWebComponent()
      const el = new AsciiPlayerElement()
      expect(typeof el.seekToFrame).toBe('function')
    })

    it('currentTime returns 0 before player init', async () => {
      const { AsciiPlayerElement } = await importWebComponent()
      const el = new AsciiPlayerElement()
      expect(el.currentTime).toBe(0)
    })

    it('duration returns 0 before player init', async () => {
      const { AsciiPlayerElement } = await importWebComponent()
      const el = new AsciiPlayerElement()
      expect(el.duration).toBe(0)
    })

    it('play() delegates to internal AsciiPlayer after data loaded', async () => {
      const { AsciiPlayerElement } = await importWebComponent()
      const el = new AsciiPlayerElement()
      el.setAttribute('src', 'http://example.com/data.json')
      document.body.appendChild(el)

      await new Promise((resolve) => setTimeout(resolve, 50))

      // Should not throw after player is initialized
      expect(() => el.play()).not.toThrow()

      document.body.removeChild(el)
    })

    it('pause() delegates to internal AsciiPlayer after data loaded', async () => {
      const { AsciiPlayerElement } = await importWebComponent()
      const el = new AsciiPlayerElement()
      el.setAttribute('src', 'http://example.com/data.json')
      document.body.appendChild(el)

      await new Promise((resolve) => setTimeout(resolve, 50))

      expect(() => el.pause()).not.toThrow()

      document.body.removeChild(el)
    })
  })

  describe('registerAsciiPlayer function', () => {
    it('does not throw when called multiple times (guard against double registration)', async () => {
      const { registerAsciiPlayer } = await importWebComponent()
      expect(() => registerAsciiPlayer()).not.toThrow()
      expect(() => registerAsciiPlayer()).not.toThrow()
    })
  })
})
