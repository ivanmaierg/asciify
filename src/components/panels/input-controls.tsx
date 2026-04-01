'use client'

import { useEditorStore } from '@/stores/editor-store'
import { CHARACTER_SETS, FONT_PRESETS } from '@/lib/constants'
import type { CharacterSetName, ColorMode, DitherMode } from '@/lib/constants'
import type { BitDepth, AudioSampleRate } from '@/lib/audio-processor'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
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

      {/* Gamma */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Gamma <span className="text-foreground ml-1">{store.gamma.toFixed(2)}</span>
        </Label>
        <Slider
          disabled={disabled}
          min={0.5}
          max={2}
          step={0.01}
          value={[store.gamma]}
          onValueChange={(v) => store.setGamma(sliderVal(v))}
        />
      </div>

      {/* Invert Characters */}
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Invert Characters</Label>
        <Switch
          disabled={disabled}
          checked={store.invertCharset}
          onCheckedChange={store.setInvertCharset}
        />
      </div>

      {/* Edge Detection */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Edge Detection <span className="text-foreground ml-1">{store.edgeDetection}%</span>
        </Label>
        <Slider
          disabled={disabled}
          min={0}
          max={100}
          step={1}
          value={[store.edgeDetection]}
          onValueChange={(v) => store.setEdgeDetection(sliderVal(v))}
        />
      </div>

      {/* Dithering */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Dithering</Label>
        <Select value={store.ditherMode} onValueChange={(v) => v && store.setDitherMode(v as DitherMode)}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="floyd-steinberg">Floyd-Steinberg</SelectItem>
            <SelectItem value="ordered">Ordered (Bayer)</SelectItem>
          </SelectContent>
        </Select>
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
            <SelectItem value="monoscale">Monoscale</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Colors */}
      {store.colorMode !== 'colored' && store.colorMode !== 'monoscale' && (
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

      {/* Trim */}
      {store.videoDuration > 0 && (
        <>
          <Separator />

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Start <span className="text-foreground ml-1">{formatTime(store.trimStart)}</span>
            </Label>
            <Slider
              min={0}
              max={store.videoDuration}
              step={0.1}
              value={[store.trimStart]}
              onValueChange={(v) => store.setTrimStart(sliderVal(v))}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              End <span className="text-foreground ml-1">{formatTime(store.trimEnd)}</span>
            </Label>
            <Slider
              min={0}
              max={store.videoDuration}
              step={0.1}
              value={[store.trimEnd]}
              onValueChange={(v) => store.setTrimEnd(sliderVal(v))}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Duration: <span className="text-foreground">{formatTime(store.trimEnd - store.trimStart)}</span>
          </p>
        </>
      )}

      {/* Audio */}
      {store.videoDuration > 0 && (
        <>
          <Separator />

          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Include Audio</Label>
            <Switch
              checked={store.audioEnabled}
              onCheckedChange={store.setAudioEnabled}
            />
          </div>

          {store.audioEnabled && (
            <>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Bit Depth</Label>
                <Select
                  value={String(store.audioBitDepth)}
                  onValueChange={(v) => v && store.setAudioBitDepth(Number(v) as BitDepth)}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="8">8-bit (NES/Game Boy)</SelectItem>
                    <SelectItem value="16">16-bit (SNES/Genesis)</SelectItem>
                    <SelectItem value="32">32-bit (Original)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Sample Rate</Label>
                <Select
                  value={String(store.audioSampleRate)}
                  onValueChange={(v) => v && store.setAudioSampleRate(Number(v) as AudioSampleRate)}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="11025">11 kHz (Lo-fi)</SelectItem>
                    <SelectItem value="22050">22 kHz (Retro)</SelectItem>
                    <SelectItem value="44100">44 kHz (CD quality)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Low-Pass <span className="text-foreground ml-1">{store.audioLowPass === 0 ? 'Off' : `${(store.audioLowPass / 1000).toFixed(1)} kHz`}</span>
                </Label>
                <Slider
                  min={0} max={20000} step={100}
                  value={[store.audioLowPass]}
                  onValueChange={(v) => store.setAudioLowPass(sliderVal(v))}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Distortion <span className="text-foreground ml-1">{store.audioDistortion}%</span>
                </Label>
                <Slider
                  min={0} max={95} step={1}
                  value={[store.audioDistortion]}
                  onValueChange={(v) => store.setAudioDistortion(sliderVal(v))}
                />
              </div>
            </>
          )}
        </>
      )}

      {/* CRT Effects */}
      <Separator />

      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">CRT Effects</Label>
        <Switch
          checked={store.crtEnabled}
          onCheckedChange={store.setCrtEnabled}
        />
      </div>

      {store.crtEnabled && (
        <>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Vignette <span className="text-foreground ml-1">{store.crtVignette}%</span>
            </Label>
            <Slider
              min={0} max={100} step={1}
              value={[store.crtVignette]}
              onValueChange={(v) => store.setCrtVignette(sliderVal(v))}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Scanlines <span className="text-foreground ml-1">{store.crtScanlines}%</span>
            </Label>
            <Slider
              min={0} max={100} step={1}
              value={[store.crtScanlines]}
              onValueChange={(v) => store.setCrtScanlines(sliderVal(v))}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Rounded Corners <span className="text-foreground ml-1">{store.crtRoundedCorners}px</span>
            </Label>
            <Slider
              min={0} max={50} step={1}
              value={[store.crtRoundedCorners]}
              onValueChange={(v) => store.setCrtRoundedCorners(sliderVal(v))}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Curvature <span className="text-foreground ml-1">{store.crtCurvature}%</span>
            </Label>
            <Slider
              min={0} max={100} step={1}
              value={[store.crtCurvature]}
              onValueChange={(v) => store.setCrtCurvature(sliderVal(v))}
            />
          </div>
        </>
      )}
    </div>
  )
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 10)
  return `${m}:${s.toString().padStart(2, '0')}.${ms}`
}
