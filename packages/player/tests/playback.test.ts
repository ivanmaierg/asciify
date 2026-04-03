import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PlaybackController } from '../src/playback'
import type { LoopMode } from '../src/types'

// Mock rAF / cAF
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

function runFrame(timestamp: number) {
  // Run the most recently scheduled rAF callback
  const ids = [...rafCallbacks.keys()]
  if (ids.length === 0) return
  const lastId = ids[ids.length - 1]
  const cb = rafCallbacks.get(lastId)!
  rafCallbacks.delete(lastId)
  cb(timestamp)
}

beforeEach(() => {
  rafCallbacks = new Map()
  rafIdCounter = 0
  mockRaf.mockClear()
  mockCaf.mockClear()
  vi.stubGlobal('requestAnimationFrame', mockRaf)
  vi.stubGlobal('cancelAnimationFrame', mockCaf)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function makeCallbacks() {
  return {
    onFrame: vi.fn(),
    onTimeUpdate: vi.fn(),
    onEnded: vi.fn(),
  }
}

describe('PlaybackController', () => {
  describe('play() / pause()', () => {
    it('play() calls requestAnimationFrame', () => {
      const cbs = makeCallbacks()
      const pc = new PlaybackController(10, 24, 'once', cbs)
      pc.play()
      expect(mockRaf).toHaveBeenCalledTimes(1)
    })

    it('pause() calls cancelAnimationFrame', () => {
      const cbs = makeCallbacks()
      const pc = new PlaybackController(10, 24, 'once', cbs)
      pc.play()
      pc.pause()
      expect(mockCaf).toHaveBeenCalledTimes(1)
    })

    it('isPlaying reflects state correctly', () => {
      const cbs = makeCallbacks()
      const pc = new PlaybackController(10, 24, 'once', cbs)
      expect(pc.isPlaying).toBe(false)
      pc.play()
      expect(pc.isPlaying).toBe(true)
      pc.pause()
      expect(pc.isPlaying).toBe(false)
    })

    it('calling play() twice does not schedule two rAF loops', () => {
      const cbs = makeCallbacks()
      const pc = new PlaybackController(10, 24, 'once', cbs)
      pc.play()
      pc.play()
      expect(mockRaf).toHaveBeenCalledTimes(1)
    })
  })

  describe('FPS throttle', () => {
    it('onFrame fires when elapsed >= 1000/fps', () => {
      const cbs = makeCallbacks()
      const fps = 10
      const pc = new PlaybackController(10, fps, 'forever', cbs)
      pc.play()
      // First tick -- sets lastFrameTime, no frame advance yet
      runFrame(0)
      // elapsed = 200ms >= 100ms (1000/10)
      runFrame(200)
      expect(cbs.onFrame).toHaveBeenCalledTimes(1)
      expect(cbs.onFrame).toHaveBeenCalledWith(0)
    })

    it('onFrame does NOT fire when elapsed < 1000/fps', () => {
      const cbs = makeCallbacks()
      const fps = 10
      const pc = new PlaybackController(10, fps, 'forever', cbs)
      pc.play()
      runFrame(0)
      // elapsed = 50ms < 100ms (1000/10)
      runFrame(50)
      expect(cbs.onFrame).toHaveBeenCalledTimes(0)
    })
  })

  describe('seekTo / seekToFrame', () => {
    it('seekToFrame(index) updates currentFrameIndex immediately', () => {
      const cbs = makeCallbacks()
      const pc = new PlaybackController(30, 30, 'once', cbs)
      pc.seekToFrame(15)
      expect(pc.currentFrameIndex).toBe(15)
    })

    it('seekTo(seconds) converts to frame index via Math.floor(seconds * fps)', () => {
      const cbs = makeCallbacks()
      const fps = 24
      const pc = new PlaybackController(240, fps, 'once', cbs)
      pc.seekTo(3.7)
      expect(pc.currentFrameIndex).toBe(Math.floor(3.7 * fps)) // 88
    })

    it('seekToFrame clamps to valid range', () => {
      const cbs = makeCallbacks()
      const pc = new PlaybackController(10, 24, 'once', cbs)
      pc.seekToFrame(100)
      expect(pc.currentFrameIndex).toBe(9)
      pc.seekToFrame(-5)
      expect(pc.currentFrameIndex).toBe(0)
    })
  })

  describe('currentTime / duration', () => {
    it('currentTime returns currentFrameIndex / fps', () => {
      const cbs = makeCallbacks()
      const fps = 24
      const pc = new PlaybackController(240, fps, 'once', cbs)
      pc.seekToFrame(48)
      expect(pc.currentTime).toBeCloseTo(48 / fps)
    })

    it('duration returns totalFrames / fps', () => {
      const cbs = makeCallbacks()
      const fps = 24
      const pc = new PlaybackController(240, fps, 'once', cbs)
      expect(pc.duration).toBeCloseTo(240 / fps)
    })
  })

  describe('Loop modes', () => {
    it('loop "once": after last frame calls onEnded and stops', () => {
      const cbs = makeCallbacks()
      const totalFrames = 3
      const fps = 10
      const pc = new PlaybackController(totalFrames, fps, 'once', cbs)
      pc.play()

      const frameDuration = 1000 / fps // 100ms

      // Advance through all 3 frames
      runFrame(0)
      runFrame(frameDuration)       // frame 0 rendered
      runFrame(frameDuration * 2)   // frame 1 rendered
      runFrame(frameDuration * 3)   // frame 2 rendered (last)

      // After last frame: should call onEnded and stop
      expect(cbs.onEnded).toHaveBeenCalledTimes(1)
      expect(pc.isPlaying).toBe(false)
    })

    it('loop "once": does NOT restart after last frame', () => {
      const cbs = makeCallbacks()
      const totalFrames = 3
      const fps = 10
      const pc = new PlaybackController(totalFrames, fps, 'once', cbs)
      pc.play()

      const frameDuration = 1000 / fps
      runFrame(0)
      runFrame(frameDuration)
      runFrame(frameDuration * 2)
      runFrame(frameDuration * 3)

      // Should not reset frame index to 0
      // After ending, currentFrameIndex should be at last frame or past it
      // and NOT restart (isPlaying = false)
      expect(pc.isPlaying).toBe(false)
      // onEnded called exactly once
      expect(cbs.onEnded).toHaveBeenCalledTimes(1)
    })

    it('loop "forever": after last frame resets to frame 0 and keeps playing', () => {
      const cbs = makeCallbacks()
      const totalFrames = 3
      const fps = 10
      const pc = new PlaybackController(totalFrames, fps, 'forever', cbs)
      pc.play()

      const frameDuration = 1000 / fps
      runFrame(0)
      runFrame(frameDuration)
      runFrame(frameDuration * 2)
      runFrame(frameDuration * 3) // last frame rendered, should loop back

      // Should still be playing and reset to frame 0
      expect(pc.isPlaying).toBe(true)
      expect(pc.currentFrameIndex).toBe(0)
      expect(cbs.onEnded).not.toHaveBeenCalled()
    })

    it('loop N (number): decrements and restarts until 0, then stops', () => {
      const cbs = makeCallbacks()
      const totalFrames = 2
      const fps = 10
      const pc = new PlaybackController(totalFrames, fps, 2, cbs)
      pc.play()

      const frameDuration = 1000 / fps
      // First pass
      runFrame(0)
      runFrame(frameDuration)       // frame 0
      runFrame(frameDuration * 2)   // frame 1 (last) -> decrement N to 1, restart

      expect(pc.isPlaying).toBe(true)
      expect(cbs.onEnded).not.toHaveBeenCalled()

      // Second pass
      runFrame(frameDuration * 3)   // frame 0
      runFrame(frameDuration * 4)   // frame 1 (last) -> N=0, stop + onEnded

      expect(cbs.onEnded).toHaveBeenCalledTimes(1)
      expect(pc.isPlaying).toBe(false)
    })
  })

  describe('destroy()', () => {
    it('destroy() pauses playback', () => {
      const cbs = makeCallbacks()
      const pc = new PlaybackController(10, 24, 'once', cbs)
      pc.play()
      pc.destroy()
      expect(pc.isPlaying).toBe(false)
    })
  })
})
