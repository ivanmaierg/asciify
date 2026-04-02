import { describe, it, expect } from 'vitest'
import { convertFrameToAscii } from '../src/ascii-engine'
import type { ConvertOptions } from '../src/ascii-engine'

const CHARSET = ' .:-=+*#%@'

function makeImageData(w: number, h: number, fill: number = 128) {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < w * h * 4; i += 4) {
    data[i] = fill       // R
    data[i + 1] = fill   // G
    data[i + 2] = fill   // B
    data[i + 3] = 255    // A
  }
  return { width: w, height: h, data }
}

function makeGradientImage(w: number, h: number) {
  const data = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const val = Math.floor((x / w) * 255)
      data[i] = val
      data[i + 1] = val
      data[i + 2] = val
      data[i + 3] = 255
    }
  }
  return { width: w, height: h, data }
}

const baseOptions: ConvertOptions = {
  columns: 10,
  charset: CHARSET,
}

describe('convertFrameToAscii', () => {
  describe('basic output structure', () => {
    it('returns an object with text and cells properties', () => {
      const img = makeImageData(80, 40)
      const frame = convertFrameToAscii(img, baseOptions)
      expect(frame).toHaveProperty('text')
      expect(frame).toHaveProperty('cells')
    })

    it('cells[0].length equals columns', () => {
      const img = makeImageData(80, 40)
      const frame = convertFrameToAscii(img, baseOptions)
      expect(frame.cells[0]).toHaveLength(10)
    })

    it('cells.length (rows) is greater than 0', () => {
      const img = makeImageData(80, 40)
      const frame = convertFrameToAscii(img, baseOptions)
      expect(frame.cells.length).toBeGreaterThan(0)
    })

    it('each cell has char, r, g, b, brightness properties', () => {
      const img = makeImageData(80, 40)
      const frame = convertFrameToAscii(img, baseOptions)
      const cell = frame.cells[0][0]
      expect(cell).toHaveProperty('char')
      expect(cell).toHaveProperty('r')
      expect(cell).toHaveProperty('g')
      expect(cell).toHaveProperty('b')
      expect(cell).toHaveProperty('brightness')
    })

    it('text has newlines separating rows', () => {
      const img = makeImageData(80, 40)
      const frame = convertFrameToAscii(img, baseOptions)
      const lines = frame.text.split('\n')
      expect(lines.length).toBe(frame.cells.length)
    })

    it('default options produce non-empty output for a uniform gray image', () => {
      const img = makeImageData(80, 40)
      const frame = convertFrameToAscii(img, baseOptions)
      expect(frame.text.length).toBeGreaterThan(0)
      expect(frame.cells.length).toBeGreaterThan(0)
    })
  })

  describe('color modes', () => {
    it('colorMode monochrome produces valid output', () => {
      const img = makeImageData(80, 40)
      const frame = convertFrameToAscii(img, { ...baseOptions, colorMode: 'monochrome' })
      expect(frame.cells.length).toBeGreaterThan(0)
      expect(frame.cells[0]).toHaveLength(10)
    })

    it('colorMode colored produces valid output', () => {
      const img = makeImageData(80, 40)
      const frame = convertFrameToAscii(img, { ...baseOptions, colorMode: 'colored' })
      expect(frame.cells.length).toBeGreaterThan(0)
      expect(frame.cells[0]).toHaveLength(10)
    })

    it('colorMode inverted produces output where bright input maps to dark characters', () => {
      const brightImg = makeImageData(80, 40, 255) // all white
      const normalFrame = convertFrameToAscii(brightImg, { ...baseOptions, colorMode: 'monochrome' })
      const invertedFrame = convertFrameToAscii(brightImg, { ...baseOptions, colorMode: 'inverted' })
      // On a bright image, inverted should produce different characters than normal
      expect(invertedFrame.cells.length).toBeGreaterThan(0)
      // The average char in inverted mode should differ from normal mode
      expect(invertedFrame.text).not.toBe(normalFrame.text)
    })

    it('colorMode monoscale produces valid output', () => {
      const img = makeImageData(80, 40)
      const frame = convertFrameToAscii(img, { ...baseOptions, colorMode: 'monoscale' })
      expect(frame.cells.length).toBeGreaterThan(0)
      expect(frame.cells[0]).toHaveLength(10)
    })
  })

  describe('dither modes', () => {
    it('ditherMode none produces valid output', () => {
      const img = makeGradientImage(80, 40)
      const frame = convertFrameToAscii(img, { ...baseOptions, ditherMode: 'none' })
      expect(frame.cells.length).toBeGreaterThan(0)
    })

    it('ditherMode floyd-steinberg produces different output than none on gradient image', () => {
      const img = makeGradientImage(80, 40)
      const noneFrame = convertFrameToAscii(img, { ...baseOptions, ditherMode: 'none' })
      const fsFrame = convertFrameToAscii(img, { ...baseOptions, ditherMode: 'floyd-steinberg' })
      // Floyd-Steinberg dithering should produce different character patterns
      expect(fsFrame.text).not.toBe(noneFrame.text)
    })

    it('ditherMode ordered produces different output than none on gradient image', () => {
      const img = makeGradientImage(80, 40)
      const noneFrame = convertFrameToAscii(img, { ...baseOptions, ditherMode: 'none' })
      const orderedFrame = convertFrameToAscii(img, { ...baseOptions, ditherMode: 'ordered' })
      // Ordered (Bayer) dithering should produce different character patterns
      expect(orderedFrame.text).not.toBe(noneFrame.text)
    })
  })

  describe('edge detection', () => {
    it('edgeDetection > 0 produces different output than edgeDetection=0', () => {
      const img = makeGradientImage(80, 40)
      const noEdge = convertFrameToAscii(img, { ...baseOptions, edgeDetection: 0 })
      const withEdge = convertFrameToAscii(img, { ...baseOptions, edgeDetection: 50 })
      expect(withEdge.text).not.toBe(noEdge.text)
    })
  })

  describe('gamma', () => {
    it('gamma=2.0 produces different output than gamma=1.0 on uniform gray image', () => {
      const img = makeImageData(80, 40, 128)
      const gamma1 = convertFrameToAscii(img, { ...baseOptions, gamma: 1.0 })
      const gamma2 = convertFrameToAscii(img, { ...baseOptions, gamma: 2.0 })
      // Gamma correction changes brightness mapping, so output should differ
      expect(gamma2.text).not.toBe(gamma1.text)
    })
  })

  describe('brightness and contrast', () => {
    it('brightnessThreshold=255 causes most cells to have brightness 0 (everything below threshold)', () => {
      const img = makeImageData(80, 40, 128) // mid-gray, below threshold of 255
      const frame = convertFrameToAscii(img, { ...baseOptions, brightnessThreshold: 255 })
      // With threshold=255, all pixel brightness values (128) are below threshold and clamp to 0
      const darkChar = CHARSET[0] // darkest char is first (space)
      expect(frame.cells[0][0].char).toBe(darkChar)
    })

    it('contrastBoost=0 produces output without crashing', () => {
      const img = makeImageData(80, 40)
      expect(() =>
        convertFrameToAscii(img, { ...baseOptions, contrastBoost: 0 }),
      ).not.toThrow()
    })

    it('contrastBoost=200 produces output without crashing', () => {
      const img = makeImageData(80, 40)
      expect(() =>
        convertFrameToAscii(img, { ...baseOptions, contrastBoost: 200 }),
      ).not.toThrow()
    })

    it('contrastBoost=0 and contrastBoost=200 produce different output', () => {
      const img = makeGradientImage(80, 40)
      const low = convertFrameToAscii(img, { ...baseOptions, contrastBoost: 0 })
      const high = convertFrameToAscii(img, { ...baseOptions, contrastBoost: 200 })
      expect(low.text).not.toBe(high.text)
    })
  })

  describe('invert charset', () => {
    it('invertCharset=true on uniform image produces different char than invertCharset=false', () => {
      const img = makeImageData(80, 40, 200) // bright image
      const normal = convertFrameToAscii(img, { ...baseOptions, invertCharset: false })
      const inverted = convertFrameToAscii(img, { ...baseOptions, invertCharset: true })
      expect(inverted.cells[0][0].char).not.toBe(normal.cells[0][0].char)
    })
  })

  describe('edge cases', () => {
    it('1x1 image does not crash and returns a single cell', () => {
      const img = makeImageData(1, 1, 128)
      expect(() => convertFrameToAscii(img, { ...baseOptions, columns: 1 })).not.toThrow()
      const frame = convertFrameToAscii(img, { ...baseOptions, columns: 1 })
      expect(frame.cells.length).toBeGreaterThan(0)
    })

    it('all-black image (fill=0) produces darkest characters', () => {
      const img = makeImageData(80, 40, 0)
      const frame = convertFrameToAscii(img, baseOptions)
      // All cells should have the darkest char (first in charset = space)
      const darkChar = CHARSET[0]
      expect(frame.cells[0][0].char).toBe(darkChar)
    })

    it('all-white image (fill=255) produces brightest characters', () => {
      const img = makeImageData(80, 40, 255)
      const frame = convertFrameToAscii(img, baseOptions)
      // All cells should have the brightest char (last in charset = '@')
      const brightChar = CHARSET[CHARSET.length - 1]
      expect(frame.cells[0][0].char).toBe(brightChar)
    })
  })
})
