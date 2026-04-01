import type { ColorMode, DitherMode } from '@/lib/constants'

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

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

const SOBEL_X = [
  [-1, 0, 1],
  [-2, 0, 2],
  [-1, 0, 1],
]
const SOBEL_Y = [
  [-1, -2, -1],
  [0, 0, 0],
  [1, 2, 1],
]

export function convertFrameToAscii(
  imageData: ImageData,
  columns: number,
  charset: string,
  brightnessThreshold: number,
  contrastBoost: number,
  colorMode: ColorMode,
  gamma: number,
  edgeDetection: number,
  ditherMode: DitherMode,
  invertCharset: boolean,
): AsciiFrame {
  const { width, height, data } = imageData
  const cellWidth = width / columns
  const rows = Math.max(1, Math.round((height / cellWidth) * 0.5))
  const cellHeight = height / rows

  const invertBrightness = colorMode === 'inverted'
  const charCount = charset.length

  // Pass 1: Sample pixels, compute brightness grid
  const brightnessGrid: number[][] = []
  const rgbGrid: { r: number; g: number; b: number }[][] = []

  for (let row = 0; row < rows; row++) {
    const rowBrightness: number[] = []
    const rowRgb: { r: number; g: number; b: number }[] = []
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

      let brightness = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB

      if (brightness < brightnessThreshold) brightness = 0

      const contrastFactor = contrastBoost / 100
      brightness = ((brightness / 255 - 0.5) * contrastFactor + 0.5) * 255
      brightness = Math.max(0, Math.min(255, brightness))

      if (invertBrightness) brightness = 255 - brightness

      // Gamma correction
      if (gamma !== 1.0) {
        brightness = Math.pow(brightness / 255, gamma) * 255
      }

      rowBrightness.push(brightness)
      rowRgb.push({ r: avgR, g: avgG, b: avgB })
    }

    brightnessGrid.push(rowBrightness)
    rgbGrid.push(rowRgb)
  }

  // Pass 2: Edge detection (Sobel)
  if (edgeDetection > 0) {
    const strength = edgeDetection / 100
    const edgeGrid: number[][] = []

    for (let row = 0; row < rows; row++) {
      const rowEdge: number[] = []
      for (let col = 0; col < columns; col++) {
        let gx = 0
        let gy = 0
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const r = Math.max(0, Math.min(rows - 1, row + ky))
            const c = Math.max(0, Math.min(columns - 1, col + kx))
            const val = brightnessGrid[r][c]
            gx += val * SOBEL_X[ky + 1][kx + 1]
            gy += val * SOBEL_Y[ky + 1][kx + 1]
          }
        }
        const magnitude = Math.min(255, Math.sqrt(gx * gx + gy * gy))
        rowEdge.push(magnitude)
      }
      edgeGrid.push(rowEdge)
    }

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        brightnessGrid[row][col] =
          brightnessGrid[row][col] * (1 - strength) + edgeGrid[row][col] * strength
      }
    }
  }

  // Pass 3: Dithering
  if (ditherMode === 'floyd-steinberg') {
    const levels = charCount
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const old = brightnessGrid[row][col]
        const quantized = Math.round((old / 255) * (levels - 1)) * (255 / (levels - 1))
        const error = old - quantized
        brightnessGrid[row][col] = quantized

        if (col + 1 < columns) brightnessGrid[row][col + 1] += error * (7 / 16)
        if (row + 1 < rows) {
          if (col - 1 >= 0) brightnessGrid[row + 1][col - 1] += error * (3 / 16)
          brightnessGrid[row + 1][col] += error * (5 / 16)
          if (col + 1 < columns) brightnessGrid[row + 1][col + 1] += error * (1 / 16)
        }
      }
    }
  } else if (ditherMode === 'ordered') {
    const levels = charCount
    const step = levels > 1 ? 255 / (levels - 1) : 255
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const threshold = (BAYER_4X4[row % 4][col % 4] / 16.0 - 0.5) * step
        brightnessGrid[row][col] += threshold
      }
    }
  }

  // Pass 4: Map to characters and build output
  const cells: AsciiCell[][] = []
  const lines: string[] = []

  for (let row = 0; row < rows; row++) {
    const rowCells: AsciiCell[] = []
    let line = ''

    for (let col = 0; col < columns; col++) {
      const brightness = Math.max(0, Math.min(255, brightnessGrid[row][col]))
      let charIndex = Math.min(charCount - 1, Math.floor((brightness / 255) * (charCount - 1)))

      if (invertCharset) charIndex = charCount - 1 - charIndex

      const char = charset[charIndex]
      const rgb = rgbGrid[row][col]

      rowCells.push({ char, r: rgb.r, g: rgb.g, b: rgb.b, brightness })
      line += char
    }

    cells.push(rowCells)
    lines.push(line)
  }

  return { text: lines.join('\n'), cells }
}
