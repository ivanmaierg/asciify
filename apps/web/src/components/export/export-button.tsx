'use client'

import { useCallback, useState } from 'react'
import { useEditorStore } from '@/stores/editor-store'
import { extractFrames } from '@/lib/frame-extractor'
import { deltaEncode } from '@asciify/encoder'
import { generateExportHtml, downloadHtml } from '@/lib/html-export'
import { generateExportAPNG } from '@/lib/export-apng'
import { generateExportSVG } from '@/lib/export-svg'
import { generateExportANSI } from '@/lib/export-ansi'
import { generateWebGPUExportHtml } from '@/lib/export-webgpu'
import { processAudio, blobToBase64DataUrl } from '@/lib/audio-processor'
import { EXPORT_FORMAT_LABELS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Download, Loader2, CircleAlert } from 'lucide-react'

function downloadFile(data: Blob | string, filename: string, mimeType: string) {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ExportButton() {
  const store = useEditorStore()
  const [error, setError] = useState<string | null>(null)
  const disabled = store.playbackState === 'empty' || store.isExporting

  const handleExport = useCallback(async () => {
    const s = useEditorStore.getState()
    if (!s.videoUrl || !s.videoDuration) return

    setError(null)
    s.setIsExporting(true)
    s.setExportProgress(0)
    s.setExportedOutput(null)
    s.setExportedBlob(null)

    try {
      // Phase 1: Extract frames (shared across all formats)
      const extracted = await extractFrames(
        {
          videoUrl: s.videoUrl,
          videoDuration: s.videoDuration,
          startTime: s.trimStart,
          endTime: s.trimEnd,
          frameRate: s.frameRate,
          frameSkip: s.frameSkip,
          columns: s.columns,
          characterSet: s.characterSet,
          customCharacters: s.customCharacters,
          brightnessThreshold: s.brightnessThreshold,
          contrastBoost: s.contrastBoost,
          colorMode: s.colorMode,
          gamma: s.gamma,
          edgeDetection: s.edgeDetection,
          ditherMode: s.ditherMode,
          invertCharset: s.invertCharset,
        },
        (p) => s.setExportProgress(p * 0.9), // 0-90% for extraction
      )

      // Phase 1.5: Process audio if enabled and format supports it
      const format = s.exportFormat
      let audioDataUrl: string | null = null
      const supportsAudio = format === 'html' || format === 'webgpu'
      if (s.audioEnabled && supportsAudio && s.videoUrl) {
        try {
          const audioBlob = await processAudio({
            videoFile: s.videoFile ?? undefined,
            videoUrl: s.videoUrl,
            trimStart: s.trimStart,
            trimEnd: s.trimEnd,
            bitDepth: s.audioBitDepth,
            sampleRate: s.audioSampleRate,
            lowPass: s.audioLowPass,
            distortion: s.audioDistortion,
          })
          audioDataUrl = await blobToBase64DataUrl(audioBlob)
        } catch (audioErr) {
          console.warn('Audio processing failed:', audioErr)
          // Video may not have audio — continue without it
        }
      }

      // Phase 2: Generate format-specific output
      const lineHeight = Math.ceil(s.fontSize * 1.2)

      switch (format) {
        case 'html': {
          const keyframeInterval = s.exportFps * 2
          const { frames: encodedFrames } = deltaEncode(
            extracted.frames.map((f) => f.text),
            keyframeInterval,
          )
          const canvasHeight = extracted.rows * lineHeight

          const html = generateExportHtml({
            frames: encodedFrames,
            fps: s.exportFps,
            loop: s.exportLoop,
            autoplay: s.exportAutoplay,
            canvasWidth: s.exportCanvasWidth,
            canvasHeight,
            fgColor: s.foregroundColor,
            bgColor: s.backgroundColor,
            fontFamily: s.fontFamily,
            fontSize: s.fontSize,
            lineHeight,
            showControls: s.exportShowControls,
            colorMode: s.colorMode,
            audioDataUrl,
            crt: {
              enabled: s.crtEnabled,
              vignette: s.crtVignette,
              roundedCorners: s.crtRoundedCorners,
              scanlines: s.crtScanlines,
              curvature: s.crtCurvature,
            },
          })

          downloadHtml(html)
          s.setExportedOutput(html)
          break
        }

        case 'apng': {
          const blob = await generateExportAPNG(
            {
              frames: extracted.frames,
              rows: extracted.rows,
              fps: s.exportFps,
              loop: s.exportLoop,
              canvasWidth: s.exportCanvasWidth,
              fontFamily: s.fontFamily,
              fontSize: s.fontSize,
              fgColor: s.foregroundColor,
              bgColor: s.backgroundColor,
              colorMode: s.colorMode,
            },
            (p) => s.setExportProgress(0.9 + p * 0.1),
          )

          downloadFile(blob, 'ascii-animation.apng', 'image/apng')
          s.setExportedBlob(blob)
          break
        }

        case 'svg': {
          const svg = generateExportSVG({
            frames: extracted.frames,
            fps: s.exportFps,
            loop: s.exportLoop,
            fontFamily: s.fontFamily,
            fontSize: s.fontSize,
            fgColor: s.foregroundColor,
            bgColor: s.backgroundColor,
            colorMode: s.colorMode,
            canvasWidth: s.exportCanvasWidth,
          })

          downloadFile(svg, 'ascii-animation.svg', 'image/svg+xml')
          s.setExportedOutput(svg)
          break
        }

        case 'webgpu': {
          const webgpuHtml = generateWebGPUExportHtml({
            frames: extracted.frames,
            rows: extracted.rows,
            columns: extracted.columns,
            fps: s.exportFps,
            loop: s.exportLoop,
            autoplay: s.exportAutoplay,
            canvasWidth: s.exportCanvasWidth,
            fontFamily: s.fontFamily,
            fontSize: s.fontSize,
            fgColor: s.foregroundColor,
            bgColor: s.backgroundColor,
            colorMode: s.colorMode,
            showControls: s.exportShowControls,
            audioDataUrl,
            crt: {
              enabled: s.crtEnabled,
              vignette: s.crtVignette,
              roundedCorners: s.crtRoundedCorners,
              scanlines: s.crtScanlines,
              curvature: s.crtCurvature,
            },
          })

          downloadFile(webgpuHtml, 'ascii-animation-webgpu.html', 'text/html')
          s.setExportedOutput(webgpuHtml)
          break
        }

        case 'ansi': {
          const script = generateExportANSI({
            frames: extracted.frames,
            fps: s.exportFps,
            loop: s.exportLoop,
            colorMode: s.colorMode,
            fgColor: s.foregroundColor,
          })

          downloadFile(script, 'ascii-animation.sh', 'text/x-shellscript')
          s.setExportedOutput(script)
          break
        }
      }

      s.setExportProgress(1)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed. Please try again.'
      setError(message)
    } finally {
      s.setIsExporting(false)
    }
  }, [])

  const formatLabel = EXPORT_FORMAT_LABELS[store.exportFormat]

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
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
          <CircleAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{error}</p>
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
            Export {formatLabel}
          </>
        )}
      </Button>
    </div>
  )
}
