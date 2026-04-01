import type { AsciiFrame } from '@/lib/ascii-engine'
import type { ColorMode, ExportLoop } from '@/lib/constants'
import { renderAsciiToCanvas } from '@/lib/pretext-renderer'
import { encodeAPNG } from '@/lib/png-encoder'

export interface APNGExportOptions {
  frames: AsciiFrame[]
  rows: number
  fps: number
  loop: ExportLoop
  canvasWidth: number
  fontFamily: string
  fontSize: number
  fgColor: string
  bgColor: string
  colorMode: ColorMode
}

export async function generateExportAPNG(
  options: APNGExportOptions,
  onProgress: (progress: number) => void,
): Promise<Blob> {
  const { frames, rows, fps, loop, canvasWidth, fontFamily, fontSize, fgColor, bgColor, colorMode } = options

  const font = `${fontSize}px ${fontFamily}, monospace`
  const lineHeight = Math.ceil(fontSize * 1.2)
  const canvasHeight = rows * lineHeight

  // Create offscreen canvas for rendering
  const canvas = document.createElement('canvas')
  canvas.width = canvasWidth
  canvas.height = canvasHeight
  const ctx = canvas.getContext('2d')!

  // Measure char width to size canvas correctly
  ctx.font = font
  const charWidth = ctx.measureText('M').width
  const actualWidth = Math.ceil(charWidth * (frames[0]?.cells[0]?.length ?? 80))
  canvas.width = actualWidth

  const imageDataFrames: ImageData[] = []

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i]

    renderAsciiToCanvas(
      ctx,
      frame.text,
      frame.cells,
      font,
      lineHeight,
      canvas.width,
      canvas.height,
      colorMode === 'colored' || colorMode === 'monoscale' ? undefined : fgColor,
      bgColor,
      colorMode,
    )

    imageDataFrames.push(ctx.getImageData(0, 0, canvas.width, canvas.height))
    onProgress(i / frames.length)
  }

  const loopCount = loop === 'forever' ? 0 : loop === 'once' ? 1 : loop
  const apngData = await encodeAPNG(imageDataFrames, fps, loopCount, onProgress)

  return new Blob([apngData.buffer as ArrayBuffer], { type: 'image/apng' })
}
