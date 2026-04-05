'use client'

import { useCallback, useRef, useState } from 'react'
import { useDemoStore } from '@/stores/demo-store'
import { Upload, FileJson } from 'lucide-react'
import { Button } from '@/components/ui/button'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

export function DemoDropZone() {
  const setVideoFile = useDemoStore((s) => s.setVideoFile)
  const setPlayerData = useDemoStore((s) => s.setPlayerData)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const jsonInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jsonMode, setJsonMode] = useState(false)
  const [jsonText, setJsonText] = useState('')

  const handleFile = useCallback(
    (file: File) => {
      setError(null)

      // JSON file — load directly as player data
      if (file.name.endsWith('.json') || file.type === 'application/json') {
        const reader = new FileReader()
        reader.onload = () => {
          try {
            const data = JSON.parse(reader.result as string)
            if (!data.version || !data.metadata || !data.frames) {
              setError('Invalid AsciiPlayerData JSON — needs version, metadata, and frames fields.')
              return
            }
            setPlayerData(data)
          } catch {
            setError('Failed to parse JSON file.')
          }
        }
        reader.readAsText(file)
        return
      }

      // Video file
      if (!file.type.startsWith('video/')) {
        setError('Please select a video or JSON file.')
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        setError('File too large. Maximum size is 100MB.')
        return
      }
      setVideoFile(file)
    },
    [setVideoFile, setPlayerData],
  )

  const handleJsonPaste = useCallback(() => {
    setError(null)
    try {
      const data = JSON.parse(jsonText)
      if (!data.version || !data.metadata || !data.frames) {
        setError('Invalid AsciiPlayerData JSON — needs version, metadata, and frames fields.')
        return
      }
      setPlayerData(data)
    } catch {
      setError('Failed to parse JSON.')
    }
  }, [jsonText, setPlayerData])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback(() => setIsDragging(false), [])

  const onVideoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const onJsonChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  if (jsonMode) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setJsonMode(false)}>
            ← Back to video
          </Button>
          <span className="text-xs text-muted-foreground">or</span>
          <Button variant="outline" size="sm" onClick={() => jsonInputRef.current?.click()}>
            <FileJson className="h-4 w-4 mr-1" /> Load JSON file
          </Button>
          <input
            ref={jsonInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={onJsonChange}
          />
        </div>
        <textarea
          className="w-full h-64 rounded-xl border border-muted-foreground/25 bg-background p-4 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder='Paste AsciiPlayerData or AsciiPlayerDataCompact JSON here...

{
  "version": 1,
  "metadata": { "columns": 80, "rows": 24, "fps": 12, ... },
  "frames": [ ... ]
}'
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
        />
        <Button onClick={handleJsonPaste} disabled={!jsonText.trim()} className="w-full">
          Load JSON
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div
        className={`flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-16 transition-colors cursor-pointer ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => videoInputRef.current?.click()}
      >
        <Upload className="h-10 w-10 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            Drop a video or JSON file here, or click to upload
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            MP4, WebM, MOV — up to 100MB &nbsp;|&nbsp; JSON (AsciiPlayerData)
          </p>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,.json,application/json"
          className="hidden"
          onChange={onVideoChange}
        />
      </div>
      <div className="text-center">
        <Button variant="link" size="sm" className="text-xs text-muted-foreground" onClick={() => setJsonMode(true)}>
          <FileJson className="h-3 w-3 mr-1" /> Paste JSON directly
        </Button>
      </div>
    </div>
  )
}
