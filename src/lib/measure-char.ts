let cachedCtx: CanvasRenderingContext2D | null = null

function getCtx(): CanvasRenderingContext2D {
  if (!cachedCtx) {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    cachedCtx = canvas.getContext('2d')!
  }
  return cachedCtx
}

const cache = new Map<string, { charWidth: number; charHeight: number }>()

export function measureMonospaceChar(font: string, fontSize: number): { charWidth: number; charHeight: number } {
  const key = font
  const cached = cache.get(key)
  if (cached) return cached

  const ctx = getCtx()
  ctx.font = font
  const charWidth = ctx.measureText('M').width
  const charHeight = Math.ceil(fontSize * 1.2)
  const result = { charWidth, charHeight }
  cache.set(key, result)
  return result
}

export function clearMeasureCache(): void {
  cache.clear()
}
