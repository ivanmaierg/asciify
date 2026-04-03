import type {
  AsciiPlayerData,
  AsciiPlayerDataCompact,
  AsciiFrame,
  DeltaPatch,
  EncodedFrame,
} from '@asciify/encoder'
import { rleDecode } from '@asciify/encoder'
import { prepare } from '@chenglou/pretext'
import type { AsciiPlayerOptions, LoopMode, PlayerInputData, RenderMode } from './types'
import { PlaybackController } from './playback'
import { renderGridFrame, renderProportionalFrame, renderTypewriterFrame } from './renderer'
import { TypewriterReveal } from './typewriter'

/**
 * AsciiPlayer is the core ES Module API for animated ASCII art playback.
 * Supports uncompressed (AsciiPlayerData) and compact (AsciiPlayerDataCompact) formats.
 */
export class AsciiPlayer extends EventTarget {
  readonly ready: Promise<void>

  private _canvas: HTMLCanvasElement
  private _ctx: CanvasRenderingContext2D
  private _frames: AsciiFrame[]
  private _fps: number
  private _loop: LoopMode
  private _font: string
  private _fgColor: string
  private _bgColor: string
  private _colorMode: string
  private _charWidth: number
  private _lineHeight: number
  private _playback!: PlaybackController
  private _options: AsciiPlayerOptions
  private _mode: RenderMode
  private _typewriter: TypewriterReveal | null = null
  private _revealCount: number = 0
  private _isRevealing: boolean = false
  private _charTimestamps: Float64Array | null = null

  constructor(
    canvas: HTMLCanvasElement,
    data: PlayerInputData,
    options: AsciiPlayerOptions = {},
  ) {
    super()

    this._canvas = canvas
    this._ctx = canvas.getContext('2d')!
    this._frames = []
    this._charWidth = 0
    this._lineHeight = 0
    this._options = options
    this._mode = options.mode ?? 'grid'

    // Resolve options with defaults
    this._fps = options.fps ?? data.metadata.fps ?? 24
    this._loop = options.loop ?? 'once'
    this._font = options.font ?? '14px monospace'
    this._fgColor = options.fgColor ?? '#00ff00'
    this._bgColor = options.bgColor ?? '#000000'
    this._colorMode = data.metadata.colorMode ?? 'monochrome'

    // Start async init
    this.ready = this._init(data)

    // Autoplay: chain play() after ready resolves (D-08: trigger takes precedence over autoplay)
    if (options.autoplay && !options.trigger) {
      this.ready.then(() => this.play())
    }
  }

  // ──────────────────────────────────────────────────────────
  // Playback delegation
  // ──────────────────────────────────────────────────────────

  play(): void {
    this._playback.play()
  }

  pause(): void {
    this._playback.pause()
  }

  seekTo(seconds: number): void {
    this._playback.seekTo(seconds)
  }

  seekToFrame(index: number): void {
    this._playback.seekToFrame(index)
  }

  get currentFrameIndex(): number {
    return this._playback.currentFrameIndex
  }

  get currentTime(): number {
    return this._playback.currentTime
  }

  get duration(): number {
    return this._playback.duration
  }

  get isPlaying(): boolean {
    return this._playback.isPlaying
  }

  get charTimestamps(): Float64Array | null {
    return this._charTimestamps
  }

  destroy(): void {
    this._typewriter?.cancel()
    this._playback?.destroy()
    const ctx = this._ctx
    ctx.clearRect(0, 0, this._canvas.width, this._canvas.height)
  }

  // ──────────────────────────────────────────────────────────
  // Init
  // ──────────────────────────────────────────────────────────

  private async _init(data: PlayerInputData): Promise<void> {
    // Detect format: compact if frames contain strings or DeltaPatch arrays
    if (this._isCompact(data)) {
      this._frames = this._decompressFrames(data as AsciiPlayerDataCompact)
    } else {
      this._frames = (data as AsciiPlayerData).frames
    }

    // Wait for font to load (PLR-11, MODE-05)
    await document.fonts.load(this._font)

    // Prime pretext measurement cache (D-11)
    const sampleText = this._frames[0]?.text ?? ' '
    prepare(sampleText, this._font)

    // Measure character width via canvas context
    this._ctx.font = this._font
    this._charWidth = this._ctx.measureText('M').width

    // Calculate line height from font size (standard 1.2x multiplier)
    const fontSize = parseFloat(this._font)
    this._lineHeight = fontSize * 1.2

    // Create playback controller
    this._playback = new PlaybackController(
      this._frames.length,
      this._fps,
      this._loop,
      {
        onFrame: (frameIndex: number) => {
          const frame = this._frames[frameIndex]
          if (!frame) return

          if (this._mode === 'proportional') {
            renderProportionalFrame(
              this._ctx,
              frame,
              this._lineHeight,
              this._fgColor,
              this._bgColor,
              this._colorMode as Parameters<typeof renderGridFrame>[6],
            )
          } else if (this._mode === 'typewriter') {
            this._startTypewriterReveal(frame, frameIndex)
          } else {
            renderGridFrame(
              this._ctx,
              frame,
              this._charWidth,
              this._lineHeight,
              this._fgColor,
              this._bgColor,
              this._colorMode as Parameters<typeof renderGridFrame>[6],
            )
          }

          // Dispatch timeupdate event
          const currentTime = this._playback.currentTime
          this.dispatchEvent(
            new CustomEvent('timeupdate', {
              detail: { currentTime },
              bubbles: true,
              composed: true,
            }),
          )
          this._options.onTimeUpdate?.(currentTime)
        },
        onTimeUpdate: (_currentTime: number) => {
          // Already handled in onFrame above
        },
        onEnded: () => {
          this.dispatchEvent(
            new CustomEvent('ended', {
              bubbles: true,
              composed: true,
            }),
          )
          this._options.onEnded?.()
        },
      },
    )
  }

  // ──────────────────────────────────────────────────────────
  // Typewriter integration
  // ──────────────────────────────────────────────────────────

  private _startTypewriterReveal(frame: AsciiFrame, frameIndex: number): void {
    // Cancel any active reveal
    this._typewriter?.cancel()
    this._isRevealing = true
    this._playback.pause() // Pause frame advancement during reveal

    const charDelay = this._options.charDelay ?? 30
    this._typewriter = new TypewriterReveal(charDelay)

    // Count total chars in frame (sum of all row lengths)
    const totalChars = frame.cells.reduce((sum, row) => sum + row.length, 0)

    this._typewriter.reveal(
      totalChars,
      (revealCount: number) => {
        this._revealCount = revealCount
        renderTypewriterFrame(
          this._ctx,
          frame,
          this._charWidth,
          this._lineHeight,
          this._fgColor,
          this._bgColor,
          this._colorMode as Parameters<typeof renderGridFrame>[6],
          revealCount,
          true,
        )
      },
      (timestamps: number[]) => {
        this._isRevealing = false
        // Store timestamps (MODE-04) — only populated once for first frame
        if (!this._charTimestamps) {
          this._charTimestamps = new Float64Array(timestamps)
          this.dispatchEvent(
            new CustomEvent('timestamps-ready', {
              detail: { timestamps: this._charTimestamps },
              bubbles: true,
              composed: true,
            }),
          )
        }
        // Resume frame advancement
        this._playback.play()
      },
      frameIndex * (1000 / this._fps), // startTime offset
    )
  }

  // ──────────────────────────────────────────────────────────
  // Format detection and decompression
  // ──────────────────────────────────────────────────────────

  private _isCompact(data: PlayerInputData): boolean {
    const frames = data.frames as EncodedFrame[]
    if (frames.length === 0) return false
    const first = frames[0]
    // Compact frames are either strings (RLE keyframes) or arrays (delta patches)
    return typeof first === 'string' || Array.isArray(first)
  }

  private _decompressFrames(data: AsciiPlayerDataCompact): AsciiFrame[] {
    const result: AsciiFrame[] = []
    let prevText = ''

    for (const encoded of data.frames) {
      let text: string

      if (typeof encoded === 'string') {
        // RLE keyframe
        text = rleDecode(encoded)
      } else {
        // Delta patches: apply to previous frame text
        const patches = encoded as DeltaPatch
        const chars = prevText.split('')

        for (const [position, changedChars] of patches) {
          for (let i = 0; i < changedChars.length; i++) {
            chars[position + i] = changedChars[i]
          }
        }

        text = chars.join('')
      }

      // Compact format has text only -- no per-cell color data
      // Build minimal AsciiFrame with empty cells (monochrome rendering only)
      result.push({ text, cells: [] })
      prevText = text
    }

    return result
  }
}
