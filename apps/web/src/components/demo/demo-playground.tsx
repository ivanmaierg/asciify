'use client'

import { useDemoStore } from '@/stores/demo-store'
import type { ColorMode } from '@asciify/encoder'
import { DemoDropZone } from './demo-drop-zone'
import { DemoConverter } from './demo-converter'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'

function sliderVal(v: number | readonly number[]): number {
  if (typeof v === 'number') return v
  return v[0] ?? 0
}

export function DemoPlayground() {
  const videoUrl = useDemoStore((s) => s.videoUrl)
  const columns = useDemoStore((s) => s.columns)
  const fps = useDemoStore((s) => s.fps)
  const colorMode = useDemoStore((s) => s.colorMode)
  const playerData = useDemoStore((s) => s.playerData)
  const setColumns = useDemoStore((s) => s.setColumns)
  const setFps = useDemoStore((s) => s.setFps)
  const setColorMode = useDemoStore((s) => s.setColorMode)

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Asciify Playground</h1>
          <p className="text-muted-foreground mt-2">
            Drop a video, tweak settings, watch it play as ASCII art
          </p>
        </div>

        {!videoUrl ? (
          <DemoDropZone />
        ) : (
          <div className="flex gap-6">
            {/* Controls panel */}
            <div className="w-full max-w-sm shrink-0 space-y-6">
              {/* Settings */}
              <div className="space-y-4 rounded-xl border border-muted-foreground/25 p-4">
                <h2 className="text-sm font-semibold text-foreground">Settings</h2>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Columns <span className="text-foreground ml-1">{columns}</span>
                  </Label>
                  <Slider
                    min={40}
                    max={200}
                    step={1}
                    value={[columns]}
                    onValueChange={(v) => setColumns(sliderVal(v))}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    FPS <span className="text-foreground ml-1">{fps}</span>
                  </Label>
                  <Slider
                    min={1}
                    max={30}
                    step={1}
                    value={[fps]}
                    onValueChange={(v) => setFps(sliderVal(v))}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Color Mode</Label>
                  <Select
                    value={colorMode}
                    onValueChange={(v) => v && setColorMode(v as ColorMode)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monochrome">Monochrome</SelectItem>
                      <SelectItem value="colored">Colored</SelectItem>
                      <SelectItem value="inverted">Inverted</SelectItem>
                      <SelectItem value="monoscale">Monoscale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Converter */}
              <DemoConverter />
            </div>

            {/* Player area */}
            <div className="flex-1 rounded-xl border border-muted-foreground/25 bg-muted/10 flex items-center justify-center min-h-[400px]">
              {playerData ? (
                <p className="text-muted-foreground text-sm">
                  Player output will appear here (Plan 02)
                </p>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Configure settings and click Convert
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
