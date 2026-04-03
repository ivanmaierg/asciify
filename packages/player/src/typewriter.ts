/**
 * TypewriterReveal — reveals characters one at a time at configurable charDelay intervals.
 * Generates per-character timestamps for external audio sync (MODE-04).
 */
export class TypewriterReveal {
  private _charDelay: number
  private _timeoutId: ReturnType<typeof setTimeout> | null = null
  private _cancelled: boolean = false

  constructor(charDelay: number = 30) {
    this._charDelay = charDelay
  }

  get charDelay(): number { return this._charDelay }

  /**
   * Begins revealing characters sequentially.
   * @param totalChars - Total number of characters to reveal
   * @param onChar - Called for each character revealed: (revealCount, charIndex, timestamp)
   * @param onComplete - Called when all characters are revealed, with full timestamps array
   * @param startTime - Base timestamp offset in ms (default 0)
   */
  reveal(
    totalChars: number,
    onChar: (revealCount: number, charIndex: number, timestamp: number) => void,
    onComplete: (timestamps: number[]) => void,
    startTime: number = 0,
  ): void {
    this._cancelled = false
    const timestamps: number[] = []
    let i = 0

    const step = () => {
      if (this._cancelled || i >= totalChars) {
        if (!this._cancelled) onComplete(timestamps)
        return
      }
      const t = startTime + i * this._charDelay
      timestamps.push(t)
      onChar(i + 1, i, t)
      i++
      this._timeoutId = setTimeout(step, this._charDelay)
    }
    step()
  }

  /**
   * Cancels an in-progress reveal. The onComplete callback will not be called.
   */
  cancel(): void {
    this._cancelled = true
    if (this._timeoutId !== null) {
      clearTimeout(this._timeoutId)
      this._timeoutId = null
    }
  }
}
