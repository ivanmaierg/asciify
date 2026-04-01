'use client'

import { useEditorStore } from '@/stores/editor-store'
import { FPS_OPTIONS } from '@/lib/constants'
import type { ExportLoop } from '@/lib/constants'
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

  return (
    <div className="space-y-4">
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

      {/* Autoplay */}
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Autoplay</Label>
        <Switch
          disabled={disabled}
          checked={store.exportAutoplay}
          onCheckedChange={store.setExportAutoplay}
        />
      </div>

      {/* Show Controls */}
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Show Controls</Label>
        <Switch
          disabled={disabled}
          checked={store.exportShowControls}
          onCheckedChange={store.setExportShowControls}
        />
      </div>

      {/* Canvas Width */}
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
    </div>
  )
}
