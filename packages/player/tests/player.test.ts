import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AsciiPlayer } from '../src/player'
import type { AsciiPlayerData, AsciiPlayerDataCompact } from '@asciify/encoder'
import { rleEncode } from '@asciify/encoder'

// ──────────────────────────────────────────────────────────
// Global mocks
// ──────────────────────────────────────────────────────────

// Mock prepare from @chenglou/pretext
vi.mock('@chenglou/pretext', () => ({
  prepare: vi.fn().mockReturnValue({}),
}))

// Mock renderer so we can spy on which render function is called
vi.mock('../src/renderer', () => ({
  renderGridFrame: vi.fn(),
  renderProportionalFrame: vi.fn(),
  renderTypewriterFrame: vi.fn(),
}))

// Mock typewriter so we can control reveal behavior
vi.mock('../src/typewriter', () => {
  const mockReveal = vi.fn()
  const mockCancel = vi.fn()
  function MockTypewriterReveal(this: { charDelay: number; reveal: typeof mockReveal; cancel: typeof mockCancel }, charDelay: number = 30) {
    this.charDelay = charDelay
    this.reveal = mockReveal
    this.cancel = mockCancel
  }
  const TypewriterReveal = vi.fn().mockImplementation(function(this: { charDelay: number; reveal: typeof mockReveal; cancel: typeof mockCancel }, charDelay: number = 30) {
    this.charDelay = charDelay
    this.reveal = mockReveal
    this.cancel = mockCancel
  })
  return { TypewriterReveal }
})

// Mock requestAnimationFrame / cancelAnimationFrame
let rafCallbacks: Map<number, FrameRequestCallback> = new Map()
let rafIdCounter = 0
const mockRaf = vi.fn((cb: FrameRequestCallback) => {
  const id = ++rafIdCounter
  rafCallbacks.set(id, cb)
  return id
})
const mockCaf = vi.fn((id: number) => {
  rafCallbacks.delete(id)
})

beforeEach(() => {
  rafCallbacks = new Map()
  rafIdCounter = 0
  mockRaf.mockClear()
  mockCaf.mockClear()
  vi.stubGlobal('requestAnimationFrame', mockRaf)
  vi.stubGlobal('cancelAnimationFrame', mockCaf)

  // Mock document.fonts.load
  vi.stubGlobal('document', {
    fonts: {
      load: vi.fn().mockResolvedValue([]),
    },
    createElement: (tag: string) => {
      if (tag === 'canvas') return makeMockCanvas()
      return {}
    },
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

function makeMockCtx() {
  return {
    fillStyle: '' as string,
    font: '' as string,
    textBaseline: '' as string,
    canvas: { width: 400, height: 200 },
    fillRect: vi.fn(),
    fillText: vi.fn(),
    clearRect: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 8 }),
  }
}

function makeMockCanvas() {
  const ctx = makeMockCtx()
  const canvas = {
    width: 400,
    height: 200,
    getContext: vi.fn().mockReturnValue(ctx),
  }
  return canvas as unknown as HTMLCanvasElement
}

function makeFrame(text: string, cols: number, rows: number) {
  const cells = []
  for (let r = 0; r < rows; r++) {
    const row = []
    for (let c = 0; c < cols; c++) {
      row.push({ char: text[r * cols + c] ?? ' ', r: 200, g: 200, b: 200, brightness: 0.5 })
    }
    cells.push(row)
  }
  return { text, cells }
}

function makeTestData(frameCount = 3): AsciiPlayerData {
  const cols = 10
  const rows = 5
  const frameText = '.'.repeat(cols * rows)
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
    frames: Array.from({ length: frameCount }, () => makeFrame(frameText, cols, rows)),
  }
}

function makeCompactData(): AsciiPlayerDataCompact {
  const cols = 5
  const rows = 2
  const text = '.'.repeat(cols * rows)
  const encoded = rleEncode(text)
  return {
    version: 1,
    metadata: {
      columns: cols,
      rows,
      fps: 10,
      duration: 2 / 10,
      frameCount: 2,
      colorMode: 'monochrome',
      charset: ' .:-=+*#%@',
    },
    frames: [
      encoded,        // keyframe
      encoded,        // another keyframe (simplest test case)
    ],
  }
}

// ──────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────

describe('AsciiPlayer', () => {
  describe('constructor', () => {
    it('returns immediately without awaiting ready', () => {
      const canvas = makeMockCanvas()
      const data = makeTestData()
      // Should not throw and not need to await
      const player = new AsciiPlayer(canvas, data)
      expect(player).toBeInstanceOf(AsciiPlayer)
      expect(player.ready).toBeInstanceOf(Promise)
    })

    it('ready is a Promise', () => {
      const canvas = makeMockCanvas()
      const data = makeTestData()
      const player = new AsciiPlayer(canvas, data)
      expect(player.ready).toBeInstanceOf(Promise)
    })
  })

  describe('ready / init', () => {
    it('ready resolves after init', async () => {
      const canvas = makeMockCanvas()
      const data = makeTestData()
      const player = new AsciiPlayer(canvas, data)
      await expect(player.ready).resolves.toBeUndefined()
    })

    it('calls document.fonts.load() with the font option string', async () => {
      const canvas = makeMockCanvas()
      const data = makeTestData()
      const font = '16px Courier'
      const player = new AsciiPlayer(canvas, data, { font })
      await player.ready
      expect(document.fonts.load).toHaveBeenCalledWith(font)
    })

    it('calls prepare() from @chenglou/pretext during init', async () => {
      const { prepare } = await import('@chenglou/pretext')
      const canvas = makeMockCanvas()
      const data = makeTestData()
      const font = '14px monospace'
      const player = new AsciiPlayer(canvas, data, { font })
      await player.ready
      expect(prepare).toHaveBeenCalled()
    })
  })

  describe('play / pause / seek delegation', () => {
    it('play() delegates to PlaybackController.play()', async () => {
      const canvas = makeMockCanvas()
      const data = makeTestData()
      const player = new AsciiPlayer(canvas, data)
      await player.ready
      player.play()
      expect(mockRaf).toHaveBeenCalled()
    })

    it('pause() delegates to PlaybackController.pause()', async () => {
      const canvas = makeMockCanvas()
      const data = makeTestData()
      const player = new AsciiPlayer(canvas, data)
      await player.ready
      player.play()
      player.pause()
      expect(mockCaf).toHaveBeenCalled()
    })

    it('seekTo() delegates to PlaybackController.seekTo()', async () => {
      const canvas = makeMockCanvas()
      const data = makeTestData(30) // 30 frames at 10fps = 3 seconds
      const player = new AsciiPlayer(canvas, data, { fps: 10 })
      await player.ready
      player.seekTo(1.5)
      expect(player.currentFrameIndex).toBe(15)
    })

    it('seekToFrame() delegates to PlaybackController.seekToFrame()', async () => {
      const canvas = makeMockCanvas()
      const data = makeTestData(10)
      const player = new AsciiPlayer(canvas, data)
      await player.ready
      player.seekToFrame(7)
      expect(player.currentFrameIndex).toBe(7)
    })
  })

  describe('currentTime / duration', () => {
    it('currentTime returns PlaybackController.currentTime', async () => {
      const canvas = makeMockCanvas()
      const data = makeTestData(10)
      const player = new AsciiPlayer(canvas, data, { fps: 10 })
      await player.ready
      player.seekToFrame(5)
      expect(player.currentTime).toBeCloseTo(5 / 10)
    })

    it('duration returns PlaybackController.duration', async () => {
      const canvas = makeMockCanvas()
      const data = makeTestData(20)
      const player = new AsciiPlayer(canvas, data, { fps: 10 })
      await player.ready
      expect(player.duration).toBeCloseTo(20 / 10)
    })
  })

  describe('autoplay', () => {
    it('autoplay: true calls play() after ready resolves', async () => {
      const canvas = makeMockCanvas()
      const data = makeTestData()
      const player = new AsciiPlayer(canvas, data, { autoplay: true })
      await player.ready
      // Give the then() chain a microtask to fire
      await Promise.resolve()
      expect(mockRaf).toHaveBeenCalled()
    })

    it('autoplay not set: play() is NOT called after ready', async () => {
      const canvas = makeMockCanvas()
      const data = makeTestData()
      const player = new AsciiPlayer(canvas, data)
      await player.ready
      await Promise.resolve()
      expect(mockRaf).not.toHaveBeenCalled()
    })
  })

  describe('destroy()', () => {
    it('destroy() calls PlaybackController.destroy() and clears canvas', async () => {
      const canvas = makeMockCanvas()
      const ctx = canvas.getContext('2d') as ReturnType<typeof makeMockCtx>
      const data = makeTestData()
      const player = new AsciiPlayer(canvas, data)
      await player.ready
      player.play()
      player.destroy()
      expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, canvas.width, canvas.height)
    })
  })

  describe('event dispatching', () => {
    it('dispatches "timeupdate" CustomEvent with detail.currentTime', async () => {
      const canvas = makeMockCanvas()
      const data = makeTestData(5)
      const player = new AsciiPlayer(canvas, data, { fps: 10 })
      await player.ready

      const timeupdateEvents: CustomEvent[] = []
      player.addEventListener('timeupdate', (e) => timeupdateEvents.push(e as CustomEvent))

      player.play()

      // Simulate a rAF tick that advances a frame
      const ids = [...rafCallbacks.keys()]
      const firstId = ids[0]
      const cb = rafCallbacks.get(firstId)!
      rafCallbacks.delete(firstId)
      cb(0) // init tick
      const ids2 = [...rafCallbacks.keys()]
      const secondId = ids2[0]
      const cb2 = rafCallbacks.get(secondId)!
      rafCallbacks.delete(secondId)
      cb2(200) // 200ms > 1000/10=100ms, so frame fires

      expect(timeupdateEvents.length).toBeGreaterThan(0)
      expect(timeupdateEvents[0].detail).toHaveProperty('currentTime')
    })

    it('dispatches "ended" CustomEvent when playback ends (loop: once)', async () => {
      const canvas = makeMockCanvas()
      const data = makeTestData(1) // 1 frame
      const player = new AsciiPlayer(canvas, data, { fps: 10, loop: 'once' })
      await player.ready

      const endedFired = vi.fn()
      player.addEventListener('ended', endedFired)

      player.play()
      const frameDuration = 1000 / 10

      // Run through all frames
      const runNextFrame = (ts: number) => {
        const ids = [...rafCallbacks.keys()]
        if (ids.length === 0) return
        const id = ids[ids.length - 1]
        const cb = rafCallbacks.get(id)!
        rafCallbacks.delete(id)
        cb(ts)
      }

      runNextFrame(0)
      runNextFrame(frameDuration)     // renders frame 0 (last), triggers end

      expect(endedFired).toHaveBeenCalled()
    })

    it('onTimeUpdate callback fires when provided in options', async () => {
      const canvas = makeMockCanvas()
      const data = makeTestData(5)
      const onTimeUpdate = vi.fn()
      const player = new AsciiPlayer(canvas, data, { fps: 10, onTimeUpdate })
      await player.ready

      player.play()

      const runNextFrame = (ts: number) => {
        const ids = [...rafCallbacks.keys()]
        if (ids.length === 0) return
        const id = ids[ids.length - 1]
        const cb = rafCallbacks.get(id)!
        rafCallbacks.delete(id)
        cb(ts)
      }

      runNextFrame(0)
      runNextFrame(200)

      expect(onTimeUpdate).toHaveBeenCalled()
    })

    it('onEnded callback fires when provided in options', async () => {
      const canvas = makeMockCanvas()
      const data = makeTestData(1)
      const onEnded = vi.fn()
      const player = new AsciiPlayer(canvas, data, { fps: 10, loop: 'once', onEnded })
      await player.ready

      player.play()
      const frameDuration = 1000 / 10

      const runNextFrame = (ts: number) => {
        const ids = [...rafCallbacks.keys()]
        if (ids.length === 0) return
        const id = ids[ids.length - 1]
        const cb = rafCallbacks.get(id)!
        rafCallbacks.delete(id)
        cb(ts)
      }

      runNextFrame(0)
      runNextFrame(frameDuration)

      expect(onEnded).toHaveBeenCalled()
    })
  })

  describe('uncompressed data (AsciiPlayerData)', () => {
    it('accepts AsciiPlayerData and uses frames directly', async () => {
      const canvas = makeMockCanvas()
      const data = makeTestData(5)
      const player = new AsciiPlayer(canvas, data)
      await player.ready
      expect(player.duration).toBeCloseTo(5 / data.metadata.fps)
    })
  })

  describe('compact data (AsciiPlayerDataCompact)', () => {
    it('accepts AsciiPlayerDataCompact and decompresses frames eagerly', async () => {
      const canvas = makeMockCanvas()
      const compactData = makeCompactData()
      const player = new AsciiPlayer(canvas, compactData)
      await player.ready
      // If decompression succeeded, player should have correct duration
      expect(player.duration).toBeCloseTo(compactData.metadata.frameCount / compactData.metadata.fps)
    })
  })

  describe('mode dispatch', () => {
    it('default mode is grid when not specified', async () => {
      const { renderGridFrame } = await import('../src/renderer')
      const canvas = makeMockCanvas()
      const data = makeTestData(3)
      const player = new AsciiPlayer(canvas, data)
      await player.ready
      player.play()

      // Trigger a rAF frame
      const ids = [...rafCallbacks.keys()]
      const firstId = ids[0]
      const cb = rafCallbacks.get(firstId)!
      rafCallbacks.delete(firstId)
      cb(0) // init tick
      const ids2 = [...rafCallbacks.keys()]
      const secondId = ids2[0]
      const cb2 = rafCallbacks.get(secondId)!
      rafCallbacks.delete(secondId)
      cb2(200) // 200ms triggers frame

      expect(renderGridFrame).toHaveBeenCalled()
    })

    it('mode=grid calls renderGridFrame', async () => {
      const { renderGridFrame } = await import('../src/renderer')
      const canvas = makeMockCanvas()
      const data = makeTestData(3)
      const player = new AsciiPlayer(canvas, data, { mode: 'grid' })
      await player.ready
      player.play()

      const cb1 = [...rafCallbacks.values()][0]!
      rafCallbacks.clear()
      cb1(0)
      const cb2 = [...rafCallbacks.values()][0]!
      rafCallbacks.clear()
      cb2(200)

      expect(renderGridFrame).toHaveBeenCalled()
    })

    it('mode=proportional calls renderProportionalFrame', async () => {
      const { renderProportionalFrame } = await import('../src/renderer')
      const canvas = makeMockCanvas()
      const data = makeTestData(3)
      const player = new AsciiPlayer(canvas, data, { mode: 'proportional' })
      await player.ready
      player.play()

      const cb1 = [...rafCallbacks.values()][0]!
      rafCallbacks.clear()
      cb1(0)
      const cb2 = [...rafCallbacks.values()][0]!
      rafCallbacks.clear()
      cb2(200)

      expect(renderProportionalFrame).toHaveBeenCalled()
    })

    it('mode=typewriter instantiates TypewriterReveal and calls reveal', async () => {
      const { TypewriterReveal } = await import('../src/typewriter')
      const canvas = makeMockCanvas()
      const data = makeTestData(3)
      const player = new AsciiPlayer(canvas, data, { mode: 'typewriter', charDelay: 50 })
      await player.ready
      player.play()

      const cb1 = [...rafCallbacks.values()][0]!
      rafCallbacks.clear()
      cb1(0)
      const cb2 = [...rafCallbacks.values()][0]!
      rafCallbacks.clear()
      cb2(200)

      expect(TypewriterReveal).toHaveBeenCalledWith(50)
    })

    it('mode=typewriter with charDelay passes delay to TypewriterReveal', async () => {
      const { TypewriterReveal } = await import('../src/typewriter')
      const canvas = makeMockCanvas()
      const data = makeTestData(3)
      const player = new AsciiPlayer(canvas, data, { mode: 'typewriter', charDelay: 100 })
      await player.ready
      player.play()

      const cb1 = [...rafCallbacks.values()][0]!
      rafCallbacks.clear()
      cb1(0)
      const cb2 = [...rafCallbacks.values()][0]!
      rafCallbacks.clear()
      cb2(200)

      expect(TypewriterReveal).toHaveBeenCalledWith(100)
    })

    it('charTimestamps is null initially', async () => {
      const canvas = makeMockCanvas()
      const data = makeTestData(3)
      const player = new AsciiPlayer(canvas, data)
      await player.ready
      expect(player.charTimestamps).toBeNull()
    })

    it('charTimestamps is populated after typewriter reveal completes', async () => {
      const { TypewriterReveal } = await import('../src/typewriter')
      // Make reveal call onComplete immediately with mock timestamps
      const mockRevealImpl = vi.fn((
        _totalChars: number,
        onChar: (revealCount: number, charIndex: number, timestamp: number) => void,
        onComplete: (timestamps: number[]) => void,
      ) => {
        // Simulate immediate single-char reveal + complete
        onChar(1, 0, 0)
        onComplete([0, 30, 60])
      });
      (TypewriterReveal as ReturnType<typeof vi.fn>).mockImplementation(function(this: { charDelay: number; reveal: unknown; cancel: unknown }, charDelay: number = 30) {
        this.charDelay = charDelay
        this.reveal = mockRevealImpl
        this.cancel = vi.fn()
      })

      const canvas = makeMockCanvas()
      const data = makeTestData(3)
      const player = new AsciiPlayer(canvas, data, { mode: 'typewriter' })
      await player.ready
      player.play()

      const cb1 = [...rafCallbacks.values()][0]!
      rafCallbacks.clear()
      cb1(0)
      const cb2 = [...rafCallbacks.values()][0]!
      rafCallbacks.clear()
      cb2(200)

      expect(player.charTimestamps).toBeInstanceOf(Float64Array)
      expect(player.charTimestamps?.length).toBe(3)
    })

    it('dispatches timestamps-ready CustomEvent when charTimestamps populated', async () => {
      const { TypewriterReveal } = await import('../src/typewriter')
      const mockRevealImpl = vi.fn((
        _totalChars: number,
        onChar: (revealCount: number, charIndex: number, timestamp: number) => void,
        onComplete: (timestamps: number[]) => void,
      ) => {
        onChar(1, 0, 0)
        onComplete([0, 30, 60])
      });
      (TypewriterReveal as ReturnType<typeof vi.fn>).mockImplementation(function(this: { charDelay: number; reveal: unknown; cancel: unknown }, charDelay: number = 30) {
        this.charDelay = charDelay
        this.reveal = mockRevealImpl
        this.cancel = vi.fn()
      })

      const canvas = makeMockCanvas()
      const data = makeTestData(3)
      const player = new AsciiPlayer(canvas, data, { mode: 'typewriter' })
      await player.ready

      const timestampsReadyFired = vi.fn()
      player.addEventListener('timestamps-ready', timestampsReadyFired)

      player.play()
      const cb1 = [...rafCallbacks.values()][0]!
      rafCallbacks.clear()
      cb1(0)
      const cb2 = [...rafCallbacks.values()][0]!
      rafCallbacks.clear()
      cb2(200)

      expect(timestampsReadyFired).toHaveBeenCalled()
    })

    it('autoplay with trigger set does NOT autoplay (D-08)', async () => {
      const canvas = makeMockCanvas()
      const data = makeTestData(3)
      const player = new AsciiPlayer(canvas, data, { autoplay: true, trigger: 'scroll' })
      await player.ready
      await Promise.resolve() // allow microtasks

      // rAF should not be called since trigger prevents autoplay
      expect(mockRaf).not.toHaveBeenCalled()
    })
  })
})
