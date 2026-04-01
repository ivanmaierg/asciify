import type { ColorMode } from '@/lib/constants'

export interface AsciiCell {
  char: string
  r: number
  g: number
  b: number
  brightness: number
}

export interface AsciiFrame {
  text: string
  cells: AsciiCell[][]
}

export function convertFrameToAscii(
  imageData: ImageData,
  columns: number,
  charset: string,
  brightnessThreshold: number,
  contrastBoost: number,
  colorMode: ColorMode,
): AsciiFrame {
  const { width, height, data } = imageData
  const cellWidth = width / columns
  // Aspect ratio correction: characters are ~2x taller than wide
  const rows = Math.max(1, Math.round((height / cellWidth) * 0.5))
  const cellHeight = height / rows

  const invertBrightness = colorMode === 'inverted'
  const charCount = charset.length

  const cells: AsciiCell[][] = []
  const lines: string[] = []

  for (let row = 0; row < rows; row++) {
    const rowCells: AsciiCell[] = []
    let line = ''
    const y0 = Math.floor(row * cellHeight)
    const y1 = Math.min(Math.floor((row + 1) * cellHeight), height)

    for (let col = 0; col < columns; col++) {
      const x0 = Math.floor(col * cellWidth)
      const x1 = Math.min(Math.floor((col + 1) * cellWidth), width)

      let totalR = 0
      let totalG = 0
      let totalB = 0
      let pixelCount = 0

      for (let y = y0; y < y1; y++) {
        const rowOffset = y * width
        for (let x = x0; x < x1; x++) {
          const i = (rowOffset + x) * 4
          totalR += data[i]
          totalG += data[i + 1]
          totalB += data[i + 2]
          pixelCount++
        }
      }

      if (pixelCount === 0) pixelCount = 1

      const avgR = totalR / pixelCount
      const avgG = totalG / pixelCount
      const avgB = totalB / pixelCount

      // Perceived luminance
      let brightness = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB

      // Brightness threshold
      if (brightness < brightnessThreshold) brightness = 0

      // Contrast boost (100 = neutral)
      const contrastFactor = contrastBoost / 100
      brightness = ((brightness / 255 - 0.5) * contrastFactor + 0.5) * 255
      brightness = Math.max(0, Math.min(255, brightness))

      // Invert if needed
      if (invertBrightness) brightness = 255 - brightness

      // Map brightness to character index
      const charIndex = Math.min(
        charCount - 1,
        Math.floor((brightness / 255) * (charCount - 1)),
      )
      const char = charset[charIndex]

      rowCells.push({ char, r: avgR, g: avgG, b: avgB, brightness })
      line += char
    }

    cells.push(rowCells)
    lines.push(line)
  }

  return { text: lines.join('\n'), cells }
}
