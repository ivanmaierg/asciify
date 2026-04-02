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

  // Fast path: original single-pass when no new effects are active
  const needsMultiPass =
    gamma !== 1.0 || edgeDetection > 0 || ditherMode !== 'none' || invertCharset

  if (!needsMultiPass) {
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

        let brightness = 0.299 * avgR + 0.587 * avgG + 0.114 * avgB

        if (brightness < brightnessThreshold) brightness = 0

        const contrastFactor = contrastBoost / 100
        brightness = ((brightness / 255 - 0.5) * contrastFactor + 0.5) * 255
        brightness = Math.max(0, Math.min(255, brightness))

        if (invertBrightness) brightness = 255 - brightness

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

  // Multi-pass path for gamma, edge detection, dithering, or invert charset
  // Use flat arrays to minimize allocation overhead
  const totalCells = rows * columns
  const brightnessGrid = new Float32Array(totalCells)
  const rgbR = new Float32Array(totalCells)
  const rgbG = new Float32Array(totalCells)
  const rgbB = new Float32Array(totalCells)

  // Pass 1: Sample pixels, compute brightness
  for (let row = 0; row < rows; row++) {
    const y0 = Math.floor(row * cellHeight)
    const y1 = Math.min(Math.floor((row + 1) * cellHeight), height)
    const rowOffset = row * columns

    for (let col = 0; col < columns; col++) {
      const x0 = Math.floor(col * cellWidth)
      const x1 = Math.min(Math.floor((col + 1) * cellWidth), width)

      let totalR = 0
      let totalG = 0
      let totalB = 0
      let pixelCount = 0

      for (let y = y0; y < y1; y++) {
        const yOff = y * width
        for (let x = x0; x < x1; x++) {
          const i = (yOff + x) * 4
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

      if (gamma !== 1.0) {
        brightness = Math.pow(brightness / 255, gamma) * 255
      }

      const idx = rowOffset + col
      brightnessGrid[idx] = brightness
      rgbR[idx] = avgR
      rgbG[idx] = avgG
      rgbB[idx] = avgB
    }
  }

  // Pass 2: Edge detection (Sobel)
  if (edgeDetection > 0) {
    const strength = edgeDetection / 100
    const edgeGrid = new Float32Array(totalCells)

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        let gx = 0
        let gy = 0
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const r = Math.max(0, Math.min(rows - 1, row + ky))
            const c = Math.max(0, Math.min(columns - 1, col + kx))
            const val = brightnessGrid[r * columns + c]
            gx += val * SOBEL_X[ky + 1][kx + 1]
            gy += val * SOBEL_Y[ky + 1][kx + 1]
          }
        }
        edgeGrid[row * columns + col] = Math.min(255, Math.sqrt(gx * gx + gy * gy))
      }
    }

    for (let i = 0; i < totalCells; i++) {
      brightnessGrid[i] = brightnessGrid[i] * (1 - strength) + edgeGrid[i] * strength
    }
  }

  // Pass 3: Dithering
  if (ditherMode === 'floyd-steinberg') {
    const levels = charCount
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const idx = row * columns + col
        const old = brightnessGrid[idx]
        const quantized = Math.round((old / 255) * (levels - 1)) * (255 / (levels - 1))
        const error = old - quantized
        brightnessGrid[idx] = quantized

        if (col + 1 < columns) brightnessGrid[idx + 1] += error * (7 / 16)
        if (row + 1 < rows) {
          const nextRow = (row + 1) * columns
          if (col - 1 >= 0) brightnessGrid[nextRow + col - 1] += error * (3 / 16)
          brightnessGrid[nextRow + col] += error * (5 / 16)
          if (col + 1 < columns) brightnessGrid[nextRow + col + 1] += error * (1 / 16)
        }
      }
    }
  } else if (ditherMode === 'ordered') {
    const levels = charCount
    const step = levels > 1 ? 255 / (levels - 1) : 255
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const threshold = (BAYER_4X4[row % 4][col % 4] / 16.0 - 0.5) * step
        brightnessGrid[row * columns + col] += threshold
      }
    }
  }

  // Pass 4: Map to characters and build output
  const cells: AsciiCell[][] = []
  const lines: string[] = []

  for (let row = 0; row < rows; row++) {
    const rowCells: AsciiCell[] = []
    let line = ''
    const rowOffset = row * columns

    for (let col = 0; col < columns; col++) {
      const idx = rowOffset + col
      const brightness = Math.max(0, Math.min(255, brightnessGrid[idx]))
      let charIndex = Math.min(charCount - 1, Math.floor((brightness / 255) * (charCount - 1)))

      if (invertCharset) charIndex = charCount - 1 - charIndex

      const char = charset[charIndex]

      rowCells.push({ char, r: rgbR[idx], g: rgbG[idx], b: rgbB[idx], brightness })
      line += char
    }

    cells.push(rowCells)
    lines.push(line)
  }

  return { text: lines.join('\n'), cells }
}
