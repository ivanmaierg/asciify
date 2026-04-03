'use client'

import { useState } from 'react'
import { useDemoStore } from '@/stores/demo-store'
import { THEMES } from '@asciify/player'
import type { RenderMode, LoopMode } from '@asciify/player'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

function sliderVal(v: number | readonly number[]): number {
  if (typeof v === 'number') return v
  return v[0] ?? 0
}

export function DemoControls() {
  const renderMode = useDemoStore((s) => s.renderMode)
  const theme = useDemoStore((s) => s.theme)
  const loop = useDemoStore((s) => s.loop)
  const charDelay = useDemoStore((s) => s.charDelay)
  const fps = useDemoStore((s) => s.fps)
  const playerData = useDemoStore((s) => s.playerData)
  const setRenderMode = useDemoStore((s) => s.setRenderMode)
  const setTheme = useDemoStore((s) => s.setTheme)
  const setLoop = useDemoStore((s) => s.setLoop)
  const setCharDelay = useDemoStore((s) => s.setCharDelay)

  const [isExporting, setIsExporting] = useState(false)

  const renderModes: { value: RenderMode; label: string }[] = [
    { value: 'grid', label: 'Grid' },
    { value: 'proportional', label: 'Proportional' },
    { value: 'typewriter', label: 'Typewriter' },
  ]

  const loopOptions: { value: LoopMode; label: string }[] = [
    { value: 'forever', label: 'Forever' },
    { value: 'once', label: 'Once' },
    { value: 3, label: '3x' },
  ]

  const loopMatches = (a: LoopMode, b: LoopMode) => {
    if (typeof a === 'number' && typeof b === 'number') return a === b
    return a === b
  }

  async function handleExport() {
    if (!playerData) return
    setIsExporting(true)
    try {
      const res = await fetch('/player-bundle.js')
      const playerBundle = res.ok ? await res.text() : ''

      const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>ASCII Animation</title>
<style>body{margin:0;background:#000}</style>
</head>
<body>
<script>${playerBundle}<\/script>
<ascii-player
  src="data:application/json,${encodeURIComponent(JSON.stringify(playerData))}"
  autoplay
  controls
  loop="${String(loop)}"
  mode="${renderMode}"
  theme="${theme}"
  fps="${fps}"
  width="800"
></ascii-player>
</body>
</html>`

      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'asciify-demo.html'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Render Mode */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Render Mode
        </h3>
        <div className="flex gap-1">
          {renderModes.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setRenderMode(value)}
              className={cn(
                'flex-1 rounded px-2 py-1.5 text-xs font-medium transition-colors',
                renderMode === value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Char delay (typewriter only) */}
      {renderMode === 'typewriter' && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Char Delay: <span className="text-foreground">{charDelay}ms</span>
          </h3>
          <Slider
            min={10}
            max={200}
            step={5}
            value={[charDelay]}
            onValueChange={(v) => setCharDelay(sliderVal(v))}
          />
        </div>
      )}

      {/* Theme */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Theme
        </h3>
        <div className="flex flex-col gap-1">
          {Object.entries(THEMES).map(([key, t]) => (
            <button
              key={key}
              onClick={() => setTheme(key)}
              className={cn(
                'flex items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors text-left',
                theme === key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: t.fgColor }}
              />
              {key}
            </button>
          ))}
        </div>
      </div>

      {/* Loop */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Loop
        </h3>
        <div className="flex gap-1">
          {loopOptions.map(({ value, label }) => (
            <button
              key={label}
              onClick={() => setLoop(value)}
              className={cn(
                'flex-1 rounded px-2 py-1.5 text-xs font-medium transition-colors',
                loopMatches(loop, value)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Export */}
      <div className="pt-1">
        <Button
          onClick={handleExport}
          disabled={!playerData || isExporting}
          className="w-full"
          size="sm"
        >
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              Exporting...
            </>
          ) : (
            'Export HTML'
          )}
        </Button>
      </div>
    </div>
  )
}
