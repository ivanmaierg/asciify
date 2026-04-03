import { AsciiPlayer } from './player'
import type { AsciiPlayerOptions, LoopMode, PlayerInputData, RenderMode, TriggerMode } from './types'
import { THEMES } from './types'

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

function parseLoop(value: string | null): LoopMode {
  if (!value || value === 'once') return 'once'
  if (value === 'forever') return 'forever'
  const n = Number(value)
  return isNaN(n) ? 'once' : n
}

// ──────────────────────────────────────────────────────────
// AsciiPlayerElement — <ascii-player> Web Component
// ──────────────────────────────────────────────────────────

export class AsciiPlayerElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return [
      'src',
      'autoplay',
      'loop',
      'controls',
      'fps',
      'fg-color',
      'bg-color',
      'theme',
      'font',
      'mode',
      'char-delay',
      'trigger',
    ]
  }

  private _shadow: ShadowRoot
  private _canvas: HTMLCanvasElement
  private _player: AsciiPlayer | null = null
  private _pendingData: PlayerInputData | null = null
  private _controlsDiv: HTMLDivElement | null = null
  private _intersectionObserver: IntersectionObserver | null = null
  private _boundMouseEnter: (() => void) | null = null
  private _boundMouseLeave: (() => void) | null = null
  private _boundClick: (() => void) | null = null

  constructor() {
    super()

    // Open Shadow DOM (per D-01 discretion)
    this._shadow = this.attachShadow({ mode: 'open' })

    // Default CSS custom properties and host styling
    const style = document.createElement('style')
    style.textContent = `
      :host {
        display: block;
        width: 100%;
        --ascii-fg: #00ff00;
        --ascii-bg: #000000;
      }
      canvas {
        display: block;
        width: 100%;
        height: auto;
      }
      [data-controls] {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        background: rgba(0, 0, 0, 0.7);
        color: #fff;
        font-family: monospace;
        font-size: 12px;
      }
      [data-controls] button {
        background: transparent;
        border: 1px solid currentColor;
        color: inherit;
        cursor: pointer;
        padding: 2px 8px;
        font-family: inherit;
        font-size: inherit;
      }
      [data-controls] input[type="range"] {
        flex: 1;
      }
    `
    this._shadow.appendChild(style)

    // Canvas element
    this._canvas = document.createElement('canvas') as HTMLCanvasElement
    this._shadow.appendChild(this._canvas)
  }

  // ──────────────────────────────────────────────────────────
  // Lifecycle callbacks
  // ──────────────────────────────────────────────────────────

  connectedCallback(): void {
    const src = this.getAttribute('src')
    if (src) {
      fetch(src)
        .then((r) => r.json())
        .then((data: PlayerInputData) => this._initPlayer(data))
        .catch((err) => {
          console.error('[ascii-player] Failed to load src:', err)
          this.dispatchEvent(
            new CustomEvent('error', {
              detail: { error: err },
              bubbles: true,
              composed: true,
            }),
          )
        })
    } else if (this._pendingData) {
      this._initPlayer(this._pendingData)
      this._pendingData = null
    }
  }

  disconnectedCallback(): void {
    this._teardownTrigger()
    this._player?.destroy()
    this._player = null
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
    if (oldVal === newVal) return

    if (name === 'src' && newVal && this.isConnected) {
      fetch(newVal)
        .then((r) => r.json())
        .then((data: PlayerInputData) => this._initPlayer(data))
        .catch((err) => console.error('[ascii-player] Failed to load src:', err))
      return
    }

    if (name === 'controls') {
      if (this._player) {
        if (newVal !== null) {
          this._renderControls()
        } else {
          this._removeControls()
        }
      }
      return
    }

    if (name === 'trigger') {
      this._teardownTrigger()
      if (newVal && this._player) {
        this._player.ready.then(() => {
          if (this._player) this._setupTrigger(newVal)
        })
      }
      return
    }

    // For color/theme/font/fps/loop changes: reinitialize player if running
    // Simple approach: if player exists, it will be reinitialized on next data load
    // For now, attribute changes to non-structural options are deferred to next init
  }

  // ──────────────────────────────────────────────────────────
  // .data property setter (direct object assignment)
  // ──────────────────────────────────────────────────────────

  set data(value: PlayerInputData) {
    if (this.isConnected) {
      this._initPlayer(value)
    } else {
      this._pendingData = value
    }
  }

  // ──────────────────────────────────────────────────────────
  // Internal: initialize or reinitialize AsciiPlayer
  // ──────────────────────────────────────────────────────────

  private _initPlayer(data: PlayerInputData): void {
    // Destroy existing player if any
    this._player?.destroy()
    this._player = null
    this._removeControls()

    // Resolve colors with priority chain (D-01):
    // theme < CSS custom property < explicit fg-color/bg-color attr
    const themeName = this.getAttribute('theme')
    const theme = themeName ? THEMES[themeName] : null

    const fgColor = this._resolveColor(
      'fg-color',
      '--ascii-fg',
      theme?.fgColor ?? '#00ff00',
    )
    const bgColor = this._resolveColor(
      'bg-color',
      '--ascii-bg',
      theme?.bgColor ?? '#000000',
    )

    // Auto-size canvas (PLR-09): width-driven, height from frame aspect ratio
    const meta = (data as { metadata: { rows: number; columns: number; fps?: number } }).metadata
    const width = this.clientWidth || 640
    const height =
      meta.rows && meta.columns
        ? Math.round(width * (meta.rows / meta.columns))
        : Math.round(width * 0.5)

    this._canvas.width = width
    this._canvas.height = height

    // Build options
    const fpsAttr = this.getAttribute('fps')
    const charDelayAttr = this.getAttribute('char-delay')
    const triggerAttr = this.getAttribute('trigger') as TriggerMode | null
    const options: AsciiPlayerOptions = {
      fps: fpsAttr ? Number(fpsAttr) : (meta as { fps?: number }).fps ?? 24,
      loop: parseLoop(this.getAttribute('loop')),
      autoplay: this.hasAttribute('autoplay'),
      font: this.getAttribute('font') ?? '14px monospace',
      fgColor,
      bgColor,
      mode: (this.getAttribute('mode') as RenderMode) ?? 'grid',
      charDelay: charDelayAttr ? Number(charDelayAttr) : undefined,
      trigger: triggerAttr ?? undefined,
    }

    // Create player
    this._player = new AsciiPlayer(this._canvas, data, options)

    // Set up trigger if present (after player is ready)
    if (triggerAttr) {
      this._player.ready.then(() => {
        if (this._player) this._setupTrigger(triggerAttr)
      })
    }

    // Forward events from player to element (composed: true to pierce Shadow DOM)
    this._player.addEventListener('timeupdate', (e) => {
      this.dispatchEvent(
        new CustomEvent('timeupdate', {
          detail: (e as CustomEvent).detail,
          bubbles: true,
          composed: true,
        }),
      )
    })

    this._player.addEventListener('ended', () => {
      this.dispatchEvent(
        new CustomEvent('ended', {
          bubbles: true,
          composed: true,
        }),
      )
    })

    // Render controls if attribute present
    if (this.hasAttribute('controls')) {
      // Wait for player.ready so we have duration for the progress bar
      this._player.ready.then(() => {
        if (this._player) this._renderControls()
      })
    }
  }

  // ──────────────────────────────────────────────────────────
  // Internal: trigger setup / teardown
  // ──────────────────────────────────────────────────────────

  private _setupTrigger(trigger: string): void {
    if (trigger === 'scroll') {
      this._intersectionObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              this.seekTo(0)
              this.play()
            }
          }
        },
        { threshold: 0.5 },
      )
      this._intersectionObserver.observe(this)
    } else if (trigger === 'hover') {
      this._boundMouseEnter = () => {
        this.seekTo(0)
        this.play()
      }
      this._boundMouseLeave = () => {
        this.pause()
      }
      this.addEventListener('mouseenter', this._boundMouseEnter)
      this.addEventListener('mouseleave', this._boundMouseLeave)
    } else if (trigger === 'click') {
      this._boundClick = () => {
        if (this._player?.isPlaying) {
          this.pause()
        } else {
          this.seekTo(0)
          this.play()
        }
      }
      this.addEventListener('click', this._boundClick)
    }
  }

  private _teardownTrigger(): void {
    if (this._intersectionObserver) {
      this._intersectionObserver.disconnect()
      this._intersectionObserver = null
    }
    if (this._boundMouseEnter) {
      this.removeEventListener('mouseenter', this._boundMouseEnter)
      this._boundMouseEnter = null
    }
    if (this._boundMouseLeave) {
      this.removeEventListener('mouseleave', this._boundMouseLeave)
      this._boundMouseLeave = null
    }
    if (this._boundClick) {
      this.removeEventListener('click', this._boundClick)
      this._boundClick = null
    }
  }

  // ──────────────────────────────────────────────────────────
  // Internal: color resolution
  // ──────────────────────────────────────────────────────────

  private _resolveColor(
    attrName: string,
    cssVarName: string,
    defaultColor: string,
  ): string {
    const attr = this.getAttribute(attrName)
    if (attr) return attr
    const cssVar = getComputedStyle(this).getPropertyValue(cssVarName).trim()
    if (cssVar) return cssVar
    return defaultColor
  }

  // ──────────────────────────────────────────────────────────
  // Internal: controls bar
  // ──────────────────────────────────────────────────────────

  private _renderControls(): void {
    this._removeControls()
    if (!this._player) return

    const player = this._player
    const div = document.createElement('div')
    div.setAttribute('data-controls', '')

    // Play/Pause button
    const btn = document.createElement('button')
    btn.textContent = 'Play'
    btn.addEventListener('click', () => {
      if (player.isPlaying) {
        player.pause()
        btn.textContent = 'Play'
      } else {
        player.play()
        btn.textContent = 'Pause'
      }
    })

    // Progress range input
    const range = document.createElement('input')
    range.type = 'range'
    range.min = '0'
    range.max = '100'
    range.value = '0'
    range.addEventListener('input', () => {
      const duration = player.duration
      if (duration > 0) {
        player.seekTo((duration * Number(range.value)) / 100)
      }
    })

    // Update range on timeupdate
    player.addEventListener('timeupdate', (e) => {
      const detail = (e as CustomEvent<{ currentTime: number }>).detail
      const duration = player.duration
      if (duration > 0) {
        range.value = String((detail.currentTime / duration) * 100)
      }
    })

    // Update button text based on playback state
    player.addEventListener('ended', () => {
      btn.textContent = 'Play'
    })

    div.appendChild(btn)
    div.appendChild(range)

    this._controlsDiv = div
    this._shadow.appendChild(div)
  }

  private _removeControls(): void {
    if (this._controlsDiv) {
      this._controlsDiv.remove()
      this._controlsDiv = null
    }
  }

  // ──────────────────────────────────────────────────────────
  // Public API delegation (PLR-04)
  // ──────────────────────────────────────────────────────────

  play(): void {
    this._player?.play()
  }

  pause(): void {
    this._player?.pause()
  }

  seekTo(seconds: number): void {
    this._player?.seekTo(seconds)
  }

  seekToFrame(index: number): void {
    this._player?.seekToFrame(index)
  }

  get currentTime(): number {
    return this._player?.currentTime ?? 0
  }

  get duration(): number {
    return this._player?.duration ?? 0
  }
}

// ──────────────────────────────────────────────────────────
// Registration (guarded against double-registration, Pitfall 2)
// ──────────────────────────────────────────────────────────

export function registerAsciiPlayer(): void {
  if (typeof customElements !== 'undefined' && !customElements.get('ascii-player')) {
    customElements.define('ascii-player', AsciiPlayerElement)
  }
}

// Auto-register when module loads in browser
registerAsciiPlayer()
