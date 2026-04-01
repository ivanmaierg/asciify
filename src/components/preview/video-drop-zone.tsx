'use client'

import { useCallback, useRef, useState } from 'react'
import { useEditorStore } from '@/stores/editor-store'
import { Upload } from 'lucide-react'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

export function VideoDropZone() {
  const setVideoFile = useEditorStore((s) => s.setVideoFile)
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback(
    (file: File) => {
      setError(null)
      if (!file.type.startsWith('video/')) {
        setError('Please select a video file.')
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        setError('File too large. Maximum size is 100MB.')
        return
      }
      setVideoFile(file)
    },
    [setVideoFile],
  )

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

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-16 transition-colors cursor-pointer ${
        isDragging
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/25 hover:border-muted-foreground/50'
      }`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => inputRef.current?.click()}
    >
      <Upload className="h-10 w-10 text-muted-foreground" />
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">
          Drop a video here or click to upload
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          MP4, WebM, MOV — up to 100MB
        </p>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={onChange}
      />
    </div>
  )
}
