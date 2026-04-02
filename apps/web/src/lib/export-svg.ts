import type { AsciiFrame, AsciiCell } from '@/lib/ascii-engine'
import type { ColorMode, ExportLoop } from '@/lib/constants'
import { measureMonospaceChar } from '@/lib/measure-char'

export interface SVGExportOptions {
  frames: AsciiFrame[]
  fps: number
  loop: ExportLoop
  fontFamily: string
  fontSize: number
  fgColor: string
  bgColor: string
  colorMode: ColorMode
  canvasWidth: number
}

function xmlEscape(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildColoredLine(cells: AsciiCell[]): string {
  let spans = ''
  let i = 0
  while (i < cells.length) {
    const { r, g, b } = cells[i]
    let text = ''
    while (
      i < cells.length &&
      (cells[i].r | 0) === (r | 0) &&
      (cells[i].g | 0) === (g | 0) &&
      (cells[i].b | 0) === (b | 0)
    ) {
      text += xmlEscape(cells[i].char)
      i++
    }
    spans += `<tspan fill="rgb(${r | 0},${g | 0},${b | 0})">${text}</tspan>`
  }
  return spans
}

function buildMonoscaleLine(cells: AsciiCell[]): string {
  let spans = ''
  let i = 0
  while (i < cells.length) {
    const g = cells[i].brightness | 0
    let text = ''
    while (i < cells.length && (cells[i].brightness | 0) === g) {
      text += xmlEscape(cells[i].char)
      i++
    }
    spans += `<tspan fill="rgb(${g},${g},${g})">${text}</tspan>`
  }
  return spans
}

export function generateExportSVG(options: SVGExportOptions): string {
  const { frames, fps, loop, fontFamily, fontSize, fgColor, bgColor, colorMode, canvasWidth } = options

  if (frames.length === 0) return '<svg xmlns="http://www.w3.org/2000/svg"/>'

  const rows = frames[0].cells.length
  const cols = frames[0].cells[0]?.length ?? 80
  const font = `${fontSize}px ${fontFamily}, monospace`
  const { charWidth, charHeight: lineHeight } = measureMonospaceChar(font, fontSize)
  const svgWidth = charWidth * cols
  const svgHeight = lineHeight * rows
  const totalDuration = frames.length / fps

  const iterationCount =
    loop === 'forever' ? 'infinite' : loop === 'once' ? '1' : String(loop)

  // Build keyframes — each frame visible for 1/N of the duration
  const framePercent = 100 / frames.length
  const keyframes = `@keyframes play{0%{visibility:visible}${framePercent.toFixed(4)}%{visibility:hidden}100%{visibility:hidden}}`

  // Build frame groups
  const frameGroups: string[] = []
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i]
    const lines = frame.text.split('\n')
    const delay = (i / fps).toFixed(4)

    let textElements = ''
    for (let row = 0; row < lines.length; row++) {
      const y = ((row + 1) * lineHeight).toFixed(2)
      if (colorMode === 'colored') {
        textElements += `<text x="0" y="${y}" xml:space="preserve">${buildColoredLine(frame.cells[row])}</text>`
      } else if (colorMode === 'monoscale') {
        textElements += `<text x="0" y="${y}" xml:space="preserve">${buildMonoscaleLine(frame.cells[row])}</text>`
      } else {
        textElements += `<text x="0" y="${y}" xml:space="preserve">${xmlEscape(lines[row])}</text>`
      }
    }

    frameGroups.push(
      `<g class="f" style="animation-delay:${delay}s">${textElements}</g>`,
    )
  }

  const viewBox = `0 0 ${svgWidth.toFixed(2)} ${svgHeight.toFixed(2)}`
  const fillAttr = colorMode === 'colored' || colorMode === 'monoscale' ? '' : ` fill="${fgColor}"`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${canvasWidth}" font-family="${fontFamily}, monospace" font-size="${fontSize}"${fillAttr}>
<style>${keyframes}.f{visibility:hidden;animation:play ${totalDuration.toFixed(4)}s step-end ${iterationCount};}</style>
<rect width="100%" height="100%" fill="${bgColor}"/>
${frameGroups.join('\n')}
</svg>`
}
