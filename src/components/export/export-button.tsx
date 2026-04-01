'use client'

import { useCallback } from 'react'
import { useEditorStore } from '@/stores/editor-store'
import { convertFrameToAscii } from '@/lib/ascii-engine'
import { rleEncode } from '@/lib/rle'
import { generateExportHtml, downloadHtml } from '@/lib/html-export'
import { CHARACTER_SETS } from '@/lib/constants'
import type { CharacterSetName } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'

function getCharset(name: CharacterSetName, custom: string): string {
  if (name === 'custom') return custom || CHARACTER_SETS.standard
  return CHARACTER_SETS[name]
}

export function ExportButton() {
  const store = useEditorStore()
  const disabled = store.playbackState === 'empty' || store.isExporting

  const handleExport = useCallback(async () => {
    const s = useEditorStore.getState()
    if (!s.videoUrl || !s.videoDuration) return

    s.setIsExporting(true)
    s.setExportProgress(0)
    s.setExportedHtml(null)

    try {
      // Create a temporary video element for frame extraction
      const video = document.createElement('video')
      video.crossOrigin = 'anonymous'
      video.muted = true
      video.playsInline = true
      video.src = s.videoUrl

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve()
        video.onerror = () => reject(new Error('Failed to load video'))
      })

      const extractionCanvas = document.createElement('canvas')
      extractionCanvas.width = video.videoWidth
      extractionCanvas.height = video.videoHeight
      const ectx = extractionCanvas.getContext('2d', { willReadFrequently: true })!

      const charset = getCharset(s.characterSet, s.customCharacters)
      const frameDuration = (1 / s.frameRate) * s.frameSkip
      const totalFrames = Math.floor(s.videoDuration / frameDuration)
      const frames: string[] = []

      for (let i = 0; i < totalFrames; i++) {
        // Seek to frame time
        const time = i * frameDuration
        video.currentTime = time
        await new Promise<void>((resolve) => {
          video.onseeked = () => resolve()
        })

        // Extract frame
        ectx.drawImage(video, 0, 0, extractionCanvas.width, extractionCanvas.height)
        const imageData = ectx.getImageData(0, 0, extractionCanvas.width, extractionCanvas.height)

        // Convert to ASCII
        const result = convertFrameToAscii(
          imageData,
          s.columns,
          charset,
          s.brightnessThreshold,
          s.contrastBoost,
          s.colorMode,
        )

        // RLE encode and store
        frames.push(rleEncode(result.text))

        // Update progress
        s.setExportProgress((i + 1) / totalFrames)

        // Yield to main thread every 5 frames
        if (i % 5 === 0) await new Promise((r) => setTimeout(r, 0))
      }

      // Calculate export canvas dimensions
      const measureCanvas = document.createElement('canvas')
      const mctx = measureCanvas.getContext('2d')!
      const font = `${s.fontSize}px ${s.fontFamily}, monospace`
      mctx.font = font
      const charWidth = mctx.measureText('M').width

      const exportCanvasWidth = s.exportCanvasWidth
      const exportColumns = Math.floor(exportCanvasWidth / charWidth)
      const lineHeight = Math.ceil(s.fontSize * 1.2)

      // Re-calculate rows from first frame
      const sampleResult = convertFrameToAscii(
        ectx.getImageData(0, 0, extractionCanvas.width, extractionCanvas.height),
        s.columns,
        charset,
        s.brightnessThreshold,
        s.contrastBoost,
        s.colorMode,
      )
      const rows = sampleResult.cells.length
      const exportCanvasHeight = rows * lineHeight

      // Generate HTML
      const html = generateExportHtml({
        frames,
        fps: s.exportFps,
        loop: s.exportLoop,
        autoplay: s.exportAutoplay,
        canvasWidth: exportCanvasWidth,
        canvasHeight: exportCanvasHeight,
        fgColor: s.foregroundColor,
        bgColor: s.backgroundColor,
        fontFamily: s.fontFamily,
        fontSize: s.fontSize,
        lineHeight,
        showControls: s.exportShowControls,
        colorMode: s.colorMode,
      })

      // Download
      downloadHtml(html)
      s.setExportedHtml(html)

      // Clean up
      video.removeAttribute('src')
      video.load()
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      s.setIsExporting(false)
    }
  }, [])

  return (
    <div className="space-y-2">
      {store.isExporting && (
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className="bg-primary h-full transition-all duration-200"
            style={{ width: `${store.exportProgress * 100}%` }}
          />
        </div>
      )}
      <Button
        className="w-full"
        disabled={disabled}
        onClick={handleExport}
      >
        {store.isExporting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Exporting {Math.round(store.exportProgress * 100)}%
          </>
        ) : (
          <>
            <Download className="h-4 w-4 mr-2" />
            Export HTML
          </>
        )}
      </Button>
    </div>
  )
}
