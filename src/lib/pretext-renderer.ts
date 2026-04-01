import type { AsciiCell } from '@/lib/ascii-engine'
import type { ColorMode } from '@/lib/constants'

export function renderAsciiToCanvas(
  ctx: CanvasRenderingContext2D,
  text: string,
  cells: AsciiCell[][],
  font: string,
  lineHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  fgColor: string | undefined,
  bgColor: string,
  colorMode: ColorMode,
): void {
  // Clear canvas
  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  ctx.font = font
  ctx.textBaseline = 'top'

  if (colorMode === 'monochrome' || colorMode === 'inverted') {
    // Single color — draw line by line
    ctx.fillStyle = fgColor || '#00ff00'
    const lines = text.split('\n')
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], 0, i * lineHeight)
    }
  } else {
    // Colored mode — draw character by character with individual colors
    // Cache monospace character width
    const charWidth = ctx.measureText('M').width

    for (let row = 0; row < cells.length; row++) {
      const rowCells = cells[row]
      for (let col = 0; col < rowCells.length; col++) {
        const cell = rowCells[col]
        if (cell.char === ' ') continue // skip spaces for perf
        ctx.fillStyle = `rgb(${cell.r | 0},${cell.g | 0},${cell.b | 0})`
        ctx.fillText(cell.char, col * charWidth, row * lineHeight)
      }
    }
  }
}
