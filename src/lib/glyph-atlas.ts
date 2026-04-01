export interface GlyphAtlas {
  canvas: HTMLCanvasElement
  charWidth: number
  charHeight: number
  atlasColumns: number
  atlasRows: number
  charToIndex: Map<string, number>
}

export function createGlyphAtlas(
  charset: string,
  fontFamily: string,
  fontSize: number,
): GlyphAtlas {
  // Measure character dimensions
  const measureCanvas = document.createElement('canvas')
  const mctx = measureCanvas.getContext('2d')!
  const font = `${fontSize}px ${fontFamily}, monospace`
  mctx.font = font
  const charWidth = Math.ceil(mctx.measureText('M').width)
  const charHeight = Math.ceil(fontSize * 1.2)

  // Build character-to-index map
  const charToIndex = new Map<string, number>()
  for (let i = 0; i < charset.length; i++) {
    charToIndex.set(charset[i], i)
  }

  // Calculate atlas grid
  const atlasColumns = Math.ceil(Math.sqrt(charset.length))
  const atlasRows = Math.ceil(charset.length / atlasColumns)

  // Create atlas canvas
  const canvas = document.createElement('canvas')
  canvas.width = atlasColumns * charWidth
  canvas.height = atlasRows * charHeight
  const ctx = canvas.getContext('2d')!

  // Draw characters in white on transparent background
  ctx.font = font
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#ffffff'

  for (let i = 0; i < charset.length; i++) {
    const col = i % atlasColumns
    const row = Math.floor(i / atlasColumns)
    ctx.fillText(charset[i], col * charWidth, row * charHeight)
  }

  return { canvas, charWidth, charHeight, atlasColumns, atlasRows, charToIndex }
}
