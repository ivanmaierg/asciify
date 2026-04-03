import type { AsciiFrame } from '@asciify/encoder'
import type { ColorMode } from '@asciify/encoder'

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
