'use client'

import { useEditorStore } from '@/stores/editor-store'
import { CHARACTER_SETS, FONT_PRESETS } from '@/lib/constants'
import type { CharacterSetName, ColorMode } from '@/lib/constants'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

function sliderVal(v: number | readonly number[]): number {
  return Array.isArray(v) ? v[0] : (v as number)
}

export function InputControls() {
  const store = useEditorStore()
  const disabled = store.playbackState === 'empty'

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Input Controls</h2>
      <Separator />

      {/* Character Set */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Character Set</Label>
        <Select value={store.characterSet} onValueChange={(v) => v && store.setCharacterSet(v as CharacterSetName)}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="minimal">Minimal</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="dense">Dense</SelectItem>
            <SelectItem value="emoji">Emoji</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
        {store.characterSet === 'custom' && (
          <input
            type="text"
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground"
            placeholder="Characters (light → dark)"
            value={store.customCharacters}
            onChange={(e) => store.setCustomCharacters(e.target.value)}
          />
        )}
      </div>

      {/* Grid Density */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Columns <span className="text-foreground ml-1">{store.columns}</span>
        </Label>
        <Slider
          disabled={disabled}
          min={20}
          max={240}
          step={1}
          value={[store.columns]}
          onValueChange={(v) => store.setColumns(sliderVal(v))}
        />
      </div>

      <Separator />

      {/* Brightness Threshold */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Brightness Threshold <span className="text-foreground ml-1">{store.brightnessThreshold}</span>
        </Label>
        <Slider
          disabled={disabled}
          min={0}
          max={255}
          step={1}
          value={[store.brightnessThreshold]}
          onValueChange={(v) => store.setBrightnessThreshold(sliderVal(v))}
        />
      </div>

      {/* Contrast */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Contrast <span className="text-foreground ml-1">{store.contrastBoost}%</span>
        </Label>
        <Slider
          disabled={disabled}
          min={0}
          max={200}
          step={1}
          value={[store.contrastBoost]}
          onValueChange={(v) => store.setContrastBoost(sliderVal(v))}
        />
      </div>

      <Separator />

      {/* Color Mode */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Color Mode</Label>
        <Select value={store.colorMode} onValueChange={(v) => v && store.setColorMode(v as ColorMode)}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="monochrome">Monochrome</SelectItem>
            <SelectItem value="colored">Colored</SelectItem>
            <SelectItem value="inverted">Inverted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Colors */}
      {store.colorMode !== 'colored' && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Foreground</Label>
          <input
            type="color"
            className="h-8 w-full cursor-pointer rounded border border-border"
            value={store.foregroundColor}
            onChange={(e) => store.setForegroundColor(e.target.value)}
          />
        </div>
      )}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Background</Label>
        <input
          type="color"
          className="h-8 w-full cursor-pointer rounded border border-border"
          value={store.backgroundColor}
          onChange={(e) => store.setBackgroundColor(e.target.value)}
        />
      </div>

      <Separator />

      {/* Font */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Font</Label>
        <Select value={store.fontFamily} onValueChange={(v) => v && store.setFontFamily(v)}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {FONT_PRESETS.map((font) => (
              <SelectItem key={font} value={font}>{font}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Font Size */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Font Size <span className="text-foreground ml-1">{store.fontSize}px</span>
        </Label>
        <Slider
          disabled={disabled}
          min={6}
          max={24}
          step={1}
          value={[store.fontSize]}
          onValueChange={(v) => store.setFontSize(sliderVal(v))}
        />
      </div>

      <Separator />

      {/* Frame Skip */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Frame Skip <span className="text-foreground ml-1">{store.frameSkip}</span>
        </Label>
        <Slider
          disabled={disabled}
          min={1}
          max={8}
          step={1}
          value={[store.frameSkip]}
          onValueChange={(v) => store.setFrameSkip(sliderVal(v))}
        />
      </div>
    </div>
  )
}
