import type { LoopMode } from './types'

export interface PlaybackCallbacks {
  onFrame: (frameIndex: number) => void
  onTimeUpdate: (currentTime: number) => void
  onEnded: () => void
}

/**
 * Manages the requestAnimationFrame loop with FPS throttling and loop state machine.
 */
export class PlaybackController {
  private _totalFrames: number
  private _fps: number
  private _loop: LoopMode
  private _loopRemaining: number
  private _callbacks: PlaybackCallbacks | null
  private _isPlaying: boolean
  private _currentFrameIndex: number
  private _rafId: number
  private _lastFrameTime: number
  private _tick: FrameRequestCallback

  constructor(
    totalFrames: number,
    fps: number,
    loop: LoopMode,
    callbacks: PlaybackCallbacks,
  ) {
    this._totalFrames = totalFrames
    this._fps = fps
    this._loop = loop
    this._loopRemaining = typeof loop === 'number' ? loop : 0
    this._callbacks = callbacks
    this._isPlaying = false
    this._currentFrameIndex = 0
    this._rafId = 0
    this._lastFrameTime = -1

    // Bind tick so it can be used as rAF callback
    this._tick = this._tickImpl.bind(this)
  }

  get isPlaying(): boolean {
    return this._isPlaying
  }

  get currentFrameIndex(): number {
    return this._currentFrameIndex
  }

  get currentTime(): number {
    return this._currentFrameIndex / this._fps
  }

  get duration(): number {
    return this._totalFrames / this._fps
  }

  set fps(value: number) {
    this._fps = value
  }

  set loop(value: LoopMode) {
    this._loop = value
    if (typeof value === 'number') {
      this._loopRemaining = value
    }
  }

  play(): void {
    if (this._isPlaying) return
    this._isPlaying = true
    this._lastFrameTime = -1
    this._rafId = requestAnimationFrame(this._tick)
  }

  pause(): void {
    this._isPlaying = false
    cancelAnimationFrame(this._rafId)
    this._rafId = 0
  }

  seekTo(seconds: number): void {
    const index = Math.floor(seconds * this._fps)
    this.seekToFrame(index)
  }

  seekToFrame(index: number): void {
    this._currentFrameIndex = Math.max(0, Math.min(index, this._totalFrames - 1))
  }

  destroy(): void {
    this.pause()
    this._callbacks = null
  }

  private _tickImpl(timestamp: number): void {
    if (!this._isPlaying) return

    // Initialize last frame time on first tick
    if (this._lastFrameTime < 0) {
      this._lastFrameTime = timestamp
      this._rafId = requestAnimationFrame(this._tick)
      return
    }

    const frameDuration = 1000 / this._fps
    const elapsed = timestamp - this._lastFrameTime

    if (elapsed >= frameDuration) {
      // Drift correction: subtract the fractional overshoot
      this._lastFrameTime = timestamp - (elapsed % frameDuration)

      // Render current frame
      this._callbacks?.onFrame(this._currentFrameIndex)
      this._callbacks?.onTimeUpdate(this.currentTime)

      // Advance to next frame
      this._advance()
    }

    // Schedule next tick if still playing
    if (this._isPlaying) {
      this._rafId = requestAnimationFrame(this._tick)
    }
  }

  private _advance(): void {
    this._currentFrameIndex++

    if (this._currentFrameIndex >= this._totalFrames) {
      // Reached end of animation
      const loop = this._loop

      if (loop === 'forever') {
        // Restart from beginning
        this._currentFrameIndex = 0
      } else if (loop === 'once') {
        // Stop and signal end
        this._currentFrameIndex = this._totalFrames - 1
        this.pause()
        this._callbacks?.onEnded()
      } else if (typeof loop === 'number') {
        // Decrement remaining count
        this._loopRemaining--
        if (this._loopRemaining <= 0) {
          // Done looping
          this._currentFrameIndex = this._totalFrames - 1
          this.pause()
          this._callbacks?.onEnded()
        } else {
          // Restart
          this._currentFrameIndex = 0
        }
      }
    }
  }
}
