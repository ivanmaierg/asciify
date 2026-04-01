'use client'

import { useState, useCallback } from 'react'
import { useEditorStore } from '@/stores/editor-store'
import { Button } from '@/components/ui/button'
import { Copy, Check, ExternalLink } from 'lucide-react'

export function CodePreview() {
  const exportedOutput = useEditorStore((s) => s.exportedOutput)
  const exportedBlob = useEditorStore((s) => s.exportedBlob)
  const exportFormat = useEditorStore((s) => s.exportFormat)
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    if (!exportedOutput) return
    await navigator.clipboard.writeText(exportedOutput)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [exportedOutput])

  const handlePreview = useCallback(() => {
    if (exportedBlob) {
      const url = URL.createObjectURL(exportedBlob)
      window.open(url, '_blank')
    } else if (exportedOutput) {
      const mimeMap: Record<string, string> = {
        html: 'text/html',
        svg: 'image/svg+xml',
        ansi: 'text/plain',
      }
      const blob = new Blob([exportedOutput], { type: mimeMap[exportFormat] || 'text/plain' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
    }
  }, [exportedOutput, exportedBlob, exportFormat])

  if (!exportedOutput && !exportedBlob) return null

  // Binary format (APNG)
  if (exportedBlob && !exportedOutput) {
    const sizeKB = (exportedBlob.size / 1024).toFixed(1)
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Output</span>
          <Button variant="ghost" size="xs" onClick={handlePreview}>
            <ExternalLink className="h-3 w-3 mr-1" />
            Preview
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{sizeKB} KB</p>
      </div>
    )
  }

  if (!exportedOutput) return null

  const preview = createPreview(exportedOutput, exportFormat)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Output Preview</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="xs" onClick={handlePreview}>
            <ExternalLink className="h-3 w-3 mr-1" />
            Preview
          </Button>
          <Button variant="ghost" size="xs" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="h-3 w-3 mr-1" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </>
            )}
          </Button>
        </div>
      </div>
      <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs font-mono text-muted-foreground leading-relaxed">
        {preview}
      </pre>
      <p className="text-xs text-muted-foreground">
        {(new Blob([exportedOutput]).size / 1024).toFixed(1)} KB
      </p>
    </div>
  )
}

function createPreview(content: string, format: string): string {
  if (format === 'html') {
    const frameMatch = content.match(new RegExp('var F=\\[.*?\\];', 's'))
    if (!frameMatch) return content.slice(0, 1000) + '\n...'
    const before = content.slice(0, frameMatch.index!)
    const after = content.slice(frameMatch.index! + frameMatch[0].length)
    const frameCount = (frameMatch[0].match(/","/g)?.length ?? 0) + 1
    return before + `var F=[/* ${frameCount} frames */];` + after
  }

  if (format === 'svg') {
    // Show header + first frame group, truncate rest
    const frameGroups = content.match(/<g class="f"/g)
    const count = frameGroups?.length ?? 0
    const firstEnd = content.indexOf('</g>') + 4
    if (firstEnd > 4 && count > 1) {
      return content.slice(0, firstEnd) + `\n<!-- ... ${count - 1} more frames ... -->\n</svg>`
    }
    return content.slice(0, 2000)
  }

  if (format === 'ansi') {
    // Show header + first frame
    const lines = content.split('\n')
    const headerEnd = lines.findIndex((l) => l.includes("printf '\\033[H'"))
    if (headerEnd > 0 && lines.length > headerEnd + 10) {
      return lines.slice(0, headerEnd + 8).join('\n') + '\n# ... more frames ...'
    }
    return content.slice(0, 2000)
  }

  return content.slice(0, 2000)
}
