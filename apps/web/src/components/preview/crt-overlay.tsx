'use client'

import { useEditorStore } from '@/stores/editor-store'

export function CrtOverlay() {
  const enabled = useEditorStore((s) => s.crtEnabled)
  const vignette = useEditorStore((s) => s.crtVignette)
  const roundedCorners = useEditorStore((s) => s.crtRoundedCorners)
  const scanlines = useEditorStore((s) => s.crtScanlines)
  const curvature = useEditorStore((s) => s.crtCurvature)

  if (!enabled) return null

  const vignetteOpacity = vignette / 100
  const scanlinesOpacity = scanlines / 100
  const curvePerspective = 2000 - curvature * 15 // 2000px (flat) to 500px (curved)

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        perspective: curvature > 0 ? `${curvePerspective}px` : undefined,
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          transform: curvature > 0
            ? `rotateY(0deg) scale(${1 + curvature * 0.001})`
            : undefined,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Vignette */}
        {vignette > 0 && (
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${vignetteOpacity}) 100%)`,
            }}
          />
        )}

        {/* Scanlines */}
        {scanlines > 0 && (
          <div
            className="absolute inset-0"
            style={{
              background: `repeating-linear-gradient(0deg, transparent 0px, transparent 1px, rgba(0,0,0,${scanlinesOpacity}) 1px, rgba(0,0,0,${scanlinesOpacity}) 2px)`,
              backgroundSize: '100% 2px',
            }}
          />
        )}
      </div>
    </div>
  )
}

// Generate CRT CSS string for exports
export function generateCrtCss(opts: {
  vignette: number
  roundedCorners: number
  scanlines: number
  curvature: number
}): string {
  const { vignette, roundedCorners, scanlines, curvature } = opts
  const vigOp = vignette / 100
  const scanOp = scanlines / 100
  const perspective = 2000 - curvature * 15

  let css = `.crt-wrap{position:relative;display:inline-block;overflow:hidden;border-radius:${roundedCorners}px;`
  if (curvature > 0) css += `perspective:${perspective}px;`
  css += '}'
  css += '.crt-wrap canvas{display:block;}'

  if (vignette > 0) {
    css += `.crt-vig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,transparent 40%,rgba(0,0,0,${vigOp}) 100%);}`
  }

  if (scanlines > 0) {
    css += `.crt-scan{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,transparent 0px,transparent 1px,rgba(0,0,0,${scanOp}) 1px,rgba(0,0,0,${scanOp}) 2px);background-size:100% 2px;}`
  }

  return css
}

export function generateCrtHtml(opts: {
  vignette: number
  scanlines: number
}): string {
  let html = ''
  if (opts.vignette > 0) html += '<div class="crt-vig"></div>'
  if (opts.scanlines > 0) html += '<div class="crt-scan"></div>'
  return html
}
