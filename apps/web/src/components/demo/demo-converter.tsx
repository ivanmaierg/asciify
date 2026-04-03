'use client'

import { useCallback } from 'react'
import { useDemoStore } from '@/stores/demo-store'
import { extractFrames } from '@/lib/frame-extractor'
import {
  createPlayerData,
  compressPlayerData,
  CHARACTER_SETS,
} from '@asciify/encoder'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export function DemoConverter() {
  const {
    videoUrl,
    videoDuration,
    columns,
    characterSet,
    colorMode,
    fps,
    isConverting,
    convertProgress,
    error,
    playerData,
    setIsConverting,
    setConvertProgress,
    setError,
    setPlayerData,
  } = useDemoStore()

  const handleConvert = useCallback(async () => {
    if (!videoUrl || !videoDuration) return

    setIsConverting(true)
    setConvertProgress(0)
    setError(null)
    setPlayerData(null)

    try {
      const extracted = await extractFrames(
        {
          videoUrl,
          videoDuration,
          startTime: 0,
          endTime: videoDuration,
          frameRate: fps,
          frameSkip: 1,
          columns,
          characterSet,
          customCharacters: '',
          brightnessThreshold: 128,
          contrastBoost: 0,
          colorMode,
          gamma: 1.0,
          edgeDetection: 0,
          ditherMode: 'none',
          invertCharset: false,
        },
        (p) => setConvertProgress(p),
      )

      const charset = characterSet === 'custom'
        ? ''
        : CHARACTER_SETS[characterSet as keyof typeof CHARACTER_SETS]

      const rawData = createPlayerData(extracted.frames, {
        columns: extracted.columns,
        fps,
        duration: videoDuration,
        colorMode,
        charset,
      })

      const compact = compressPlayerData(rawData)
      setPlayerData(compact)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed')
    } finally {
      setIsConverting(false)
    }
  }, [
    videoUrl,
    videoDuration,
    columns,
    characterSet,
    colorMode,
    fps,
    setIsConverting,
    setConvertProgress,
    setError,
    setPlayerData,
  ])

  return (
    <div className="space-y-3">
      <Button
        onClick={handleConvert}
        disabled={isConverting || !videoUrl}
        className="w-full"
      >
        {isConverting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Converting...
          </>
        ) : (
          'Convert to ASCII'
        )}
      </Button>

      {isConverting && (
        <div className="space-y-1">
          <div className="h-2 w-full rounded bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-200"
              style={{ width: `${Math.round(convertProgress * 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-right">
            {Math.round(convertProgress * 100)}%
          </p>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {playerData && !isConverting && (
        <p className="text-xs text-green-500">Ready to play</p>
      )}
    </div>
  )
}
