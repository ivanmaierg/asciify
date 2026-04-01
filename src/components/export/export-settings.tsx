'use client'

import { useEditorStore } from '@/stores/editor-store'
import { FPS_OPTIONS, EXPORT_FORMAT_LABELS } from '@/lib/constants'
import type { ExportLoop } from '@/lib/constants'
import { useMemo } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

function sliderVal(v: number | readonly number[]): number {
  return Array.isArray(v) ? v[0] : (v as number)
}

export function ExportSettings() {
  const store = useEditorStore()
  const disabled = store.playbackState === 'empty'
  const format = store.exportFormat
  const showAutoplay = format === 'html'
  const showControls = format === 'html'
  const showCanvasWidth = format !== 'ansi'

  // Estimated file size
  const estimatedSize = useMemo(() => {
    if (!store.videoDuration || !store.frameRate) return null
    const frameDuration = (1 / store.frameRate) * store.frameSkip
    const totalFrames = Math.floor(store.videoDuration / frameDuration)
    const aspectRatio = store.videoHeight ? store.videoWidth / store.videoHeight : 16 / 9
    const rows = Math.max(1, Math.round((store.columns / aspectRatio) * 0.5))
    const charsPerFrame = store.columns * rows

    if (format === 'apng') {
      // APNG: rough estimate based on canvas pixels with compression
      const canvasPixels = store.exportCanvasWidth * (rows * Math.ceil(store.fontSize * 1.2))
      return canvasPixels * 0.5 * totalFrames // ~0.5 bytes per pixel after deflate for ASCII content
    }

    if (format === 'svg') {
      // SVG: ~chars per frame + markup overhead
      return charsPerFrame * totalFrames * 1.5 + 1024
    }

    if (format === 'ansi') {
      // ANSI: chars + escape codes
      const colorOverhead = store.colorMode === 'colored' ? 20 : 0 // per char ANSI codes
      return (charsPerFrame + charsPerFrame * colorOverhead) * totalFrames + 512
    }

    // HTML: RLE compressed + player
    const bytesPerFrame = charsPerFrame * 0.7
    return bytesPerFrame * totalFrames + 2048
  }, [store.videoDuration, store.frameRate, store.frameSkip, store.columns, store.videoWidth, store.videoHeight, store.exportCanvasWidth, store.fontSize, store.colorMode, format])

  const durationWarning = store.videoDuration > 30

  return (
    <div className="space-y-4">
      {/* File size estimate */}
      {estimatedSize !== null && (
        <div className="rounded-md bg-muted px-3 py-2">
          <p className="text-xs text-muted-foreground">
            Estimated size: <span className="text-foreground font-medium">{estimatedSize > 1024 * 1024 ? `${(estimatedSize / (1024 * 1024)).toFixed(1)} MB` : `${(estimatedSize / 1024).toFixed(0)} KB`}</span>
          </p>
        </div>
      )}

      {/* Duration warning */}
      {durationWarning && (
        <div className="flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2">
          <TriangleAlert className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-500">
            Video is over 30s. The exported {EXPORT_FORMAT_LABELS[format]} file may be large. Consider reducing duration or increasing frame skip.
          </p>
        </div>
      )}

      {/* FPS */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Playback FPS</Label>
        <Select
          disabled={disabled}
          value={String(store.exportFps)}
          onValueChange={(v) => v && store.setExportFps(Number(v))}
        >
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {FPS_OPTIONS.map((fps) => (
              <SelectItem key={fps} value={String(fps)}>{fps} fps</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loop */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Loop</Label>
        <Select
          disabled={disabled}
          value={typeof store.exportLoop === 'number' ? 'times' : store.exportLoop}
          onValueChange={(v) => {
            if (!v) return
            if (v === 'times') store.setExportLoop(3)
            else store.setExportLoop(v as ExportLoop)
          }}
        >
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="forever">Loop forever</SelectItem>
            <SelectItem value="once">Play once</SelectItem>
            <SelectItem value="times">N times</SelectItem>
          </SelectContent>
        </Select>
        {typeof store.exportLoop === 'number' && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Times <span className="text-foreground ml-1">{store.exportLoop}</span>
            </Label>
            <Slider
              min={2}
              max={20}
              step={1}
              value={[store.exportLoop]}
              onValueChange={(v) => store.setExportLoop(sliderVal(v))}
            />
          </div>
        )}
      </div>

      {/* Autoplay — HTML only */}
      {showAutoplay && (
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Autoplay</Label>
          <Switch
            disabled={disabled}
            checked={store.exportAutoplay}
            onCheckedChange={store.setExportAutoplay}
          />
        </div>
      )}

      {/* Show Controls — HTML only */}
      {showControls && (
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Show Controls</Label>
          <Switch
            disabled={disabled}
            checked={store.exportShowControls}
            onCheckedChange={store.setExportShowControls}
          />
        </div>
      )}

      {/* Canvas Width — not for ANSI */}
      {showCanvasWidth && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Canvas Width <span className="text-foreground ml-1">{store.exportCanvasWidth}px</span>
          </Label>
          <Slider
            disabled={disabled}
            min={320}
            max={1920}
            step={10}
            value={[store.exportCanvasWidth]}
            onValueChange={(v) => store.setExportCanvasWidth(sliderVal(v))}
          />
        </div>
      )}
    </div>
  )
}
