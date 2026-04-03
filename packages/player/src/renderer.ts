import type { AsciiFrame } from '@asciify/encoder'
import type { ColorMode } from '@asciify/encoder'
import { prepareWithSegments, layoutWithLines } from '@chenglou/pretext'

/**
 * Renders a single ASCII frame in proportional font mode.
 * Character x-positions are derived from pretext widths[] prefix sums (D-01),
 * not from ctx.measureText(). Characters are clipped silently at canvas edge (D-02).
 * Supports per-cell coloring in colored/monoscale modes (D-03).
 */
export function renderProportionalFrame(
  ctx: CanvasRenderingContext2D,
  frame: AsciiFrame,
  lineHeight: number,
  fgColor: string,
  bgColor: string,
  colorMode: ColorMode,
): void {
  // Clear background
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  ctx.textBaseline = 'top'

  const cells = frame.cells
  for (let row = 0; row < cells.length; row++) {
    const rowCells = cells[row]
    if (rowCells.length === 0) continue

    // Build row text from cells
    const rowText = rowCells.map(c => c.char).join('')

    // Use pretext to get per-segment widths (D-01: pretext-driven positioning)
    const prepared = prepareWithSegments(rowText, ctx.font, { whiteSpace: 'pre-wrap' })
    // layoutWithLines validates that the row fits within canvas width
    layoutWithLines(prepared, ctx.canvas.width, lineHeight)

    // Derive x-positions via prefix sums of prepared.widths[]
    let x = 0
    const y = row * lineHeight

    for (let col = 0; col < rowCells.length; col++) {
      // D-02: clip silently at canvas edge
      if (x >= ctx.canvas.width) break

      const cell = rowCells[col]

      // Skip space characters (advance x but do not fillText)
      if (cell.char !== ' ') {
        // Set color based on mode (D-03)
        if (colorMode === 'colored' || colorMode === 'monoscale') {
          ctx.fillStyle = `rgb(${cell.r},${cell.g},${cell.b})`
        } else {
          // monochrome or inverted: use fgColor
          ctx.fillStyle = fgColor
        }

        ctx.fillText(cell.char, x, y)
      }

      // Advance x by this segment's width from pretext widths[]
      x += (prepared as unknown as { widths: number[] }).widths[col] ?? 0
    }
  }
}

/**
 * Renders a single ASCII frame in grid mode.
 * Each cell is positioned at (col * charWidth, row * lineHeight).
 */
export function renderGridFrame(
  ctx: CanvasRenderingContext2D,
  frame: AsciiFrame,
  charWidth: number,
  lineHeight: number,
  fgColor: string,
  bgColor: string,
  colorMode: ColorMode,
): void {
  // Clear background
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  ctx.textBaseline = 'top'

  const cells = frame.cells
  for (let row = 0; row < cells.length; row++) {
    const rowCells = cells[row]
    for (let col = 0; col < rowCells.length; col++) {
      const cell = rowCells[col]
      // Skip space characters
      if (cell.char === ' ') continue

      // Set color based on mode
      if (colorMode === 'colored' || colorMode === 'monoscale') {
        ctx.fillStyle = `rgb(${cell.r},${cell.g},${cell.b})`
      } else {
        // monochrome or inverted: use fgColor
        ctx.fillStyle = fgColor
      }

      ctx.fillText(cell.char, col * charWidth, row * lineHeight)
    }
  }
}

/**
 * Renders a partial ASCII frame in typewriter mode.
 * Only the first `revealCount` characters (row-major order) are drawn.
 * Optionally renders a block cursor at the next unrevealed position.
 * Uses grid-mode fixed charWidth positioning (proportional-typewriter is out of v1 scope).
 */
export function renderTypewriterFrame(
  ctx: CanvasRenderingContext2D,
  frame: AsciiFrame,
  charWidth: number,
  lineHeight: number,
  fgColor: string,
  bgColor: string,
  colorMode: ColorMode,
  revealCount: number,
  showCursor?: boolean,
): void {
  // Clear background
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  ctx.textBaseline = 'top'

  const cells = frame.cells
  // Flatten to row-major linear index for partial reveal
  let charIndex = 0

  for (let row = 0; row < cells.length; row++) {
    const rowCells = cells[row]
    for (let col = 0; col < rowCells.length; col++) {
      if (charIndex >= revealCount) {
        // Draw cursor at this position if requested
        if (showCursor && charIndex === revealCount) {
          ctx.fillStyle = fgColor
          ctx.fillText('|', col * charWidth, row * lineHeight)
        }
        return
      }

      const cell = rowCells[col]

      // Set color based on mode
      if (colorMode === 'colored' || colorMode === 'monoscale') {
        ctx.fillStyle = `rgb(${cell.r},${cell.g},${cell.b})`
      } else {
        ctx.fillStyle = fgColor
      }

      ctx.fillText(cell.char, col * charWidth, row * lineHeight)
      charIndex++
    }
  }
}
